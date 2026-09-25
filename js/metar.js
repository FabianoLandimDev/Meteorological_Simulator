/*
  Encoder baseado nas regras de codificação trabalhadas na APOSTILA_METEOROLOGIA
  (ICA 105-15 / 105-16 / 105-17, edição de referência do projeto).
  Este módulo é educacional: valide contra a publicação normativa vigente antes
  de qualquer utilização operacional.
*/

export function floorStep(value, step) {
  return Math.floor(value / step) * step;
}

export function encodeVisibility(m) {
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

export function encodeTempDew(t, td) {
  return `${encodeTemp(t)}/${encodeTemp(td)}`;
}

export function encodeWind(s) {
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

export function encodeClouds(clouds, vertical) {
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

export function encodeWeather(weather) {
  if (!weather?.length) return "";
  return weather.slice(0,3).join(" ");
}

function shouldCavok(s) {
  return s.visibility >= 10000 &&
    (!s.weather || s.weather.length === 0) &&
    (!s.clouds || !s.clouds.some(c => c.amount === "BKN" || c.amount === "OVC" || c.type === "CB" || c.type === "TCU")) &&
    s.vertical == null;
}

export function encodeMetar({icao, date, auto=false}, s, type="METAR") {
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

export function normalizeForCompare(metar) {
  return metar.replace(/\s+/g," ").trim().toUpperCase().replace(/=$/,"");
}
