"use client";

import { useEffect, useState } from "react";

/* ---------- 표준 트리 ---------- */
const STANDARDS: Record<string, Record<string, string[]>> = {
  "TEKS (Texas)": {
    "Movement Patterns and Skills": ["Locomotor", "Non-locomotor", "Manipulative"],
    "Health-Related Fitness": ["Cardiovascular", "Muscular Strength", "Flexibility"],
    "Social Development": ["Cooperation", "Rules and Etiquette", "Self-management"],
    "Movement Concepts": ["Space Awareness", "Effort", "Relationships"],
  },
  "SHAPE America": {
    "Motor Skills and Movement Patterns": ["Locomotor", "Non-locomotor", "Manipulative"],
    "Movement Concepts and Strategies": ["Space Awareness", "Effort", "Relationships/Tactics"],
    "Health-Enhancing Fitness": ["Cardiorespiratory Endurance", "Muscular Strength/Endurance", "Flexibility"],
    "Responsible Personal and Social Behavior": ["Rules and Etiquette", "Working with Others", "Safety"],
    "Value of Physical Activity": ["Health", "Challenge", "Self-Expression/Social Interaction"],
  },
  "California": {
    "Motor Skills": ["Locomotor", "Non-locomotor", "Manipulative"],
    "Movement Concepts, Principles, Strategies": ["Movement Concepts", "Game Strategy"],
    "Physical Fitness": ["Fitness Knowledge", "Fitness Assessment"],
    "Psychological/Sociological Concepts": ["Self-responsibility", "Social Interaction", "Group Dynamics"],
  },
  "Ontario (Canada)": {
    "Active Living": ["Active Participation", "Physical Fitness", "Safety"],
    "Movement Competence": ["Skills and Concepts", "Movement Strategies"],
    "Healthy Living": ["Understanding Health Concepts", "Making Healthy Choices", "Making Connections for Healthy Living"],
  },
  "IB PYP/MYP": {
    "Active Living": ["Effects of Exercise", "Fitness Choices", "Safety"],
    "Games/Adventure Challenges": ["Individual Skills", "Team Strategy/Cooperation"],
    "Health and Wellbeing": ["Nutrition", "Growth and Development", "Relationships"],
    "Identity": ["Self-awareness through Movement", "Body Systems"],
  },
  "2022 개정 체육과 교육과정": {
    "운동": ["체력 운동", "동작 도전", "동작 표현"],
    "스포츠": ["기술형 스포츠", "전략형 스포츠", "생태형 스포츠"],
    "표현": ["표현 활동", "리듬 활동"],
    "안전": ["신체 안전", "안전 수칙 및 대처"],
  },
};
const SLOTS = ["웜업", "태깅게임", "메인1", "메인2", "마무리"];

type Activity = {
  id: string; name: string; slot: string; default_minutes: number;
  teks_subcategory: string; tags: string[]; equipment: string[];
  description: string; steps: string[]; scoring: string; source: string;
};

const SEED: Activity[] = [
  { id: "act_001", name: "딱지치기", slot: "메인", default_minutes: 15, teks_subcategory: "Manipulative",
    tags: ["한국전통놀이", "손기술", "순환형"], equipment: ["딱지"],
    description: "완성된 딱지로 자유 순환, 짝 바꿔가며 계속 움직이게 진행", steps: [], scoring: "", source: "" },
  { id: "act_002", name: "사방치기", slot: "메인", default_minutes: 15, teks_subcategory: "Locomotor",
    tags: ["한국전통놀이", "점프", "스테이션형"], equipment: ["바닥테이프"],
    description: "칸 그려진 곳에서 순서대로, 스테이션 여러 개로 대기 없이 진행", steps: [], scoring: "", source: "" },
  { id: "act_003", name: "한국 전통팽이 돌리기", slot: "메인", default_minutes: 15, teks_subcategory: "Manipulative",
    tags: ["한국전통놀이", "손목", "개인연습"], equipment: ["전통팽이", "팽이채"],
    description: "손으로 돌리기 → 채로 유지하기, 개인차 크므로 연습 시간 넉넉히", steps: [], scoring: "", source: "" },
  { id: "act_004", name: "투호 (폴리스팟 3단계)", slot: "메인", default_minutes: 15, teks_subcategory: "Manipulative",
    tags: ["한국전통놀이", "던지기", "단계형", "스테이션형"], equipment: ["폴리스팟", "콩주머니", "콘"],
    description: "가까이/중간/멀리 3단계 배치, 30초 안에 득점 많이 하기", steps: [], scoring: "", source: "" },
  { id: "act_005", name: "한국 고무줄놀이 (밴드형 티니클링)", slot: "메인", default_minutes: 15, teks_subcategory: "Non-locomotor",
    tags: ["한국전통놀이", "리듬", "단계형"], equipment: ["티니클링밴드"],
    description: "발목→무릎→허벅지→허리 단계별, 넘기/감기 동작", steps: [], scoring: "", source: "" },
];

