/* METEO OPMET Simulator v2 - single-file browser bundle. */
"use strict";
window.__METEO_APP_READY__ = false;
const AERODROMES = [
  {
    icao: "SBJF",
    name: "Juiz de Fora / Francisco Álvares de Assis",
    elevationM: 911,
    runway: "03/21",
    climate: "interior-subtropical"
  },
  {
    icao: "SBCF",
    name: "Belo Horizonte / Confins",
    elevationM: 828,
    runway: "16/34",
    climate: "interior-tropical"
  },
  {
    icao: "SBSP",
    name: "São Paulo / Congonhas",
    elevationM: 802,
    runway: "17/35",
    climate: "urban-subtropical"
  }
];

function getAerodrome(icao) {
  return AERODROMES.find(a => a.icao === icao) ?? AERODROMES[0];
}

/*
  Cenários são intencionalmente descritos como estados meteorológicos.
  O encoder METAR trabalha depois sobre o estado, evitando "sortear strings METAR".
*/

const SCENARIOS = {
  clear: {
    label: "Condição estável / boa visibilidade",
    phase: "estável",
    durationMin: 180,
    start: {
      windDir: 90, windSpeed: 6, gust: 0,
      visibility: 9999, minVisibility: null, minDirection: null,
      weather: [], recent: [], clouds: [
        {amount:"FEW", baseM:750, type:null},
        {amount:"SCT", baseM:1500, type:null}
      ],
      temp: 24, dew: 18, qnh: 1018, rvr: null, vertical: null,
      windShear: null, instability: 15
    }
  },

  convective: {
    label: "Evolução convectiva",
    phase: "pré-convectivo",
    durationMin: 180,
    start: {
      windDir: 90, windSpeed: 7, gust: 0,
      visibility: 9999, minVisibility: null, minDirection: null,
      weather: [], recent: [], clouds: [
        {amount:"FEW", baseM:900, type:null},
        {amount:"SCT", baseM:1500, type:null}
      ],
      temp: 25, dew: 20, qnh: 1015, rvr: null, vertical: null,
      windShear: null, instability: 45
    }
  },

  frontal: {
    label: "Passagem de frente fria",
    phase: "pré-frontal",
    durationMin: 180,
    start: {
      windDir: 100, windSpeed: 8, gust: 0,
      visibility: 9999, minVisibility: null, minDirection: null,
      weather: [], recent: [], clouds: [
        {amount:"SCT", baseM:900, type:null},
        {amount:"BKN", baseM:2100, type:null}
      ],
      temp: 27, dew: 20, qnh: 1016, rvr: null, vertical: null,
      windShear: null, instability: 35
    }
  },

  fog: {
    label: "Formação e dissipação de nevoeiro",
    phase: "resfriamento",
    durationMin: 180,
    start: {
      windDir: 30, windSpeed: 3, gust: 0,
      visibility: 5000, minVisibility: null, minDirection: null,
      weather: ["BR"], recent: [], clouds: [
        {amount:"SCT", baseM:450, type:null}
      ],
      temp: 19, dew: 18, qnh: 1019, rvr: null, vertical: null,
      windShear: null, instability: 10
    }
  }
};

