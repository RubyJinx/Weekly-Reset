// Week order: Sunday -> Saturday
const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const ROLE_LABELS = { W:"Work + Gym", S:"School", A:"Admin / Life", R:"Recovery" };
const TARGETS = { W:[3,4], S:[2,2], A:[1,1], R:[1,1] };

// ---- Role-suggested task options (custom to your life) ----
const TASK_CATEGORIES = {
  universal: [
    "5 min: dishes",
    "5 min: clear one counter",
    "5 min: quick sweep / tidy one zone",
    "Gather cups/plates to sink",
    "Trash + recycling check",
    "Pick up trash (2 minutes)",
    "5-minute tidy (one zone only)",
    "Reset one surface (counter/desk/nightstand)",
    "Refill water bottle",
    "Meds/vitamins (if needed)",
    "Quick shower / rinse",
    "Lay out tomorrow clothes",
    "Lights low + candle/lamps (set the vibe)",
    "Answer one text/email",
    "Open calendar + check tomorrow",
    "Write a 3-item mini plan",
    "Set a timer for one task (10 min)",
  ],
  work: [
    "Prep uniform (clothes + name tag)",
    "Pack work bag (wallet/keys/charger/water)",
    "Set out shoes + socks",
    "Make / pack a snack for shift",
    "Check schedule + alarms",
  ],
  baileigh: [
    "Baileigh: potty break",
    "Baileigh: short walk",
    "Baileigh: medication",
    "Baileigh: refill water bowl",
    "Baileigh: quick brush / wipe paws",
  ],
  studio: [
    "Reset one surface (counter/desk/nightstand)",
    "Dishes: 5 minutes",
    "Trash + recycling check",
    "Quick sweep (one area)",
    "Gather cups/plates to sink",
    "Pick up trash (2 minutes)",
  ],
  laundry: [
    "Laundry: start a load",
    "Laundry: move to dryer",
    "Laundry: fold 10 minutes",
    "Laundry: put away one category (socks/shirts)",
  ],
  school: [
    "School: 10 min review",
    "School: open assignment + write 3 bullets",
    "School: submit one small thing",
    "School: organize one folder (5 min)",
  ],
  admin: [
    "Check bank balance (no action required)",
    "Pay/check one bill (or set reminder)",
    "Confirm next appointment / due date",
  ],
  recovery: [
    "5 min: breathe + lights low",
    "5 min: stretch",
    "5 min: step outside / fresh air",
    "Set the room vibe (candle/lamps/music)",
  ]
};

const ROLE_PRIORITY = {
  W: ["work","universal","baileigh","studio","laundry","admin","recovery","school"],
  S: ["school","universal","admin","laundry","baileigh","studio","recovery","work"],
  A: ["admin","studio","laundry","universal","baileigh","work","school","recovery"],
  R: ["recovery","baileigh","universal","studio","laundry","school","admin","work"],
  "": ["universal","baileigh","studio","laundry","school","admin","recovery","work"]
};

function uniquePreserve(arr){
  const seen = new Set();
  const out = [];
  for(const x of arr){
    if(!seen.has(x)){
      seen.add(x);
      out.push(x);
    }
  }
  return out;
}

function buildTaskOptionsForRole(role){
  const order = ROLE_PRIORITY[role] || ROLE_PRIORITY[""];
  const merged = [];
  for(const key of order){
    merged.push(...(TASK_CATEGORIES[key] || []));
  }
  return uniquePreserve(merged);
}

function pickRandomTask(role){
  const list = buildTaskOptionsForRole(role).filter(Boolean);
  return list[Math.floor(Math.random() * list.length)];
}

// ---------------- State ----------------
const state = {
  weekOf: "",
  days: DAYS.map(d => ({
    day: d,
    role: "",
    shift: "",
    gym: "",
    task: "",
    note: "",
    school: {
      course: "",
      focus: "",
      hours: 3,
      lightEnabled: false,
      lightFocus: "",
      lightHours: 1,
      intensity: "" // "Heavier" or "Lighter"
    }
  })),
  closingDuties: "",
  adminCircuit: "",
  collapse: "",
  closingSelected: [],
  adminSelected: []
};

