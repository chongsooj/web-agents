'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

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

function ItemRow({ item }: { item: { key: string; label: string; score: number; status: 'good' | 'warning' | 'fail'; detail: string } }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-[#2a2a4e] last:border-0">
      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: item.status === 'good' ? '#4caf7d' : item.status === 'warning' ? '#f59e0b' : '#e55' }} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white">{item.label}</div>
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

  const competitorData = ranking.competitors.map((c: any) => ({
    name: c.name,
    opr: c.opr,
    rank: rankView === 'korea' ? c.koreaRank : c.globalRank,
    isTarget: false,
  }));
  const targetBar = { name: domain, opr: ranking.openPageRank, rank: rankView === 'korea' ? ranking.koreaRank : ranking.globalRank, isTarget: true };
  const allBars = [...competitorData, targetBar].sort((a, b) => (a.opr > b.opr ? -1 : 1));

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
                { label: '글로벌 순위', value: ranking.globalRank ? `#${ranking.globalRank.toLocaleString()}` : '데이터 없음' },
                { label: '한국 순위', value: ranking.koreaRank ? `#${ranking.koreaRank.toLocaleString()}` : '데이터 없음' },
                { label: '월 방문자', value: ranking.estimatedMonthlyVisits },
                { label: '도메인 권위', value: `${ranking.domainAuthority} / 100` },
              ].map(s => (
                <div key={s.label} className="bg-[#0a0a0f] rounded-xl p-3">
                  <div className="text-gray-500 text-xs mb-1">{s.label}</div>
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
            <p className="text-xs text-gray-600 mt-2">* OPR(OpenPageRank) 기준 · 높을수록 권위 있는 도메인</p>
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
                  <th className="text-right pb-3">OPR</th>
                  <th className="text-right pb-3">DA</th>
                  <th className="text-right pb-3">{rankView === 'korea' ? '한국 순위' : '글로벌 순위'}</th>
                  <th className="text-right pb-3">위치</th>
                </tr>
              </thead>
              <tbody>
                {[...ranking.competitors, {
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
            <h2 className="font-bold text-lg mb-1">🔍 SEO 상세</h2>
            <p className="text-gray-500 text-sm mb-4">검색엔진 최적화 점수: <span className="text-white font-bold">{seo.score}/100</span></p>
            <div>{seo.items.map((item: any) => <ItemRow key={item.key} item={item} />)}</div>
          </div>

          <div className="bg-[#1a1a2e] border border-[#2a2a4e] rounded-2xl p-6">
            <h2 className="font-bold text-lg mb-1">🤖 GEO 상세</h2>
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
