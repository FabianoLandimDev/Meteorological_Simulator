/*
  Cenários são intencionalmente descritos como estados meteorológicos.
  O encoder METAR trabalha depois sobre o estado, evitando "sortear strings METAR".
*/

export const SCENARIOS = {
  clear: {
    label: "Condição estável / boa visibilidade",
    phase: "estável",
    durationMin: 180,
    start: {
      windDir: 090, windSpeed: 06, gust: 0,
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
      windDir: 090, windSpeed: 07, gust: 0,
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
      windDir: 100, windSpeed: 08, gust: 0,
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
      windDir: 030, windSpeed: 03, gust: 0,
      visibility: 5000, minVisibility: null, minDirection: null,
      weather: ["BR"], recent: [], clouds: [
        {amount:"SCT", baseM:450, type:null}
      ],
      temp: 19, dew: 18, qnh: 1019, rvr: null, vertical: null,
      windShear: null, instability: 10
    }
  }
};

export function listScenarios() {
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

export function evolveScenario(id, minutes, base) {
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
    state.instability = clamp(15 + m*.08, 10, 30);
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