type Config = { apiKey: string; defaultEffort: string; standard: string; formUrl: string; formEntry: string };
const DEFAULT_CONFIG: Config = { apiKey: "", defaultEffort: "자세히", standard: "TEKS (Texas)", formUrl: "", formEntry: "" };

function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    const raw = localStorage.getItem(key);
    if (raw) { try { setValue(JSON.parse(raw)); } catch {} }
  }, [key]);
  useEffect(() => { localStorage.setItem(key, JSON.stringify(value)); }, [key, value]);
  return [value, setValue] as const;
}

const card = "bg-[#1e2f26] border border-[#33493c] rounded-xl p-4 mb-4";
const label = "block text-xs text-[#9fb3a7] mt-3 mb-1";
const input = "w-full bg-[#24382d] border border-[#33493c] rounded-md px-3 py-2 text-sm text-[#eef3ef]";
const btn = "bg-[#7fb88a] text-[#0f1a14] rounded-md px-4 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50";
const btnSecondary = "bg-[#24382d] border border-[#33493c] text-[#eef3ef] rounded-md px-4 py-2 text-sm hover:opacity-90";
const tagChip = "inline-block bg-[#24382d] text-[#c9a15a] border border-[#33493c] rounded-full px-2 py-0.5 text-[11px] mr-1 mb-1";