function listScenarios() {
  return Object.entries(SCENARIOS).map(([id, value]) => ({id, label:value.label}));
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function approach(a,b,f) { return a + (b-a)*f; }
function interpolate(start, end, f) {
  const s = structuredClone(start);
  for (const k of ["windDir","windSpeed","gust","visibility","temp","dew","qnh","instability"]) {
    if (end[k] !== undefined) s[k] = approach(start[k], end[k], f);
  }
  s.phase = end.phase ?? s.phase;
  s.weather = end.weather ?? s.weather;
  s.recent = end.recent ?? s.recent;
  s.clouds = end.clouds ?? s.clouds;
  s.minVisibility = end.minVisibility ?? null;
  s.minDirection = end.minDirection ?? null;
  s.rvr = end.rvr ?? null;
  s.vertical = end.vertical ?? null;
  s.windShear = end.windShear ?? null;
  return s;
}

function evolveScenario(id, minutes, base) {
  const state = structuredClone(base);
  const m = minutes;

  if (id === "clear") {
    state.phase = m < 60 ? "estável" : m < 120 ? "aquecimento" : "estável";
    state.windDir = (90 + m * 0.18) % 360;
    state.windSpeed = clamp(6 + m * 0.025, 5, 12);
    state.gust = 0;
    state.temp = 24 + Math.min(m / 120, 1.2);
    state.dew = 18 + Math.min(m / 180, .8);
    state.qnh = 1018 - Math.min(m / 300, 1.5);
    state.visibility = 9999;
    state.weather = [];
    state.clouds = [
      {amount:"FEW", baseM: Math.round((750 + m*2)/30)*30, type:null},
      {amount:"SCT", baseM: Math.round((1500 + m*3)/30)*30, type:null}
    ];
    state.instability = clamp(15 + m*.8, 10, 30);
  }

  if (id === "convective") {
    if (m < 45) {
      const f=m/45;
      state.phase="desenvolvimento de cúmulos";
      state.temp=25+f*2; state.dew=20+f*1.5;
      state.windDir=90+f*20; state.windSpeed=7+f*3;
      state.visibility=9999; state.weather=[];
      state.clouds=[
        {amount:"SCT", baseM:Math.max(300, Math.round((900-f*180)/30)*30), type:null},
        {amount:"SCT", baseM:Math.round((1500-f*300)/30)*30, type:"TCU"}
      ];
      state.instability=45+f*20;
    } else if (m < 85) {
      const f=(m-45)/40;
      state.phase="pancadas convectivas";
      state.windDir=110+f*25; state.windSpeed=10+f*5; state.gust=0;
      state.visibility=Math.round((9999-(f*4499))/100)*100;
      state.weather=["-SHRA"];
      state.clouds=[
        {amount:"SCT", baseM:Math.round(450/30)*30, type:null},
        {amount:"BKN", baseM:Math.round(900/30)*30, type:"CB"}
      ];
      state.instability=65+f*15;
    } else if (m < 120) {
      const f=(m-85)/35;
      state.phase="trovoada";
      state.windDir=135+f*35; state.windSpeed=15+f*4; state.gust=state.windSpeed+10;
      state.visibility=Math.round((5500-f*3300)/50)*50;
      state.weather=[f<.45 ? "-TSRA" : "+TSRA"];
      state.clouds=[
        {amount:"SCT", baseM:Math.round(300/30)*30, type:null},
        {amount:"BKN", baseM:Math.round(600/30)*30, type:"CB"}
      ];
      state.qnh=1015-f*5;
      state.instability=85;
    } else {
      const f=Math.min((m-120)/60,1);
      state.phase="dissipação";
      state.windDir=170+f*30; state.windSpeed=16-f*6; state.gust=Math.max(0,state.windSpeed+4);
      state.visibility=2200+f*7799;
      state.weather=f<.45 ? ["RA"] : [];
      state.clouds=[
        {amount:"SCT", baseM:Math.round((600+f*900)/30)*30, type:null},
        {amount:"BKN", baseM:Math.round((1200+f*1200)/30)*30, type:null}
      ];
      state.instability=85-f*55;
    }
  }

  if (id === "frontal") {
    if (m < 45) {
      const f=m/45;
      state.phase="aproximação frontal";
      state.windDir=100+f*25; state.windSpeed=8+f*4;
      state.qnh=1016-f*2;
      state.temp=27-f*.8; state.dew=20+f*.5;
      state.visibility=9999;
      state.weather=[];
      state.clouds=[
        {amount:"SCT", baseM:Math.round((900-f*240)/30)*30, type:null},
        {amount:"BKN", baseM:Math.round((2100-f*600)/30)*30, type:null}
      ];
    } else if (m < 80) {
      const f=(m-45)/35;
      state.phase="chuva frontal";
      state.windDir=125+f*35; state.windSpeed=12+f*5;
      state.qnh=1014-f*2; state.temp=26-f*1.5; state.dew=20.5+f*.5;
      state.visibility=Math.round((8500-f*4500)/100)*100;
      state.weather=["-RA"];
      state.clouds=[
        {amount:"BKN", baseM:Math.round((600-f*300)/30)*30, type:null},
        {amount:"OVC", baseM:Math.round((1200-f*300)/30)*30, type:null}
      ];
    } else if (m < 110) {
      const f=(m-80)/30;
      state.phase="passagem da frente";
      state.windDir=160+f*70; state.windSpeed=17+f*5; state.gust=state.windSpeed+10;
      state.qnh=1012-f*3; state.temp=24-f*2; state.dew=21-f*.2;
      state.visibility=Math.round((4000-f*1800)/50)*50;
      state.weather=["RA"];
      state.clouds=[
        {amount:"BKN", baseM:Math.round(300/30)*30, type:null},
        {amount:"OVC", baseM:Math.round(750/30)*30, type:null}
      ];
      state.windShear = "WS ALL RWY";
    } else {
      const f=Math.min((m-110)/70,1);
      state.phase="pós-frontal";
      state.windDir=230+f*25; state.windSpeed=22-f*8; state.gust=Math.max(0,state.windSpeed+5);
      state.qnh=1009+f*5; state.temp=22+f*1; state.dew=18+f*.5;
      state.visibility=2200+f*7799;
      state.weather=f<.35 ? ["-RA"] : [];
      state.clouds=[
        {amount:"SCT", baseM:Math.round((750+f*750)/30)*30, type:null},
        {amount:"BKN", baseM:Math.round((1500+f*1200)/30)*30, type:null}
      ];
      state.windShear = null;
    }
  }

  if (id === "fog") {
    if (m < 60) {
      const f=m/60;
      state.phase="resfriamento / aumento da umidade";
      state.windSpeed=Math.max(1,3-f*1.5);
      state.temp=19-f*2.5; state.dew=18-f*.4;
      state.visibility=Math.round((5000-f*3800)/50)*50;
      state.weather=["BR"];
      state.clouds=[{amount:"SCT",baseM:Math.round((450-f*300)/30)*30,type:null}];
    } else if (m < 110) {
      const f=(m-60)/50;
      state.phase="nevoeiro";
      state.windSpeed=1; state.temp=16.5-f*.5; state.dew=16.2-f*.2;
      state.visibility=Math.round((1200-f*950)/50)*50;
      state.weather=["FG"];
      state.vertical=Math.round((300-f*180)/30)*30;
      state.clouds=[];
    } else {
      const f=Math.min((m-110)/70,1);
      state.phase="dissipação do nevoeiro";
      state.windSpeed=1+f*4; state.windDir=30+f*50;
      state.temp=16+f*5; state.dew=16+f*2;
      state.visibility=250+f*9749;
      state.weather=f<.35 ? ["BR"] : [];
      state.vertical=null;
      state.clouds=[
        {amount:"BKN",baseM:Math.round((300+f*900)/30)*30,type:null},
        {amount:"SCT",baseM:Math.round((900+f*1200)/30)*30,type:null}
      ];
    }
  }

  // General physical consistency guards.
  state.windDir = ((state.windDir % 360) + 360) % 360;
  state.windSpeed = clamp(state.windSpeed, 0, 99);
  state.gust = state.gust && state.gust >= state.windSpeed + 10 ? state.gust : 0;
  state.dew = Math.min(state.dew, state.temp);
  state.qnh = clamp(state.qnh, 850, 1100);
  state.visibility = clamp(state.visibility, 0, 9999);
  state.clouds = (state.clouds || []).map(c => ({
    ...c,
    baseM: clamp(Math.floor(c.baseM/30)*30, 0, 3000)
  }));
  return state;
}

/*
  Encoder baseado nas regras de codificação trabalhadas na APOSTILA_METEOROLOGIA
  (ICA 105-15 / 105-16 / 105-17, edição de referência do projeto).
  Este módulo é educacional: valide contra a publicação normativa vigente antes
  de qualquer utilização operacional.
*/

function floorStep(value, step) {
  return Math.floor(value / step) * step;
}

function encodeVisibility(m) {
  if (m >= 10000) return "9999";
  if (m < 800) return String(floorStep(Math.max(0,m),50)).padStart(4,"0");
  if (m < 5000) return String(floorStep(m,100)).padStart(4,"0");
  if (m < 10000) return String(floorStep(m,1000)).padStart(4,"0");
  return "9999";
}

function encodeTemp(t) {
  const n = Math.floor(t + 0.5);
  if (n < 0) return "M" + String(Math.abs(n)).padStart(2,"0");
  return String(n).padStart(2,"0");
}

function encodeTempDew(t, td) {
  return `${encodeTemp(t)}/${encodeTemp(td)}`;
}

function encodeWind(s) {
  let speed = Math.round(s.windSpeed);
  let dir = Math.round(s.windDir / 10) * 10;
  if (dir >= 360) dir = 0;

  if (speed < 1) return "00000KT";
  if (speed >= 100) return String(dir).padStart(3,"0") + "P99KT";

  let out = String(dir).padStart(3,"0") + String(speed).padStart(2,"0");
  if (s.gust && s.gust >= speed + 10) {
    out += "G" + String(Math.min(99, Math.round(s.gust))).padStart(2,"0");
  }
  return out + "KT";
}

function encodeClouds(clouds, vertical) {
  if (vertical !== null && vertical !== undefined) {
    const ftHundreds = Math.min(20, Math.floor((vertical * 3.28084) / 100));
    return `VV${String(ftHundreds).padStart(3,"0")}`;
  }
  if (!clouds?.length) return "NSC";

  const groups = clouds
    .slice()
    .sort((a,b)=>a.baseM-b.baseM)
    .map(c => {
      const h = Math.min(100, Math.floor((c.baseM / 30.48) / 100));
      return `${c.amount}${String(h).padStart(3,"0")}${c.type || ""}`;
    });
  return groups.slice(0,4).join(" ");
}

function encodeWeather(weather) {
  if (!weather?.length) return "";
  return weather.slice(0,3).join(" ");
}

function shouldCavok(s) {
  return s.visibility >= 10000 &&
    (!s.weather || s.weather.length === 0) &&
    (!s.clouds || !s.clouds.some(c => c.amount === "BKN" || c.amount === "OVC" || c.type === "CB" || c.type === "TCU")) &&
    s.vertical == null;
}

function encodeMetar({icao, date, auto=false}, s, type="METAR") {
  const parts = [];
  parts.push(type, icao, date);
  if (auto) parts.push("AUTO");
  parts.push(encodeWind(s));

  const cavok = shouldCavok(s);

  if (cavok) {
    parts.push("CAVOK");
  } else {
    parts.push(encodeVisibility(s.visibility));

    if (s.minVisibility != null && s.minVisibility < s.visibility &&
        (s.minVisibility < 1500 || (s.minVisibility < 0.5*s.visibility && s.minVisibility < 5000))) {
      parts.push(encodeVisibility(s.minVisibility) + (s.minDirection || ""));
    }

    if (s.rvr != null && s.rvr < 2000) {
      parts.push(`R${s.runway || "09"}/${encodeVisibility(s.rvr)}`);
    }

    const wx = encodeWeather(s.weather);
    if (wx) parts.push(wx);

    parts.push(encodeClouds(s.clouds, s.vertical));
  }

  parts.push(encodeTempDew(s.temp, s.dew));
  parts.push("Q" + String(Math.floor(s.qnh)).padStart(4,"0"));

  if (s.recent?.length) parts.push(...s.recent.slice(0,3));
  if (s.windShear) parts.push(s.windShear);

  return parts.join(" ") + "=";
}

function normalizeForCompare(metar) {
  return metar.replace(/\s+/g," ").trim().toUpperCase().replace(/=$/,"");
}

/*
  Detector de mudanças significativas para treinamento.
  Os limiares são parametrizados para que possam ser revisados sem alterar o
  motor meteorológico.
*/

const TH = {
  windDirChange: 60,
  windSpeedChange: 10,
  visCrossings: [1500, 5000],
  ceiling: [30,60,150,300,450],
  tempChange: 0 // não dispara isoladamente
};

function angularDiff(a,b) {
  return Math.abs(((a-b+180)%360)-180);
}

function ceiling(state) {
  const operational = (state.clouds || [])
    .filter(c => ["BKN","OVC"].includes(c.amount))
    .sort((a,b)=>a.baseM-b.baseM);
  return operational.length ? operational[0].baseM : null;
}

function crossed(a,b,level) {
  return (a > level && b <= level) || (a <= level && b > level);
}

function detectSpeci(prev, curr) {
  if (!prev) return {trigger:false, reasons:["Sem observação anterior."]};

  const reasons = [];

  const ddir = angularDiff(prev.windDir, curr.windDir);
  if (ddir >= TH.windDirChange && Math.max(prev.windSpeed,curr.windSpeed) >= 10) {
    reasons.push(`Mudança de direção do vento ≥ ${TH.windDirChange}° com vento operacional.`);
  }

  if (Math.abs(curr.windSpeed - prev.windSpeed) >= TH.windSpeedChange) {
    reasons.push(`Mudança da velocidade média do vento ≥ ${TH.windSpeedChange} kt.`);
  }

  if ((curr.gust || 0) >= 22 && (prev.gust || 0) < 22) {
    reasons.push("Rajada atingiu faixa de tempestade/squall relevante.");
  }

  for (const level of TH.visCrossings) {
    if (crossed(prev.visibility, curr.visibility, level)) {
      reasons.push(`Visibilidade cruzou o limiar de ${level} m.`);
    }
  }

  const prevCeil=ceiling(prev), currCeil=ceiling(curr);
  if (prevCeil != null && currCeil != null) {
    for (const level of TH.ceiling) {
      if (crossed(prevCeil,currCeil,level)) {
        reasons.push(`Teto operacional cruzou ${level} m.`);
        break;
      }
    }
  }

  const prevTS=(prev.weather||[]).some(x=>x.includes("TS"));
  const currTS=(curr.weather||[]).some(x=>x.includes("TS"));
  if (prevTS !== currTS) reasons.push("Início ou término de trovoada.");

  const prevFG=(prev.weather||[]).some(x=>x.includes("FG"));
  const currFG=(curr.weather||[]).some(x=>x.includes("FG"));
  if (prevFG !== currFG) reasons.push("Início ou término de nevoeiro.");

  const prevRA=(prev.weather||[]).some(x=>x.includes("RA"));
  const currRA=(curr.weather||[]).some(x=>x.includes("RA"));
  if (prevRA !== currRA) reasons.push("Mudança significativa de precipitação.");

  return {trigger: reasons.length > 0, reasons};
}


function tokenize(s) {
  return normalizeForCompare(s).replace("=", " =").split(/\s+/).filter(Boolean);
}

function validateStudent(input, expected) {
  const got = tokenize(input);
  const exp = tokenize(expected);
  const issues = [];

  if (got.length !== exp.length) {
    issues.push(`Quantidade de grupos diferente: esperado ${exp.length}, informado ${got.length}.`);
  }

  const n=Math.max(got.length, exp.length);
  for (let i=0;i<n;i++) {
    if (got[i] !== exp[i]) {
      issues.push(`Grupo ${i+1}: esperado "${exp[i] ?? "—"}"; informado "${got[i] ?? "—"}".`);
    }
  }

  return {ok: issues.length === 0, issues};
}

function explainExpected(state, meta) {
  return encodeMetar(meta, state, "METAR");
}


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

// v2 boot marker: set only after all selectors, handlers and initial state are ready.
window.__METEO_APP_READY__ = true;
window.dispatchEvent(new CustomEvent("meteo:ready"));
