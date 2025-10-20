
import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, ChevronDown, Search, Info } from "lucide-react";

// === 模拟数据（fallback）：仅在 output/*.json 读取失败时使用 =====================
const mock = {
  kpis: [
    { title: "候选总数", value: 1283, tag: "pool" },
    { title: "通过校准", value: 312, tag: "calibrated" },
    { title: "有效传感器", value: 17, tag: "sensors" },
    { title: "阶段数量", value: 6, tag: "stages" },
  ],
  stages: [
    { id: "S1", name: "发现", score: 0.78, desc: "初筛指标 + 热点捕获", requirements: ["热点", "新叙事", "增量"] },
    { id: "S2", name: "验证", score: 0.66, desc: "社区/交易所/DEX 初步验证", requirements: ["社媒", "DEX", "追踪"] },
    { id: "S3", name: "试仓", score: 0.82, desc: "小仓位试错 + 风控", requirements: ["回撤", "波动", "流动性"] },
    { id: "S4", name: "加仓", score: 0.71, desc: "结构确认 + 加仓", requirements: ["结构", "资金曲线", "强度"] },
    { id: "S5", name: "持有", score: 0.64, desc: "持有期管理", requirements: ["再平衡", "风控", "止盈"] },
    { id: "S6", name: "退出", score: 0.59, desc: "阶段性退出", requirements: ["目标达成", "转弱", "博弈"] },
  ],
  sensors: {
    signals: { dex: 0.82, cg: 0.75, llama: 0.78, tg: 0.65, twitter: 0.62, github: 0.57, tvl: 0.7 },
  },
  candidates: Array.from({ length: 12 }).map((_, i) => ({
    symbol: ["OPUS","AERO","DORA","NOVA","GLMR","ARKM","RUNE","TIA","BLAST","WLD","TON","SOL"][i % 12],
    name: ["Opus Protocol","Aerodrome V2","Dora AI","Nova Layer","Moonriver GLMR","Arkham Intel","THORChain","Celestia","Blast L2","Worldcoin","TON Network","Solana"][i % 12],
    score: [0.88,0.74,0.69,0.83,0.58,0.77,0.81,0.72,0.6,0.79,0.86,0.9][i % 12],
    stage: ["S1","S2","S3","S4","S5","S3","S4","S2","S1","S3","S4","S2"][i % 12],
    marketcap: [280e6, 510e6, 120e6, 780e6, 65e6, 1.2e9, 3.2e9, 2.1e9, 900e6, 1.6e9, 8.9e9, 12.3e9][i % 12],
    growth: [0.23,0.12,0.42,0.35,0.09,0.18,0.27,0.31,0.15,0.2,0.11,0.24][i % 12],
    hot: i % 3 !== 0,
    growthFlag: i % 2 === 0,
    tags: ["hot","AI","Infra","Rollup","Privacy"].slice(0, (i % 4) + 1),
  })),
  cohorts: [
    { id: 1, name: "批次·AI 叙事", updated_at: "2025-10-13", size: 8, tags: ["AI","Infra","Data"] },
    { id: 2, name: "批次·L2 新链", updated_at: "2025-10-12", size: 6, tags: ["L2","Rollup"] },
  ],
  buckets: [ { id: "1000x", title: "千倍候选" }, { id: "10000x", title: "万倍候选" } ],
  dimensions: [
    "A1 量能跃迁 (Vol/Mcap)",
    "A2 资金沉淀 (TVL)",
    "A3 自然扩散 (SNS)",
    "A4 市场深度 (Depth)",
    "B1 杠杆健康 (Funding/OI)",
    "B2 鲸鱼净入 (Whale)",
    "B3 开发活跃 (Devt)",
    "B4 生态配套 (Infra/DApps)",
  ],
  projects: [
    { bucket: "1000x", name: "ONDO", title: "链上美债通道 (RWA Infra)", stage: "S2", score: 34.5, conf: 0.66, action: "轻仓观察（1–3月）", metrics: { TVL_3d: { label: "3日总锁仓变化率", value: 0.04 }, VolMcap_1d: { label: "1日成交额/市值", value: 0.08 } } },
    { bucket: "1000x", name: "TIA", title: "模组化数据可用层 (DA)", stage: "S3", score: 36.1, conf: 0.68, action: "趋势跟踪（加权）", metrics: { TVL_3d: { label: "3日总锁仓变化率", value: 0.02 }, VolMcap_1d: { label: "1日成交额/市值", value: 0.12 } } },
    { bucket: "10000x", name: "OLAS", title: "AI 代理经济 (Agent Network)", stage: "S1", score: 28.2, conf: 0.62, action: "仅事件/短线；严格风控", metrics: { TVL_3d: { label: "3日总锁仓变化率", value: 0.06 }, VolMcap_1d: { label: "1日成交额/市值", value: 0.06 } } },
    { bucket: "10000x", name: "NOVA", title: "Zero-Knowledge Infra", stage: "S1", score: 27.3, conf: 0.6, action: "观察", metrics: { TVL_3d: { label: "3日总锁仓变化率", value: 0.03 }, VolMcap_1d: { label: "1日成交额/市值", value: 0.05 } } },
  ],
};

