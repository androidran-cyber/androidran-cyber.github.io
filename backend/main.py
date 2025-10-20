# -*- coding: utf-8 -*-
import os, json, hashlib, datetime
from pathlib import Path

SCHEMA_VERSION = "1.3.x"
BASE_DIR = Path(".")
CFG_DIR = BASE_DIR / "config" / "model" / "latest"
OUT_DIR = BASE_DIR / "output"
OUT_DIR.mkdir(parents=True, exist_ok=True)

CADENCE = os.getenv("CADENCE", "daily").strip().lower()
UTC_NOW = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")

def jread(p, d):
    try:
        with open(p, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return d

W = jread(CFG_DIR/'weights.json', {"factor_weights":{
    "A1_vol_mcap":0.18,"A2_tvl":0.15,"A3_sns":0.12,"A4_depth":0.10,
    "B1_leverage":0.15,"B2_whale":0.10,"B3_dev":0.10,"B4_ecosys":0.10}})

def r01(key):
    h = hashlib.sha256(key.encode('utf-8')).hexdigest()
    return (int(h[:12],16)%1000000)/1000000.0

def tag(c): return {"daily":"daily","tplus3":"t+3","t+3":"t+3","weekly":"weekly"}.get(c,"daily")

SEEDS=[("1000x","再质押（Restaking 协议）","S1","Karak"),
       ("1000x","社交基础设施（Social Infra）","S1","OLAS"),
       ("10000x","零知识基础设施（ZK Infra）","S2","ZKM"),
       ("10000x","RWA 资产通道","S2","Ondo")]

def gen_board():
    items=[]
    fw=W.get("factor_weights",{})
    for (bucket,structure,stage,name) in SEEDS:
        key=f"{name}|{bucket}|{CADENCE}"
        agents={
            "A1_vol_mcap": int(round(100*(0.50+0.45*r01(key+':a')))),
            "A2_tvl":      int(round(100*(0.45+0.50*r01(key+':b')))),
            "A3_sns":      int(round(100*(0.40+0.55*r01(key+':c')))),
            "A4_depth":    int(round(100*(0.40+0.50*r01(key+':d')))),
            "B1_leverage": int(round(100*(0.40+0.55*r01(key+':e')))),
            "B2_whale":    int(round(100*(0.35+0.60*r01(key+':f')))),
            "B3_dev":      int(round(100*(0.45+0.50*r01(key+':g')))),
            "B4_ecosys":   int(round(100*(0.40+0.50*r01(key+':h')))),
        }
        score=sum(float(fw.get(k,0.0))*(v/100.0) for k,v in agents.items())
        items.append({
            "project":name,"bucket":bucket,"structure":structure,"stage":stage,
            "score_total":round(score*100,1),"confidence":round(55+35*r01(key+':conf'),1),
            "current_price":None,"agents":agents,
            "metrics":{"TVL_3d":round(-2.0+8.0*r01(key+':tvl3'),1),
                       "VolMcap_1d":round(2.0+8.0*r01(key+':vol1'),1)},
            "actions":"严格风控" if bucket=="10000x" else "观察与分批建仓"
        })
    s5=round(30+40*r01('market|'+CADENCE),1)/100.0
    regime="bull" if s5>=0.66 else ("bear" if s5<=0.34 else "neutral")
    board={"schema_version":SCHEMA_VERSION,"cadence":tag(CADENCE),"updated_at":UTC_NOW,
           "items":items,"market_regime":{"s5_regime":regime,"score":round(s5,2)}}
    (OUT_DIR/'board.json').write_text(json.dumps(board,ensure_ascii=False,indent=2),encoding='utf-8')

def gen_stages():
    stages={"S1":{"pool":[]},"S2":{"pool":[]},"S3":{"pool":[]},"S4":{"pool":[]},"S5":{"pool":[]}}
    watch=[]
    for (_,_,stage,name) in SEEDS:
        st=stage; r=r01('stage|'+name+'|'+CADENCE)
        if CADENCE in ('tplus3','t+3') and r>0.70 and st!='S5': st=f"S{min(int(st[1])+1,5)}"
        if CADENCE=='weekly' and r>0.55 and st!='S5': st=f"S{min(int(st[1])+1,5)}"
        stages[st]['pool'].append(name)
        if r<0.25: watch.append(name)
    fake=sum(1 for n in watch if r01('fake|'+n)>0.6)
    out={"cadence":tag(CADENCE),"stages":stages,"fake_start":fake,"watchlist":watch}
    (OUT_DIR/'stages.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')

LAYERS={"L1_supply":["lp_lock_ratio","holder_gini"],
        "L2_demand":["tg_growth_7d","x_engagement"],
        "L3_liquidity":["depth_usd"],
        "L4_devops":["commit_7d"],
        "L5_narrative":["news_pulse"],
        "L6_risk":["contract_risk"]}

def gen_sensors():
    layers=[]
    for layer,probes in LAYERS.items():
        q=round((55+35*r01('quality|'+layer+'|'+CADENCE))/100.0,2)
        pr=[]
        for k in probes:
            key=layer+'|'+k+'|'+CADENCE
            if k in ('lp_lock_ratio','holder_gini'): v=round(50+50*r01(key),1)
            elif k in ('tg_growth_7d','x_engagement','news_pulse'): v=round(-2.0+8.0*r01(key),1)
            elif k=='depth_usd': v=int(50000+200000*r01(key))
            elif k=='commit_7d': v=int(5+40*r01(key))
            elif k=='contract_risk': v=['低','中','高'][int(3*r01(key))%3]
            else: v=round(100*r01(key),1)
            pr.append({'k':k,'v':v})
        layers.append({'layer':layer,'quality':q,'probes':pr})
    (OUT_DIR/'sensors.json').write_text(json.dumps({'cadence':tag(CADENCE),'layers':layers},ensure_ascii=False,indent=2),encoding='utf-8')

if __name__=='__main__':
    gen_board(); gen_stages(); gen_sensors()
    print('[ok] output ready', CADENCE, UTC_NOW)
