import { AERODROMES, getAerodrome } from "./aerodromes.js";
import { SCENARIOS, listScenarios, evolveScenario } from "./scenarios.js";
import { encodeMetar } from "./metar.js";
import { detectSpeci } from "./speci.js";
import { validateStudent } from "./validator.js";

const $ = id => document.getElementById(id);

const els = {
  aerodrome:$("aerodrome"), scenario:$("scenario"), speed:$("speed"), mode:$("mode"),
  btnStart:$("btnStart"), btnPause:$("btnPause"), btnStep:$("btnStep"),
  btnMetar:$("btnMetar"), btnSpeci:$("btnSpeci"), btnNew:$("btnNew"),
  btnClear:$("btnClear"), btnCopy:$("btnCopy"), btnCheck:$("btnCheck"), btnExport:$("btnExport"),
  simStatus:$("simStatus"), stationTitle:$("stationTitle"), utcClock:$("utcClock"),
  wind:$("wind"), gust:$("gust"), visibility:$("visibility"), minVis:$("minVis"),
  weather:$("weather"), recent:$("recent"), clouds:$("clouds"), vertical:$("vertical"),
  temp:$("temp"), dew:$("dew"), qnh:$("qnh"), qfe:$("qfe"),
  rvr:$("rvr"), ws:$("ws"), phase:$("phase"), instability:$("instability"),
  messageBox:$("messageBox"), studentArea:$("studentArea"), studentInput:$("studentInput"),
  feedback:$("feedback"), speciDecision:$("speciDecision"), speciReasons:$("speciReasons"),
  timeline:$("timeline"), history:$("history")
};

let sim = {
  running:false, paused:false, timer:null, speed:10,
  minutes:0, base:null, current:null, previous:null, scenarioId:"convective",
  aerodrome:"SBJF", startDate:new Date(), history:[], timeline:[]
};

function utcStamp(date) {
  const d = date instanceof Date ? date : new Date(date);
  const dd=String(d.getUTCDate()).padStart(2,"0");
  const hh=String(d.getUTCHours()).padStart(2,"0");
  const mm=String(d.getUTCMinutes()).padStart(2,"0");
  return `${dd}${hh}${mm}Z`;
}
function simDate() {
  const d=new Date(sim.startDate.getTime()+sim.minutes*60000);
  return {date:d, stamp:utcStamp(d)};
}
function fmtVis(v) { return v >= 9999 ? "≥ 10 km" : `${Math.round(v)} m`; }
function fmtWeather(w) { return w?.length ? w.join(" ") : "—"; }
function fmtClouds(c) {
  if (!c?.length) return "NSC";
  return c.map(x=>`${x.amount} ${Math.round(x.baseM)} m${x.type?` ${x.type}`:""}`).join(" · ");
}

function initSelectors() {
  els.aerodrome.innerHTML=AERODROMES.map(a=>`<option value="${a.icao}">${a.icao} — ${a.name}</option>`).join("");
  els.scenario.innerHTML=listScenarios().map(s=>`<option value="${s.id}">${s.label}</option>`).join("");
  els.aerodrome.value=sim.aerodrome;
  els.scenario.value=sim.scenarioId;
}

function resetSimulation() {
  stopTimer();
  sim.minutes=0;
  sim.previous=null;
  sim.scenarioId=els.scenario.value;
  sim.aerodrome=els.aerodrome.value;
  sim.startDate=new Date();
  const scenario=SCENARIOS[sim.scenarioId];
  sim.base=structuredClone(scenario.start);
  sim.current=evolveScenario(sim.scenarioId,0,sim.base);
  sim.timeline=[];
  render();
  renderMessage("");
  renderSpeci({trigger:false,reasons:["Aguardando evolução da simulação."]});
  setStatus("idle","PARADO");
}

function setStatus(cls,label) {
  els.simStatus.className=`status-pill ${cls}`;
  els.simStatus.textContent=label;
}

function startTimer() {
  if (sim.running) return;
  sim.running=true; sim.paused=false;
  setStatus("run","EXECUTANDO");
  tick();
  sim.timer=setInterval(tick,1000);
}
function stopTimer() {
  sim.running=false; sim.paused=false;
  if (sim.timer) clearInterval(sim.timer);
  sim.timer=null;
}
function tick() {
  if (!sim.running || sim.paused) return;
  step(1);
}
function step(minutes) {
  sim.previous=structuredClone(sim.current);
  sim.minutes += minutes * Number(els.speed.value);
  sim.current=evolveScenario(sim.scenarioId,sim.minutes,sim.base);
  sim.timeline.push({minutes:sim.minutes,state:structuredClone(sim.current)});
  if (sim.timeline.length>24) sim.timeline.shift();
  render();
  const decision=detectSpeci(sim.previous,sim.current);
  renderSpeci(decision);
  if (decision.trigger) {
    renderMessage(encode("SPECI"));
    addHistory("SPECI",encode("SPECI"));
  } else if (sim.minutes % 30 === 0) {
    renderMessage(encode("METAR"));
    addHistory("METAR",encode("METAR"));
  }
}

function encode(type="METAR") {
  const a=getAerodrome(sim.aerodrome);
  const sd=simDate();
  const date=sd.stamp;
  const state=structuredClone(sim.current);
  state.runway=a.runway?.split("/")[0] || "09";
  return encodeMetar({icao:a.icao,date},state,type);
}

