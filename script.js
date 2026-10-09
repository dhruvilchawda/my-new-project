"use strict";

const STORAGE_KEY = "clearday.tasks.v1";
const FOCUS_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;
const priorities = { high: 0, medium: 1, low: 2 };

const sampleTasks = [
  { id: "demo-1", title: "Review today's lecture notes", priority: "high", due: "", completed: false, createdAt: 3 },
  { id: "demo-2", title: "Make progress on a side project", priority: "medium", due: "", completed: false, createdAt: 2 },
  { id: "demo-3", title: "Plan tomorrow's priorities", priority: "low", due: "", completed: true, createdAt: 1 }
];

const $ = (selector) => document.querySelector(selector);
const list = $("#task-list");
const dialog = $("#task-dialog");
const form = $("#task-form");
let tasks = loadTasks();
let activeFilter = "all";
let searchTerm = "";
let toastTimeout;
let timerInterval = null;
let timerMode = "focus";
let remainingSeconds = FOCUS_SECONDS;
let endTime = 0;

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return sampleTasks.map((task) => ({ ...task }));
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((task) => task && typeof task.title === "string" && typeof task.id === "string")
      .map((task) => ({
        id: task.id,
        title: task.title.slice(0, 100),
        priority: Object.hasOwn(priorities, task.priority) ? task.priority : "medium",
        due: typeof task.due === "string" && /^\d{4}-\d{2}-\d{2}$/.test(task.due) ? task.due : "",
        completed: task.completed === true,
        createdAt: Number.isFinite(task.createdAt) ? task.createdAt : 0
      }));
  } catch {
    return sampleTasks.map((task) => ({ ...task }));
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    showToast("Storage is unavailable; changes may not persist.");
  }
}

function localToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function niceDate(dateString) {
  const parts = dateString.split("-").map(Number);
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("show"), 2900);
}

function addTaskRow(task) {
  const item = document.createElement("li");
  item.className = "task-item" + (task.completed ? " done" : "");

  const checkbox = document.createElement("button");
  checkbox.type = "button";
  checkbox.className = "task-check" + (task.completed ? " checked" : "");
  checkbox.dataset.action = "toggle";
  checkbox.dataset.id = task.id;
  checkbox.setAttribute("aria-label", (task.completed ? "Mark incomplete: " : "Complete task: ") + task.title);
  checkbox.setAttribute("aria-pressed", String(task.completed));
  checkbox.textContent = task.completed ? "✓" : "";

  const main = document.createElement("div");
  main.className = "task-main";
  const title = document.createElement("p");
  title.className = "task-title";
  title.textContent = task.title;
  const meta = document.createElement("div");
  meta.className = "task-metadata";
  const priority = document.createElement("span");
  priority.className = "priority-pill priority-" + task.priority;
  priority.textContent = task.priority[0].toUpperCase() + task.priority.slice(1);
  meta.append(priority);
  if (task.due) {
    const date = document.createElement("span");
    date.className = "date-pill" + (task.due < localToday() && !task.completed ? " overdue" : "");
    date.textContent = (task.due < localToday() && !task.completed ? "Overdue · " : "Due ") + niceDate(task.due);
    meta.append(date);
  }
  main.append(title, meta);

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "task-delete";
  remove.dataset.action = "delete";
  remove.dataset.id = task.id;
  remove.setAttribute("aria-label", "Delete task: " + task.title);
  remove.title = "Delete task";
  remove.textContent = "×";

  item.append(checkbox, main, remove);
  return item;
}

function renderTasks() {
  const filtered = tasks.filter((task) => {
    const statusMatch = activeFilter === "all" ||
      (activeFilter === "active" && !task.completed) ||
      (activeFilter === "completed" && task.completed);
    return statusMatch && task.title.toLowerCase().includes(searchTerm);
  }).sort((a, b) =>
    Number(a.completed) - Number(b.completed) ||
    priorities[a.priority] - priorities[b.priority] ||
    ((a.due || "9999") < (b.due || "9999") ? -1 : (a.due || "9999") > (b.due || "9999") ? 1 : 0) ||
    b.createdAt - a.createdAt
  );

  list.replaceChildren(...filtered.map(addTaskRow));
  const empty = $("#empty-state");
  empty.hidden = filtered.length > 0;
  list.hidden = filtered.length === 0;
  if (!filtered.length) {
    $("#empty-title").textContent = searchTerm ? "No matches found" :
      activeFilter === "completed" ? "No finished tasks yet" :
      activeFilter === "active" ? "You're all caught up!" : "Your day starts here";
    $("#empty-description").textContent = searchTerm ? "Try a different search term." :
      activeFilter === "all" ? "Use + New task to add your first item." : "Change the filter to see other tasks.";
  }
  $("#task-count").textContent = String(tasks.length);
  renderStats();
}

function renderStats() {
  const done = tasks.filter((task) => task.completed).length;
  const total = tasks.length;
  const percent = total ? Math.round((done / total) * 100) : 0;
  $("#stat-total").textContent = String(total);
  $("#stat-completed").textContent = String(done);
  $("#stat-pending").textContent = String(total - done);
  $("#progress-percent").textContent = percent + "%";
  $("#progress-donut").style.setProperty("--progress", percent + "%");
  $("#progress-fill").style.width = percent + "%";
  $("#progress-ratio").textContent = done + " / " + total;
  $("#progress-headline").textContent = !total ? "Ready when you are" :
    percent === 100 ? "Everything complete!" :
    percent >= 50 ? "Look at you go!" : "You're building momentum";
  $("#progress-description").textContent = !total ? "Add a task to begin your day." :
    percent === 100 ? "Every task finished. Enjoy that feeling." :
    percent >= 50 ? "More than halfway there. Keep it up!" : "One checked box at a time.";
}