// ---------------- DOM ----------------
const daysWrap = document.getElementById("days");
const schoolWrap = document.getElementById("schoolWrap");
const countsEl = document.getElementById("counts");
const statusBox = document.getElementById("statusBox");

const weekOfInput = document.getElementById("weekOf");
const closingInput = document.getElementById("closingDuties");
const adminInput = document.getElementById("adminCircuit");
const collapseInput = document.getElementById("collapse");

const closingPick = document.getElementById("closingPick");
const adminPick = document.getElementById("adminPick");

const scheduleBody = document.querySelector("#scheduleTable tbody");
const metaWeek = document.getElementById("metaWeek");
const metaUpdated = document.getElementById("metaUpdated");

const closingPreview = document.getElementById("closingPreview");
const adminPreview = document.getElementById("adminPreview");
const collapsePreview = document.getElementById("collapsePreview");

const schoolPreview = document.getElementById("schoolPreview");
const schoolPreviewEmpty = document.getElementById("schoolPreviewEmpty");

// Wizard
const steps = Array.from(document.querySelectorAll(".step"));
const progressDots = document.getElementById("progressDots");
const btnBack = document.getElementById("btnBack");
const btnNext = document.getElementById("btnNext");
let stepIndex = 0;

// ---------------- Helpers ----------------
function nowStamp(){ return new Date().toLocaleString(); }
function linesToList(text){ return text.split("\n").map(l=>l.trim()).filter(Boolean); }
function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;");
}
function el(tag, attrs = {}, children = []){
  const n = document.createElement(tag);
  Object.entries(attrs).forEach(([k,v])=>{
    if(k === "class") n.className = v;
    else if(k === "html") n.innerHTML = v;
    else n.setAttribute(k, v);
  });
  children.forEach(c => n.appendChild(c));
  return n;
}
function labelWrap(labelText, inputEl){
  const wrap = document.createElement("div");
  const lab = document.createElement("label");
  lab.textContent = labelText;
  wrap.appendChild(lab);
  wrap.appendChild(inputEl);
  return wrap;
}

// Step 5 selection helpers
function syncSelectionWithList(listLines, selectedArr){
  const set = new Set(selectedArr || []);
  return listLines.filter(x => set.has(x));
}
function renderPickbox(targetEl, listLines, selectedArr, onToggle){
  targetEl.innerHTML = "";
  if(listLines.length === 0){
    targetEl.innerHTML = `<div class="mini">No items in this list.</div>`;
    return;
  }
  const selected = new Set(selectedArr || []);
  listLines.forEach(line=>{
    const row = document.createElement("label");
    row.className = "pickitem";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = selected.has(line);
    cb.addEventListener("change", ()=> onToggle(line, cb.checked));

    const text = document.createElement("div");
    text.className = "text";
    text.innerHTML = cb.checked ? `<strong>${escapeHtml(line)}</strong>` : `${escapeHtml(line)}`;

    row.appendChild(cb);
    row.appendChild(text);
    targetEl.appendChild(row);
  });
}
function renderCheckedList(targetUl, selectedArr){
  targetUl.innerHTML = "";
  const items = (selectedArr || []).filter(Boolean);
  if(items.length === 0) return; // leave empty; section will hide
  items.forEach(item=>{
    const li = document.createElement("li");
    li.textContent = item;
    targetUl.appendChild(li);
  });
}
function setSectionVisibleByList(ulEl){
  const section = ulEl.closest(".board-section");
  if(!section) return;
  section.style.display = ulEl.children.length ? "" : "none";
}
function renderStep5Picklists(){
  const closingLines = linesToList(state.closingDuties || closingInput.value);
  const adminLines = linesToList(state.adminCircuit || adminInput.value);

  state.closingSelected = syncSelectionWithList(closingLines, state.closingSelected);
  state.adminSelected = syncSelectionWithList(adminLines, state.adminSelected);

  renderPickbox(closingPick, closingLines, state.closingSelected, (line, checked)=>{
    const set = new Set(state.closingSelected || []);
    checked ? set.add(line) : set.delete(line);
    state.closingSelected = Array.from(set);
    renderAll();
  });

  renderPickbox(adminPick, adminLines, state.adminSelected, (line, checked)=>{
    const set = new Set(state.adminSelected || []);
    checked ? set.add(line) : set.delete(line);
    state.adminSelected = Array.from(set);
    renderAll();
  });
}

