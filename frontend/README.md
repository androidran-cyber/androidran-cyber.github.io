# EtherionOS Frontend (Vite + React + Tailwind)

这是一份可直接部署/二次集成的前端框架：
- 读取 **/output** 或 **/site/output** 下的 `board.json`、`sensors.json`、`stages.json`
- 读取失败时自动回退到内置 mock，保证可预览
- 移动端/PC 响应式，二级导航（千倍/万倍）+ 主页（总览/阶段/传感器/候选池/批次）
- 万倍币卡片红系光效、千倍币青系
- URL 哈希保留视图与位置（例：`#deep/bucket-10000x`）

## 本地开发
```bash
pnpm i   # 或 npm i / yarn
pnpm dev
```

## 构建
```bash
pnpm build
pnpm preview
```

## 部署到 GitHub Pages（示例）
将 `dist/` 目录发布为静态站点，并将 **后端产物** 放到站点根：
```
/output/board.json
/output/sensors.json
/output/stages.json
```
或：
```
/site/output/board.json
/site/output/sensors.json
/site/output/stages.json
```

> 如果两处都存在，将优先读取 `/output`。

## 最小字段要求（board.json）
```jsonc
{
  "updated_at": "2025-10-20T00:00:00Z",
  "market_regime": { "s5_regime": "neutral" },
  "items": [{
    "bucket": "1000x",        // or "10000x"
    "project": "ONDO",        // or name / ticker（至少一个）
    "ticker": "ONDO",
    "stage": "S2",
    "confidence": 0.66,
    "score_total": 34.5,
    "actions": "轻仓观察（1–3月）",
    "structure": "RWA Infra",
    "current_price": 0.98,
    "marketcap": 123000000,
    "agents": { "A1_vol_mcap": 0.62, "A2_tvl": 0.04, "A4_depth": 0.31 },
    "metrics": { "TVL_3d": { "value": 0.04 }, "VolMcap_1d": { "value": 0.08 } }
  }]
}
```

## 说明
- 百分比展示统一容错：既支持 0–1，也支持直接给百分值（>1 判定为百分值）。
- 传感器支持两种结构：`signals{}`（旧）或 `layers[]`（新）。
- 如果某字段缺失，前端将用占位符 `—` 展示，不会空卡。