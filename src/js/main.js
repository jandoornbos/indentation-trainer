import { load, save, freshState } from "./storage.js";
import { makeMessy, check } from "./indent.js";
import { createEditor } from "./editor.js";

const $ = (id) => document.getElementById(id);

// ---------- Opgaven laden ----------
const data = await fetch("data/exercises.json").then(r => r.json());
const EXERCISES = data.exercises.map(ex => ({ ...ex, code: ex.code.join("\n") }));
const REFLECT_NEAT = data.reflection.neat.join("\n");
const REFLECT_MESSY = data.reflection.messy.join("\n");

let state = load();

// ---------- Schermen ----------
function show(name) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  $("s-" + name).classList.add("active");
  state.screen = name; save(state);
  window.scrollTo(0, 0);
}

function renderProgress(el, current) {
  el.innerHTML = "";
  EXERCISES.forEach((_, i) => {
    const s = document.createElement("span");
    s.textContent = i + 1;
    if (i < current) s.className = "done";
    if (i === current) s.className = "now";
    el.appendChild(s);
  });
  const r = document.createElement("span");
  r.textContent = "Reflectie";
  if (current === EXERCISES.length) r.className = "now";
  el.appendChild(r);
}

// ---------- Opgave ----------
const editor = createEditor($("code"), $("gutter"), (text) => {
  state.drafts[state.ex] = text; save(state);
});

function loadExercise(i) {
  state.ex = i; save(state);
  const ex = EXERCISES[i];
  renderProgress($("progress"), i);
  $("ex-lang").textContent = ex.lang;
  $("ex-title").textContent = ex.title;
  $("ex-intro").textContent = ex.intro;
  $("ex-hint").textContent = ex.hint;
  $("feedback").className = "feedback";
  document.querySelector("details.hint").open = false;
  editor.setValue(state.drafts[i] != null ? state.drafts[i] : makeMessy(ex, i));
  setCheckButton(false);
  show("ex");
}

function setCheckButton(next) {
  const b = $("btn-check");
  b.dataset.next = next ? "1" : "";
  b.textContent = next
    ? (state.ex === EXERCISES.length - 1 ? "Naar de laatste vraag" : `Naar opgave ${state.ex + 2}`)
    : "Controleer";
}

function feedback(kind, html) {
  const f = $("feedback");
  f.className = "feedback show " + kind;
  f.innerHTML = html;
}

$("btn-check").addEventListener("click", () => {
  if ($("btn-check").dataset.next) {
    if (state.ex < EXERCISES.length - 1) loadExercise(state.ex + 1);
    else openReflection();
    return;
  }
  const r = check(EXERCISES[state.ex], editor.value);
  if (r.type === "ok") {
    editor.markLines([]);
    feedback("good", `<p><strong>Klopt helemaal.</strong> Je hebt overal ${r.unit} spaties per stap gebruikt.</p>`);
    setCheckButton(true);
    $("btn-check").focus();
  } else if (r.type === "content") {
    editor.markLines([r.line]);
    feedback("bad", `<p><strong>De code zelf is veranderd bij regel ${r.line}.</strong></p><p>Je mag alleen spaties aan het begin van een regel aanpassen. Draai je wijziging terug met <kbd>Ctrl</kbd> + <kbd>Z</kbd>, of begin opnieuw met deze code.</p>`);
  } else if (r.type === "tabs") {
    editor.markLines(r.lines);
    feedback("bad", `<p><strong>Er staan tabs in plaats van spaties</strong> (regel ${r.lines.join(", ")}).</p><p>Gebruik spaties. De Tab-toets in deze editor zet automatisch 2 spaties neer.</p>`);
  } else {
    editor.markLines(r.lines);
    const n = r.lines.length;
    feedback("bad", `<p><strong>${n === 1 ? "Eén regel staat" : n + " regels staan"} nog niet goed:</strong> regel ${r.lines.join(", ")}.</p><p>Vraag je per regel af: binnen welk element (of welke <code>{ }</code>) staat deze regel? Elke stap dieper is ${r.unit} spaties extra.</p>`);
  }
});

