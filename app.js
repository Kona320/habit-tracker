// dates
function toKey(d){
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth()+1).padStart(2,"0");
  const day = String(dt.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function todayKey(){ return toKey(new Date()); }
function last7Keys(){
  const out = []; const base = new Date();
  for(let i=6;i>=0;i--){ const d=new Date(base); d.setDate(base.getDate()-i); out.push(toKey(d)); }
  return out;
}

// storage
const STORAGE_KEY = "habits_v1";
function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return {habits:[]};
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.habits) ? parsed : {habits:[]};
  }catch{return {habits:[]}}
}
function saveState(s){ localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }

// model
function uid(){
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2);
}
function newHabit(name){
  // Added bestStreak property to store historical best
  return { id: uid(), name: String(name).trim(), createdOn: todayKey(), log:{}, bestStreak: 0 };
}

// Modified: compute current streak and best streak
function computeStreak(h){
  const allKeys = Object.keys(h.log).sort(); // chronological order
  let best = 0, current = 0, prev = null;

  allKeys.forEach(k=>{
    const d = new Date(k);
    if(prev){
      const diffDays = Math.round((d - prev)/(1000*60*60*24));
      if(diffDays === 1){
        current++;
      } else {
        if(current > best) best = current;
        current = 1;
      }
    } else {
      current = 1;
    }
    prev = d;
  });
  if(current > best) best = current;

  // update stored bestStreak
  h.bestStreak = Math.max(h.bestStreak || 0, best);
  return { current, best: h.bestStreak };
}

// dom
const rows = document.getElementById("rows");
const weekRange = document.getElementById("week-range");

// state
let state = loadState();
const weekKeys = last7Keys();
weekRange.textContent = `${weekKeys[0]} to ${weekKeys[6]}`;

// render
function render(){
  rows.innerHTML = "";

  if(state.habits.length === 0){
    const row = document.createElement("div");
    row.setAttribute("style","display:grid;grid-template-columns:1.6fr repeat(7,.9fr) 1fr 1fr;align-items:center;border-bottom:1px solid #eef2f6;");

    const nameCol = document.createElement("div");
    nameCol.setAttribute("style","padding:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;");
    nameCol.textContent = "No habits yet";
    row.appendChild(nameCol);

    weekKeys.forEach(()=>{
      const col = document.createElement("div");
      col.setAttribute("style","padding:10px;text-align:center;");
      row.appendChild(col);
    });

    const streakCol = document.createElement("div");
    streakCol.setAttribute("style","padding:10px;font-variant-numeric:tabular-nums;");
    streakCol.textContent = "0";
    row.appendChild(streakCol);

    const actionsCol = document.createElement("div");
    actionsCol.setAttribute("style","padding:10px;color:#66788a;");
    actionsCol.textContent = "Add a habit";
    row.appendChild(actionsCol);

    rows.appendChild(row);
    return;
  }

  state.habits.forEach(h => {
    const row = document.createElement("div");
    row.setAttribute("style","display:grid;grid-template-columns:1.6fr repeat(7,.9fr) 1fr 1fr;align-items:center;border-bottom:1px solid #eef2f6;");

    const nameCol = document.createElement("div");
    nameCol.setAttribute("style","padding:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;");
    nameCol.textContent = h.name;
    row.appendChild(nameCol);

    weekKeys.forEach(k => {
      const col = document.createElement("div");
      col.setAttribute("style","padding:10px;text-align:center;");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("aria-label", `${h.name} on ${k}`);
      btn.setAttribute("role", "checkbox");
      const checked = !!h.log[k];
      btn.setAttribute("aria-checked", String(checked));
      btn.textContent = checked ? "✓" : "";
      btn.dataset.habitId = h.id;
      btn.dataset.dateKey = k;
      btn.setAttribute(
        "style",
        "display:flex;align-items:center;justify-content:center;width:36px;height:36px;margin:auto;border-radius:8px;border:1px solid #dbe7f0;cursor:pointer;user-select:none;background:"+(checked?"#e9f8ef":"#fff")+";color:"+(checked?"#1e9e4a":"inherit")+";font-weight:"+(checked?"700":"400")+";"
      );
      btn.addEventListener("click", onToggleDay);
      btn.addEventListener("keydown", e => { if(e.key === " " || e.key === "Enter"){ e.preventDefault(); btn.click(); } });
      col.appendChild(btn);
      row.appendChild(col);
    });

    // Modified: display current and best streak
    const streakCol = document.createElement("div");
    const { current, best } = computeStreak(h);
    streakCol.setAttribute("style","padding:10px;font-variant-numeric:tabular-nums;");
    streakCol.textContent = `🔥 ${current}/${best}`;
    row.appendChild(streakCol);

    const actions = document.createElement("div");
    actions.setAttribute("style","padding:10px;display:flex;gap:8px;flex-wrap:wrap;");

    const tick = document.createElement("button");
    tick.type = "button";
    tick.textContent = "Tick today";
    tick.setAttribute("style","background:#fff;border:1px solid #dbe7f0;color:#0b3b58;padding:6px 10px;border-radius:8px;cursor:pointer;");
    tick.addEventListener("click", () => toggleLog(h.id, todayKey()));

    const del = document.createElement("button");
    del.type = "button";
    del.textContent = "Delete";
    del.setAttribute("style","background:#fff;border:1px solid #f2c9cd;color:#c71f23;padding:6px 10px;border-radius:8px;cursor:pointer;");
    del.addEventListener("click", () => {
      if(confirm(`Delete habit "${h.name}"?`)){
        state.habits = state.habits.filter(x => x.id !== h.id);
        saveState(state);
        render();
      }
    });

    actions.appendChild(tick);
    actions.appendChild(del);
    row.appendChild(actions);

    rows.appendChild(row);
  });
}

// actions
function onToggleDay(e){
  const btn = e.currentTarget;
  const habitId = btn.dataset.habitId;
  const dateKey = btn.dataset.dateKey;
  toggleLog(habitId, dateKey);
}
function toggleLog(habitId, dateKey){
  const h = state.habits.find(x => x.id === habitId);
  if(!h) return;
  if(h.log[dateKey]) delete h.log[dateKey]; else h.log[dateKey] = true;
  saveState(state);
  render();
}

// add habit
document.getElementById("habit-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("habit-name");
  const name = input.value.trim();
  if(!name) return;
  state.habits.push(newHabit(name));
  saveState(state);
  input.value = "";
  render();
});

// export
document.getElementById("export-json").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state,null,2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "habits-export.json"; a.click();
  URL.revokeObjectURL(url);
});

// import
document.getElementById("import-json").addEventListener("change", async (e) => {
  const file = e.target.files?.[0]; if(!file) return;
  try{
    const text = await file.text();
    const data = JSON.parse(text);
    if(!Array.isArray(data.habits)) throw new Error("Invalid format");
    state = data;
    saveState(state);
    render();
    alert("Import complete");
  }catch{
    alert("Import failed. Please check the JSON file.");
  }
  e.target.value = "";
});

// reset
document.getElementById("reset-all").addEventListener("click", () => {
  if(!confirm("Remove all habits and logs from this browser?")) return;
  state = {habits:[]};
  saveState(state);
  render();
});

render();
