import { normalizeForCompare, encodeMetar } from "./metar.js";

function tokenize(s) {
  return normalizeForCompare(s).replace("=", " =").split(/\s+/).filter(Boolean);
}

export function validateStudent(input, expected) {
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

export function explainExpected(state, meta) {
  return encodeMetar(meta, state, "METAR");
}