// === 工具函数 ================================================================
const cls = (...a: (string | false | undefined)[]) => a.filter(Boolean).join(" ");
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const fmtNum = (v: any) => {
  if (v === null || v === undefined) return "-";
  if (typeof v === "number" && !Number.isFinite(v)) return "-";
  if (Math.abs(Number(v)) >= 1e9) return (Number(v) / 1e9).toFixed(2) + "B";
  if (Math.abs(Number(v)) >= 1e6) return (Number(v) / 1e6).toFixed(2) + "M";
  if (Math.abs(Number(v)) >= 1e3) return (Number(v) / 1e3).toFixed(1) + "k";
  if (typeof v === "number") return v.toFixed(2);
  return String(v);
};
const badge = (v: number) => (v >= 0.8 ? "优" : v >= 0.6 ? "良" : "弱");
const toPct = (v: any) => {
  if (v == null || v === "-") return "—";
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return "—";
  const pct = n > 1 ? n : n * 100;
  return `${clamp(Math.round(pct), -999, 999)}%`;
};

// === 数据适配器：统一 output/*.json 到前端所需结构 ============================
async function tryFetch(paths: string[]) {
  for (const p of paths) {
    try {
      const r = await fetch(p, { cache: "no-store" });
      if (r.ok) return await r.json();
    } catch (e) {}
  }
  return null;
}

function normalizeSensors(s: any) {
  if (!s) return { entries: Object.entries(mock.sensors.signals).map(([k,v])=>({ key:k, value:v })), fromBackend: false };
  if (Array.isArray(s.layers)) {
    return {
      entries: s.layers.map((l: any) => ({ key: l.layer || "layer", value: l.quality ?? 0.5, probes: l.probes || [] })),
      fromBackend: true,
    };
  }
  if (s.signals && typeof s.signals === 'object') {
    return { entries: Object.entries(s.signals).map(([k,v]: any)=>({ key:k, value:v })), fromBackend: true };
  }
  return { entries: [], fromBackend: true };
}

function normalizeBoard(b: any) {
  if (!b || !Array.isArray(b.items)) {
    return {
      updated_at: new Date().toISOString(),
      market_regime: { s5_regime: "neutral" },
      items: mock.projects.map((p: any) => ({
        bucket: p.bucket,
        project: p.name,
        name: p.name,
        stage: p.stage,
        score_total: p.score,
        confidence: p.conf,
        actions: p.action,
        metrics: p.metrics,
        agents: {},
        structure: p.title,
        ticker: p.name,
      })),
      fromBackend: false,
    } as any;
  }
  return {
    updated_at: b.updated_at || new Date().toISOString(),
    market_regime: b.market_regime || { s5_regime: "neutral" },
    items: b.items.map((it: any) => ({
      bucket: it.bucket ?? it.model ?? "1000x",
      project: it.project ?? it.name ?? it.ticker ?? "-",
      name: it.name ?? it.project ?? it.ticker ?? "-",
      stage: String(it.stage ?? it.S ?? "-").toUpperCase(),
      score_total: it.score_total ?? it.score ?? null,
      confidence: it.confidence ?? it.conf ?? null,
      actions: it.actions ?? it.action ?? "-",
      metrics: it.metrics ?? null,
      agents: it.agents ?? {},
      structure: it.structure ?? "",
      ticker: it.ticker ?? it.symbol ?? "",
      current_price: it.current_price ?? null,
      marketcap: it.marketcap ?? it.mcap ?? null,
    })),
    fromBackend: true,
  } as any;
}

