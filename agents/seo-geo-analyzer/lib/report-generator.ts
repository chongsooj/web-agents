import type { SeoResult } from './seo-analyzer';
import type { GeoResult } from './geo-analyzer';
import type { RankingResult } from './ranking';

export interface ReportIssue {
  priority: '높음' | '중간' | '낮음';
  title: string;
  plain: string;
  impact: string;
  fix: string;
}

export interface ReportBenchmark {
  domain: string;
  name: string;
  why: string;
  strengths: string[];
  lesson: string;
}

export interface AnalysisReport {
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  summary: string;
  issues: ReportIssue[];
  benchmark: ReportBenchmark | null;
  quickWins: string[];
}

export async function generateReport(
  url: string,
  seo: SeoResult,
  geo: GeoResult,
  ranking: RankingResult,
  apiKey: string,
): Promise<AnalysisReport | null> {
  try {
    const Groq = (await import('groq-sdk')).default;
    const groq = new Groq({ apiKey });

    const failedSeo = seo.items.filter(i => i.status !== 'good').map(i => `${i.label}: ${i.detail}`).join('\n');
    const failedGeo = geo.items.filter(i => i.status !== 'good').map(i => `${i.label}: ${i.detail}`).join('\n');
    const topCompetitor = [...(ranking.competitorsKorea ?? []), ...(ranking.competitorsGlobal ?? [])]
      .sort((a, b) => b.opr - a.opr)[0];

    const prompt = `당신은 SEO/GEO 전문 컨설턴트입니다. 다음 웹사이트 분석 결과를 바탕으로 비개발자 CEO/마케터가 이해할 수 있는 컨설팅 보고서를 작성하세요.

분석 대상: ${url}
산업군: ${geo.industry}
SEO 점수: ${seo.score}/100
GEO 점수: ${geo.score}/100
도메인 권위: ${ranking.domainAuthority}/100

SEO 문제점:
${failedSeo || '없음'}

GEO 문제점:
${failedGeo || '없음'}

최상위 경쟁사: ${topCompetitor ? `${topCompetitor.name} (${topCompetitor.domain}), OPR: ${topCompetitor.opr}` : '없음'}

다음 JSON 형식으로만 답하세요 (다른 텍스트 없이):
{
  "grade": "A|B|C|D|F 중 하나 (SEO+GEO 평균 기준)",
  "summary": "현재 상황을 CEO가 이해하는 말로 2~3문장 요약. 기술 용어 사용 금지.",
  "issues": [
    {
      "priority": "높음|중간|낮음",
      "title": "문제 제목 (15자 이내)",
      "plain": "비개발자가 이해하는 문제 설명 (2문장)",
      "impact": "이 문제가 매출/방문자에 미치는 영향 (1문장)",
      "fix": "구체적 해결 방법 (1~2문장, 기술 용어 최소화)"
    }
  ],
  "benchmark": {
    "domain": "경쟁사 도메인",
    "name": "경쟁사 이름",
    "why": "이 사이트를 벤치마킹해야 하는 이유 (1문장)",
    "strengths": ["잘하는 점 1", "잘하는 점 2", "잘하는 점 3"],
    "lesson": "우리 사이트에 바로 적용할 수 있는 핵심 교훈 (2문장)"
  },
  "quickWins": ["이번 주 안에 할 수 있는 것 1", "이번 주 안에 할 수 있는 것 2", "이번 주 안에 할 수 있는 것 3"]
}

주의사항:
- issues는 우선순위 높음 먼저, 최대 5개
- 기술 용어(canonical, JSON-LD 등) 대신 쉬운 말 사용
- 한국어로 작성
- benchmark는 실제 존재하는 ${geo.industry} 업종 최상위 사이트로`;

    const res = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    });

    const parsed = JSON.parse(res.choices[0].message.content || '{}');
    return {
      grade: parsed.grade || 'C',
      summary: parsed.summary || '',
      issues: Array.isArray(parsed.issues) ? parsed.issues.slice(0, 5) : [],
      benchmark: parsed.benchmark || null,
      quickWins: Array.isArray(parsed.quickWins) ? parsed.quickWins.slice(0, 3) : [],
    };
  } catch {
    return null;
  }
}
