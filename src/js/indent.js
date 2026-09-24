// Rommelige versie maken en de ingesprongen code controleren

export const indentOf = (line) => (line.match(/^[ \t]*/) || [""])[0];

function seeded(seed) { let s = seed; return () => (s = (s * 9301 + 49297) % 233280) / 233280; }

export function makeMessy(ex, i) {
  const lines = ex.code.split("\n");
  if (ex.mess === "flat") return lines.map(l => l.trim()).join("\n");
  const rnd = seeded(i * 7 + 3);
  const options = [0, 1, 2, 3, 4, 5, 6, 8];
  return lines.map((l, n) => {
    if (!l.trim()) return "";
    const correct = indentOf(l).length;
    let pick = options[Math.floor(rnd() * options.length)];
    if (n > 0 && pick === correct) pick = (pick + 3) % 9;
    return " ".repeat(pick) + l.trim();
  }).join("\n");
}

export function check(ex, text) {
  const exp = ex.code.split("\n").filter(l => l.trim()).map(l => ({ t: l.trim(), depth: indentOf(l).length / 2 }));
  const got = text.split("\n").map((l, i) => ({ raw: l.replace(/\s+$/, ""), no: i + 1 })).filter(l => l.raw.trim());

  // Inhoud mag niet veranderd zijn
  for (let i = 0; i < Math.max(exp.length, got.length); i++) {
    if (!exp[i] || !got[i] || exp[i].t !== got[i].raw.trim()) {
      const line = got[i] ? got[i].no : (got.length ? got[got.length - 1].no : 1);
      return { type: "content", line };
    }
  }
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