function normalizeStages(s: any) {
  if (!s || typeof s !== 'object') return { stages: {}, fake_start: 0, fromBackend: false };
  return {
    stages: s.stages || {},
    fake_start: s.fake_start || 0,
    fromBackend: true,
  };
}

function computeKpis(board: any, sensors: any, stages: any) {
  const total = board.items.length;
  const calibrated = board.items.filter((x: any) => (x.confidence ?? 0) >= 0.6).length;
  const senCount = sensors.entries.length;
  const stageCount = Object.keys(stages.stages || {}).length || mock.stages.length;
  return [
    { title: "候选总数", value: total || mock.kpis[0].value, tag: "pool" },
    { title: "通过校准", value: calibrated, tag: "calibrated" },
    { title: "有效传感器", value: senCount, tag: "sensors" },
    { title: "阶段数量", value: stageCount, tag: "stages" },
  ];
}

function safeMetrics(p: any) {
  const a = p.agents || {};
  const m = p.metrics || {};
  return {
    TVL_3d: m.TVL_3d ?? { label: "3日总锁仓变化率", value: a.A2_tvl ?? null },
    VolMcap_1d: m.VolMcap_1d ?? { label: "1日成交额/市值", value: a.A1_vol_mcap ?? null },
    Depth_agg: m.Depth_agg ?? { label: "1% 深度合并", value: a.A4_depth ?? null },
  };
}

