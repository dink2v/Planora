"use strict";

(() => {
  const $ = (selector) => document.querySelector(selector);
  const taskList = $("#task-list");
  const dialog = $("#task-dialog");
  const form = $("#task-form");
  const upcomingContainer = $(".upcoming-list");

  if (!taskList || !dialog || !form) {
    console.error("Planora: elemen utama tidak ditemukan. Periksa index.html.");
    return;
  }

  const STORAGE_KEY = "planora-demo-tasks";
  const now = new Date();
  let shownMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const dateKey = (date) =>
    [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");

  const todayKey = () => dateKey(new Date());

  const makeDemoTasks = () => {
    const today = todayKey();
    return [
      { id: "demo-1", title: "Review pekerjaan", date: today, time: "09:00", category: "Pekerjaan", priority: "medium", done: false },
      { id: "demo-2", title: "Cek agenda minggu ini", date: today, time: "10:30", category: "Pribadi", priority: "low", done: true },
      { id: "demo-3", title: "Belanja kebutuhan", date: today, time: "16:00", category: "Pribadi", priority: "high", done: false }
    ];
  };

  function isValidTask(task) {
    return task && typeof task.title === "string" && task.title.trim() &&
      typeof task.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(task.date);
  }

  function loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) return makeDemoTasks();
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(isValidTask).map((task, index) => ({
        id: task.id || "task-" + index,
        title: task.title.trim(),
        date: task.date,
        time: typeof task.time === "string" ? task.time : "",
        category: typeof task.category === "string" ? task.category : "Lainnya",
        priority: ["low", "medium", "high"].includes(task.priority) ? task.priority : "medium",
        done: Boolean(task.done)
      })) : makeDemoTasks();
    } catch (error) {
      console.warn("Planora: data lokal tidak dapat dibaca.", error);
      return makeDemoTasks();
    }
  }

  let tasks = loadTasks();

  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
      return true;
    } catch (error) {
      console.warn("Planora: gagal menyimpan data lokal.", error);
      showNotice("Data tidak bisa disimpan di browser ini. Periksa ruang penyimpanan atau mode privat.");
      return false;
    }
  }

  function showNotice(message) {
    let notice = $("#planora-notice");
    if (!notice) {
      notice = document.createElement("p");
      notice.id = "planora-notice";
      notice.setAttribute("role", "status");
      notice.className = "notice";
      const heading = $(".page-heading");
      if (heading) heading.insertAdjacentElement("afterend", notice);
    }
    notice.textContent = message;
  }

  const priorityLabels = { low: "Rendah", medium: "Sedang", high: "Tinggi" };
  const categoryClass = (category) => category === "Pekerjaan" ? "blue-dot" : category === "Belajar" ? "purple-dot" : "green-dot";
  const displayTime = (time) => time || "Waktu belum ditentukan";

  function createTaskRow(task) {
    const row = document.createElement("article");
    row.className = "task-row";

    const check = document.createElement("button");
    check.type = "button";
    check.className = "task-check" + (task.done ? " checked" : "");
    check.setAttribute("aria-label", task.done ? "Tandai belum selesai" : "Tandai selesai");
    check.setAttribute("aria-pressed", String(task.done));
    check.textContent = task.done ? "✓" : "";
    check.addEventListener("click", () => {
      task.done = !task.done;
      saveTasks();
      renderAll();
    });

    const info = document.createElement("div");
    info.className = "task-info";
    const title = document.createElement("strong");
    title.textContent = task.title;
    if (task.done) title.className = "completed";

    const meta = document.createElement("span");
    meta.append(document.createTextNode(displayTime(task.time) + " · "));
    const dot = document.createElement("i");
    dot.className = "dot " + categoryClass(task.category);
    meta.append(dot, document.createTextNode(task.category || "Lainnya"));
    info.append(title, meta);

    const priority = document.createElement("span");
    priority.className = "priority " + task.priority;
    priority.textContent = priorityLabels[task.priority] || "Sedang";
    row.append(check, info, priority);
    return row;
  }

  function renderTasks() {
    const today = todayKey();
    const todayTasks = tasks.filter((task) => task.date === today)
      .sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));

    $("#today-count").textContent = todayTasks.length;
    $("#done-count").textContent = todayTasks.filter((task) => task.done).length;
    $("#overdue-count").textContent = tasks.filter((task) => !task.done && task.date < today).length;

    taskList.replaceChildren();
    if (!todayTasks.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "Belum ada rencana hari ini. Tambahkan rencana baru untuk memulai.";
      taskList.append(empty);
      return;
    }
    todayTasks.forEach((task) => taskList.append(createTaskRow(task)));
  }

  function renderCalendar() {
    const year = shownMonth.getFullYear();
    const month = shownMonth.getMonth();
    $("#month-label").textContent = shownMonth.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    const grid = $("#calendar-grid");
    grid.replaceChildren();

    ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].forEach((day) => {
      const el = document.createElement("span");
      el.className = "weekday";
      el.textContent = day;
      grid.append(el);
    });

    const firstDay = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    for (let i = 0; i < firstDay; i++) {
      const blank = document.createElement("span");
      blank.setAttribute("aria-hidden", "true");
      grid.append(blank);
    }

    for (let day = 1; day <= days; day++) {
      const date = new Date(year, month, day);
      const key = dateKey(date);
      const el = document.createElement("span");
      el.textContent = String(day);
      if (key === todayKey()) el.classList.add("today");
      if (tasks.some((task) => task.date === key)) {
        el.classList.add("has-plan");
        el.setAttribute("aria-label", day + " ada rencana");
      }
      grid.append(el);
    }
  }

  function renderUpcoming() {
    if (!upcomingContainer) return;
    upcomingContainer.replaceChildren();
    const today = todayKey();
    const upcoming = tasks.filter((task) => !task.done && task.date >= today)
      .sort((a, b) => (a.date + (a.time || "99:99")).localeCompare(b.date + (b.time || "99:99")))
      .slice(0, 4);

    if (!upcoming.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "Belum ada rencana mendatang.";
      upcomingContainer.append(empty);
      return;
    }

    upcoming.forEach((task) => {
      const date = new Date(task.date + "T12:00:00");
      const dateBox = document.createElement("div");
      dateBox.className = "upcoming-date";
      const day = document.createElement("strong");
      day.textContent = date.toLocaleDateString("id-ID", { day: "2-digit" });
      const month = document.createElement("span");
      month.textContent = date.toLocaleDateString("id-ID", { month: "short" });
      dateBox.append(day, month);

      const info = document.createElement("div");
      info.className = "upcoming-info";
      const title = document.createElement("strong");
      title.textContent = task.title;
      const detail = document.createElement("span");
      const dateLabel = task.date === today ? "Hari ini" : date.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" });
      detail.textContent = dateLabel + (task.time ? ", " + task.time : "") + " · " + (task.category || "Lainnya");
      info.append(title, detail);

      const priority = document.createElement("span");
      priority.className = "priority " + task.priority;
      priority.textContent = priorityLabels[task.priority] || "Sedang";
      const item = document.createElement("div");
      item.className = "upcoming-list-item";
      item.append(dateBox, info, priority);
      upcomingContainer.append(item);
    });
  }

  function renderAll() {
    renderTasks();
    renderCalendar();
    renderUpcoming();
  }

  function openDialog() {
    form.reset();
    form.elements.date.value = todayKey();
    form.elements.time.value = "09:00";
    if (typeof dialog.showModal === "function") dialog.showModal();
    else showNotice("Browser ini belum mendukung form dialog. Coba buka Planora di browser terbaru.");
  }

  $("#open-task-form")?.addEventListener("click", openDialog);
  $("#add-inline")?.addEventListener("click", openDialog);
  $("#close-dialog")?.addEventListener("click", () => dialog.close());
  $("#cancel-dialog")?.addEventListener("click", () => dialog.close());
  $("#prev-month")?.addEventListener("click", () => {
    shownMonth = new Date(shownMonth.getFullYear(), shownMonth.getMonth() - 1, 1);
    renderCalendar();
  });
  $("#next-month")?.addEventListener("click", () => {
    shownMonth = new Date(shownMonth.getFullYear(), shownMonth.getMonth() + 1, 1);
    renderCalendar();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const title = String(data.get("title") || "").trim();
    const date = String(data.get("date") || "");
    if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      showNotice("Nama rencana dan tanggal wajib diisi dengan benar.");
      return;
    }
    tasks.push({
      id: "task-" + Date.now(),
      title,
      date,
      time: String(data.get("time") || ""),
      category: String(data.get("category") || "Lainnya"),
      priority: ["low", "medium", "high"].includes(String(data.get("priority"))) ? String(data.get("priority")) : "medium",
      done: false
    });
    saveTasks();
    renderAll();
    dialog.close();
    showNotice("Rencana berhasil ditambahkan.");
  });

  $("#today-date").textContent = new Date().toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  }).toUpperCase();

  // Fitur yang belum dibuat diberi keterangan, bukan link kosong.
  document.querySelectorAll('a[href="#settings"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      showNotice("Halaman Pengaturan belum dibuat. Saat ini fokusnya dashboard dan rencana.");
    });
  });
  $(".profile")?.addEventListener("click", () => {
    showNotice("Profil pengguna akan ditambahkan setelah fitur akun dibuat.");
  });

  // Highlight menu sesuai bagian yang sedang dibuka.
  document.querySelectorAll(".nav-item").forEach((link) => {
    link.addEventListener("click", () => {
      document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
      link.classList.add("active");
    });
  });

  renderAll();
})();