// ---------------- Wizard UI ----------------
function buildProgress(){
  progressDots.innerHTML = "";
  steps.forEach((_, i)=>{
    const dot = document.createElement("div");
    dot.className = "dot";
    dot.title = `Step ${i+1}`;
    dot.addEventListener("click", ()=>{
      stepIndex = i;
      renderWizard();
    });
    progressDots.appendChild(dot);
  });
}
function renderWizard(){
  steps.forEach((s,i)=> s.classList.toggle("active", i === stepIndex));
  const dots = Array.from(progressDots.querySelectorAll(".dot"));
  dots.forEach((d,i)=>{
    d.classList.toggle("active", i === stepIndex);
    d.classList.toggle("done", i < stepIndex);
  });
  btnBack.disabled = stepIndex === 0;
  btnNext.textContent = stepIndex === steps.length - 1 ? "Done" : "Next";
}
btnBack.addEventListener("click", ()=>{
  if(stepIndex > 0){ stepIndex--; renderWizard(); }
});
btnNext.addEventListener("click", ()=>{
  if(stepIndex < steps.length - 1){ stepIndex++; renderWizard(); }
  else { alert("You’re set. Export PDF when ready."); }
});

// ---------------- Counts / status ----------------
function computeCounts(){
  const c = {W:0,S:0,A:0,R:0,none:0};
  state.days.forEach(d=>{
    if(!d.role) c.none++;
    else c[d.role] = (c[d.role]||0) + 1;
  });
  return c;
}
function updateCountsAndStatus(){
  const c = computeCounts();
  countsEl.innerHTML = "";
  [["W",c.W],["S",c.S],["A",c.A],["R",c.R],["—",c.none]].forEach(([k,v])=>{
    const node = el("div", { class:"count" });
    node.innerHTML = `<strong>${k}</strong>: ${v}`;
    countsEl.appendChild(node);
  });

  const allAssigned = (c.none === 0);
  const okW = (c.W >= TARGETS.W[0] && c.W <= TARGETS.W[1]);
  const okS = (c.S >= TARGETS.S[0] && c.S <= TARGETS.S[1]);
  const okA = (c.A >= TARGETS.A[0] && c.A <= TARGETS.A[1]);
  const okR = (c.R >= TARGETS.R[0] && c.R <= TARGETS.R[1]);

  let cls = "warn";
  let msg = "Targets: 3–4 W, 2 S, 1 A, 1 R. No mixed roles.";

  if(!allAssigned){
    cls = "warn";
    msg = "Assign roles to each day. Then tune toward: 3–4 W, 2 S, 1 A, 1 R.";
  } else if(okW && okS && okA && okR){
    cls = "ok";
    msg = "Your week matches the target structure. Keep the rhythm. Export when ready.";
  } else {
    cls = "warn";
    msg = "Roles assigned. Targets aren’t matched—allowed. Adjust only if you want the default rhythm.";
    if(c.R === 0){
      cls = "bad";
      msg = "You have 0 Recovery (R) days. Your system says R is non-negotiable—consider adding one.";
    }
  }

  statusBox.className = `status ${cls}`;
  statusBox.textContent = msg;
}
function autoGymSuggestion(i){
  const r = state.days[i].role;
  if(r === "W" && !state.days[i].gym){
    state.days[i].gym = "Gym: red light + optional light movement (no decisions)";
  }
  if(r !== "W" && state.days[i].gym === "Gym: red light + optional light movement (no decisions)"){
    state.days[i].gym = "";
  }
}