export default function LPExplorerPage() {
  const [activities, setActivities] = useLocalStorage<Activity[]>("lpx_activities", SEED);
  const [cfg, setCfg] = useLocalStorage<Config>("lpx_config", DEFAULT_CONFIG);
  const [tab, setTab] = useState<"db" | "wizard" | "record" | "community" | "settings">("db");
  const [toastMsg, setToastMsg] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/lp-explorer/me").then((r) => r.json()).then((d) => setUserEmail(d.email)).catch(() => {});
  }, []);

  const toast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(""), 2200); };
  const allTags = [...new Set(activities.flatMap((a) => a.tags))].sort();
  const tree = STANDARDS[cfg.standard] || STANDARDS["TEKS (Texas)"];
  const subcats = Object.values(tree).flat();

  const filteredActivities = search
    ? activities.filter((a) => a.name.includes(search) || a.description.includes(search) || a.tags.some((t) => t.includes(search)))
    : activities;
  const selected = activities.find((a) => a.id === selectedId) || null;

  function attachTag(activityId: string, tag: string) {
    setActivities((prev) => prev.map((a) => (a.id === activityId && !a.tags.includes(tag) ? { ...a, tags: [...a.tags, tag] } : a)));
    toast(`'${tag}' 태그가 부착되었습니다`);
  }

  return (
    <div className="min-h-screen bg-[#16221c] text-[#eef3ef] font-sans text-sm">
      <header className="px-6 py-4 border-b border-[#33493c] flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-semibold tracking-tight">Lesson Plan Explorer</h1>
          <div className="text-[12px] text-[#9fb3a7] mt-0.5">개인 데이터는 브라우저에, 공개 활동만 서버에 저장됩니다</div>
        </div>
        <div className="text-[12px] text-[#9fb3a7]">
          {userEmail ? `${userEmail}로 로그인됨` : <a href="/login" className="underline">Google로 로그인</a>}
        </div>
      </header>

      <nav className="px-6 flex gap-1 border-b border-[#33493c]">
        {([
          ["db", "DB 관리"], ["wizard", "위저드"], ["record", "오늘 수업 기록"], ["community", "커뮤니티"], ["settings", "설정"],
        ] as const).map(([key, label_]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3.5 py-2.5 text-[13px] border-b-2 ${tab === key ? "border-[#7fb88a] text-[#eef3ef]" : "border-transparent text-[#9fb3a7]"}`}
          >
            {label_}
          </button>
        ))}
      </nav>

      <main className="px-6 py-5 max-w-3xl mx-auto">
        {tab === "db" && (
          <DBView
            tree={tree}
            activities={filteredActivities}
            allActivities={activities}
            allTags={allTags}
            search={search}
            setSearch={setSearch}
            selected={selected}
            onSelect={setSelectedId}
            onDropTag={(id, tag) => attachTag(id, tag)}
          />
        )}
        {tab === "wizard" && <WizardView activities={activities} allTags={allTags} />}
        {tab === "record" && (
          <RecordView
            cfg={cfg}
            subcats={subcats}
            userEmail={userEmail}
            onRegister={(a) => { setActivities((prev) => [...prev, a]); toast(`'${a.name}' 활동이 등록되었습니다.`); }}
            toast={toast}
          />
        )}
        {tab === "community" && <CommunityView toast={toast} onImport={(a) => { setActivities((prev) => [...prev, { ...a, id: "act_" + Date.now() }]); toast(`'${a.name}' 활동을 내 목록에 추가했습니다.`); }} />}
        {tab === "settings" && (
          <SettingsView cfg={cfg} onSave={(c) => { setCfg(c); toast("설정이 저장되었습니다."); }} toast={toast} />
        )}
      </main>

      {toastMsg && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-[#24382d] border border-[#33493c] px-4 py-2.5 rounded-lg text-[13px]">
          {toastMsg}
        </div>
      )}
    </div>
  );
}

/* ---------- DB 관리 ---------- */
function DBView({
  tree, activities, allTags, search, setSearch, selected, onSelect, onDropTag,
}: {
  tree: Record<string, string[]>; activities: Activity[]; allActivities: Activity[]; allTags: string[];
  search: string; setSearch: (v: string) => void; selected: Activity | null;
  onSelect: (id: string) => void; onDropTag: (id: string, tag: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  return (
    <>
      <div className={card}>
        <h2 className="text-[13px] text-[#9fb3a7] font-medium mb-3">표준 트리</h2>
        {Object.entries(tree).map(([major, minors]) => (
          <div key={major} className="mb-1.5">
            <strong>{major}</strong>{" "}
            {minors.map((m) => (
              <span key={m} className={tagChip + " cursor-pointer"} onClick={() => setSearch("")}>{m}</span>
            ))}
          </div>
        ))}
      </div>

      <div className={card}>
        <h2 className="text-[13px] text-[#9fb3a7] font-medium mb-3">활동 검색</h2>
        <input className={input} placeholder="활동 검색 (예: 딱지)" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="mt-3 space-y-2">
          {activities.length === 0 && <div className="text-[#9fb3a7]">활동이 없습니다</div>}
          {activities.map((a) => (
            <div key={a.id} onClick={() => onSelect(a.id)}
              className="border border-[#33493c] rounded-lg px-3 py-2.5 cursor-pointer hover:border-[#7fb88a]">
              <div className="font-semibold">[{a.slot}] {a.name}</div>
              <div className="mt-1">{a.tags.map((t) => <span key={t} className={tagChip}>{t}</span>)}</div>
            </div>
          ))}
        </div>
      </div>

      <div
        className={card + (dragOver ? " outline outline-2 outline-[#7fb88a] outline-offset-2" : "")}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault(); setDragOver(false);
          const tag = e.dataTransfer.getData("text/plain");
          if (tag && selected) onDropTag(selected.id, tag);
        }}
      >
        <h2 className="text-[13px] text-[#9fb3a7] font-medium mb-3">선택한 활동 상세 (태그를 여기로 드래그)</h2>
        {!selected && <div className="text-[#9fb3a7]">활동을 클릭하세요</div>}
        {selected && (
          <div className="whitespace-pre-wrap leading-relaxed">
            {`[${selected.slot}] ${selected.name} (${selected.default_minutes}분)\n\n`}
            {`설명: ${selected.description}\n\n`}
            {selected.steps.length > 0 && `진행 순서:\n${selected.steps.map((s) => "- " + s).join("\n")}\n\n`}
            {selected.scoring && `승부/평가 방식: ${selected.scoring}\n\n`}
            {`준비물: ${selected.equipment.join(", ")}\n\n`}
            {`태그: ${selected.tags.join(", ")}`}
            {selected.source && `\n\n출처: ${selected.source}`}
          </div>
        )}
      </div>

      <div className={card}>
        <h2 className="text-[13px] text-[#9fb3a7] font-medium mb-3">태그 팔레트</h2>
        {allTags.map((tag) => (
          <span key={tag} className={tagChip + " cursor-grab"} draggable
            onDragStart={(e) => e.dataTransfer.setData("text/plain", tag)}>
            {tag}
          </span>
        ))}
      </div>
    </>
  );
}

/* ---------- 위저드 ---------- */
function WizardView({ activities, allTags }: { activities: Activity[]; allTags: string[] }) {
  const [mode, setMode] = useState<"rec" | "free">("rec");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [choice, setChoice] = useState<Record<string, { id: string; minutes: number }>>({});
  const [preview, setPreview] = useState("");

  function candidatesFor(slot: string) {
    const base = slot === "메인1" || slot === "메인2" ? "메인" : slot;
    let pool = activities.filter((a) => a.slot === base);
    if (selectedTags.length) {
      pool = [...pool].sort(
        (a, b) => selectedTags.filter((t) => b.tags.includes(t)).length - selectedTags.filter((t) => a.tags.includes(t)).length
      );
    }
    return pool;
  }

  const total = SLOTS.reduce((sum, slot) => sum + (choice[slot]?.minutes || 0), 0);

  function toggleTag(tag: string) {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  function buildPreview() {
    const lines = [`[${mode === "rec" ? "추천 모드" : "자유 모드"}] 레슨플랜 초안`, ""];
    SLOTS.forEach((slot) => {
      const pick = choice[slot];
      const a = activities.find((x) => x.id === pick?.id);
      if (a) {
        lines.push(`■ ${slot} (${pick.minutes}분): ${a.name}`);
        lines.push(`   - ${a.description}`);
        lines.push(`   - 준비물: ${a.equipment.join(", ")}`);
      } else lines.push(`■ ${slot}: (미선택)`);
    });
    setPreview(lines.join("\n"));
  }

  return (
    <>
      <div className={card}>
        <h2 className="text-[13px] text-[#9fb3a7] font-medium mb-3">체육 지도 경력</h2>
        <label className="block mb-1"><input type="radio" checked={mode === "rec"} onChange={() => setMode("rec")} /> 추천 (정해진 틀 안에서 진행)</label>
        <label className="block"><input type="radio" checked={mode === "free"} onChange={() => setMode("free")} /> 자유 (템플릿만 빌려 자율 진행)</label>
      </div>

      <div className={card}>
        <h2 className="text-[13px] text-[#9fb3a7] font-medium mb-3">이번 주 주제 태그 선택</h2>
        {allTags.map((tag) => (
          <label key={tag} className="inline-block mr-3">
            <input type="checkbox" checked={selectedTags.includes(tag)} onChange={() => toggleTag(tag)} /> {tag}
          </label>
        ))}
      </div>

      <div className={card}>
        <h2 className="text-[13px] text-[#9fb3a7] font-medium mb-3">슬롯별 활동 선택</h2>
        {SLOTS.map((slot) => {
          const cands = candidatesFor(slot);
          const current = choice[slot];
          return (
            <div key={slot} className="flex gap-2.5 items-center mb-2">
              <div className="w-20 shrink-0">{slot}</div>
              <select
                className={input}
                value={current?.id || ""}
                onChange={(e) => {
                  const a = activities.find((x) => x.id === e.target.value);
                  setChoice((prev) => ({ ...prev, [slot]: { id: e.target.value, minutes: a?.default_minutes || 0 } }));
                }}
              >
                <option value="">{cands.length ? "선택" : "(등록된 활동 없음)"}</option>
                {cands.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <input
                type="number" className={input + " w-20 shrink-0"}
                value={current?.minutes || 0}
                onChange={(e) => setChoice((prev) => ({ ...prev, [slot]: { id: prev[slot]?.id || "", minutes: Number(e.target.value) } }))}
              />
            </div>
          );
        })}
        <div className="text-[#c9a15a] mt-2">총 시간: {total}분</div>
      </div>

      <button className={btn} onClick={buildPreview}>미리보기 생성</button>
      <div className={card + " mt-3 whitespace-pre-wrap"}>{preview || <span className="text-[#9fb3a7]">미리보기 결과가 여기 표시됩니다</span>}</div>
    </>
  );
}

/* ---------- 오늘 수업 기록 ---------- */
function RecordView({
  cfg, subcats, userEmail, onRegister, toast,
}: { cfg: Config; subcats: string[]; userEmail: string | null; onRegister: (a: Activity) => void; toast: (m: string) => void }) {
  const [raw, setRaw] = useState("");
  const [source, setSource] = useState("");
  const [effort, setEffort] = useState(cfg.defaultEffort);
  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [form, setForm] = useState({
    name: "", slot: "메인", teks_subcategory: "", minutes: 15,
    tags: "", desc: "", steps: "", scoring: "", equip: "",
  });

  async function generate() {
    if (!raw.trim()) { toast("오늘 수업 메모를 먼저 적어주세요."); return; }
    if (!cfg.apiKey) { toast("설정 탭에서 API 키를 먼저 입력하세요."); return; }
    setLoading(true);
    try {
      let prompt: string;
      if (effort === "원문") {
        prompt = `다음은 체육 교사가 오늘 진행한 수업에 대해 적은 메모야. 이 활동을 다른 교사가 그대로 따라 할 수 있게 자유롭게 자세히 설명해줘 (진행 방법, 규칙, 승부/평가 방식 포함).\n\n메모: ${raw}`;
      } else {
        const guide: Record<string, string> = {
          "간단": "steps와 scoring은 한두 줄로 짧게.",
          "중간": "steps는 필요한 만큼(보통 3~6개), scoring도 이해되게 구체적으로.",
          "자세히": "steps는 순서/규칙/예외 상황까지 최대한 자세히, scoring도 구체적 기준까지.",
        };
        prompt = `다음은 체육 교사가 오늘 진행한 수업에 대해 적은 메모야. 이걸 레슨플랜 DB에 등록할 새 활동 항목으로 구조화해줘. 메모에 있는 내용(진행 순서, 규칙, 승부/평가 방식 등)을 빠짐없이 담아줘. ${guide[effort] || ""} 반드시 아래 JSON 형식만 출력하고 다른 텍스트는 넣지 마 (없는 필드는 빈 값):\n{"name": "활동명", "slot": "웜업|태깅게임|메인|마무리 중 하나", "teks_subcategory": "다음 중 하나: ${subcats.join(", ")}", "tags": ["태그1", "태그2"], "default_minutes": 15, "description": "한 줄 요약", "steps": ["진행 순서"], "scoring": "승부/평가 방식", "equipment": ["준비물"]}\n\n메모: ${raw}`;
      }
      const parts: any[] = [];
      if (source && (source.includes("youtube.com") || source.includes("youtu.be"))) parts.push({ file_data: { file_uri: source } });
      parts.push({ text: prompt });

      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${cfg.apiKey}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts }] }),
      });
      if (!resp.ok) throw new Error(`${resp.status} 오류: ${await resp.text()}`);
      const data = await resp.json();
      const text: string = data.candidates[0].content.parts[0].text;

      let result: any;
      if (effort === "원문") {
        result = { name: "", slot: "메인", teks_subcategory: "", tags: [], default_minutes: 15, description: text.trim(), steps: [], scoring: "", equipment: [] };
      } else {
        const cleaned = text.trim().replace(/^```json/, "").replace(/^```/, "").replace(/```$/, "").trim();
        result = JSON.parse(cleaned);
      }
      setForm({
        name: result.name || "", slot: result.slot || "메인", teks_subcategory: result.teks_subcategory || subcats[0] || "",
        minutes: result.default_minutes || 15, tags: (result.tags || []).join(", "), desc: result.description || "",
        steps: (result.steps || []).join("\n"), scoring: result.scoring || "", equip: (result.equipment || []).join(", "),
      });
      setShowResult(true);
    } catch (err: any) {
      toast(err.message);
    } finally {
      setLoading(false);
    }
  }

  function buildActivity(): Activity | null {
    if (!form.name.trim()) { toast("활동명을 입력하세요."); return null; }
    return {
      id: "act_" + Date.now(), name: form.name.trim(), slot: form.slot, teks_subcategory: form.teks_subcategory,
      default_minutes: Number(form.minutes) || 15,
      tags: form.tags.split(",").map((s) => s.trim()).filter(Boolean),
      equipment: form.equip.split(",").map((s) => s.trim()).filter(Boolean),
      description: form.desc.trim(),
      steps: form.steps.split("\n").map((s) => s.trim()).filter(Boolean),
      scoring: form.scoring.trim(), source: source.trim(),
    };
  }

  function reset() {
    setRaw(""); setSource(""); setShowResult(false);
    setForm({ name: "", slot: "메인", teks_subcategory: "", minutes: 15, tags: "", desc: "", steps: "", scoring: "", equip: "" });
  }

  async function sendToGoogleForm() {
    const activity = buildActivity();
    if (!activity) return;
    if (!cfg.formUrl || !cfg.formEntry) { toast("설정에서 구글 폼 URL/entry ID를 먼저 저장하세요."); return; }
    const body = new URLSearchParams();
    body.append(cfg.formEntry, JSON.stringify(activity));
    await fetch(cfg.formUrl, { method: "POST", mode: "no-cors", body });
    toast(`'${activity.name}' 활동을 구글 폼으로 보냈습니다.`);
  }

  async function publishToCommunity() {
        const activity = buildActivity();
        if (!activity) return;
        if (!userEmail) { toast("커뮤니티 공개는 로그인 후 가능합니다."); return; }
        try {
                const resp = await fetch("/api/lp-explorer", {
                          method: "POST", headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ ...activity, is_public: true }),
                });
                const json = await resp.json().catch(() => ({}));
                if (!resp.ok) { toast(`공개 실패 (${resp.status}): ${json.error || "알 수 없는 오류"}`); return; }
      toast(`'${activity.name}' 활동을 커뮤니티에 공개했습니다.`);
        } catch (err: any) {
                toast("공개 실패 (네트워크): " + (err?.message || String(err)));
        }
  }
  return (
    <>
      <div className={card}>
        <h2 className="text-[13px] text-[#9fb3a7] font-medium mb-3">오늘 한 수업을 자유롭게 적어주세요</h2>
        <textarea className={input + " min-h-[80px]"} placeholder="예: 딱지치기 30명 순환으로 진행, 다들 재밌어함, 15분 정도 걸림"
          value={raw} onChange={(e) => setRaw(e.target.value)} />
        <div className="flex gap-2.5 mt-2">
          <div className="flex-1">
            <label className={label}>출처 (선택, 유튜브 URL 가능)</label>
            <input className={input} placeholder="https://youtube.com/..." value={source} onChange={(e) => setSource(e.target.value)} />
          </div>
          <div className="w-36 shrink-0">
            <label className={label}>노력</label>
            <select className={input} value={effort} onChange={(e) => setEffort(e.target.value)}>
              <option>간단</option><option>중간</option><option>자세히</option><option>원문</option>
            </select>
          </div>
        </div>
        <button className={btn + " mt-3"} disabled={loading} onClick={generate}>{loading ? "정리 중..." : "AI로 정리하기"}</button>
      </div>

      {showResult && (
        <div className={card}>
          <h2 className="text-[13px] text-[#9fb3a7] font-medium mb-3">결과 (수정 가능)</h2>
          <label className={label}>활동명</label>
          <input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="flex gap-2.5">
            <div className="flex-1">
              <label className={label}>슬롯</label>
              <select className={input} value={form.slot} onChange={(e) => setForm({ ...form, slot: e.target.value })}>
                <option>웜업</option><option>태깅게임</option><option>메인</option><option>마무리</option>
              </select>
            </div>
            <div className="flex-1">
              <label className={label}>TEKS 소분류</label>
              <select className={input} value={form.teks_subcategory} onChange={(e) => setForm({ ...form, teks_subcategory: e.target.value })}>
                {subcats.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="w-20 shrink-0">
              <label className={label}>시간(분)</label>
              <input type="number" className={input} value={form.minutes} onChange={(e) => setForm({ ...form, minutes: Number(e.target.value) })} />
            </div>
          </div>
          <label className={label}>태그 (쉼표 구분)</label>
          <input className={input} value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
          <label className={label}>설명 (요약)</label>
          <textarea className={input} value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} />
          <label className={label}>진행 순서 (한 줄에 하나씩)</label>
          <textarea className={input + " min-h-[80px]"} value={form.steps} onChange={(e) => setForm({ ...form, steps: e.target.value })} />
          <label className={label}>승부/평가 방식</label>
          <textarea className={input} value={form.scoring} onChange={(e) => setForm({ ...form, scoring: e.target.value })} />
          <label className={label}>준비물 (쉼표 구분)</label>
          <input className={input} value={form.equip} onChange={(e) => setForm({ ...form, equip: e.target.value })} />
          <div className="flex gap-2.5 mt-3">
            <button className={btn} onClick={() => { const a = buildActivity(); if (a) onRegister(a); }}>등록 (개인용)</button>
            <button className={btnSecondary} onClick={publishToCommunity}>커뮤니티에 공개</button>
            <button className={btnSecondary} onClick={sendToGoogleForm}>구글 폼으로 보내기</button>
            <button className={btnSecondary} onClick={reset}>초기화</button>
          </div>
          {!userEmail && <p className="text-[#9fb3a7] text-xs mt-2">커뮤니티 공개는 <a href="/login" className="underline">로그인</a> 후 가능합니다.</p>}
        </div>
      )}
    </>
  );
}

