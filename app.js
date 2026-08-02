const WORK_TYPES = [
  "Cardamom plucking",
  "Land cleaning",
  "Watering plants",
  "Applying fertilizer",
  "Soil treatment",
  "Tree planting",
  "Tree cutting",
  "Branch cutting",
  "Pruning",
  "Plant maintenance",
  "Weeding",
  "Shade management",
  "Other"
];

const defaultWorkers = [
  { id: crypto.randomUUID(), name: "Worker 1", gender: "Female", wage: 550 },
  { id: crypto.randomUUID(), name: "Worker 2", gender: "Male", wage: 700 }
];

function readStored(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

const storedWorkers = readStored("hw_workers", defaultWorkers);
const storedEntries = readStored("hw_entries", []);
const state = {
  workers: Array.isArray(storedWorkers) ? storedWorkers : defaultWorkers,
  entries: Array.isArray(storedEntries) ? storedEntries : []
};

const $ = id => document.getElementById(id);
const moneyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});
const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric"
});

const money = value => moneyFormatter.format(Number(value || 0));

function persist() {
  localStorage.setItem("hw_workers", JSON.stringify(state.workers));
  localStorage.setItem("hw_entries", JSON.stringify(state.entries));
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  })[character]);
}

function optionList(items, valueKey = "name", labelKey = "name") {
  return items.map(item => (
    `<option value="${escapeHtml(item[valueKey])}">${escapeHtml(item[labelKey])}</option>`
  )).join("");
}

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromString(value) {
  return new Date(`${value}T12:00:00`);
}

