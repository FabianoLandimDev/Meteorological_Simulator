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

export function detectSpeci(prev, curr) {
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