// ---------------- School intensity auto-suggest ----------------
function autoAssignSchoolIntensity(){
  const sIndices = state.days
    .map((d, idx) => ({ d, idx }))
    .filter(x => x.d.role === "S");

  if(sIndices.length === 0) return;

  // Clear + rebuild suggestion fresh
  sIndices.forEach(x => state.days[x.idx].school.intensity = "");

  const sorted = [...sIndices].sort((a,b)=>{
    const ah = Number(a.d.school.hours || 0);
    const bh = Number(b.d.school.hours || 0);
    if(bh !== ah) return bh - ah;
    return a.idx - b.idx;
  });

  if(sorted.length === 1){
    state.days[sorted[0].idx].school.intensity = "Heavier";
    return;
  }
  state.days[sorted[0].idx].school.intensity = "Heavier";
  state.days[sorted[1].idx].school.intensity = "Lighter";
}

// ---------------- Day rows ----------------
function buildDayRows(){
  daysWrap.innerHTML = "";
  state.days.forEach((row, idx) => {
    const roleSel = el("select", { "data-idx": idx, "aria-label": `${row.day} role` });
    roleSel.appendChild(new Option("— Select role —", ""));
    ["W","S","A","R"].forEach(r => roleSel.appendChild(new Option(`${r} — ${ROLE_LABELS[r]}`, r)));
    roleSel.value = row.role;

    roleSel.addEventListener("change", (e)=>{
      const i = Number(e.target.getAttribute("data-idx"));
      state.days[i].role = e.target.value;
      autoGymSuggestion(i);
      autoAssignSchoolIntensity();
      buildSchoolBlocks();
      buildDayRows(); // rebuild to reorder task suggestions
      renderAll();
    });

    const shiftInput = el("input", { type:"text", placeholder:"e.g., 7:00–2:00", value: row.shift, "data-idx": idx });
    shiftInput.addEventListener("input", (e)=>{
      const i = Number(e.target.getAttribute("data-idx"));
      state.days[i].shift = e.target.value;
      renderAll();
    });

    const gymInput = el("input", { type:"text", placeholder:"gym decompression", value: row.gym, "data-idx": idx });
    gymInput.addEventListener("input", (e)=>{
      const i = Number(e.target.getAttribute("data-idx"));
      state.days[i].gym = e.target.value;
      renderAll();
    });

    const taskSel = el("select", { "data-idx": idx, "aria-label": `${row.day} low-effort task` });
    taskSel.appendChild(new Option("— choose one —", ""));
    const orderedTasks = buildTaskOptionsForRole(row.role || "");
    orderedTasks.forEach(task => taskSel.appendChild(new Option(task, task)));
    taskSel.value = row.task || "";
    taskSel.addEventListener("change", (e)=>{
      const i = Number(e.target.getAttribute("data-idx"));
      state.days[i].task = e.target.value;
      renderAll();
    });

    const autoBtn = el("button", { type:"button", "data-idx": idx, title:"Pick a task for me" });
    autoBtn.textContent = "Auto";
    autoBtn.addEventListener("click", (e)=>{
      const i = Number(e.target.getAttribute("data-idx"));
      state.days[i].task = pickRandomTask(state.days[i].role || "");
      buildDayRows();
      renderAll();
    });

    const taskRow = el("div", { class:"task-row" }, [taskSel, autoBtn]);

    const noteInput = el("input", { type:"text", placeholder:"day note (optional)", value: row.note, "data-idx": idx });
    noteInput.addEventListener("input", (e)=>{
      const i = Number(e.target.getAttribute("data-idx"));
      state.days[i].note = e.target.value;
      renderAll();
    });

    const rowEl = el("div", { class:"day-row" }, [
      el("div", { class:"day-name", html: row.day }),
      el("div", {}, [labelWrap("Role", roleSel)]),
      el("div", {}, [labelWrap("Work shift", shiftInput)]),
      el("div", {}, [labelWrap("Gym / decompression", gymInput)]),
      el("div", {}, [labelWrap("One low-effort task (choose one)", taskRow)]),
      el("div", {}, [labelWrap("Notes", noteInput)]),
    ]);

    daysWrap.appendChild(rowEl);
  });
}

