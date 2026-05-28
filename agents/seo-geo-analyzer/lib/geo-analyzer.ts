import * as cheerio from 'cheerio';

export interface GeoResult {
  score: number;
  items: {
    key: string;
    label: string;
    score: number;
    status: 'good' | 'warning' | 'fail';
    detail: string;
  }[];
  industry: string;
  industryEn: string;
  summary: string;
  competitorsKorea: { domain: string; name: string }[];
  competitorsGlobal: { domain: string; name: string }[];
}

// GEO: Generative Engine Optimization — AI 검색에 얼마나 최적화되어 있는지
export async function analyzeGeo(url: string, html: string, apiKey?: string): Promise<GeoResult> {
  const $ = cheerio.load(html);
  const items: GeoResult['items'] = [];

  // 1. 구조화 데이터 (JSON-LD)
  const ldScripts = $('script[type="application/ld+json"]');
  const ldCount = ldScripts.length;
  let hasOrg = false, hasFAQ = false, hasArticle = false, hasBreadcrumb = false;
  ldScripts.each((_, el) => {
    try {
      const d = JSON.parse($(el).html() || '{}');
      const types = [d['@type'], ...(Array.isArray(d['@graph']) ? d['@graph'].map((g: { '@type': string }) => g['@type']) : [])].flat();
      if (types.some(t => ['Organization','LocalBusiness'].includes(t))) hasOrg = true;
      if (types.includes('FAQPage')) hasFAQ = true;
      if (types.some(t => ['Article','BlogPosting','NewsArticle'].includes(t))) hasArticle = true;
      if (types.includes('BreadcrumbList')) hasBreadcrumb = true;
    } catch {}
  });

  items.push({ key: 'ld_json', label: '구조화 데이터 (JSON-LD)', score: Math.min(ldCount * 25, 100), status: ldCount >= 2 ? 'good' : ldCount === 1 ? 'warning' : 'fail', detail: `${ldCount}개 스크립트 감지` });
  items.push({ key: 'faq', label: 'FAQ 스키마', score: hasFAQ ? 100 : 0, status: hasFAQ ? 'good' : 'fail', detail: hasFAQ ? 'FAQPage 스키마 존재' : 'FAQ 없음 — AI 답변 노출 기회 손실' });
  items.push({ key: 'org', label: '기관/브랜드 정보', score: hasOrg ? 100 : 0, status: hasOrg ? 'good' : 'warning', detail: hasOrg ? 'Organization 스키마 존재' : '브랜드 정보 미등록' });
  items.push({ key: 'article', label: '콘텐츠 스키마', score: hasArticle ? 100 : 0, status: hasArticle ? 'good' : 'warning', detail: hasArticle ? 'Article 스키마 존재' : '콘텐츠 유형 미정의' });

  // 2. E-E-A-T 신호
  const bodyText = $('body').text().toLowerCase();
  const hasAuthor = $('[rel="author"], .author, .byline, [itemprop="author"]').length > 0 || bodyText.includes('저자') || bodyText.includes('작성자');
  const hasDate = $('time, [itemprop="datePublished"], [itemprop="dateModified"]').length > 0;
  const hasAbout = $('a[href*="about"], a[href*="소개"]').length > 0 || bodyText.includes('about us') || bodyText.includes('회사소개');

  items.push({ key: 'author', label: '저자/전문성 표시', score: hasAuthor ? 100 : 0, status: hasAuthor ? 'good' : 'warning', detail: hasAuthor ? '저자 정보 감지' : '저자 정보 없음 (E-E-A-T 취약)' });
  items.push({ key: 'date', label: '날짜 정보', score: hasDate ? 100 : 40, status: hasDate ? 'good' : 'warning', detail: hasDate ? '발행/수정 날짜 존재' : '날짜 정보 없음' });
  items.push({ key: 'about', label: '브랜드 신뢰 페이지', score: hasAbout ? 100 : 30, status: hasAbout ? 'good' : 'warning', detail: hasAbout ? '소개 페이지 감지' : '소개 페이지 없음' });

  // 3. 콘텐츠 품질
  const headings = $('h2, h3').map((_, el) => $(el).text().trim()).get();
  const hasQA = headings.some(h => h.includes('?') || h.includes('란') || h.includes('무엇') || h.includes('왜') || h.includes('how') || h.includes('what') || h.includes('why'));
  const hasTable = $('table').length > 0;
  const hasList = $('ul li, ol li').length > 5;

  items.push({ key: 'qa_headings', label: '질문형 헤딩', score: hasQA ? 100 : 30, status: hasQA ? 'good' : 'warning', detail: hasQA ? 'Q&A 형식 헤딩 감지' : '질문형 헤딩 없음 — AI 답변 생성에 불리' });
  items.push({ key: 'structure', label: '콘텐츠 구조화', score: (hasTable ? 40 : 0) + (hasList ? 40 : 0) + (headings.length > 3 ? 20 : 0), status: hasTable && hasList ? 'good' : hasList || headings.length > 3 ? 'warning' : 'fail', detail: `표${hasTable ? '✓' : '✗'} 목록${hasList ? '✓' : '✗'} 헤딩${headings.length}개` });

  // 4. 브랜드 언급 가능성
  const metaDesc = $('meta[name="description"]').attr('content') || '';
  const title = $('title').first().text();
  const hasConsistentBrand = title.length > 0 && metaDesc.length > 0;
  items.push({ key: 'brand', label: '브랜드 일관성', score: hasConsistentBrand ? 80 : 30, status: hasConsistentBrand ? 'good' : 'warning', detail: hasConsistentBrand ? '타이틀·설명 일관성 확인' : '브랜드 메시지 불일치' });

  // 5. HTTPS
  const isHttps = url.startsWith('https://');
  items.push({ key: 'https', label: 'HTTPS 보안', score: isHttps ? 100 : 0, status: isHttps ? 'good' : 'fail', detail: isHttps ? 'SSL 적용' : 'HTTP — AI 검색에서 신뢰도 낮음' });

  const score = Math.round(items.reduce((s, i) => s + i.score, 0) / items.length);

  // Groq: 산업군 분류 + 한국/글로벌 경쟁사 한번에
  let industry = '기타', industryEn = 'other', summary = '';
  let competitorsKorea: { domain: string; name: string }[] = [];
  let competitorsGlobal: { domain: string; name: string }[] = [];
  if (apiKey) {
    try {
      const Groq = (await import('groq-sdk')).default;
      const groq = new Groq({ apiKey });
      const bodySnippet = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 800);
      const prompt = `Analyze the following website and respond with JSON only. No other text:
{
  "industry": "Korean industry name (전자상거래/금융/의료/교육/여행/음식/IT·SaaS/미디어/기타)",
  "industryEn": "one of: ecommerce|finance|health|education|travel|food|it_saas|media|other",
  "summary": "one-line Korean description under 25 chars",
  "competitorsKorea": [
    {"domain":"example.co.kr","name":"사이트명"},
    ... 6 similar Korean competitor websites (Korean market focused, exclude the target site)
  ],
  "competitorsGlobal": [
    {"domain":"example.com","name":"Site Name"},
    ... 6 similar global competitor websites (international, exclude the target site)
  ]
}

URL: ${url}
Content: ${bodySnippet}`;
      const res = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: '반드시 모든 텍스트를 한국어로만 작성하세요. 영어·러시아어·중국어 등 다른 언어 절대 금지. 도메인명·브랜드명 등 고유명사는 예외.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 800,
        response_format: { type: 'json_object' },
      });
      const parsed = JSON.parse(res.choices[0].message.content || '{}');
      industry = parsed.industry || '기타';
      industryEn = parsed.industryEn || 'other';
      summary = parsed.summary || '';
      competitorsKorea = Array.isArray(parsed.competitorsKorea) ? parsed.competitorsKorea.slice(0, 6) : [];
      competitorsGlobal = Array.isArray(parsed.competitorsGlobal) ? parsed.competitorsGlobal.slice(0, 6) : [];
    } catch {}
  }

  return { score, items, industry, industryEn, summary, competitorsKorea, competitorsGlobal };
}
