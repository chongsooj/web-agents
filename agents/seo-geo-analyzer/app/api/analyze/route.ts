import { NextRequest, NextResponse } from 'next/server';
import { analyzeSeo } from '@/lib/seo-analyzer';
import { analyzeGeo } from '@/lib/geo-analyzer';
import { analyzeRanking } from '@/lib/ranking';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const { url } = await req.json();

  if (!url) return NextResponse.json({ error: 'URL이 필요합니다.' }, { status: 400 });

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
  } catch {
    return NextResponse.json({ error: '올바른 URL을 입력하세요.' }, { status: 400 });
  }

  const targetUrl = parsedUrl.href;
  const domain = parsedUrl.hostname.replace(/^www\./, '');

  // 웹사이트 크롤링
  let html = '';
  try {
    const res = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SEOBot/1.0)' },
      signal: AbortSignal.timeout(10000),
    });
    html = await res.text();
  } catch {
    return NextResponse.json({ error: '사이트에 접근할 수 없습니다. URL을 확인해주세요.' }, { status: 502 });
  }

  // SEO + GEO 병렬 분석 (Gemini로 산업군+경쟁사 한번에)
  const [seo, geo] = await Promise.all([
    analyzeSeo(targetUrl, html),
    analyzeGeo(targetUrl, html, process.env.GROQ_API_KEY),
  ]);

  // Groq가 추천한 한국/글로벌 경쟁사로 OPR 조회
  const rankingWithIndustry = await analyzeRanking(domain, geo.industryEn, geo.competitorsKorea, geo.competitorsGlobal);

  const overallScore = Math.round((seo.score * 0.45) + (geo.score * 0.35) + (rankingWithIndustry.domainAuthority * 0.2));

  // PageSpeed 추가 (Google API, 키 없으면 스킵)
  let performance = { mobile: 0, desktop: 0, lcp: 0, cls: 0, fid: 0 };
  if (process.env.GOOGLE_PAGESPEED_API_KEY) {
    try {
      const psUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(targetUrl)}&key=${process.env.GOOGLE_PAGESPEED_API_KEY}&strategy=mobile`;
      const psRes = await fetch(psUrl, { signal: AbortSignal.timeout(15000) });
      const ps = await psRes.json();
      performance.mobile = Math.round((ps.lighthouseResult?.categories?.performance?.score ?? 0) * 100);
      const metrics = ps.lighthouseResult?.audits;
      performance.lcp  = Math.round((metrics?.['largest-contentful-paint']?.numericValue ?? 0) / 1000 * 10) / 10;
      performance.cls  = Math.round((metrics?.['cumulative-layout-shift']?.numericValue ?? 0) * 1000) / 1000;

      // Desktop
      const psDesktop = await fetch(`${psUrl}&strategy=desktop`, { signal: AbortSignal.timeout(15000) });
      const pd = await psDesktop.json();
      performance.desktop = Math.round((pd.lighthouseResult?.categories?.performance?.score ?? 0) * 100);
    } catch {}
  }

  return NextResponse.json({
    url: targetUrl,
    domain,
    analyzedAt: new Date().toISOString(),
    overallScore,
    seo,
    geo,
    ranking: rankingWithIndustry,
    performance,
  });
}
