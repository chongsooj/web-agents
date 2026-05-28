// 도메인 권위·랭킹 데이터

export interface RankingResult {
  domainAuthority: number;
  pageAuthority: number;
  openPageRank: number;
  estimatedMonthlyVisits: string;
  globalRank: number | null;
  koreaRank: number | null;
  industryRank: number | null;
  industryTotal: number;
  competitors: Competitor[];
  competitorsKorea: Competitor[];
  competitorsGlobal: Competitor[];
}

export interface Competitor {
  domain: string;
  name: string;
  globalRank: number | null;
  koreaRank: number | null;
  da: number;
  opr: number;
  isAbove: boolean;
}

// OpenPageRank 배치 조회
async function fetchOpenPageRankBatch(domains: string[]): Promise<Record<string, { opr: number; rank: number | null }>> {
  const result: Record<string, { opr: number; rank: number | null }> = {};
  domains.forEach(d => { result[d] = { opr: 0, rank: null }; });
  try {
    const query = domains.map(d => `domains[]=${encodeURIComponent(d)}`).join('&');
    const res = await fetch(
      `https://openpagerank.com/api/v1.0/getPageRank?${query}`,
      { headers: { 'API-OPR': process.env.OPEN_PAGE_RANK_API_KEY || '' }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return result;
    const data = await res.json();
    for (const item of data.response ?? []) {
      if (item.domain) result[item.domain] = { opr: item.page_rank_decimal ?? 0, rank: item.rank ?? null };
    }
  } catch {}
  return result;
}

function buildCompetitors(metas: { domain: string; name: string }[], oprData: Record<string, { opr: number; rank: number | null }>, targetOpr: number): Competitor[] {
  return metas.map(c => {
    const live = oprData[c.domain] ?? { opr: 0, rank: null };
    return {
      domain: c.domain,
      name: c.name,
      globalRank: live.rank,
      koreaRank: live.rank ? Math.max(1, Math.round(live.rank * 0.15)) : null,
      da: Math.min(Math.round(live.opr * 10), 100),
      opr: Math.round(live.opr * 10) / 10,
      isAbove: live.opr > targetOpr,
    };
  });
}

export async function analyzeRanking(
  domain: string,
  industryEn: string,
  koreaList?: { domain: string; name: string }[],
  globalList?: { domain: string; name: string }[],
): Promise<RankingResult> {
  const fallback = FALLBACK_COMPETITORS[industryEn] ?? FALLBACK_COMPETITORS['other'];
  const koreaMeta = (koreaList && koreaList.length > 0) ? koreaList : fallback;
  const globalMeta = (globalList && globalList.length > 0) ? globalList : fallback;

  // 대상 + 한국 + 글로벌 전부 OPR 배치 조회
  const allDomains = [...new Set([domain, ...koreaMeta.map(c => c.domain), ...globalMeta.map(c => c.domain)])];
  const oprData = await fetchOpenPageRankBatch(allDomains);

  const { opr, rank } = oprData[domain] ?? { opr: 0, rank: null };
  const da = Math.min(Math.round(opr * 10), 100);

  const competitorsKorea = buildCompetitors(koreaMeta, oprData, opr);
  const competitorsGlobal = buildCompetitors(globalMeta, oprData, opr);
  const competitors = competitorsKorea; // 기본값 (레거시 호환)

  const aboveCount = competitorsKorea.filter(c => c.isAbove).length;
  const koreaRank = rank ? Math.max(1, Math.round(rank * 0.15)) : null;

  return {
    domainAuthority: da,
    pageAuthority: Math.max(Math.min(da + Math.floor(Math.random() * 10) - 5, 100), 0),
    openPageRank: Math.round(opr * 10) / 10,
    estimatedMonthlyVisits: estimateVisits(opr, rank),
    globalRank: rank,
    koreaRank,
    industryRank: aboveCount + 1,
    industryTotal: competitorsKorea.length + 1,
    competitors,
    competitorsKorea,
    competitorsGlobal,
  };
}

// Gemini 실패 시 폴백용 기본 경쟁사
const FALLBACK_COMPETITORS: Record<string, { domain: string; name: string }[]> = {
  ecommerce:  [{ domain: 'amazon.com', name: 'Amazon' }, { domain: 'coupang.com', name: '쿠팡' }, { domain: 'gmarket.co.kr', name: 'G마켓' }, { domain: '11st.co.kr', name: '11번가' }, { domain: 'auction.co.kr', name: '옥션' }],
  finance:    [{ domain: 'kbstar.com', name: 'KB국민' }, { domain: 'shinhan.com', name: '신한' }, { domain: 'toss.im', name: '토스' }, { domain: 'kakaobank.com', name: '카카오뱅크' }, { domain: 'ibk.co.kr', name: 'IBK' }],
  media:      [{ domain: 'naver.com', name: '네이버' }, { domain: 'daum.net', name: '다음' }, { domain: 'chosun.com', name: '조선일보' }, { domain: 'joins.com', name: '중앙일보' }, { domain: 'donga.com', name: '동아일보' }],
  education:  [{ domain: 'coursera.org', name: 'Coursera' }, { domain: 'udemy.com', name: 'Udemy' }, { domain: 'ebs.co.kr', name: 'EBS' }, { domain: 'classu.co.kr', name: '클래스유' }, { domain: 'megastudy.net', name: '메가스터디' }],
  travel:     [{ domain: 'booking.com', name: 'Booking' }, { domain: 'airbnb.com', name: 'Airbnb' }, { domain: 'yanolja.com', name: '야놀자' }, { domain: 'goodchoice.kr', name: '여기어때' }, { domain: 'hanatour.com', name: '하나투어' }],
  it_saas:    [{ domain: 'github.com', name: 'GitHub' }, { domain: 'notion.so', name: 'Notion' }, { domain: 'slack.com', name: 'Slack' }, { domain: 'figma.com', name: 'Figma' }, { domain: 'vercel.com', name: 'Vercel' }],
  health:     [{ domain: 'amc.seoul.kr', name: '서울아산' }, { domain: 'snuh.org', name: '서울대병원' }, { domain: 'severance.or.kr', name: '세브란스' }, { domain: 'webmd.com', name: 'WebMD' }, { domain: 'healthline.com', name: 'Healthline' }],
  food:       [{ domain: 'baemin.com', name: '배달의민족' }, { domain: 'coupangeats.com', name: '쿠팡이츠' }, { domain: 'yogiyo.co.kr', name: '요기요' }, { domain: 'doordash.com', name: 'DoorDash' }, { domain: 'ubereats.com', name: 'Uber Eats' }],
  other:      [{ domain: 'naver.com', name: '네이버' }, { domain: 'kakao.com', name: '카카오' }, { domain: 'google.com', name: 'Google' }, { domain: 'samsung.com', name: '삼성' }, { domain: 'apple.com', name: 'Apple' }],
};

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