function render() {
  const a=getAerodrome(sim.aerodrome);
  const s=sim.current;
  const sd=simDate();
  els.stationTitle.textContent=`${a.icao} — ${a.name}`;
  els.utcClock.textContent=sd.date.toISOString().slice(0,16).replace("T"," ")+"Z";
  els.wind.textContent=`${String(Math.round(s.windDir/10)*10 % 360).padStart(3,"0")}° / ${Math.round(s.windSpeed)} kt`;
  els.gust.textContent=s.gust ? `Rajada ${Math.round(s.gust)} kt` : "Sem rajada reportável";
  els.visibility.textContent=fmtVis(s.visibility);
  els.minVis.textContent=s.minVisibility ? `Mín. ${Math.round(s.minVisibility)} m ${s.minDirection||""}` : "Sem mínima adicional";
  els.weather.textContent=fmtWeather(s.weather);
  els.recent.textContent=s.recent?.length ? `Recente: ${s.recent.join(" ")}` : "Sem tempo recente";
  els.clouds.textContent=fmtClouds(s.clouds);
  els.vertical.textContent=s.vertical!=null ? `VV ${Math.round(s.vertical)} m` : "VV não aplicável";
  els.temp.textContent=`${Math.round(s.temp)} °C`;
  els.dew.textContent=`Td ${Math.round(s.dew)} °C`;
  els.qnh.textContent=`QNH ${Math.floor(s.qnh)} hPa`;
  els.qfe.textContent=`QFE estimado ${qfe(s.qnh,a.elevationM)} hPa`;
  els.rvr.textContent=s.rvr!=null ? `${Math.round(s.rvr)} m` : "Não aplicável";
  els.ws.textContent=s.windShear || "Não reportado";
  els.phase.textContent=s.phase || "—";
  els.instability.textContent=Math.round(s.instability);
  renderTimeline();
}

function qfe(qnh,elev) {
  const p=qnh*Math.pow(1-0.0065*(elev/288.15),5.25588);
  return Math.round(p);
}

function renderTimeline() {
  els.timeline.innerHTML=sim.timeline.length ? sim.timeline.map((x,i)=>{
    const d=new Date(sim.startDate.getTime()+x.minutes*60000);
    return `<div class="timeline-item ${i===sim.timeline.length-1?"current":""}">
      <time>${d.toISOString().slice(11,16)}Z</time>
      <b>${x.state.phase}</b>
      <small>${fmtVis(x.state.visibility)} · ${fmtWeather(x.state.weather)}</small>
    </div>`;
  }).join("") : `<div class="timeline-item"><small>A evolução aparecerá aqui.</small></div>`;
}

function renderMessage(message) {
  els.messageBox.textContent=message || "Aguardando geração da mensagem...";
}
function renderSpeci(d) {
  els.speciDecision.textContent=d.trigger ? "SPECI INDICADO" : "Sem critério detectado";
  els.speciDecision.style.color=d.trigger ? "var(--yellow)" : "var(--green)";
  els.speciReasons.textContent=d.reasons.join(" ");
}
function addHistory(type,message) {
  sim.history.unshift({type,message,time:new Date().toISOString()});
  sim.history=sim.history.slice(0,50);
  localStorage.setItem("meteo-opmet-history",JSON.stringify(sim.history));
  renderHistory();
}
function renderHistory() {
  els.history.innerHTML=sim.history.length ? sim.history.map(x=>`
    <div class="history-row"><div class="type">${x.type}</div><code>${x.message}</code></div>
  `).join("") : `<div class="history-row"><div class="type">INFO</div><code>Nenhuma mensagem ainda.</code></div>`;
}

els.btnStart.onclick=()=>startTimer();
els.btnPause.onclick=()=>{
  sim.paused=!sim.paused;
  if (sim.paused) setStatus("pause","PAUSADO");
  else { setStatus("run","EXECUTANDO"); if (!sim.running) startTimer(); }
};
els.btnStep.onclick=()=>{ if(!sim.running) { sim.running=true; step(10); sim.running=false; setStatus("idle","PARADO"); } };
els.btnMetar.onclick=()=>{ const m=encode("METAR"); renderMessage(m); addHistory("METAR",m); };
els.btnSpeci.onclick=()=>renderSpeci(detectSpeci(sim.previous,sim.current));
els.btnNew.onclick=resetSimulation;
els.aerodrome.onchange=resetSimulation;
els.scenario.onchange=resetSimulation;
els.speed.onchange=()=>{ sim.speed=Number(els.speed.value); };
els.mode.onchange=()=>{
  els.studentArea.classList.toggle("hidden",els.mode.value!=="student");
  if (els.mode.value==="student") renderMessage("Condições disponíveis. Confeccione o METAR.");
};
els.btnCopy.onclick=async()=>{ await navigator.clipboard.writeText(els.messageBox.textContent); els.btnCopy.textContent="Copiado"; setTimeout(()=>els.btnCopy.textContent="Copiar",900); };
els.btnCheck.onclick=()=>{
  const expected=encode("METAR");
  const r=validateStudent(els.studentInput.value,expected);
  els.feedback.className=`feedback ${r.ok?"ok":"bad"}`;
  els.feedback.textContent=r.ok ? "✓ Resposta correta." : "✗ "+r.issues.slice(0,5).join(" ");
};
els.btnClear.onclick=()=>{
  if(confirm("Apagar o histórico local?")){
    sim.history=[]; localStorage.removeItem("meteo-opmet-history"); renderHistory();
  }
};
els.btnExport.onclick=()=>{
  const data={exportedAt:new Date().toISOString(),aerodrome:sim.aerodrome,scenario:sim.scenarioId,timeline:sim.timeline,history:sim.history};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="meteo-opmet-sessao.json"; a.click();
  URL.revokeObjectURL(a.href);
};

function loadHistory() {
  try { sim.history=JSON.parse(localStorage.getItem("meteo-opmet-history")||"[]"); }
  catch { sim.history=[]; }
}

initSelectors();
loadHistory();
resetSimulation();
renderHistory();
