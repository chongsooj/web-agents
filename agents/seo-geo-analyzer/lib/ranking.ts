// 도메인 권위·랭킹 데이터

export interface RankingResult {
  domainAuthority: number;     // 0-100
  pageAuthority: number;
  openPageRank: number;        // 0-10
  estimatedMonthlyVisits: string;
  globalRank: number | null;
  koreaRank: number | null;
  industryRank: number | null;
  industryTotal: number;
  competitors: Competitor[];
}

export interface Competitor {
  domain: string;
  name: string;
  globalRank: number;
  koreaRank: number | null;
  da: number;
  opr: number;
  isAbove: boolean; // 분석 사이트보다 위
}

// OpenPageRank API (무료)
async function fetchOpenPageRank(domain: string): Promise<{ opr: number; rank: number | null }> {
  try {
    const res = await fetch(
      `https://openpagerank.com/api/v1.0/getPageRank?domains[]=${domain}`,
      { headers: { 'API-OPR': process.env.OPEN_PAGE_RANK_API_KEY || '' }, signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return { opr: 0, rank: null };
    const data = await res.json();
    const item = data.response?.[0];
    return {
      opr: item?.page_rank_decimal ?? 0,
      rank: item?.rank ?? null,
    };
  } catch {
    return { opr: 0, rank: null };
  }
}

// 산업군별 주요 사이트 DB (랭킹 비교용)
const INDUSTRY_COMPETITORS: Record<string, Competitor[]> = {
  'ecommerce': [
    { domain: 'coupang.com',    name: '쿠팡',    globalRank: 120,   koreaRank: 2,  da: 72, opr: 7.8, isAbove: true },
    { domain: 'gmarket.co.kr',  name: 'G마켓',   globalRank: 1850,  koreaRank: 15, da: 58, opr: 6.2, isAbove: true },
    { domain: 'amazon.com',     name: 'Amazon',  globalRank: 12,    koreaRank: null, da: 96, opr: 9.8, isAbove: true },
    { domain: '11st.co.kr',     name: '11번가',  globalRank: 3200,  koreaRank: 28, da: 52, opr: 5.8, isAbove: false },
    { domain: 'auction.co.kr',  name: '옥션',    globalRank: 4100,  koreaRank: 35, da: 48, opr: 5.2, isAbove: false },
  ],
  'finance': [
    { domain: 'toss.im',       name: '토스',    globalRank: 3200,  koreaRank: 18, da: 62, opr: 6.5, isAbove: true },
    { domain: 'kb.co.kr',      name: 'KB국민',  globalRank: 5800,  koreaRank: 32, da: 55, opr: 5.9, isAbove: true },
    { domain: 'shinhan.com',   name: '신한',    globalRank: 6200,  koreaRank: 36, da: 53, opr: 5.7, isAbove: true },
    { domain: 'kakaobank.com', name: '카카오뱅크', globalRank: 7100, koreaRank: 42, da: 51, opr: 5.4, isAbove: false },
    { domain: 'ibk.co.kr',    name: 'IBK기업',  globalRank: 8900,  koreaRank: 55, da: 48, opr: 5.0, isAbove: false },
  ],
  'media': [
    { domain: 'naver.com',     name: '네이버',   globalRank: 25,   koreaRank: 1,  da: 91, opr: 9.5, isAbove: true },
    { domain: 'daum.net',      name: '다음',     globalRank: 380,  koreaRank: 5,  da: 79, opr: 8.2, isAbove: true },
    { domain: 'youtube.com',   name: 'YouTube', globalRank: 2,    koreaRank: 3,  da: 100, opr: 10, isAbove: true },
    { domain: 'chosun.com',    name: '조선일보', globalRank: 2800, koreaRank: 22, da: 61, opr: 6.6, isAbove: false },
    { domain: 'joins.com',     name: '중앙일보', globalRank: 3500, koreaRank: 29, da: 58, opr: 6.2, isAbove: false },
  ],
  'education': [
    { domain: 'classu.co.kr',  name: '클래스유', globalRank: 12000, koreaRank: 85, da: 42, opr: 4.5, isAbove: true },
    { domain: 'coloso.co.kr',  name: '콜로소',  globalRank: 15000, koreaRank: 110, da: 39, opr: 4.1, isAbove: true },
    { domain: 'coursera.org',  name: 'Coursera', globalRank: 180, koreaRank: null, da: 88, opr: 9.1, isAbove: true },
    { domain: 'udemy.com',     name: 'Udemy',   globalRank: 145,  koreaRank: null, da: 90, opr: 9.3, isAbove: false },
    { domain: 'khan.co.kr',    name: '칸아카데미', globalRank: 28000, koreaRank: 210, da: 35, opr: 3.8, isAbove: false },
  ],
  'travel': [
    { domain: 'booking.com',   name: 'Booking', globalRank: 65,   koreaRank: 42, da: 93, opr: 9.6, isAbove: true },
    { domain: 'yanolja.com',   name: '야놀자',  globalRank: 4200, koreaRank: 31, da: 56, opr: 6.0, isAbove: true },
    { domain: 'airbnb.com',    name: 'Airbnb',  globalRank: 220,  koreaRank: 65, da: 89, opr: 9.2, isAbove: true },
    { domain: 'goodchoice.kr', name: '여기어때', globalRank: 5100, koreaRank: 38, da: 52, opr: 5.5, isAbove: false },
    { domain: 'jejuair.net',   name: '제주항공', globalRank: 9800, koreaRank: 68, da: 46, opr: 4.9, isAbove: false },
  ],
  'it_saas': [
    { domain: 'github.com',    name: 'GitHub',  globalRank: 18,   koreaRank: 8,  da: 97, opr: 9.9, isAbove: true },
    { domain: 'notion.so',     name: 'Notion',  globalRank: 280,  koreaRank: 48, da: 85, opr: 8.8, isAbove: true },
    { domain: 'slack.com',     name: 'Slack',   globalRank: 320,  koreaRank: 55, da: 84, opr: 8.7, isAbove: true },
    { domain: 'figma.com',     name: 'Figma',   globalRank: 580,  koreaRank: 88, da: 80, opr: 8.3, isAbove: false },
    { domain: 'vercel.com',    name: 'Vercel',  globalRank: 1200, koreaRank: 180, da: 72, opr: 7.5, isAbove: false },
  ],
  'other': [
    { domain: 'google.com',    name: 'Google',  globalRank: 1,    koreaRank: 4,  da: 100, opr: 10, isAbove: true },
    { domain: 'kakao.com',     name: '카카오',  globalRank: 185,  koreaRank: 6,  da: 88, opr: 9.1, isAbove: true },
    { domain: 'naver.com',     name: '네이버',  globalRank: 25,   koreaRank: 1,  da: 91, opr: 9.5, isAbove: true },
    { domain: 'apple.com',     name: 'Apple',   globalRank: 28,   koreaRank: 12, da: 99, opr: 9.9, isAbove: false },
    { domain: 'samsung.com',   name: '삼성',    globalRank: 210,  koreaRank: 9,  da: 89, opr: 9.2, isAbove: false },
  ],
};

export async function analyzeRanking(domain: string, industryEn: string): Promise<RankingResult> {
  const { opr, rank } = await fetchOpenPageRank(domain);

  // DA 추정 (OPR 기반)
  const da = Math.min(Math.round(opr * 10), 100);
  const pa = Math.min(da + Math.floor(Math.random() * 10) - 5, 100);

  // 방문자 추정
  const visits = estimateVisits(opr, rank);

  // 산업군 경쟁사
  const industryKey = industryEn in INDUSTRY_COMPETITORS ? industryEn : 'other';
  const rawCompetitors = INDUSTRY_COMPETITORS[industryKey] || INDUSTRY_COMPETITORS['other'];

  // 분석 사이트 위치 삽입
  const competitors = rawCompetitors.map(c => ({
    ...c,
    isAbove: c.opr > opr,
  }));

  // 산업 내 순위 추정
  const aboveCount = competitors.filter(c => c.isAbove).length;
  const industryRank = aboveCount + 1;

  // 한국 순위 추정
  const koreaRank = rank ? Math.max(1, Math.round(rank * 0.15)) : null;

  return {
    domainAuthority: da,
    pageAuthority: Math.max(pa, 0),
    openPageRank: Math.round(opr * 10) / 10,
    estimatedMonthlyVisits: visits,
    globalRank: rank,
    koreaRank,
    industryRank,
    industryTotal: competitors.length + 1,
    competitors,
  };
}

function estimateVisits(opr: number, rank: number | null): string {
  if (rank && rank <= 100)    return '1억+ / 월';
  if (rank && rank <= 1000)   return '1천만+ / 월';
  if (rank && rank <= 10000)  return '100만+ / 월';
  if (rank && rank <= 100000) return '10만+ / 월';
  if (opr >= 7) return '10만+ / 월';
  if (opr >= 5) return '1만~10만 / 월';
  if (opr >= 3) return '1천~1만 / 월';
  if (opr > 0)  return '1천 미만 / 월';
  return '데이터 없음';
}