// ---------------- School blocks UI ----------------
function buildSchoolBlocks(){
  schoolWrap.innerHTML = "";
  const sDays = state.days
    .map((d, idx) => ({ d, idx }))
    .filter(x => x.d.role === "S");

  if(sDays.length === 0){
    schoolWrap.appendChild(el("div", { class:"hint", html: "No S days assigned yet. Go back to Step 3 and set two S days." }));
    return;
  }

  autoAssignSchoolIntensity();

  sDays.forEach(({ d, idx }) => {
    const intensityLabel = d.school.intensity || "School";

    const course = el("input", { type:"text", placeholder:"Course (e.g., IT 248)", value: d.school.course, "data-idx": idx, "data-field":"course" });
    const focus  = el("input", { type:"text", placeholder:"Focus (e.g., Module 6 paper)", value: d.school.focus, "data-idx": idx, "data-field":"focus" });
    const hours  = el("input", { type:"number", min:"1", max:"8", step:"0.5", value: d.school.hours, "data-idx": idx, "data-field":"hours" });

    const lightEnabled = el("input", { type:"checkbox", "data-idx": idx, "data-field":"lightEnabled" });
    lightEnabled.checked = !!d.school.lightEnabled;

    const lightFocus = el("input", { type:"text", placeholder:"Light block focus (optional)", value: d.school.lightFocus, "data-idx": idx, "data-field":"lightFocus" });
    const lightHours = el("input", { type:"number", min:"0.5", max:"3", step:"0.5", value: d.school.lightHours, "data-idx": idx, "data-field":"lightHours" });

    const intensitySel = el("select", { "data-idx": idx, "data-field":"intensity" });
    intensitySel.appendChild(new Option("Auto (recommended)", ""));
    intensitySel.appendChild(new Option("Heavier", "Heavier"));
    intensitySel.appendChild(new Option("Lighter", "Lighter"));
    intensitySel.value = d.school.intensity || "";

    function updateField(e){
      const i = Number(e.target.getAttribute("data-idx"));
      const field = e.target.getAttribute("data-field");
      const val = e.target.type === "number" ? Number(e.target.value) : e.target.value;

      state.days[i].school[field] = val;

      if(field === "hours" || field === "intensity"){
        autoAssignSchoolIntensity();
      }
      buildSchoolBlocks();
      renderAll();
    }

    [course, focus, hours, lightFocus, lightHours, intensitySel].forEach(inp=>{
      inp.addEventListener("input", updateField);
      inp.addEventListener("change", updateField);
    });

    lightEnabled.addEventListener("change", (e)=>{
      const i = Number(e.target.getAttribute("data-idx"));
      state.days[i].school.lightEnabled = e.target.checked;
      renderAll();
    });

    const card = el("div", { class:"school-card" }, [
      el("h3", { html: `${d.day} — ${intensityLabel}` }),
      el("div", { class:"school-grid" }, [
        labelWrap("Main block course", course),
        labelWrap("Main block timebox (hours)", hours),
      ]),
      labelWrap("Main block focus", focus),
      labelWrap("Heavier / Lighter", intensitySel),
      el("div", { class:"toggle", style:"margin-top:10px;" }, [
        lightEnabled,
        el("div", { html: "<strong>Enable optional light block</strong><div class='mini'>Use only if energy allows.</div>" })
      ]),
      el("div", { class:"school-grid", style:"margin-top:10px;" }, [
        labelWrap("Light block focus", lightFocus),
        labelWrap("Light block timebox (hours)", lightHours),
      ])
    ]);

    schoolWrap.appendChild(card);
  });
}

