# EtherionOS · Combined Final v1

**目标**：基于《EtherionOS_Memory_v1》的方法论，把后端生成器（Code）与全新前端（Vite+React+Tailwind）**完整打通**，并用批判性思维做了若干结构优化，确保“放数据就亮”。

---

## 目录结构
```
/backend/                 # 你的主程序（main.py）及其依赖
/config/                  # 模型/权重等配置（原样保留）
/output/                  # 后端产物（board.json / sensors.json / stages.json）
/frontend/                # 我设计的前端（主页+二级：千倍/万倍；移动/PC）
/scripts/
  normalize_outputs.py    # 输出兜底&规范化（缺字段补齐、空数组注入示例）
  sync-output.js          # 将 /output 同步到 /frontend/public 或 /frontend/dist
/docs/
  EtherionOS_Memory_v1.md # 你的方法论与语义基线
.github/workflows/
  build-and-deploy.yml    # 一键：先跑后端→标准化→打包前端→部署 Pages
```

---

## 本地开发（推荐）
```bash
# 1) 生成数据（失败也没关系，后面会注入兜底示例）
python backend/main.py

# 2) 规范化输出，确保前端吃得到 & 字段完整
python scripts/normalize_outputs.py

# 3) 前端开发（自动把 /output 拷到 public/output）
cd frontend
npm i
npm run dev
```
打开 `http://localhost:5173` 即可。

> 前端会优先请求 `/output/*.json`；若站点结构不同，自动回退到 `/site/output/*.json`。

---

## 生产构建 & 部署
```bash
# 先在仓库根执行
python backend/main.py
python scripts/normalize_outputs.py

# 再构建前端（构建后会把 /output 拷到 dist/output）
cd frontend
npm ci
npm run build
```
将 `frontend/dist/` 发布为静态站点（GitHub Pages / Nginx / S3 均可）。

### GitHub Actions（已内置）
推送到 `main/master` 会自动：
1. 运行 `backend/main.py` 生成 `/output`
2. `scripts/normalize_outputs.py` 兜底&规范化
3. 构建 `frontend/`，并把 `/output` 拷进 `dist/output`
4. 部署 `dist/` 到 Pages

---

## 批判性修复与优化点（摘要）
- **路径容错**：前端读取 `/output` → 失败回退 `/site/output`；构建时自动打包到 `dist/output`
- **字段兼容**：Board 的 `project/name/ticker` 互通；`bucket` 约束为 `1000x/10000x`；`stage` 统一大写；`confidence/score_total/actions` 智能映射
- **空数据兜底**：若 `board.items` 为空，自动注入 2 条示例，防止白屏 → 便于“结构验收”
- **原子写盘**：`normalize_outputs.py` 用临时文件替换，避免并发/CI部分写入导致损坏
- **信息架构**：主页信息密度足（总览/阶段/传感器/候选池/批次），二级专栏（千/万倍）独立，PC/移动响应式排布
- **视觉优化**：万倍红系光效降低饱和度、千倍青系层次化；指标瓦片 + 执行建议折叠

---

## 最小输出契约（board.json）
```jsonc
{
  "updated_at": "2025-10-20T03:00:00Z",
  "market_regime": { "s5_regime": "neutral" },
  "items": [{
    "bucket": "1000x",              // 或 "10000x"
    "project": "ONDO",              // 或 name / ticker（至少一项）
    "ticker": "ONDO",
    "stage": "S2",                   // "S1"…"S5"
    "confidence": 0.66,             // 0-1
    "score_total": 34.5,            // 可选
    "actions": "轻仓观察（1–3月）",    // 可选
    "structure": "RWA Infra",       // 可选
    "current_price": 0.98,          // 可选
    "marketcap": 123000000,         // 可选
    "agents": { "A1_vol_mcap": 0.62, "A2_tvl": 0.04, "A4_depth": 0.31 },
    "metrics": { "TVL_3d": { "value": 0.04 }, "VolMcap_1d": { "value": 0.08 } }
  }]
}
```

---

## 常见问题
- **为什么我的卡片有的指标是 `—`？**  
  后端该字段暂缺；不影响布局。你可以逐步补齐 `metrics` 或 `agents`，前端会自动显示。

- **Pages 打不开数据？**  
  确认 `frontend/dist/output/*.json` 已被打包（CI 已处理）；如自建 Nginx，请把 `/output` 目录部署到站点根。

---

如需我帮你把“千/万倍专栏的筛选/排序/分页/观察池统计条”全部挂到真实后端字段上，随时把当前一份真实 `output/*.json` 发我，我立即对齐字段并升级前端映射。