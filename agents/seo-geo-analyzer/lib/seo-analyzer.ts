import * as cheerio from 'cheerio';

export interface SeoResult {
  score: number;
  items: {
    key: string;
    label: string;
    score: number; // 0-100
    status: 'good' | 'warning' | 'fail';
    detail: string;
  }[];
  title: string;
  description: string;
  ogImage: string;
  canonical: string;
  h1Count: number;
  h2Count: number;
  lang: string;
  hasRobots: boolean;
  hasSitemap: boolean;
  hasStructuredData: boolean;
  imagesMissingAlt: number;
  totalImages: number;
  internalLinks: number;
  externalLinks: number;
  wordCount: number;
}

export async function analyzeSeo(url: string, html: string): Promise<SeoResult> {
  const $ = cheerio.load(html);
  const origin = new URL(url).origin;
  const items: SeoResult['items'] = [];

  // Title
  const title = $('title').first().text().trim();
  const titleLen = title.length;
  items.push({
    key: 'title',
    label: '페이지 타이틀',
    score: titleLen >= 30 && titleLen <= 60 ? 100 : titleLen > 0 ? 50 : 0,
    status: titleLen >= 30 && titleLen <= 60 ? 'good' : titleLen > 0 ? 'warning' : 'fail',
    detail: title ? `"${title}" (${titleLen}자)` : '타이틀 없음',
  });

  // Meta description
  const desc = $('meta[name="description"]').attr('content')?.trim() || '';
  const descLen = desc.length;
  items.push({
    key: 'description',
    label: '메타 설명',
    score: descLen >= 120 && descLen <= 160 ? 100 : descLen > 0 ? 50 : 0,
    status: descLen >= 120 && descLen <= 160 ? 'good' : descLen > 0 ? 'warning' : 'fail',
    detail: desc ? `${descLen}자` : '메타 설명 없음',
  });

  // H1
  const h1Count = $('h1').length;
  items.push({
    key: 'h1',
    label: 'H1 태그',
    score: h1Count === 1 ? 100 : h1Count > 1 ? 60 : 0,
    status: h1Count === 1 ? 'good' : h1Count > 1 ? 'warning' : 'fail',
    detail: h1Count === 1 ? `"${$('h1').first().text().trim().slice(0, 50)}"` : `H1 ${h1Count}개`,
  });

  // OG tags
  const ogTitle = $('meta[property="og:title"]').attr('content');
  const ogDesc = $('meta[property="og:description"]').attr('content');
  const ogImage = $('meta[property="og:image"]').attr('content') || '';
  const ogScore = [ogTitle, ogDesc, ogImage].filter(Boolean).length;
  items.push({
    key: 'og',
    label: 'Open Graph',
    score: Math.round((ogScore / 3) * 100),
    status: ogScore === 3 ? 'good' : ogScore > 0 ? 'warning' : 'fail',
    detail: `og:title${ogTitle ? '✓' : '✗'} og:description${ogDesc ? '✓' : '✗'} og:image${ogImage ? '✓' : '✗'}`,
  });

  // Canonical
  const canonical = $('link[rel="canonical"]').attr('href') || '';
  items.push({
    key: 'canonical',
    label: '캐노니컬 태그',
    score: canonical ? 100 : 0,
    status: canonical ? 'good' : 'fail',
    detail: canonical || '캐노니컬 없음',
  });

  // Images alt
  const imgs = $('img');
  const totalImages = imgs.length;
  let missingAlt = 0;
  imgs.each((_, el) => { if (!$(el).attr('alt')) missingAlt++; });
  const altScore = totalImages === 0 ? 100 : Math.round(((totalImages - missingAlt) / totalImages) * 100);
  items.push({
    key: 'alt',
    label: '이미지 ALT',
    score: altScore,
    status: altScore === 100 ? 'good' : altScore >= 70 ? 'warning' : 'fail',
    detail: `전체 ${totalImages}개 중 ${missingAlt}개 누락`,
  });

  // Structured data
  const hasStructuredData = $('script[type="application/ld+json"]').length > 0;
  items.push({
    key: 'schema',
    label: '구조화 데이터',
    score: hasStructuredData ? 100 : 0,
    status: hasStructuredData ? 'good' : 'fail',
    detail: hasStructuredData ? 'JSON-LD 감지됨' : '구조화 데이터 없음',
  });

  // Lang
  const lang = $('html').attr('lang') || '';
  items.push({
    key: 'lang',
    label: '언어 설정',
    score: lang ? 100 : 0,
    status: lang ? 'good' : 'warning',
    detail: lang || 'lang 속성 없음',
  });

  // Viewport
  const viewport = $('meta[name="viewport"]').attr('content');
  items.push({
    key: 'viewport',
    label: '모바일 뷰포트',
    score: viewport ? 100 : 0,
    status: viewport ? 'good' : 'fail',
    detail: viewport || '뷰포트 메타 없음',
  });

  // Links
  const allLinks = $('a[href]');
  let internal = 0, external = 0;
  allLinks.each((_, el) => {
    const href = $(el).attr('href') || '';
    if (href.startsWith('http') && !href.startsWith(origin)) external++;
    else if (href.startsWith('/') || href.startsWith(origin)) internal++;
  });

  // Word count
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  const wordCount = bodyText.split(' ').filter(Boolean).length;
  items.push({
    key: 'content',
    label: '콘텐츠 분량',
    score: wordCount >= 300 ? 100 : wordCount >= 100 ? 60 : 30,
    status: wordCount >= 300 ? 'good' : wordCount >= 100 ? 'warning' : 'fail',
    detail: `약 ${wordCount.toLocaleString()}단어`,
  });

  // Robots / Sitemap (check common paths)
  let hasRobots = false, hasSitemap = false;
  try {
    const rRes = await fetch(`${origin}/robots.txt`, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
    hasRobots = rRes.ok;
  } catch {}
  try {
    const sRes = await fetch(`${origin}/sitemap.xml`, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
    hasSitemap = sRes.ok;
  } catch {}

  items.push({
    key: 'robots',
    label: 'robots.txt',
    score: hasRobots ? 100 : 0,
    status: hasRobots ? 'good' : 'fail',
    detail: hasRobots ? '존재함' : '없음',
  });
  items.push({
    key: 'sitemap',
    label: 'sitemap.xml',
    score: hasSitemap ? 100 : 0,
    status: hasSitemap ? 'good' : 'fail',
    detail: hasSitemap ? '존재함' : '없음',
  });

  const score = Math.round(items.reduce((s, i) => s + i.score, 0) / items.length);

  return {
    score,
    items,
    title,
    description: desc,
    ogImage,
    canonical,
    h1Count,
    h2Count: $('h2').length,
    lang,
    hasRobots,
    hasSitemap,
    hasStructuredData,
    imagesMissingAlt: missingAlt,
    totalImages,
    internalLinks: internal,
    externalLinks: external,
    wordCount,
  };
}
