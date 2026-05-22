'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!url || loading) return;
    setLoading(true);
    const target = url.startsWith('http') ? url : `https://${url}`;
    router.push(`/report?url=${encodeURIComponent(target)}`);
  }

  const examples = ['naver.com', 'coupang.com', 'toss.im', 'github.com', 'notion.so'];

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center px-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(124,111,247,0.15)_0%,transparent_60%)] pointer-events-none" />
      <div className="relative z-10 w-full max-w-2xl text-center">

        <div className="mb-10">
          <div className="inline-flex items-center gap-2 bg-[#7c6ff7]/10 border border-[#7c6ff7]/30 rounded-full px-4 py-1.5 text-sm text-[#7c6ff7] mb-6">
            ⚡ SEO + GEO 통합 분석
          </div>
          <h1 className="text-5xl font-bold mb-4 tracking-tight">
            내 사이트,<br />
            <span className="text-[#7c6ff7]">AI에게 보이나요?</span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            URL 하나로 SEO · GEO · 글로벌 랭킹을<br />한눈에 분석해드립니다
          </p>
        </div>

        <form onSubmit={handleAnalyze} className="mb-6">
          <div className="flex gap-3 bg-[#1a1a2e] border border-[#2a2a4e] rounded-2xl p-2 focus-within:border-[#7c6ff7] transition-colors">
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="flex-1 bg-transparent outline-none px-3 py-3 text-white placeholder-gray-500 text-lg"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !url}
              className="bg-[#7c6ff7] hover:bg-[#5a4fd4] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              {loading ? '분석 중...' : '🔍 분석 시작'}
            </button>
          </div>
        </form>

        <div className="flex flex-wrap justify-center gap-2 mb-12">
          <span className="text-gray-500 text-sm self-center">예시:</span>
          {examples.map(ex => (
            <button key={ex} onClick={() => setUrl(`https://${ex}`)}
              className="text-sm bg-[#1a1a2e] border border-[#2a2a4e] hover:border-[#7c6ff7] text-gray-300 hover:text-white px-3 py-1.5 rounded-full transition-colors">
              {ex}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: '🔍', title: 'SEO 분석', desc: '메타·구조·속도\n12개 항목' },
            { icon: '🤖', title: 'GEO 분석', desc: 'AI 검색 최적화\n10개 항목' },
            { icon: '🌍', title: '글로벌 랭킹', desc: '한국·전세계\n순위 비교' },
            { icon: '🏭', title: '산업군 비교', desc: '유사 사이트\n상·하위 랭킹' },
          ].map(f => (
            <div key={f.title} className="bg-[#1a1a2e] border border-[#2a2a4e] rounded-xl p-4 text-center">
              <div className="text-2xl mb-2">{f.icon}</div>
              <div className="font-semibold text-sm mb-1">{f.title}</div>
              <div className="text-gray-500 text-xs whitespace-pre-line">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
