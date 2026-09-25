export const AERODROMES = [
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

export function getAerodrome(icao) {
  return AERODROMES.find(a => a.icao === icao) ?? AERODROMES[0];
}
