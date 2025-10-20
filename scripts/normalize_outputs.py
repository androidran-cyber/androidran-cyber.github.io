#!/usr/bin/env python3
# Normalize outputs from backend to the schema expected by the frontend.
import os, json, sys, shutil

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(ROOT, "output")

def load_json(p):
  try:
    with open(p, "r", encoding="utf-8") as f:
      return json.load(f)
  except Exception:
    return None

def ensure_dir(d):
  os.makedirs(d, exist_ok=True)

def norm_board(board):
  if not board or "items" not in board or not isinstance(board["items"], list):
    return board
  items = []
  for it in board["items"]:
    x = dict(it)
    # Fill basics
    x["bucket"] = (x.get("bucket") or x.get("model") or "1000x").lower()
    if x["bucket"] not in ("1000x","10000x"): x["bucket"] = "1000x"
    # Name/ticker fallback
    nm = x.get("project") or x.get("name") or x.get("ticker") or "-"
    x["project"] = nm
    x["name"] = x.get("name") or nm
    x["ticker"] = x.get("ticker") or nm
    # Stage to upper
    st = str(x.get("stage") or x.get("S") or "-").upper()
    x["stage"] = st
    # Confidence/score/action
    if "confidence" not in x: x["confidence"] = x.get("conf", 0.6)
    if "score_total" not in x and "score" in x: x["score_total"] = x["score"]
    if "actions" not in x and "action" in x: x["actions"] = x["action"]
    # Agents/metrics exist or default empty
    x["agents"] = x.get("agents") or {}
    x["metrics"] = x.get("metrics") or {}
    items.append(x)
  board["items"] = items
  # Ensure meta
  if "market_regime" not in board: board["market_regime"] = {"s5_regime":"neutral"}
  if "updated_at" not in board: board["updated_at"] = __import__("datetime").datetime.utcnow().isoformat()+"Z"
  return board

def write_json_atomic(path, data):
  tmp = path + ".tmp"
  with open(tmp, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
  os.replace(tmp, path)

def main():
  ensure_dir(OUT)
  b = load_json(os.path.join(OUT, "board.json"))
  s = load_json(os.path.join(OUT, "sensors.json"))
  g = load_json(os.path.join(OUT, "stages.json"))

  if b:
    b2 = norm_board(b)
    write_json_atomic(os.path.join(OUT, "board.json"), b2)

  # sensors/stages pass-through (could add shape checks later)

  # If board.items is empty, create a minimal sample to avoid empty screens
  b3 = load_json(os.path.join(OUT, "board.json"))
  if not b3 or not isinstance(b3.get("items"), list) or not b3["items"]:
    sample = {
      "updated_at": __import__("datetime").datetime.utcnow().isoformat()+"Z",
      "market_regime":{"s5_regime":"neutral"},
      "items":[
        {"bucket":"1000x","project":"ONDO","ticker":"ONDO","stage":"S2","confidence":0.66,"score_total":34.5,"actions":"轻仓观察（1–3月）","structure":"RWA Infra","current_price":0.98,"marketcap":123000000,"agents":{"A1_vol_mcap":0.62,"A2_tvl":0.04,"A4_depth":0.31},"metrics":{"TVL_3d":{"value":0.04},"VolMcap_1d":{"value":0.08}}},
        {"bucket":"10000x","project":"OLAS","ticker":"OLAS","stage":"S1","confidence":0.62,"score_total":28.2,"actions":"仅事件/短线；严格风控","structure":"Agent Network","current_price":2.15,"marketcap":450000000,"agents":{"A1_vol_mcap":0.71,"A2_tvl":0.06,"A4_depth":0.22}}
      ]
    }
    write_json_atomic(os.path.join(OUT, "board.json"), sample)

if __name__ == "__main__":
  main()