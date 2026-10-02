import React, { useEffect, useMemo, useState } from "react";

export default function LiveWeatherChart({ weather }) {
  const [hours, setHours] = useState([]), [metric, setMetric] = useState("temperature_2m"), [range, setRange] = useState("24H"), [hover, setHover] = useState(null);
  useEffect(() => {
    const lat=Number(weather?.lat), lon=Number(weather?.lon); if(!Number.isFinite(lat)||!Number.isFinite(lon)) return;
    const u=new URL("https://api.open-meteo.com/v1/forecast"); u.searchParams.set("latitude",lat); u.searchParams.set("longitude",lon);
    u.searchParams.set("hourly","temperature_2m,apparent_temperature,precipitation,precipitation_probability,wind_speed_10m,relative_humidity_2m,surface_pressure");
    u.searchParams.set("past_hours","24"); u.searchParams.set("forecast_hours","168"); u.searchParams.set("timezone","auto");
    fetch(u).then(r=>r.json()).then(d=>{const h=d?.hourly;if(!h?.time)return;setHours(h.time.map((time,i)=>({time,temperature_2m:h.temperature_2m?.[i],apparent_temperature:h.apparent_temperature?.[i],precipitation:h.precipitation?.[i],precipitation_probability:h.precipitation_probability?.[i],wind_speed_10m:h.wind_speed_10m?.[i],relative_humidity_2m:h.relative_humidity_2m?.[i],surface_pressure:h.surface_pressure?.[i]})))}).catch(()=>{});
  },[weather?.lat,weather?.lon]);
  const data=useMemo(()=>hours.slice(0,range==="24H"?24:range==="48H"?48:168),[hours,range]);
  const cfg={temperature_2m:["Temperature","°C"],apparent_temperature:["Feels like","°C"],precipitation:["Precipitation","mm"],precipitation_probability:["Rain probability","%"],wind_speed_10m:["Wind speed","km/h"],relative_humidity_2m:["Humidity","%"],surface_pressure:["Pressure","hPa"]}[metric];
  const vals=data.map(x=>Number(x[metric])).filter(Number.isFinite); if(!vals.length)return <div className="wg-market-chart empty">Loading live telemetry…</div>;
  const min=Math.min(...vals),max=Math.max(...vals),pad=Math.max((max-min)*.14,metric==="surface_pressure"?1:.5),lo=min-pad,hi=max+pad,W=1000,H=330,PX=58,PY=30;
  const pts=data.map((d,i)=>{const v=Number(d[metric]),x=PX+i/Math.max(1,data.length-1)*(W-PX-20),y=H-PY-(v-lo)/(hi-lo)*(H-PY-PY);return{x,y,v,d}});
  const path=pts.map((p,i)=>(i?"L":"M")+" "+p.x.toFixed(1)+" "+p.y.toFixed(1)).join(" "), area=path+" L "+(pts.at(-1)?.x||PX)+" "+(H-PY)+" L "+(pts[0]?.x||PX)+" "+(H-PY)+" Z";
  const latest=vals.at(-1),prev=vals.at(-2)??latest,delta=latest-prev;
  return <div className="wg-market-chart">
    <div className="wg-market-head"><div><small>LIVE WEATHER TELEMETRY · OPEN-METEO</small><strong>{cfg[0]} <span>{Number(latest).toFixed(1)}{cfg[1]}</span></strong><label className="wg-market-axis-label">Y-axis: {cfg[1]} · X-axis: local time</label><em className={delta>=0?"up":"down"}>{delta>=0?"▲":"▼"} {Math.abs(delta).toFixed(1)} {cfg[1]} · hourly</em></div><div className="wg-market-controls">{["24H","48H","7D"].map(x=><button className={range===x?"active":""} onClick={()=>setRange(x)} key={x}>{x}</button>)}</div></div>
    <div className="wg-market-metrics">{[["temperature_2m","Temp"],["apparent_temperature","Feels"],["precipitation_probability","Rain %"],["wind_speed_10m","Wind"],["relative_humidity_2m","Humidity"],["surface_pressure","Pressure"]].map(([k,l])=><button key={k} className={metric===k?"active":""} onClick={()=>setMetric(k)}>{l}<b>{Number(data.at(-1)?.[k]??0).toFixed(k==="surface_pressure"?0:1)}{k==="surface_pressure"?"":k==="wind_speed_10m"?" km/h":k==="precipitation"?" mm":k.includes("probability")||k.includes("humidity")?"%":"°"}</b></button>)}</div>
    <div className="wg-market-svg"><svg key={metric+"-"+range+"-"+data.length} viewBox={"0 0 "+W+" "+H} preserveAspectRatio="none">
      {[0,1,2,3,4].map(i=>{const y=PY+i*((H-PY*2)/4),v=hi-i*((hi-lo)/4);return <g key={i}><line x1={PX} x2={W-20} y1={y} y2={y}/><text x="8" y={y+4}>{v.toFixed(metric==="surface_pressure"?0:1)}</text></g>})}
      {pts.filter((_,i)=>i%Math.max(1,Math.floor(pts.length/6))===0).map((p,i)=><text key={"t"+i} x={p.x} y={H-8} textAnchor="middle" className="wg-market-time">{new Date(p.d.time).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</text>)}<path d={area} className="wg-market-area"/><path d={path} className="wg-market-line"/>{pts.length>0&&<><circle cx={pts.at(-1).x} cy={pts.at(-1).y} r="7" className="wg-market-live-pulse"/><circle cx={pts.at(-1).x} cy={pts.at(-1).y} r="4" className="wg-market-live-dot"/></>}
      {pts.filter((_,i)=>i%Math.max(1,Math.floor(pts.length/12))===0).map((p,i)=><circle key={i} cx={p.x} cy={p.y} r="3.5" className="wg-market-point" onMouseEnter={()=>setHover(p)} onMouseLeave={()=>setHover(null)}/>)}
      {hover&&<g><line x1={hover.x} x2={hover.x} y1={PY} y2={H-PY} className="wg-market-cross"/><rect x={Math.min(hover.x+8,W-180)} y="20" width="165" height="58" rx="8" className="wg-market-tooltip"/><text x={Math.min(hover.x+18,W-170)} y="42">{new Date(hover.d.time).toLocaleString([], {weekday:"short",hour:"2-digit",minute:"2-digit"})}</text><text x={Math.min(hover.x+18,W-170)} y="63">{Number(hover.v).toFixed(1)} {cfg[1]}</text></g>}
    </svg></div><div className="wg-market-footer"><span>Source: Open-Meteo · free live model telemetry</span><span>{data.length} hourly points · updated on reload</span></div>
  </div>;
}