function formatDate(value) {
  const date = dateFromString(value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

function weekBounds(dateString) {
  const date = dateFromString(dateString);
  const day = (date.getDay() + 6) % 7;
  const start = new Date(date);
  start.setDate(date.getDate() - day);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return [localDateString(start), localDateString(end)];
}

function setMessage(id, text = "", tone = "success") {
  const element = $(id);
  element.textContent = text;
  element.classList.toggle("error", tone === "error");
}

function dismissToast(toast) {
  if (!toast || toast.classList.contains("leaving")) return;
  toast.classList.add("leaving");
  setTimeout(() => toast.remove(), 180);
}

function showToast(title, detail = "", type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.setAttribute("role", type === "error" ? "alert" : "status");

  const icon = document.createElement("span");
  icon.className = "toast-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = type === "error" ? "!" : type === "info" ? "i" : "✓";

  const copy = document.createElement("div");
  const heading = document.createElement("strong");
  heading.textContent = title;
  copy.appendChild(heading);
  if (detail) {
    const description = document.createElement("small");
    description.textContent = detail;
    copy.appendChild(description);
  }

  const close = document.createElement("button");
  close.className = "toast-close";
  close.type = "button";
  close.setAttribute("aria-label", "Dismiss notification");
  close.textContent = "×";
  close.addEventListener("click", () => dismissToast(toast));

  toast.append(icon, copy, close);
  $("toastRegion").appendChild(toast);
  setTimeout(() => dismissToast(toast), type === "error" ? 5200 : 3800);
}

function confirmAction({ title, message, confirmLabel = "Confirm" }) {
  const dialog = $("confirmDialog");
  $("confirmTitle").textContent = title;
  $("confirmMessage").textContent = message;
  $("confirmAction").textContent = confirmLabel;
  dialog.returnValue = "cancel";
  dialog.showModal();

  return new Promise(resolve => {
    dialog.addEventListener("close", () => resolve(dialog.returnValue === "confirm"), { once: true });
  });
}

function switchView(viewId, updateHash = true) {
  const view = $(viewId);
  if (!view) return;

  document.querySelectorAll(".tab").forEach(tab => {
    const active = tab.dataset.view === viewId;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });

  document.querySelectorAll(".view").forEach(section => {
    const active = section.id === viewId;
    section.classList.toggle("active", active);
    section.hidden = !active;
  });

  if (updateHash) history.replaceState(null, "", `#${viewId}`);
  if (viewId === "summary") renderSummary();
  if (viewId === "records") renderRecords($("recordSearch").value);
}

function renderSelects() {
  const selectedWorker = $("worker").value;
  const selectedWorkType = $("workType").value;
  const workers = state.workers.length
    ? optionList(state.workers)
    : '<option value="">Add a worker first</option>';
  const workTypes = WORK_TYPES.map(type => `<option>${escapeHtml(type)}</option>`).join("");

  $("worker").innerHTML = workers;
  $("editWorker").innerHTML = workers;
  $("workType").innerHTML = workTypes;
  $("editWorkType").innerHTML = workTypes;

  if (state.workers.some(worker => worker.name === selectedWorker)) $("worker").value = selectedWorker;
  if (WORK_TYPES.includes(selectedWorkType)) $("workType").value = selectedWorkType;

  const hasWorkers = state.workers.length > 0;
  $("worker").disabled = !hasWorkers;
  $("saveEntry").disabled = !hasWorkers;
  syncWage();
}

function syncWage() {
  const worker = state.workers.find(item => item.name === $("worker").value);
  if (worker) $("wage").value = worker.wage;
}

function findDailyEntry(worker, date, excludeId = "") {
  return state.entries.find(entry => (
    entry.id !== excludeId && entry.worker === worker && entry.date === date
  ));
}

function dailyEntryMessage(worker, date) {
  return `${worker} already has a work entry for ${formatDate(date)}. Open Records to update it.`;
}

function updateEntryAvailability(showMessage = true) {
  const hasWorkers = state.workers.length > 0;
  const worker = $("worker").value;
  const date = $("date").value;
  const existing = hasWorkers && worker && date ? findDailyEntry(worker, date) : null;
  $("saveEntry").disabled = !hasWorkers || Boolean(existing);

  if (!showMessage) return existing;
  if (existing) {
    setMessage("entryMessage", dailyEntryMessage(worker, date), "error");
  } else if ($("entryMessage").classList.contains("error")) {
    setMessage("entryMessage");
  }
  return existing;
}

function renderWorkers() {
  $("workerCount").textContent = `${state.workers.length} ${state.workers.length === 1 ? "worker" : "workers"}`;
  $("workersBody").innerHTML = state.workers.map(worker => `
    <tr>
      <td data-label="Name"><strong>${escapeHtml(worker.name)}</strong></td>
      <td data-label="Gender">${escapeHtml(worker.gender)}</td>
      <td data-label="Default wage">${money(worker.wage)}</td>
      <td data-label="Actions"><button class="danger tiny" type="button" data-remove-worker="${escapeHtml(worker.id)}" aria-label="Remove ${escapeHtml(worker.name)}">Remove</button></td>
    </tr>
  `).join("") || `
    <tr><td colspan="4" class="empty-cell"><strong>No workers yet</strong>Add your first worker above to begin.</td></tr>
  `;
}

function renderRecords(filter = "") {
  const query = filter.trim().toLowerCase();
  const rows = [...state.entries]
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter(entry => (
      `${entry.worker} ${entry.workType} ${entry.supervisor} ${entry.status} ${entry.remarks || ""}`
        .toLowerCase()
        .includes(query)
    ));

  $("recordsBody").innerHTML = rows.map(entry => `
    <tr>
      <td data-label="Date">${formatDate(entry.date)}</td>
      <td data-label="Worker"><strong>${escapeHtml(entry.worker)}</strong></td>
      <td data-label="Work">${escapeHtml(entry.workType)}</td>
      <td data-label="Supervisor">${escapeHtml(entry.supervisor)}</td>
      <td data-label="Status"><span class="badge ${entry.status === "Paid" ? "paid" : "pending"}">${escapeHtml(entry.status)}</span></td>
      <td data-label="Wage"><strong>${money(entry.wage)}</strong></td>
      <td data-label="Actions">
        <div class="row-actions">
          <button class="secondary tiny" type="button" data-edit="${escapeHtml(entry.id)}">Edit</button>
          <button class="danger tiny" type="button" data-delete="${escapeHtml(entry.id)}">Delete</button>
        </div>
      </td>
    </tr>
  `).join("") || `
    <tr><td colspan="7" class="empty-cell"><strong>${query ? "No matching records" : "No work records yet"}</strong>${query ? "Try a different worker, work type, or status." : "Your saved daily entries will appear here."}</td></tr>
  `;

  $("recordCount").textContent = query
    ? `${rows.length} of ${state.entries.length} ${state.entries.length === 1 ? "record" : "records"}`
    : `${state.entries.length} ${state.entries.length === 1 ? "record" : "records"}`;
  $("recordTabCount").textContent = state.entries.length;
  $("clearSearch").classList.toggle("hidden", !query);
  $("exportCsv").disabled = state.entries.length === 0;
  $("clearData").disabled = state.entries.length === 0;
}

function renderSummary() {
  const selected = $("summaryDate").value || localDateString();
  const [start, end] = weekBounds(selected);
  const entries = state.entries.filter(entry => entry.date >= start && entry.date <= end);
  $("weekLabel").textContent = `${formatDate(start)} — ${formatDate(end)}`;

  const total = entries.reduce((sum, entry) => sum + Number(entry.wage), 0);
  const paid = entries
    .filter(entry => entry.status === "Paid")
    .reduce((sum, entry) => sum + Number(entry.wage), 0);

  $("sumTotal").textContent = money(total);
  $("sumPaid").textContent = money(paid);
  $("sumPending").textContent = money(total - paid);
  $("sumAjith").textContent = money(entries
    .filter(entry => entry.supervisor === "Ajith")
    .reduce((sum, entry) => sum + Number(entry.wage), 0));
  $("sumDad").textContent = money(entries
    .filter(entry => entry.supervisor === "Dad")
    .reduce((sum, entry) => sum + Number(entry.wage), 0));
  $("sumEntries").textContent = entries.length;

  const grouped = {};
  entries.forEach(entry => {
    grouped[entry.worker] ??= { days: new Set(), total: 0, pending: 0 };
    grouped[entry.worker].days.add(entry.date);
    grouped[entry.worker].total += Number(entry.wage);
    if (entry.status !== "Paid") grouped[entry.worker].pending += Number(entry.wage);
  });

  $("workerSummaryBody").innerHTML = Object.entries(grouped).map(([name, group]) => `
    <tr>
      <td data-label="Worker"><strong>${escapeHtml(name)}</strong></td>
      <td data-label="Days">${group.days.size}</td>
      <td data-label="Total">${money(group.total)}</td>
      <td data-label="Pending">${money(group.pending)}</td>
    </tr>
  `).join("") || '<tr><td colspan="4" class="empty-cell"><strong>No entries this week</strong>Choose another week or add a daily entry.</td></tr>';

  renderMiniStats();
}

function renderMiniStats() {
  const current = localDateString();
  const [start, end] = weekBounds(current);
  const todayEntries = state.entries.filter(entry => entry.date === current);
  const weekEntries = state.entries.filter(entry => entry.date >= start && entry.date <= end);
  const todayTotal = todayEntries.reduce((sum, entry) => sum + Number(entry.wage), 0);
  const weekTotal = weekEntries.reduce((sum, entry) => sum + Number(entry.wage), 0);
  const pendingTotal = weekEntries
    .filter(entry => entry.status !== "Paid")
    .reduce((sum, entry) => sum + Number(entry.wage), 0);

  $("todayTotal").textContent = money(todayTotal);
  $("weekTotalMini").textContent = money(weekTotal);
  $("pendingMini").textContent = money(pendingTotal);
}

function refresh() {
  renderSelects();
  renderWorkers();
  renderRecords($("recordSearch").value);
  renderSummary();
  updateEntryAvailability();
}

function shiftSummaryWeek(days) {
  const date = dateFromString($("summaryDate").value || localDateString());
  date.setDate(date.getDate() + days);
  $("summaryDate").value = localDateString(date);
  renderSummary();
}

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    switchView(tab.dataset.view);
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  tab.addEventListener("keydown", event => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    const tabs = [...document.querySelectorAll(".tab")];
    const currentIndex = tabs.indexOf(tab);
    const offset = event.key === "ArrowRight" ? 1 : -1;
    const nextTab = tabs[(currentIndex + offset + tabs.length) % tabs.length];
    nextTab.focus();
    switchView(nextTab.dataset.view);
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
});

$("worker").addEventListener("change", () => {
  syncWage();
  updateEntryAvailability();
});
$("date").addEventListener("change", () => updateEntryAvailability());
$("summaryDate").addEventListener("change", renderSummary);
$("prevWeek").addEventListener("click", () => shiftSummaryWeek(-7));
$("nextWeek").addEventListener("click", () => shiftSummaryWeek(7));
$("todayWeek").addEventListener("click", () => {
  $("summaryDate").value = localDateString();
  renderSummary();
});

$("recordSearch").addEventListener("input", event => renderRecords(event.target.value));
$("clearSearch").addEventListener("click", () => {
  $("recordSearch").value = "";
  $("recordSearch").focus();
  renderRecords();
});

$("workerName").addEventListener("input", () => {
  $("workerName").removeAttribute("aria-invalid");
  setMessage("workerMessage");
});

$("entryForm").addEventListener("submit", event => {
  event.preventDefault();
  if (!state.workers.length) {
    showToast("Add a worker first", "A worker is required before saving a daily entry.", "error");
    switchView("workers");
    return;
  }

  const entry = {
    id: crypto.randomUUID(),
    date: $("date").value,
    worker: $("worker").value,
    workType: $("workType").value,
    wage: Number($("wage").value),
    supervisor: $("supervisor").value,
    status: $("paymentStatus").value,
    remarks: $("remarks").value.trim()
  };

  if (findDailyEntry(entry.worker, entry.date)) {
    updateEntryAvailability();
    showToast("Entry already recorded", dailyEntryMessage(entry.worker, entry.date), "error");
    return;
  }

  state.entries.push(entry);
  persist();
  $("remarks").value = "";
  $("paymentStatus").value = "Pending";
  refresh();
  setMessage("entryMessage", `Saved ${entry.worker}'s ${entry.workType.toLowerCase()} entry.`);
  showToast("Entry saved", `${entry.worker} · ${money(entry.wage)} · ${formatDate(entry.date)}`);
  setTimeout(() => updateEntryAvailability(), 3200);
});

$("workerForm").addEventListener("submit", event => {
  event.preventDefault();
  const name = $("workerName").value.trim();
  const duplicate = state.workers.some(worker => worker.name.toLowerCase() === name.toLowerCase());

  if (duplicate) {
    $("workerName").setAttribute("aria-invalid", "true");
    $("workerName").focus();
    setMessage("workerMessage", `${name} is already in your worker list.`, "error");
    showToast("Worker already exists", "Use a different name or review the current list.", "error");
    return;
  }

  const worker = {
    id: crypto.randomUUID(),
    name,
    gender: $("workerGender").value,
    wage: Number($("workerWage").value)
  };
  state.workers.push(worker);
  persist();
  event.target.reset();
  refresh();
  setMessage("workerMessage", `${worker.name} was added successfully.`);
  showToast("Worker added", `${worker.name} · Default wage ${money(worker.wage)}`);
});

document.addEventListener("click", async event => {
  const switchTarget = event.target.closest("[data-switch-view]");
  if (switchTarget) {
    switchView(switchTarget.dataset.switchView);
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  const removeButton = event.target.closest("[data-remove-worker]");
  if (removeButton) {
    const worker = state.workers.find(item => item.id === removeButton.dataset.removeWorker);
    if (!worker) return;
    const recordCount = state.entries.filter(entry => entry.worker === worker.name).length;
    const approved = await confirmAction({
      title: `Remove ${worker.name}?`,
      message: recordCount
        ? `${recordCount} existing ${recordCount === 1 ? "record" : "records"} will remain in your history.`
        : "This removes the worker from future daily entries.",
      confirmLabel: "Remove worker"
    });
    if (!approved) return;
    state.workers = state.workers.filter(item => item.id !== worker.id);
    persist();
    refresh();
    showToast("Worker removed", `${worker.name} is no longer in the daily entry list.`, "info");
    return;
  }

  const deleteButton = event.target.closest("[data-delete]");
  if (deleteButton) {
    const entry = state.entries.find(item => item.id === deleteButton.dataset.delete);
    if (!entry) return;
    const approved = await confirmAction({
      title: "Delete this work entry?",
      message: `${entry.worker} · ${entry.workType} · ${money(entry.wage)} on ${formatDate(entry.date)}. This cannot be undone.`,
      confirmLabel: "Delete entry"
    });
    if (!approved) return;
    state.entries = state.entries.filter(item => item.id !== entry.id);
    persist();
    refresh();
    showToast("Entry deleted", `${entry.worker}'s record was removed.`, "info");
    return;
  }

  const editButton = event.target.closest("[data-edit]");
  if (editButton) {
    const entry = state.entries.find(item => item.id === editButton.dataset.edit);
    if (!entry) return;
    $("editId").value = entry.id;
    $("editDate").value = entry.date;
    $("editWorker").value = entry.worker;
    $("editWorkType").value = entry.workType;
    $("editWage").value = entry.wage;
    $("editSupervisor").value = entry.supervisor;
    $("editStatus").value = entry.status;
    $("editRemarks").value = entry.remarks || "";
    setMessage("editMessage");
    $("editDialog").showModal();
  }
});

$("cancelEdit").addEventListener("click", () => $("editDialog").close());
$("editDialog").addEventListener("click", event => {
  if (event.target === $("editDialog")) $("editDialog").close();
});
$("confirmDialog").addEventListener("click", event => {
  if (event.target === $("confirmDialog")) $("confirmDialog").close("cancel");
});

$("editDate").addEventListener("change", () => setMessage("editMessage"));
$("editWorker").addEventListener("change", () => setMessage("editMessage"));

$("editForm").addEventListener("submit", event => {
  event.preventDefault();
  const entry = state.entries.find(item => item.id === $("editId").value);
  if (!entry) return;
  const changes = {
    date: $("editDate").value,
    worker: $("editWorker").value,
    workType: $("editWorkType").value,
    wage: Number($("editWage").value),
    supervisor: $("editSupervisor").value,
    status: $("editStatus").value,
    remarks: $("editRemarks").value.trim()
  };
  if (findDailyEntry(changes.worker, changes.date, entry.id)) {
    const message = dailyEntryMessage(changes.worker, changes.date);
    setMessage("editMessage", message, "error");
    showToast("Entry already recorded", message, "error");
    return;
  }
  Object.assign(entry, changes);
  persist();
  $("editDialog").close();
  refresh();
  showToast("Changes saved", `${entry.worker}'s work entry has been updated.`);
});

$("exportCsv").addEventListener("click", () => {
  const headers = ["Date", "Worker", "Work Type", "Wage", "Supervisor", "Status", "Remarks"];
  const rows = state.entries.map(entry => [
    entry.date,
    entry.worker,
    entry.workType,
    entry.wage,
    entry.supervisor,
    entry.status,
    entry.remarks || ""
  ]);
  const csv = [headers, ...rows]
    .map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  download(new Blob([csv], { type: "text/csv" }), "horticulture-wages.csv");
  showToast("CSV exported", `${state.entries.length} ${state.entries.length === 1 ? "record" : "records"} included.`);
});

$("backupJson").addEventListener("click", () => {
  download(
    new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }),
    "horticulture-wage-backup.json"
  );
  showToast("Backup created", "Keep the downloaded file somewhere safe.");
});