// ---------------- Preview rendering ----------------
function renderScheduleTable(){
  scheduleBody.innerHTML = "";
  state.days.forEach(d=>{
    const roleTag = d.role ? `<span class="tag ${d.role}">${d.role}</span>` : `<span class="tag">—</span>`;
    const roleText = d.role ? ROLE_LABELS[d.role] : "—";

    let intensityChip = "";
    if(d.role === "S" && d.school.intensity){
      intensityChip = `<span class="chip">${escapeHtml(d.school.intensity)}</span>`;
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${escapeHtml(d.day)}</strong></td>
      <td>${roleTag}<span class="mini" style="display:inline;">${escapeHtml(roleText)}</span>${intensityChip}</td>
      <td>${escapeHtml(d.shift || "—")}</td>
      <td>${escapeHtml(d.gym || (d.role === "W" ? "Gym (decompression anchor)" : "—"))}</td>
      <td>${escapeHtml(d.task || "—")}</td>
      <td>${escapeHtml(d.note || "—")}</td>
    `;
    scheduleBody.appendChild(tr);
  });
}

function renderList(targetUl, textAreaValue){
  targetUl.innerHTML = "";
  linesToList(textAreaValue).forEach(item=>{
    const li = document.createElement("li");
    li.textContent = item;
    targetUl.appendChild(li);
  });
}

function renderMeta(){
  metaWeek.textContent = `Week of: ${state.weekOf || "—"}`;
  metaUpdated.textContent = `Updated: ${nowStamp()}`;
}

function renderSchoolPreview(){
  schoolPreview.innerHTML = "";
  const sDays = state.days.filter(d => d.role === "S");

  if(sDays.length === 0){
    schoolPreviewEmpty.style.display = "block";
    return;
  }
  schoolPreviewEmpty.style.display = "none";

  sDays.forEach(d=>{
    const label = d.school.intensity ? `${d.school.intensity}` : "School";
    const mainCourse = d.school.course?.trim() || "Course (not set)";
    const mainFocus  = d.school.focus?.trim()  || "Focus (not set)";
    const mainHours  = d.school.hours || 0;

    const wrap = el("div", { class:"board-section", style:"margin:0 0 10px; padding:10px;" }, [
      el("h3", { html: `${d.day} — ${label}` }),
      el("div", { class:"mini", html: `<strong>${escapeHtml(mainCourse)}</strong> · ${mainHours} hrs<br>${escapeHtml(mainFocus)}` })
    ]);

    if(d.school.lightEnabled){
      const lf = d.school.lightFocus?.trim() || "Light focus (not set)";
      const lh = d.school.lightHours || 0;
      wrap.appendChild(el("div", { class:"mini", html: `<br><strong>Optional Light Block:</strong> ${lh} hrs · ${escapeHtml(lf)}` }));
    }

    schoolPreview.appendChild(wrap);
  });
}

// ---------------- Bind inputs ----------------
function bindInputs(){
  weekOfInput.addEventListener("input", e=>{ state.weekOf = e.target.value; renderAll(); });

  closingInput.addEventListener("input", e=>{
    state.closingDuties = e.target.value;
    const lines = linesToList(state.closingDuties);
    state.closingSelected = syncSelectionWithList(lines, state.closingSelected);
    renderAll();
  });

  adminInput.addEventListener("input", e=>{
    state.adminCircuit = e.target.value;
    const lines = linesToList(state.adminCircuit);
    state.adminSelected = syncSelectionWithList(lines, state.adminSelected);
    renderAll();
  });

  collapseInput.addEventListener("input", e=>{ state.collapse = e.target.value; renderAll(); });
}

// ---------------- PDF Export ----------------
async function exportPdf(){
  const board = document.getElementById("board");
  const btn = document.getElementById("btnExportPdf");
  const oldText = btn.textContent;
  btn.textContent = "Exporting…";
  btn.disabled = true;

  try{
    if(typeof html2canvas === "undefined" || typeof window.jspdf === "undefined"){
      alert("PDF libraries not loaded yet. Check connection and try again.");
      return;
    }

    const canvas = await html2canvas(board, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true
    });

    const imgData = canvas.toDataURL("image/png");
    const { jsPDF } = window.jspdf;

    const pdf = new jsPDF("p", "pt", "letter");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    if(imgHeight <= pageHeight){
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
    } else {
      let remainingHeight = imgHeight;
      let position = 0;
      while(remainingHeight > 0){
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        remainingHeight -= pageHeight;
        position -= pageHeight;
        if(remainingHeight > 0) pdf.addPage();
      }
    }

    const safeWeek = (state.weekOf || "weekly-board")
      .replace(/[^\w\- ]+/g, "")
      .trim()
      .replace(/\s+/g, "-");

    pdf.save(`Weekly-Command-Board_${safeWeek}.pdf`);
  } catch(err){
    console.error(err);
    alert("PDF export failed. Print (Ctrl/Cmd+P) still works.");
  } finally{
    btn.textContent = oldText;
    btn.disabled = false;
  }
}

// ---------------- Save/Load ----------------
const STORAGE_KEY = "weekly_reset_command_board_midnight_split_v1";

function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  alert("Saved.");
}

function loadState(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(!raw){ alert("No saved board found yet."); return; }
  const loaded = JSON.parse(raw);
  if(!loaded || !Array.isArray(loaded.days) || loaded.days.length !== 7){
    alert("Saved data looks invalid.");
    return;
  }
  Object.assign(state, loaded);

  weekOfInput.value = state.weekOf || "";
  closingInput.value = state.closingDuties || closingInput.value;
  adminInput.value = state.adminCircuit || adminInput.value;
  collapseInput.value = state.collapse || collapseInput.value;

  state.closingSelected = loaded.closingSelected || [];
  state.adminSelected = loaded.adminSelected || [];

  buildDayRows();
  buildSchoolBlocks();
  renderAll();
  alert("Loaded.");
}

function resetAll(){
  if(!confirm("Clear everything?")) return;

  const closingDefault = closingInput.value;
  const adminDefault = adminInput.value;
  const collapseDefault = collapseInput.value;

  state.weekOf = "";
  state.days = DAYS.map(d => ({
    day: d,
    role: "",
    shift: "",
    gym: "",
    task: "",
    note: "",
    school: { course:"", focus:"", hours:3, lightEnabled:false, lightFocus:"", lightHours:1, intensity:"" }
  }));
  state.closingDuties = closingDefault;
  state.adminCircuit = adminDefault;
  state.collapse = collapseDefault;

  state.closingSelected = [];
  state.adminSelected = [];

  weekOfInput.value = "";
  buildDayRows();
  buildSchoolBlocks();
  renderAll();
}

// ---------------- Main render ----------------
function renderAll(){
  autoAssignSchoolIntensity();
  updateCountsAndStatus();
  renderScheduleTable();
  renderMeta();

  // Step 5 picklists
  state.closingDuties = closingInput.value;
  state.adminCircuit = adminInput.value;
  renderStep5Picklists();

  // Preview: checked only + hide empty sections
  renderCheckedList(closingPreview, state.closingSelected);
  renderCheckedList(adminPreview, state.adminSelected);
  setSectionVisibleByList(closingPreview);
  setSectionVisibleByList(adminPreview);

  // Step 6
  renderList(collapsePreview, collapseInput.value);

  // School preview
  renderSchoolPreview();
}

// Buttons
document.getElementById("btnSave").addEventListener("click", saveState);
document.getElementById("btnLoad").addEventListener("click", loadState);
document.getElementById("btnReset").addEventListener("click", resetAll);
document.getElementById("btnExportPdf").addEventListener("click", exportPdf);

// Init
(function init(){
  buildProgress();
  renderWizard();

  state.closingDuties = closingInput.value;
  state.adminCircuit = adminInput.value;
  state.collapse = collapseInput.value;

  buildDayRows();
  buildSchoolBlocks();
  bindInputs();
  renderAll();
})();