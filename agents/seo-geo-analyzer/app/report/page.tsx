'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

const TOOLTIPS: Record<string, string> = {
  seo: '검색엔진 최적화(Search Engine Optimization). Google·Naver 등 검색엔진이 사이트를 잘 찾고 노출할 수 있도록 최적화하는 작업.',
  geo: '생성형 AI 검색 최적화(Generative Engine Optimization). ChatGPT·Perplexity·Gemini 같은 AI가 답변을 생성할 때 내 사이트를 인용하도록 최적화하는 작업.',
  opr: 'OpenPageRank. 도메인이 얼마나 많은 외부 링크를 받는지 측정하는 무료 지표. 0~10 점수로 표현.',
  da: '도메인 권위(Domain Authority). 검색엔진에서 해당 도메인이 얼마나 신뢰받는지 나타내는 점수(0~100). OPR 기반으로 추정.',
  eateat: 'E-E-A-T: 경험(Experience)·전문성(Expertise)·권위(Authoritativeness)·신뢰(Trustworthiness). Google이 콘텐츠 품질을 평가하는 핵심 기준.',
  canonical: '캐노니컬 태그. 중복 페이지가 있을 때 검색엔진에 "이 URL이 대표 페이지입니다"를 알려주는 HTML 태그.',
  og: 'Open Graph. SNS(카카오톡·페이스북 등)에 링크 공유 시 제목·이미지·설명이 예쁘게 표시되도록 하는 메타 태그.',
  schema: '구조화 데이터. 검색엔진이 콘텐츠를 이해하도록 JSON-LD 형식으로 작성한 부가 정보. 검색 결과에 별점·FAQ·가격 등 리치 스니펫으로 표시됨.',
  jsonld: 'JSON-LD. 구조화 데이터를 작성하는 표준 형식. <script type="application/ld+json"> 태그 안에 JSON으로 작성.',
  faq: 'FAQ 스키마. 자주 묻는 질문을 구조화 데이터로 표시하면 AI 검색이 답변 생성 시 인용할 가능성이 높아짐.',
  robots: 'robots.txt. 검색엔진 크롤러에게 "어떤 페이지를 수집해도 되는지" 알려주는 텍스트 파일.',
  sitemap: 'sitemap.xml. 사이트의 모든 페이지 목록을 검색엔진에 제출하는 XML 파일. 새 페이지 색인을 빠르게 도움.',
  lcp: 'LCP(Largest Contentful Paint). 페이지에서 가장 큰 콘텐츠가 로드되는 시간. 2.5초 이내가 좋음.',
  cls: 'CLS(Cumulative Layout Shift). 페이지 로딩 중 레이아웃이 얼마나 튀는지 측정. 0.1 이하가 좋음.',
};

function Tip({ id }: { id: string }) {
  const [show, setShow] = useState(false);
  const text = TOOLTIPS[id];
  if (!text) return null;
  return (
    <span className="relative inline-flex items-center ml-1" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <span className="w-3.5 h-3.5 rounded-full bg-[#2a2a4e] border border-[#3a3a5e] text-gray-400 text-[9px] flex items-center justify-center cursor-help select-none leading-none">?</span>
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-[#1a1a2e] border border-[#3a3a5e] text-gray-300 text-xs rounded-xl px-3 py-2 z-50 shadow-xl leading-relaxed pointer-events-none">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#3a3a5e]" />
        </span>
      )}
    </span>
  );
}

function ScoreRing({ score, size = 120, color = '#7c6ff7' }: { score: number; size?: number; color?: string }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#2a2a4e" strokeWidth={10} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={10}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1s ease' }} />
    </svg>
  );
}