$("restoreJson").addEventListener("change", async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data.workers) || !Array.isArray(data.entries)) throw new Error("Invalid backup");

    const restoredWorkers = data.workers.map(worker => ({
      ...worker,
      id: worker.id || crypto.randomUUID(),
      wage: Number(worker.wage)
    }));
    const restoredEntries = data.entries.map(entry => ({
      ...entry,
      id: entry.id || crypto.randomUUID(),
      wage: Number(entry.wage),
      remarks: entry.remarks || ""
    }));
    const workersAreValid = restoredWorkers.every(worker => (
      typeof worker.name === "string" && worker.name.trim() && Number.isFinite(worker.wage)
    ));
    const entriesAreValid = restoredEntries.every(entry => (
      typeof entry.date === "string" &&
      typeof entry.worker === "string" &&
      typeof entry.workType === "string" &&
      typeof entry.supervisor === "string" &&
      ["Paid", "Pending"].includes(entry.status) &&
      Number.isFinite(entry.wage)
    ));
    const restoredEntryKeys = new Set();
    const entriesAreUnique = restoredEntries.every(entry => {
      const key = `${entry.date}::${entry.worker.toLowerCase()}`;
      if (restoredEntryKeys.has(key)) return false;
      restoredEntryKeys.add(key);
      return true;
    });
    if (!workersAreValid || !entriesAreValid) throw new Error("Invalid backup contents");
    if (!entriesAreUnique) throw new Error("Duplicate daily entries");

    const approved = await confirmAction({
      title: "Restore this backup?",
      message: `Your current data will be replaced with ${restoredWorkers.length} ${restoredWorkers.length === 1 ? "worker" : "workers"} and ${restoredEntries.length} ${restoredEntries.length === 1 ? "entry" : "entries"}.`,
      confirmLabel: "Restore backup"
    });
    if (!approved) {
      showToast("Restore cancelled", "Your current data was not changed.", "info");
      return;
    }

    state.workers = restoredWorkers;
    state.entries = restoredEntries;
    persist();
    refresh();
    showToast("Backup restored", "Your workers and work entries are ready.");
  } catch (error) {
    const detail = error.message === "Duplicate daily entries"
      ? "The backup contains more than one entry for the same worker and date."
      : "Choose a valid Horticulture Wage Tracker backup file.";
    showToast("Could not restore backup", detail, "error");
  } finally {
    event.target.value = "";
  }
});

