// Rommelige versie maken en de ingesprongen code controleren

export const indentOf = (line) => (line.match(/^[ \t]*/) || [""])[0];

function seeded(seed) { let s = seed; return () => (s = (s * 9301 + 49297) % 233280) / 233280; }

// Regels uit ex.join (0-based index) worden achter de vorige regel geplakt
function joinLines(ex) {
  const join = ex.join || [];
  const out = [];
  ex.code.split("\n").forEach((l, n) => {
    if (join.includes(n) && out.length) out[out.length - 1].text += " " + l.trim();
    else out.push({ text: l, correct: indentOf(l).length });
  });
  return out;
}

export function makeMessy(ex, i) {
  const lines = joinLines(ex);
  if (ex.mess === "flat") return lines.map(l => l.text.trim()).join("\n");
  const rnd = seeded(i * 7 + 3);
  const options = [0, 1, 2, 3, 4, 5, 6, 8];
  return lines.map(({ text, correct }, n) => {
    if (!text.trim()) return "";
    let pick = options[Math.floor(rnd() * options.length)];
    if (n > 0 && pick === correct) pick = (pick + 3) % 9;
    return " ".repeat(pick) + text.trim();
  }).join("\n");
}

// Begin- en eindpositie van elke regel als alle regels met één spatie aan elkaar staan
function spans(texts) {
  let pos = 0;
  return texts.map(t => { const s = [pos, pos + t.length]; pos += t.length + 1; return s; });
}

export function check(ex, text) {
  const exp = ex.code.split("\n").filter(l => l.trim()).map(l => ({ t: l.trim(), depth: indentOf(l).length / 2 }));
  const got = text.split("\n").map((l, i) => ({ raw: l.replace(/\s+$/, ""), no: i + 1 })).filter(l => l.raw.trim());

  // Inhoud mag niet veranderd zijn (regels opsplitsen of samenvoegen mag wel)
  const expFlat = exp.map(e => e.t).join(" ");
  let prefix = "";
  for (const g of got) {
    prefix += (prefix ? " " : "") + g.raw.trim();
    if (!expFlat.startsWith(prefix)) return { type: "content", line: g.no };
  }
  if (prefix !== expFlat) return { type: "content", line: got.length ? got[got.length - 1].no : 1 };

  // Elke regel moet precies één regel van de oplossing zijn
  const expSpans = new Set(spans(exp.map(e => e.t)).map(s => s.join()));
  const gotSpans = spans(got.map(g => g.raw.trim()));
  const split = got.filter((g, i) => !expSpans.has(gotSpans[i].join())).map(g => g.no);
  if (split.length) return { type: "split", lines: split };

  // Geen tabs
  const tabLines = got.filter(g => indentOf(g.raw).includes("\t")).map(g => g.no);
  if (tabLines.length) return { type: "tabs", lines: tabLines };

  // Stapgrootte bepalen: 2 of 4 spaties
  let unit = 2;
  const firstIdx = exp.findIndex(e => e.depth > 0);
  if (firstIdx >= 0) {
    const u = indentOf(got[firstIdx].raw).length / exp[firstIdx].depth;
    if (u === 2 || u === 4) unit = u;
  }
  const wrong = [];
  got.forEach((g, i) => { if (indentOf(g.raw).length !== exp[i].depth * unit) wrong.push(g.no); });
  return wrong.length ? { type: "indent", lines: wrong, unit } : { type: "ok", unit };
}