$("btn-reset").addEventListener("click", () => {
  delete state.drafts[state.ex]; save(state);
  loadExercise(state.ex);
});

// ---------- Reflectie ----------
let neatSide = 0, chosen = null;
function openReflection() {
  state.ex = EXERCISES.length; save(state);
  renderProgress($("progress2"), EXERCISES.length);
  neatSide = Math.random() < 0.5 ? 0 : 1;
  const versions = neatSide === 0 ? [REFLECT_NEAT, REFLECT_MESSY] : [REFLECT_MESSY, REFLECT_NEAT];
  const wrap = $("compare"); wrap.innerHTML = "";
  chosen = null;
  ["Code A", "Code B"].forEach((name, i) => {
    const lab = document.createElement("label");
    lab.className = "choice";
    lab.innerHTML = `<input type="radio" name="pick" value="${i}"><div class="head"><span>${name}</span><span class="dot"></span></div><pre></pre>`;
    lab.querySelector("pre").textContent = versions[i];
    lab.querySelector("input").addEventListener("change", () => {
      chosen = i;
      wrap.querySelectorAll(".choice").forEach((c, j) => c.classList.toggle("selected", j === i));
      updateSubmit();
    });
    wrap.appendChild(lab);
  });
  $("motivation").value = "";
  updateSubmit();
  show("reflect");
}

const words = (t) => (t.trim().match(/\S+/g) || []).length;
function updateSubmit() {
  const w = words($("motivation").value);
  $("count").textContent = w >= 10 ? `${w} woorden` : `Schrijf minimaal 10 woorden (nu ${w}).`;
  $("btn-submit").disabled = !(chosen !== null && w >= 10);
}
$("motivation").addEventListener("input", updateSubmit);

$("btn-submit").addEventListener("click", () => {
  if (chosen === neatSide) openSurprise();
  else { state.drafts = {}; save(state); show("retry"); }
});

$("btn-retry").addEventListener("click", () => { state.drafts = {}; loadExercise(0); });

// ---------- Verrassing ----------
function detectOS() {
  const p = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || navigator.userAgent;
  if (/mac|iphone|ipad/i.test(p)) return "mac";
  if (/linux|x11|cros/i.test(p) && !/android/i.test(p)) return "linux";
  return "win";
}
function openSurprise() {
  const os = detectOS();
  const keys = { win: ["Shift", "Alt", "F"], mac: ["Shift", "Option", "F"], linux: ["Ctrl", "Shift", "I"] }[os];
  const names = { win: "Windows", mac: "macOS", linux: "Linux" };
  $("shortcut").innerHTML = keys.map(k => `<kbd>${k}</kbd>`).join('<span class="plus">+</span>');
  $("os-note").textContent = `Dit is de sneltoets voor ${names[os]}. Op een andere computer? Kijk in de tabel.`;
  document.querySelectorAll("#os-table tr").forEach(tr => tr.classList.toggle("mine", tr.dataset.os === os));
  const c = $("confetti"); c.innerHTML = "";
  const colors = ["#F4C430", "#2349A8", "#23805A", "#C4372C", "#8FB0FF"];
  for (let i = 0; i < 60; i++) {
    const b = document.createElement("i");
    b.style.left = Math.random() * 100 + "%";
    b.style.background = colors[i % colors.length];
    b.style.animationDelay = (Math.random() * 0.8) + "s";
    c.appendChild(b);
  }
  show("surprise");
}

$("btn-again").addEventListener("click", () => { state = freshState(); save(state); show("start"); });
$("btn-start").addEventListener("click", () => loadExercise(0));

// ---------- Start ----------
if (state.screen === "ex") loadExercise(Math.min(state.ex, EXERCISES.length - 1));
else if (state.screen === "reflect") openReflection();
else if (state.screen === "retry") show("retry");
else if (state.screen === "surprise") openSurprise();
else show("start");
