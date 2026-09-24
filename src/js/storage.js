// Voortgang per browser, bewaard in localStorage
const KEY = "inspring-trainer-v1";

export const freshState = () => ({ screen: "start", ex: 0, drafts: {} });

export function load() {
  try { return Object.assign(freshState(), JSON.parse(localStorage.getItem(KEY)) || {}); }
  catch (e) { return freshState(); }
}

export function save(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
}