$("clearData").addEventListener("click", async () => {
  const approved = await confirmAction({
    title: "Clear all work entries?",
    message: `${state.entries.length} ${state.entries.length === 1 ? "entry" : "entries"} will be permanently removed. Your worker list will remain.`,
    confirmLabel: "Clear entries"
  });
  if (!approved) return;
  const removedCount = state.entries.length;
  state.entries = [];
  persist();
  refresh();
  showToast("Entries cleared", `${removedCount} ${removedCount === 1 ? "entry was" : "entries were"} removed.`, "info");
});

function download(blob, name) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

let installPrompt;
window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  installPrompt = event;
  $("installBtn").classList.remove("hidden");
});

$("installBtn").addEventListener("click", async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  const choice = await installPrompt.userChoice;
  installPrompt = null;
  $("installBtn").classList.add("hidden");
  if (choice.outcome === "accepted") showToast("App installed", "You can now open it from your home screen.");
});

window.addEventListener("offline", () => showToast("You are offline", "Saved data remains available on this device.", "info"));
window.addEventListener("online", () => showToast("Back online", "The app is connected again."));

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js?v=7", { updateViaCache: "none" })
    .then(registration => registration.update())
    .catch(() => {
      showToast("Offline mode unavailable", "The app will still work while this page stays open.", "error");
    });
}

$("date").value = localDateString();
$("summaryDate").value = localDateString();
$("todayLabel").textContent = dateFormatter.format(new Date());
persist();
refresh();
switchView(location.hash.slice(1) || "entry", false);