/* ---------- 커뮤니티 ---------- */
function CommunityView({ toast, onImport }: { toast: (m: string) => void; onImport: (a: Activity) => void }) {
  const [list, setList] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/lp-explorer")
      .then((r) => r.json())
      .then((rows: { data: Activity; is_public: boolean }[]) => setList(rows.map((r) => r.data)))
      .catch(() => toast("커뮤니티 목록을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={card}>
      <h2 className="text-[13px] text-[#9fb3a7] font-medium mb-3">공개된 활동 (다른 선생님 + 내가 공개한 것)</h2>
      {loading && <div className="text-[#9fb3a7]">불러오는 중...</div>}
      {!loading && list.length === 0 && <div className="text-[#9fb3a7]">아직 공개된 활동이 없습니다.</div>}
      <div className="space-y-2">
        {list.map((a) => (
          <div key={a.id} className="border border-[#33493c] rounded-lg px-3 py-2.5">
            <div className="font-semibold">[{a.slot}] {a.name}</div>
            <div className="text-[#9fb3a7] text-xs mt-1">{a.description}</div>
            <button className={btnSecondary + " mt-2"} onClick={() => onImport(a)}>내 목록에 추가</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- 설정 ---------- */
function SettingsView({
  cfg, onSave, toast,
}: { cfg: Config; onSave: (c: Config) => void; toast: (m: string) => void }) {
  const [local, setLocal] = useState<Config>(cfg);

  return (
    <>
      <div className={card}>
        <h2 className="text-[13px] text-[#9fb3a7] font-medium mb-3">Google AI Studio API 키</h2>
        <p className="text-[#9fb3a7] text-xs mb-2">발급: aistudio.google.com → Get API key. 이 브라우저에만 저장됩니다.</p>
        <input className={input} placeholder="AIza..." value={local.apiKey} onChange={(e) => setLocal({ ...local, apiKey: e.target.value })} />
      </div>

      <div className={card}>
        <h2 className="text-[13px] text-[#9fb3a7] font-medium mb-3">기본 생성 노력 수준</h2>
        <select className={input} value={local.defaultEffort} onChange={(e) => setLocal({ ...local, defaultEffort: e.target.value })}>
          <option>간단</option><option>중간</option><option>자세히</option><option>원문</option>
        </select>
      </div>

      <div className={card}>
        <h2 className="text-[13px] text-[#9fb3a7] font-medium mb-3">교육과정 표준</h2>
        <select className={input} value={local.standard} onChange={(e) => setLocal({ ...local, standard: e.target.value })}>
          {Object.keys(STANDARDS).map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className={card}>
        <h2 className="text-[13px] text-[#9fb3a7] font-medium mb-3">구글 폼으로 보내기 (개인 관리용 백업)</h2>
        <label className={label}>폼 제출 URL (viewform → formResponse)</label>
        <input className={input} value={local.formUrl} onChange={(e) => setLocal({ ...local, formUrl: e.target.value })} />
        <label className={label}>질문의 entry ID</label>
        <input className={input} value={local.formEntry} onChange={(e) => setLocal({ ...local, formEntry: e.target.value })} />
      </div>

      <button className={btn} onClick={() => onSave(local)}>저장</button>
    </>
  );
}
