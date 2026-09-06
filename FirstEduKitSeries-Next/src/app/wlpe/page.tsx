"use client";
import { useState } from "react";

const SHEET_RE = /\((.+?)\)\s+(\d+-\d+)/;
const API = "https://firstedukitseries.onrender.com";

type Sheet = { name: string; gid: string };
type Target = { name: string; gid: string; classKey: string; weekLabel: string };

function getTargets(sheets: Sheet[], week: string, grades: string[]): Target[] {
  const seen = new Set<string>();
  const targets: Target[] = [];
  for (const s of sheets) {
    const m = SHEET_RE.exec(s.name);
    if (!m) continue;
    const [, wl, ck] = m;
    if (wl !== week || !grades.includes(ck.split("-")[0]) || seen.has(ck)) continue;
    seen.add(ck);
    targets.push({ ...s, classKey: ck, weekLabel: wl });
  }
  return targets.sort((a, b) => a.classKey.localeCompare(b.classKey));
}


export default function WLPEPage() {
  const [grades, setGrades] = useState<string[]>([]);
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [weeks, setWeeks] = useState<string[]>([]);
  const [week, setWeek] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [prevLoading, setPrevLoading] = useState<Record<string, boolean>>({});

  const toggleGrade = (g: string) =>
    setGrades(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);


  const loadSheets = async () => {
    if (!grades.length) return;
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/sheets`);
      const data = await res.json();
      setSheets(data.sheets);
      setWeeks(data.weeks);
      setWeek(data.weeks[0] || "");
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const loadPreview = async (t: Target) => {
    setPrevLoading(p => ({ ...p, [t.gid]: true }));
    try {
      const q = new URLSearchParams({ gid: t.gid });
      const res = await fetch(`${API}/export?${q}`);
      const blob = await res.blob();
      setPreviews(p => ({ ...p, [t.gid]: URL.createObjectURL(blob) }));
    } catch (e: any) { setError(e.message); }
    finally { setPrevLoading(p => ({ ...p, [t.gid]: false })); }
  };

  const exportAll = async () => {
    const ts = getTargets(sheets, week, grades);
    if (!ts.length) return;
    const gids = ts.map(t => t.gid).join(",");
    const names = ts.map(t => `${t.classKey}_${t.weekLabel}`).join(",");
    const res = await fetch(`${API}/export-all?gids=${encodeURIComponent(gids)}&names=${encodeURIComponent(names)}`);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `주간계획서_${week}.zip`;
    a.click();
  };

  const targets = getTargets(sheets, week, grades);

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="flex items-center gap-4 mb-6">
        <a href="/" className="text-gray-400 hover:text-white text-sm">← 홈</a>
        <h1 className="text-2xl font-bold">📋 Weekly Lesson Plan Export</h1>
      </div>

      {/* 학년 + 조회 */}
      <div className="flex gap-4 mb-4 items-center flex-wrap">
        {["1","2","3","4"].map(g => (
          <label key={g} className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={grades.includes(g)} onChange={() => toggleGrade(g)} className="w-4 h-4" />
            <span>{g}학년</span>
          </label>
        ))}
        <button onClick={loadSheets} disabled={loading || !grades.length}
          className="ml-4 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded disabled:opacity-40 text-sm">
          {loading ? "조회 중..." : "🔍 시트 조회"}
        </button>
      </div>


      {error && <p className="text-red-400 mb-4 text-sm">{error}</p>}

      {/* 주차 선택 */}
      {weeks.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-6">
          {weeks.map(w => (
            <button key={w} onClick={() => { setWeek(w); setPreviews({}); }}
              className={`px-3 py-1 rounded text-sm ${week === w ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"}`}>
              {w}
            </button>
          ))}
        </div>
      )}

      {targets.length > 0 && (
        <button onClick={exportAll}
          className="mb-4 px-4 py-2 bg-green-700 hover:bg-green-600 rounded text-sm font-semibold">
          📦 전체 JPG 저장 (ZIP)
        </button>
      )}

      {/* 반 카드 */}
      {targets.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {targets.map(t => (
            <div key={t.gid} className="bg-gray-800 rounded-xl p-4">
              <div className="font-bold text-lg">{t.classKey}</div>
              <div className="text-gray-400 text-sm mb-3">{t.weekLabel}</div>
              {previews[t.gid] ? (
                <>
                  <img src={previews[t.gid]} alt={t.classKey} className="w-full rounded mb-2" />
                  <a href={previews[t.gid]} download={`${t.classKey}_${t.weekLabel}.jpg`}
                    className="block text-center bg-blue-600 hover:bg-blue-500 rounded py-1.5 text-sm">
                    📥 JPG 저장
                  </a>
                </>
              ) : (
                <button onClick={() => loadPreview(t)} disabled={prevLoading[t.gid]}
                  className="w-full bg-gray-600 hover:bg-gray-500 rounded py-2 text-sm disabled:opacity-40">
                  {prevLoading[t.gid] ? "생성 중..." : "🖼️ 미리보기"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