function ScoreCard({ label, score, icon, color = '#7c6ff7' }: { label: string; score: number; icon: string; color?: string }) {
  const status = score >= 80 ? 'good' : score >= 50 ? 'warning' : 'poor';
  const statusColor = { good: '#4caf7d', warning: '#f59e0b', poor: '#e55' }[status];
  return (
    <div className="bg-[#1a1a2e] border border-[#2a2a4e] rounded-2xl p-6 flex flex-col items-center gap-3">
      <div className="relative">
        <ScoreRing score={score} color={color} />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl">{icon}</span>
          <span className="text-2xl font-bold text-white">{score}</span>
        </div>
      </div>
      <div className="text-center">
        <div className="font-semibold text-white">{label}</div>
        <div className="text-xs mt-1 font-medium" style={{ color: statusColor }}>
          {status === 'good' ? '우수' : status === 'warning' ? '개선 필요' : '취약'}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: 'good' | 'warning' | 'fail' }) {
  const map = { good: { bg: 'bg-green-500/10 text-green-400 border-green-500/20', label: '✓ 좋음' }, warning: { bg: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', label: '⚠ 주의' }, fail: { bg: 'bg-red-500/10 text-red-400 border-red-500/20', label: '✗ 개선' } };
  const s = map[status];
  return <span className={`text-xs px-2 py-0.5 rounded-full border ${s.bg}`}>{s.label}</span>;
}

const ITEM_TIP: Record<string, string> = {
  canonical: 'canonical', og: 'og', schema: 'schema', ld_json: 'jsonld',
  faq: 'faq', robots: 'robots', sitemap: 'sitemap', author: 'eateat',
};

function ItemRow({ item }: { item: { key: string; label: string; score: number; status: 'good' | 'warning' | 'fail'; detail: string } }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-[#2a2a4e] last:border-0">
      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: item.status === 'good' ? '#4caf7d' : item.status === 'warning' ? '#f59e0b' : '#e55' }} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white flex items-center">{item.label}<Tip id={ITEM_TIP[item.key] || ''} /></div>
        <div className="text-xs text-gray-500 truncate mt-0.5">{item.detail}</div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-16 h-1.5 bg-[#2a2a4e] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${item.score}%`, background: item.status === 'good' ? '#4caf7d' : item.status === 'warning' ? '#f59e0b' : '#e55' }} />
        </div>
        <span className="text-xs text-gray-400 w-8 text-right">{item.score}</span>
        <StatusBadge status={item.status} />
      </div>
    </div>
  );
}

function ReportContent() {
  const params = useSearchParams();
  const router = useRouter();
  const url = params.get('url') || '';
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rankView, setRankView] = useState<'korea' | 'global'>('korea');

  useEffect(() => {
    if (!url) return;
    fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) })
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); })
      .catch(() => setError('분석 중 오류가 발생했습니다.'))
      .finally(() => setLoading(false));
  }, [url]);

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center gap-4 text-white">
      <div className="w-16 h-16 border-4 border-[#7c6ff7]/30 border-t-[#7c6ff7] rounded-full animate-spin" />
      <p className="text-gray-400 text-lg">분석 중입니다...</p>
      <p className="text-gray-600 text-sm">{url}</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center gap-4 text-white">
      <div className="text-5xl">⚠️</div>
      <p className="text-xl">{error}</p>
      <button onClick={() => router.push('/')} className="bg-[#7c6ff7] px-6 py-3 rounded-xl mt-2">← 돌아가기</button>
    </div>
  );

  if (!data) return null;

  const { seo, geo, ranking, performance, overallScore, domain } = data;

  const radarData = [
    { subject: 'SEO', score: seo.score },
    { subject: 'GEO', score: geo.score },
    { subject: '속도', score: performance.mobile || 50 },
    { subject: '권위', score: ranking.domainAuthority },
    { subject: '신뢰', score: Math.round((seo.items.find((i: any) => i.key === 'https')?.score || 0) * 0.4 + (ranking.openPageRank * 6)) },
  ];

  const activeCompetitors = rankView === 'korea'
    ? (ranking.competitorsKorea?.length > 0 ? ranking.competitorsKorea : ranking.competitors)
    : (ranking.competitorsGlobal?.length > 0 ? ranking.competitorsGlobal : ranking.competitors);
  const competitorData = activeCompetitors.map((c: any) => ({ name: c.name, opr: c.opr, isTarget: false }));
  const targetBar = { name: domain, opr: ranking.openPageRank, isTarget: true };
  const allBars = [...competitorData, targetBar].sort((a: any, b: any) => b.opr - a.opr);

  const overallColor = overallScore >= 80 ? '#4caf7d' : overallScore >= 50 ? '#f59e0b' : '#e55';

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* 상단 바 */}
      <div className="sticky top-0 z-50 bg-[#0a0a0f]/90 backdrop-blur border-b border-[#2a2a4e] px-6 py-3 flex items-center gap-4">
        <button onClick={() => router.push('/')} className="text-gray-400 hover:text-white transition-colors text-sm">← 홈</button>
        <span className="text-gray-600">|</span>
        <span className="text-sm text-gray-400 truncate">{data.url}</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-600">산업군:</span>
          <span className="text-xs bg-[#7c6ff7]/15 border border-[#7c6ff7]/30 text-[#7c6ff7] px-2 py-1 rounded-full">{geo.industry}</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">

        {/* 종합 점수 */}
        <div className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border border-[#2a2a4e] rounded-3xl p-8 flex flex-col md:flex-row items-center gap-8">
          <div className="relative flex-shrink-0">
            <ScoreRing score={overallScore} size={160} color={overallColor} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-black" style={{ color: overallColor }}>{overallScore}</span>
              <span className="text-gray-400 text-sm">/ 100</span>
            </div>
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-1">{domain}</h1>
            {geo.summary && <p className="text-gray-400 mb-4">{geo.summary}</p>}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: '글로벌 순위', value: ranking.globalRank ? `#${ranking.globalRank.toLocaleString()}` : '데이터 없음', tip: '' },
                { label: '한국 순위', value: ranking.koreaRank ? `#${ranking.koreaRank.toLocaleString()}` : '데이터 없음', tip: '' },
                { label: '월 방문자', value: ranking.estimatedMonthlyVisits, tip: '' },
                { label: '도메인 권위', value: `${ranking.domainAuthority} / 100`, tip: 'da' },
              ].map(s => (
                <div key={s.label} className="bg-[#0a0a0f] rounded-xl p-3">
                  <div className="text-gray-500 text-xs mb-1 flex items-center">{s.label}{s.tip && <Tip id={s.tip} />}</div>
                  <div className="font-bold text-white">{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4개 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ScoreCard label="SEO" score={seo.score} icon="🔍" color="#7c6ff7" />
          <ScoreCard label="GEO" score={geo.score} icon="🤖" color="#06b6d4" />
          <ScoreCard label="도메인 권위" score={ranking.domainAuthority} icon="🏛️" color="#f59e0b" />
          <ScoreCard label="속도 (모바일)" score={performance.mobile || 50} icon="⚡" color="#4caf7d" />
        </div>

        {/* 레이더 + 산업 랭킹 */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* 레이더 차트 */}
          <div className="bg-[#1a1a2e] border border-[#2a2a4e] rounded-2xl p-6">
            <h2 className="font-bold text-lg mb-4">종합 분석 레이더</h2>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#2a2a4e" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#8890a4', fontSize: 13 }} />
                <Radar name="점수" dataKey="score" stroke="#7c6ff7" fill="#7c6ff7" fillOpacity={0.25} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* 산업군 랭킹 */}
          <div className="bg-[#1a1a2e] border border-[#2a2a4e] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">산업군 랭킹 비교 <span className="text-sm text-gray-500 font-normal">({geo.industry})</span></h2>
              <div className="flex bg-[#0a0a0f] rounded-lg p-0.5">
                <button onClick={() => setRankView('korea')} className={`text-xs px-3 py-1.5 rounded-md transition-colors ${rankView === 'korea' ? 'bg-[#7c6ff7] text-white' : 'text-gray-400 hover:text-white'}`}>🇰🇷 한국</button>
                <button onClick={() => setRankView('global')} className={`text-xs px-3 py-1.5 rounded-md transition-colors ${rankView === 'global' ? 'bg-[#7c6ff7] text-white' : 'text-gray-400 hover:text-white'}`}>🌍 글로벌</button>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={allBars} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" domain={[0, 10]} tick={{ fill: '#8890a4', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#e2e8f0', fontSize: 12 }} width={65} />
                <Tooltip formatter={(v: any) => [`OPR: ${v}`, '']} contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a4e', borderRadius: 8 }} />
                <Bar dataKey="opr" radius={[0, 4, 4, 0]}>
                  {allBars.map((entry, i) => (
                    <Cell key={i} fill={entry.isTarget ? '#7c6ff7' : '#2a2a4e'} stroke={entry.isTarget ? '#7c6ff7' : '#3a3a5e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-gray-600 mt-2 flex items-center gap-1">* OPR(OpenPageRank) 기준 · 높을수록 권위 있는 도메인<Tip id="opr" /></p>
          </div>
        </div>

        {/* 경쟁사 테이블 */}
        <div className="bg-[#1a1a2e] border border-[#2a2a4e] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg">유사 사이트 순위</h2>
            <div className="flex bg-[#0a0a0f] rounded-lg p-0.5">
              <button onClick={() => setRankView('korea')} className={`text-xs px-3 py-1.5 rounded-md transition-colors ${rankView === 'korea' ? 'bg-[#7c6ff7] text-white' : 'text-gray-400'}`}>🇰🇷 한국</button>
              <button onClick={() => setRankView('global')} className={`text-xs px-3 py-1.5 rounded-md transition-colors ${rankView === 'global' ? 'bg-[#7c6ff7] text-white' : 'text-gray-400'}`}>🌍 글로벌</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-[#2a2a4e]">
                  <th className="text-left pb-3 w-8">#</th>
                  <th className="text-left pb-3">사이트</th>
                  <th className="text-right pb-3"><span className="flex items-center justify-end gap-0.5">OPR<Tip id="opr" /></span></th>
                  <th className="text-right pb-3"><span className="flex items-center justify-end gap-0.5">DA<Tip id="da" /></span></th>
                  <th className="text-right pb-3">{rankView === 'korea' ? '한국 순위' : '글로벌 순위'}</th>
                  <th className="text-right pb-3">위치</th>
                </tr>
              </thead>
              <tbody>
                {[...activeCompetitors, {
                  domain, name: domain, opr: ranking.openPageRank, da: ranking.domainAuthority,
                  globalRank: ranking.globalRank, koreaRank: ranking.koreaRank, isAbove: false, isTarget: true,
                }].sort((a: any, b: any) => b.opr - a.opr).map((c: any, i: number) => (
                  <tr key={c.domain} className={`border-b border-[#2a2a4e] last:border-0 ${c.isTarget ? 'bg-[#7c6ff7]/5' : ''}`}>
                    <td className="py-3 text-gray-500">{i + 1}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${c.isTarget ? 'text-[#7c6ff7]' : 'text-white'}`}>{c.name}</span>
                        {c.isTarget && <span className="text-xs bg-[#7c6ff7]/20 text-[#7c6ff7] px-1.5 py-0.5 rounded">분석 대상</span>}
                      </div>
                      <span className="text-xs text-gray-500">{c.domain}</span>
                    </td>
                    <td className="py-3 text-right font-mono">{c.opr}</td>
                    <td className="py-3 text-right font-mono">{c.da}</td>
                    <td className="py-3 text-right font-mono text-gray-400">
                      {(rankView === 'korea' ? c.koreaRank : c.globalRank) ? `#${(rankView === 'korea' ? c.koreaRank : c.globalRank)?.toLocaleString()}` : '-'}
                    </td>
                    <td className="py-3 text-right">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${c.isTarget ? 'bg-[#7c6ff7]/10 border-[#7c6ff7]/30 text-[#7c6ff7]' : c.isAbove ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-gray-500/10 border-gray-500/20 text-gray-400'}`}>
                        {c.isTarget ? '분석 대상' : c.isAbove ? '↑ 상위' : '↓ 하위'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SEO 항목 */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-[#1a1a2e] border border-[#2a2a4e] rounded-2xl p-6">
            <h2 className="font-bold text-lg mb-1 flex items-center">🔍 SEO 상세<Tip id="seo" /></h2>
            <p className="text-gray-500 text-sm mb-4">검색엔진 최적화 점수: <span className="text-white font-bold">{seo.score}/100</span></p>
            <div>{seo.items.map((item: any) => <ItemRow key={item.key} item={item} />)}</div>
          </div>

          <div className="bg-[#1a1a2e] border border-[#2a2a4e] rounded-2xl p-6">
            <h2 className="font-bold text-lg mb-1 flex items-center">🤖 GEO 상세<Tip id="geo" /></h2>
            <p className="text-gray-500 text-sm mb-4">AI 검색 최적화 점수: <span className="text-white font-bold">{geo.score}/100</span></p>
            <div>{geo.items.map((item: any) => <ItemRow key={item.key} item={item} />)}</div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="text-center text-gray-600 text-xs pb-8">
          분석 시각: {new Date(data.analyzedAt).toLocaleString('ko-KR')} · 랭킹 데이터는 추정치입니다
        </div>
      </div>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white">로딩 중...</div>}>
      <ReportContent />
    </Suspense>
  );
}
