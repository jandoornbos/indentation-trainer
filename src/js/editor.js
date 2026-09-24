// Code-editor: textarea met regelnummers en Tab / Shift+Tab om in te springen

export function createEditor(ta, gutter, onChange) {
  let badLines = [];

  function renderGutter() {
    const n = ta.value.split("\n").length;
    let html = "";
    for (let i = 1; i <= n; i++) html += `<div${badLines.includes(i) ? ' class="bad"' : ""}>${i}</div>`;
    gutter.innerHTML = html;
    gutter.scrollTop = ta.scrollTop;
  }
  ta.addEventListener("scroll", () => { gutter.scrollTop = ta.scrollTop; });
  ta.addEventListener("input", () => {
    badLines = []; renderGutter();
    onChange(ta.value);
  });

  function replaceRange(start, end, text) {
    ta.focus();
    ta.setSelectionRange(start, end);
    let ok = false;
    try { ok = document.execCommand("insertText", false, text); } catch (e) {}
    if (!ok) ta.setRangeText(text, start, end, "end");
    ta.dispatchEvent(new Event("input"));
  }

  let escaped = false;
  ta.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { escaped = true; return; }
    if (e.key !== "Tab") { escaped = false; return; }
    if (escaped) { escaped = false; return; } // laat Tab de focus verplaatsen
    e.preventDefault();
    const v = ta.value, s = ta.selectionStart, en = ta.selectionEnd;
    if (s === en && !e.shiftKey) {
      replaceRange(s, s, "  ");
      return;
    }
    const lineStart = v.lastIndexOf("\n", s - 1) + 1;
    let blockEnd = (en > s && v[en - 1] === "\n") ? en - 1 : en;
    const nl = v.indexOf("\n", blockEnd);
    blockEnd = nl === -1 ? v.length : nl;
    const lines = v.slice(lineStart, blockEnd).split("\n");
    let firstDelta = 0, total = 0;
    const out = lines.map((l, i) => {
      let d;
      if (e.shiftKey) {
        const rm = l.startsWith("\t") ? 1 : (l.match(/^ {0,2}/) || [""])[0].length;
        d = -rm; l = l.slice(rm);
      }
      else { d = 2; l = "  " + l; }
      if (i === 0) firstDelta = d;
      total += d; return l;
    });
    replaceRange(lineStart, blockEnd, out.join("\n"));
    const newStart = Math.max(lineStart, s + firstDelta);
    const newEnd = s === en ? newStart : Math.max(newStart, en + total);
    ta.setSelectionRange(newStart, newEnd);
  });

  return {
    get value() { return ta.value; },
    setValue(text) {
      ta.value = text;
      badLines = []; renderGutter();
      ta.scrollTop = 0; ta.scrollLeft = 0;
    },
    markLines(lines) { badLines = lines; renderGutter(); },
  };
}