function openDialog() {
  form.reset();
  dialog.showModal();
  $("#task-title").focus();
}

$("#open-add").addEventListener("click", openDialog);
$("#open-add-secondary").addEventListener("click", openDialog);
$("#close-dialog").addEventListener("click", () => dialog.close());
$("#cancel-dialog").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = $("#task-title").value.trim();
  if (!title) {
    $("#task-title").setCustomValidity("Please enter a task title.");
    $("#task-title").reportValidity();
    return;
  }
  $("#task-title").setCustomValidity("");
  const priority = $("#task-priority").value;
  tasks.unshift({
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random(),
    title: title.slice(0, 100),
    priority: Object.hasOwn(priorities, priority) ? priority : "medium",
    due: $("#task-due").value,
    completed: false,
    createdAt: Date.now()
  });
  saveTasks();
  activeFilter = "all";
  searchTerm = "";
  $("#task-search").value = "";
  updateFilterTabs();
  renderTasks();
  dialog.close();
  showToast("Task added. You've got this!");
});
$("#task-title").addEventListener("input", () => $("#task-title").setCustomValidity(""));

list.addEventListener("click", (event) => {
  const control = event.target.closest("button[data-action]");
  if (!control) return;
  const task = tasks.find((item) => item.id === control.dataset.id);
  if (!task) return;
  if (control.dataset.action === "toggle") {
    task.completed = !task.completed;
    showToast(task.completed ? "Another win for today!" : "Task marked as active.");
  } else if (control.dataset.action === "delete") {
    tasks = tasks.filter((item) => item.id !== task.id);
    showToast("Task removed.");
  }
  saveTasks();
  renderTasks();
});

function updateFilterTabs() {
  document.querySelectorAll(".filter-tab").forEach((button) => {
    const selected = button.dataset.filter === activeFilter;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}
document.querySelectorAll(".filter-tab").forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    updateFilterTabs();
    renderTasks();
  });
});
$("#task-search").addEventListener("input", (event) => {
  searchTerm = event.target.value.trim().toLowerCase();
  renderTasks();
});

function sessionLength() {
  return timerMode === "focus" ? FOCUS_SECONDS : BREAK_SECONDS;
}

function paintTimer() {
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const formatted = String(mins).padStart(2, "0") + ":" + String(secs).padStart(2, "0");
  $("#timer-display").textContent = formatted;
  $("#timer-display").setAttribute("aria-label", formatted + " remaining");
  const progress = Math.round(((sessionLength() - remainingSeconds) / sessionLength()) * 100);
  $("#timer-ring").style.setProperty("--timer-progress", progress + "%");
  $("#timer-label").textContent = timerMode === "focus" ? "FOCUS SESSION" : "SHORT BREAK";
}

function updateTimerButton() {
  const running = timerInterval !== null;
  $("#timer-toggle").innerHTML = running ? '<span aria-hidden="true">Ⅱ</span> Pause timer' :
    '<span aria-hidden="true">▶</span> ' + (timerMode === "focus" ? "Start focus" : "Start break");
}

function stopTimer() {
  if (timerInterval !== null) clearInterval(timerInterval);
  timerInterval = null;
  updateTimerButton();
}

function timerTick() {
  remainingSeconds = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
  paintTimer();
  if (remainingSeconds === 0) {
    stopTimer();
    showToast(timerMode === "focus" ? "Focus complete! Take a short break." : "Break over! Ready to refocus?");
    document.title = "✦ Session complete — ClearDay";
    setTimeout(() => { document.title = "ClearDay — Make today count"; }, 4000);
  }
}

$("#timer-toggle").addEventListener("click", () => {
  if (timerInterval !== null) {
    timerTick();
    stopTimer();
  } else {
    if (remainingSeconds === 0) remainingSeconds = sessionLength();
    endTime = Date.now() + remainingSeconds * 1000;
    timerInterval = setInterval(timerTick, 250);
    updateTimerButton();
    paintTimer();
  }
});

$("#timer-reset").addEventListener("click", () => {
  stopTimer();
  remainingSeconds = sessionLength();
  paintTimer();
  showToast("Timer reset.");
});

document.querySelectorAll(".timer-mode").forEach((button) => {
  button.addEventListener("click", () => {
    stopTimer();
    timerMode = button.dataset.mode;
    remainingSeconds = sessionLength();
    document.querySelectorAll(".timer-mode").forEach((modeButton) => {
      const selected = modeButton.dataset.mode === timerMode;
      modeButton.classList.toggle("active", selected);
      modeButton.setAttribute("aria-pressed", String(selected));
    });
    paintTimer();
    updateTimerButton();
  });
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && timerInterval !== null) timerTick();
});

document.querySelectorAll(".nav-item").forEach((link) => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.classList.remove("selected");
      item.removeAttribute("aria-current");
    });
    link.classList.add("selected");
    link.setAttribute("aria-current", "page");
  });
});

$("#today-date").textContent = new Date().toLocaleDateString(undefined, {
  weekday: "short", month: "short", day: "numeric", year: "numeric"
});
paintTimer();
renderTasks();