function useDashboardData() {
  const [loading, setLoading] = useState(true);
  const [board, setBoard] = useState<any>(normalizeBoard(null));
  const [sensors, setSensors] = useState<any>(normalizeSensors(null));
  const [stages, setStages] = useState<any>(normalizeStages(null));

  useEffect(() => {
    let alive = true;
    (async () => {
      const [b, s, g] = await Promise.all([
        // 兼容两种路径："output/" 与 "site/output/"
        tryFetch(["output/board.json", "/site/output/board.json"]),
        tryFetch(["output/sensors.json", "/site/output/sensors.json"]),
        tryFetch(["output/stages.json", "/site/output/stages.json"]),
      ]);
      if (!alive) return;
      setBoard(normalizeBoard(b));
      setSensors(normalizeSensors(s));
      setStages(normalizeStages(g));
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const kpis = computeKpis(board, sensors, stages);

  return { loading, board, sensors, stages, kpis };
}

// === 将 board.items 映射成“候选池卡片”所需的简化结构 ==========================
function mapBoardToCandidates(items: any[] | undefined) {
  if (!Array.isArray(items) || !items.length) return null;
  return items.map((it) => {
    const conf = it.confidence ?? 0.6; // 用置信度作为质量分
    const a = it.agents || {};
    const growth = (it.metrics?.TVL_3d?.value ?? a.A2_tvl ?? null);
    return {
      symbol: it.ticker || it.project || it.name || "-",
      name: it.project || it.name || it.ticker || "-",
      stage: it.stage || "-",
      marketcap: it.marketcap ?? null,
      growth: growth,
      hot: (a.A1_vol_mcap ?? 0) >= 0.6, // 量能强=>热点
      growthFlag: (a.A2_tvl ?? 0) > 0,
      score: conf, // 0-1
      tags: [it.bucket, it.structure].filter(Boolean),
    };
  });
}

// === 主组件 ==================================================================
export default function App() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [active, setActive] = useState("top");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ hot: true, growth: true, quality: true });
  const [view, setView] = useState<"home" | "deep">("home"); // home | deep

  const { loading, board, sensors, stages, kpis } = useDashboardData();

  // URL hash: #home/overview 或 #deep/bucket-1000x
  useEffect(() => {
    const hash = window.location.hash.replace('#','');
    if (!hash) return;
    const [v, id] = hash.split('/');
    if (v === 'home' || v === 'deep') setView(v as any);
    if (id) setTimeout(() => scrollTo(id), 0);
  }, []);

  const toggleExpand = (id: string) => setExpanded(expanded === id ? null : id);

  // 主页/二级 导航
  const sectionsHome = [
    { id: "top", label: "顶部" },
    { id: "overview", label: "总览" },
    { id: "stages", label: "阶段" },
    { id: "sensors", label: "传感器" },
    { id: "candidates", label: "候选池" },
    { id: "cohorts", label: "批次" },
  ];
  const sectionsDeep = [
    { id: "bucket-1000x", label: "千倍币" },
    { id: "bucket-10000x", label: "万倍币" },
  ];

  // 只监听当前视图的锚点，避免隐藏区干扰
  useEffect(() => {
    const list = view === "home" ? sectionsHome : sectionsDeep;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive((visible.target as HTMLElement).id);
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    list.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [view]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 70;
    window.scrollTo({ top, behavior: "smooth" });
    window.history.replaceState(null, "", `#${view}/${id}`);
  };

  // 从后台映射候选池（失败则回退 mock）
  const candidatesFromBoard = useMemo(() => mapBoardToCandidates(board.items), [board.items]);

  // 候选池筛选
  const filtered = useMemo(() => {
    const base = candidatesFromBoard ?? mock.candidates;
    return base
      .filter((c: any) => {
        if (filters.hot && !(c.hot || (c.tags || []).includes("hot"))) return false;
        if (filters.growth && !c.growthFlag) return false;
        if (filters.quality && (c.score ?? 0) < 0.6) return false;
        return true;
      })
      .filter((c: any) => {
        if (!search) return true;
        const t = `${c.symbol} ${c.name} ${c.stage} ${(c.tags||[]).join(" ")}`.toLowerCase();
        return t.includes(search.toLowerCase());
      });
  }, [candidatesFromBoard, filters, search]);

  return (
    <div className={cls(theme === "dark" ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900", "min-h-screen font-sans transition-colors duration-300")}> 
      {/* 顶栏 */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-slate-700/40 backdrop-blur bg-slate-900/70" id="top">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-gradient-to-tr from-cyan-400 to-sky-600 grid place-items-center font-bold">∴</div>
          <div>
            <div className="text-lg font-bold">EtherionOS</div>
            <div className="text-xs opacity-70">以太粒子系统 · 候选捕获面板</div>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <label className="sr-only" htmlFor="search">搜索</label>
            <input
              id="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索币种 / 阶段 / 标签…"
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800/70 border border-slate-700/50 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button aria-pressed={theme!=="dark"} onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="p-2 rounded-lg border border-slate-600">
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 次级导航 + 视图切换 */}
      <div className="sticky top-[52px] z-10 bg-slate-900/70 backdrop-blur border-b border-slate-700/40">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-3 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 mr-2">
            {[
              { key: "home", label: "主页模块" },
              { key: "deep", label: "二级模块" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => { setView(t.key as any); setActive(t.key === 'home' ? 'overview' : 'bucket-1000x'); window.history.replaceState(null, '', `#${t.key}/${t.key==='home'?'overview':'bucket-1000x'}`); }}
                className={cls(
                  "px-3 py-1 rounded-full border text-xs",
                  view === t.key ? "border-indigo-400 text-indigo-300" : "border-slate-600 text-slate-300"
                )}
                aria-pressed={view===t.key}
              >
                {t.label}
              </button>
            ))}
          </div>
          {(view === 'home' ? sectionsHome : sectionsDeep).map((s) => (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              className={cls(
                "px-3 py-1 rounded-full border text-xs whitespace-nowrap",
                active === s.id ? "border-indigo-400 text-indigo-300" : "border-slate-600 text-slate-300"
              )}
              aria-current={active===s.id?"true":undefined}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* 主体：主页模块（信息丰富） */}
      <main className={cls("max-w-7xl mx-auto p-4 space-y-8", view === 'deep' && 'hidden')}>
        {/* 总览 */}
        <section id="overview" tabIndex={-1}>
          <h2 className="text-xl font-bold mb-2">总览</h2>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {(loading ? mock.kpis : kpis).map((k: any) => (
              <motion.div key={k.title} className="rounded-2xl border border-slate-700/40 bg-slate-900/60 backdrop-blur p-4 shadow-xl" initial={{opacity:0, y:6}} whileInView={{opacity:1,y:0}} viewport={{once:true, amount:0.2}}>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-sm opacity-70">{k.tag}</div>
                    <div className="text-lg font-semibold">{k.title}</div>
                  </div>
                  <div className="text-2xl font-extrabold">{fmtNum(k.value)}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* 阶段（静态说明 + 可换为后台 stages.json 渲染卡片） */}
        <section id="stages" tabIndex={-1}>
          <h2 className="text-xl font-bold mb-2">阶段</h2>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {mock.stages.map((s: any) => (
              <motion.div key={s.id} className="rounded-2xl border border-slate-700/40 bg-slate-900/60 backdrop-blur p-4 shadow-xl" initial={{opacity:0, y:6}} whileInView={{opacity:1,y:0}} viewport={{once:true, amount:0.2}}>
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{s.name}</div>
                  <div className={cls("px-2 py-0.5 rounded-full text-xs border", s.score >= 0.8 ? "border-emerald-400/40 bg-emerald-500/10" : s.score >= 0.6 ? "border-amber-400/40 bg-amber-500/10" : "border-rose-400/40 bg-rose-500/10")}>{badge(s.score)}</div>
                </div>
                <div className="text-xs opacity-70 mt-1">{s.desc}</div>
                <div className="h-2 rounded-full bg-slate-700/40 mt-2 overflow-hidden">
                  <div className={cls("h-full rounded-full", s.score >= 0.8 ? "bg-emerald-400" : s.score >= 0.6 ? "bg-amber-400" : "bg-rose-400")} style={{ width: `${Math.round(s.score * 100)}%` }} />
                </div>
                <div className="flex gap-1 flex-wrap mt-2">
                  {s.requirements.map((r: string) => (
                    <span key={r} className="text-[10px] px-2 py-0.5 rounded-full border border-slate-700/40">{r}</span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* 传感器 */}
        <section id="sensors" tabIndex={-1}>
          <h2 className="text-xl font-bold mb-2">传感器</h2>
          <motion.div className="rounded-2xl border border-slate-700/40 bg-slate-900/60 backdrop-blur p-4 shadow-xl" initial={{opacity:0, y:6}} whileInView={{opacity:1,y:0}} viewport={{once:true, amount:0.2}}>
            <div className="text-sm opacity-80 mb-3 flex items-center gap-2"><Info className="w-4 h-4"/> 传感器按 0–1 归一化，≥0.8 视为“优”，≥0.6 视为“良”。支持新旧两种结构（layers/signals）。</div>
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {(loading ? normalizeSensors(null).entries : sensors.entries).map((s: any) => (
                <div key={s.key} className="rounded-2xl border border-slate-700/40 bg-slate-900/60 backdrop-blur p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold capitalize">{s.key}</div>
                    <div className={cls("px-2 py-0.5 rounded-full text-xs border", (s.value ?? 0) >= 0.8 ? "border-emerald-400/40 bg-emerald-500/10" : (s.value ?? 0) >= 0.6 ? "border-amber-400/40 bg-amber-500/10" : "border-rose-400/40 bg-rose-500/10")}>{badge(s.value ?? 0)}</div>
                  </div>
                  <div className="text-sm opacity-70 mt-1">值：{(s.value ?? 0).toFixed(2)}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* 候选池 */}
        <section id="candidates" tabIndex={-1}>
          <h2 className="text-xl font-bold mb-2">候选池</h2>
          {/* 候选池说明卡 */}
          <motion.div className="rounded-2xl border border-slate-700/40 bg-slate-900/60 backdrop-blur p-4 shadow-xl" initial={{opacity:0, y:6}} whileInView={{opacity:1,y:0}} viewport={{once:true, amount:0.2}}>
            <div className="text-sm opacity-80 mb-2 flex items-start gap-2"><Info className="w-4 h-4 mt-0.5"/> 候选池来源：多源传感器→阶段规则→分数聚合。默认筛选“热点/增长/质量”。分数≥0.8 重点关注，≥0.6 观察；结合阶段 S1–S5 做仓位决策。</div>
            <div className="flex flex-wrap gap-2 items-center">
              {[
                { key: "hot", label: "热点" },
                { key: "growth", label: "增长" },
                { key: "quality", label: "质量" },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilters((x) => ({ ...x, [f.key]: !(x as any)[f.key] }))}
                  className={cls(
                    "text-xs px-3 py-1 rounded-full border",
                    (filters as any)[f.key] ? "bg-slate-800/60 border-slate-600" : "bg-transparent border-slate-700/40 opacity-70"
                  )}
                  aria-pressed={(filters as any)[f.key]}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </motion.div>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mt-3">
            {filtered.map((it: any) => (
              <motion.div key={`${it.symbol}-${it.name}`} className="rounded-2xl border border-slate-700/40 bg-slate-900/60 backdrop-blur p-4 shadow-xl" initial={{opacity:0, y:6}} whileInView={{opacity:1,y:0}} viewport={{once:true, amount:0.2}}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm opacity-70">{it.name}</div>
                    <div className="text-xl font-extrabold tracking-wide">{it.symbol}</div>
                  </div>
                  <div className={cls("px-2 py-0.5 rounded-full text-xs border", (it.score ?? 0) >= 0.8 ? "border-emerald-400/40 bg-emerald-500/10" : (it.score ?? 0) >= 0.6 ? "border-amber-400/40 bg-amber-500/10" : "border-rose-400/40 bg-rose-500/10")}>{badge(it.score ?? 0)}</div>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div>
                    <div className="text-xs opacity-70">阶段</div>
                    <div className="text-lg font-bold">{it.stage}</div>
                  </div>
                  <div>
                    <div className="text-xs opacity-70">市值</div>
                    <div className="text-lg font-bold">{fmtNum(it.marketcap)}</div>
                  </div>
                  <div>
                    <div className="text-xs opacity-70">增长</div>
                    <div className="text-lg font-bold">{toPct(it.growth)}</div>
                  </div>
                </div>
                <div className="flex gap-1 flex-wrap mt-2">
                  {(it.tags||[]).map((t: string) => (
                    <span key={t} className="text-[10px] px-2 py-0.5 rounded-full border border-slate-700/40">{t}</span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* 批次 */}
        <section id="cohorts" tabIndex={-1}>
          <h2 className="text-xl font-bold mb-2">分组 / 批次</h2>
          {/* 批次说明卡 */}
          <motion.div className="rounded-2xl border border-slate-700/40 bg-slate-900/60 backdrop-blur p-4 shadow-xl" initial={{opacity:0, y:6}} whileInView={{opacity:1,y:0}} viewport={{once:true, amount:0.2}}>
            <div className="text-sm opacity-80 mb-2 flex items-start gap-2"><Info className="w-4 h-4 mt-0.5"/> 批次用于把同叙事/同阶段/同资金状态的标的打包跟踪，卡片上的 [AI] [Infra] [Data]/[Rollup] 等为<strong>标签</strong>，用于快速识别主题与管道。</div>
          </motion.div>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {mock.cohorts.map((b: any) => (
              <motion.div key={b.id} className="rounded-2xl border border-slate-700/40 bg-slate-900/60 backdrop-blur p-4 shadow-xl" initial={{opacity:0, y:6}} whileInView={{opacity:1,y:0}} viewport={{once:true, amount:0.2}}>
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{b.name}</div>
                  <div className="text-xs opacity-70">{b.size} 项</div>
                </div>
                <div className="text-xs opacity-70">更新：{b.updated_at}</div>
                <div className="flex gap-1 flex-wrap mt-2">
                  {b.tags.map((t: string) => (
                    <span key={t} className="text-[10px] px-2 py-0.5 rounded-full border border-slate-700/40">{t}</span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      {/* 二级视图：千倍/万倍 专栏（根据 output/board.json 自适应列数）*/}
      <main className={cls("max-w-6xl mx-auto p-4 space-y-8", view === 'home' && 'hidden')}>
        {[{ id: "1000x", title: "千倍候选" }, { id: "10000x", title: "万倍候选" }].map((bucket) => {
          const list = (board.items || []).filter((p: any) => String(p.bucket).toLowerCase() === bucket.id);
          const useList = list.length ? list : mock.projects.filter((p: any)=>p.bucket===bucket.id);
          const columns = useList.length > 1 ? "md:grid-cols-2" : "md:grid-cols-1";
          return (
            <section key={bucket.id} id={`bucket-${bucket.id}`} tabIndex={-1}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span className={cls("uppercase", bucket.id === "1000x" ? "text-cyan-400" : "text-rose-300")}>{bucket.id}</span>
                  <span>{bucket.title}</span>
                </h2>
              </div>
              <div className={cls("grid gap-4 grid-cols-1", columns)}>
                {useList.map((p: any) => {
                  const name = p.project || p.name || p.ticker || "-";
                  const stage = p.stage || "-";
                  const conf = p.confidence ?? p.conf ?? 0.6;
                  const score = p.score_total ?? p.score ?? null;
                  const action = p.actions ?? p.action ?? "-";
                  const price = p.current_price != null && p.current_price !== '' ? `$${p.current_price}` : '—';
                  const metrics = safeMetrics(p);
                  return (
                    <motion.div key={name} whileHover={{ scale: 1.01 }} className={cls("relative rounded-2xl p-4 shadow-md backdrop-blur border transition-transform duration-300", bucket.id === "1000x" ? "bg-gradient-to-br from-cyan-900/30 to-slate-800/30 border-cyan-700/40" : "bg-gradient-to-br from-rose-950/40 via-rose-900/30 to-orange-900/30 border-rose-700/40")}> 
                      {bucket.id === "10000x" && (<div className="pointer-events-none absolute -inset-px rounded-[20px] bg-[radial-gradient(120px_60px_at_20%_0%,rgba(244,63,94,0.18),transparent),radial-gradient(140px_80px_at_120%_30%,rgba(251,146,60,0.15),transparent)]" />)}
                      <div className="relative flex items-center justify-between">
                        <div>
                          <div className="text-lg font-bold flex items-center gap-2">{name}<span className={cls("text-xs px-2 py-0.5 rounded-full uppercase border", bucket.id === "1000x" ? "border-cyan-500/40 text-cyan-300" : "border-rose-500/40 text-rose-300")}>{bucket.id}</span></div>
                          <div className="text-sm opacity-80">{p.structure || ''} · {stage}</div>
                        </div>
                        <div className={cls("text-xs px-2 py-0.5 rounded-full border", bucket.id === "1000x" ? "border-amber-400/40 bg-amber-500/10" : "border-rose-400/40 bg-rose-500/10")}>{stage} 强化</div>
                      </div>
                      <div className="relative text-xs opacity-80 mt-1">Score: {score==null?"—":Number(score).toFixed(2)} · Conf: {conf} · Action: {action} · 现价: {price}</div>
                      <div className="relative mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        {mock.dimensions.map((d: any, i: number) => (
                          <div key={i} className={cls("rounded-md px-2 py-1 flex items-center justify-between border", bucket.id === "1000x" ? "bg-slate-800/40 border-slate-700/40" : "bg-rose-950/20 border-rose-700/30")}> 
                            <span>{d}</span>
                            <span className={cls("w-2 h-2 rounded-full", i % 3 === 0 ? "bg-emerald-400/80" : i % 3 === 1 ? "bg-amber-400/80" : "bg-rose-400/80")} />
                          </div>
                        ))}
                      </div>
                      <div className="relative mt-3 grid grid-cols-2 gap-2 text-xs">
                        {Object.entries(metrics).map(([k, meta]: any) => (
                          <div key={k} className={cls("rounded-md px-3 py-2 border", bucket.id === "1000x" ? "bg-slate-800/40 border-slate-700/40" : "bg-rose-950/20 border-rose-700/30")}> 
                            <div className="opacity-80 text-[11px]">{meta.label}</div>
                            <div className={cls((meta.value ?? 0) > 0 ? (bucket.id === "1000x" ? "text-emerald-400" : "text-rose-300") : "text-rose-400", "font-bold text-sm")}>{toPct(meta.value)}</div>
                          </div>
                        ))}
                      </div>
                      <div className="relative mt-3 border-t border-slate-700/40 pt-2 text-sm">
                        <button onClick={() => toggleExpand(name)} aria-expanded={expanded===name} className={cls("flex items-center gap-1 px-3 py-1 rounded-md border hover:opacity-90 transition-colors", bucket.id === "1000x" ? "border-cyan-500/40 text-cyan-300" : "border-rose-500/40 text-rose-300")}>执行建议（计划 & 风控） <ChevronDown className="w-3 h-3" /></button>
                        <AnimatePresence>
                          {expanded === name && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-2 text-xs leading-relaxed bg-slate-800/40 border border-slate-700/40 rounded-md p-3">
                              <p className="opacity-90 mb-1">🧭 建议：</p>
                              <ul className="list-disc list-inside space-y-1 opacity-80">
                                <li>保持风控阈值：单项目仓位 ≤ 3%</li>
                                <li>动态监测 A 指标波动区间</li>
                                <li>关注阶段信号变动（S 值衰减预警）</li>
                                <li>执行止盈/止损：±15% 自动提示</li>
                              </ul>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </main>

      <footer className="text-center text-xs opacity-70 py-6 border-t border-slate-700/40">© EtherionOS · 日更 / T+3 / 周更</footer>
    </div>
  );
}
