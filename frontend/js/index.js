/* =========================================
   CONFIG & HELPERS
========================================= */

const API = {
  dates: "/api/dates",
  times: (d) => `/api/times?date=${encodeURIComponent(d)}`,
  book: "/api/book",
};

const $ = (s) => document.querySelector(s);
const pad = (n) => (n < 10 ? "0" + n : "" + n);
const d2str = (d) => d.toISOString().slice(0, 10);

let availableDates = new Set();
let viewYear, viewMonth;
let selectedDate = null;
let selectedTime = null;

/* Toast Message */
const toast = (m) => {
  const t = $(".toast");
  t.textContent = m;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 1800);
};

/* Fetch Wrapper */
async function j(url, opt) {
  const r = await fetch(url, opt);
  if (!r.ok) throw new Error("net");
  return r.json();
}

const fetchDates = () => j(API.dates);
const fetchTimes = (d) => j(API.times(d));
const book = (payload) =>
  j(API.book, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

/* =========================================
   CALENDAR
========================================= */

function setMonthLabel(y, m) {
  const th = [
    "ม.ค.",
    "ก.พ.",
    "มี.ค.",
    "เม.ย.",
    "พ.ค.",
    "มิ.ย.",
    "ก.ค.",
    "ส.ค.",
    "ก.ย.",
    "ต.ค.",
    "พ.ย.",
    "ธ.ค.",
  ];
  $("#monthLabel").textContent = `${th[m]} ${y + 543}`;
}

function renderCalendar() {
  const grid = $("#calGrid");
  grid.innerHTML = "";

  const first = new Date(viewYear, viewMonth, 1);
  const start = first.getDay();
  const days = new Date(viewYear, viewMonth + 1, 0).getDate();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  setMonthLabel(viewYear, viewMonth);

  for (let i = 0; i < start; i++)
    grid.appendChild(document.createElement("div"));

  for (let d = 1; d <= days; d++) {
    const dateObj = new Date(viewYear, viewMonth, d);
    const el = document.createElement("button");
    el.type = "button";
    el.className = "day";
    el.textContent = d;

    const dateStr = `${dateObj.getFullYear()}-${pad(
      dateObj.getMonth() + 1
    )}-${pad(d)}`;

    if (dateObj < today) el.classList.add("muted");
    else if (availableDates.has(dateStr)) {
      el.classList.add("available");
      el.onclick = () => selectDate(dateStr, el);
    }

    if (d2str(today) === dateStr) el.classList.add("today");

    grid.appendChild(el);
  }
}

async function reloadDates() {
  try {
    $("#apiMsg").textContent = "กำลังโหลดวันว่าง...";
    const arr = await fetchDates();
    availableDates = new Set(Array.isArray(arr) ? arr : []);

    $("#apiMsg").textContent = `พบวันว่าง ${availableDates.size} วัน`;
    renderCalendar();
  } catch {
    $("#apiMsg").textContent = "โหลดวันว่างไม่สำเร็จ";
  }
}

async function selectDate(dateStr, el) {
  selectedDate = dateStr;
  selectedTime = null;

  $("#selectedDate").textContent = `วันที่เลือก: ${dateStr}`;

  document
    .querySelectorAll(".day")
    .forEach((x) => x.classList.remove("selected"));
  el.classList.add("selected");

  const box = $("#times");
  box.innerHTML = "กำลังโหลด...";

  try {
    const times = await fetchTimes(dateStr);
    box.innerHTML = "";

    if (!times?.length) {
      box.innerHTML = `<span class="muted">คิวเต็ม/ปิดร้าน</span>`;
      return;
    }

    times.forEach((t) => {
      const b = document.createElement("button");
      b.className = "chip";
      b.textContent = t;

      b.onclick = () => {
        selectedTime = t;
        [...box.children].forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
      };

      box.appendChild(b);
    });
  } catch {
    box.innerHTML = `<span class="muted">โหลดเวลาไม่สำเร็จ</span>`;
  }
}

/* =========================================
   BOOKING FORM
========================================= */

async function onSubmit(e) {
  e.preventDefault();

  const msg = $("#formMsg");
  msg.textContent = "";

  if (!selectedDate) return (msg.textContent = "กรุณาเลือกวัน");
  if (!selectedTime) return (msg.textContent = "กรุณาเลือกเวลา");

  const payload = {
    customerName: $("#name").value.trim(),
    phone: $("#phone").value.trim(),
    customerEmail: $("#email").value.trim(),
    notes: $("#notes").value.trim(),
    dateStr: selectedDate,
    timeStr: selectedTime,
  };

  if (!payload.customerName || !payload.phone)
    return (msg.textContent = "กรอกชื่อและเบอร์ให้ครบ");

  const btn = $("#submitBtn");
  const old = btn.textContent;
  btn.disabled = true;
  btn.textContent = "กำลังจอง...";

  try {
    const res = await book(payload);

    if (res?.ok) {
      toast("✔ จองสำเร็จ");
      $("#bookForm").reset();
      $("#times").innerHTML = "";
      selectedTime = null;
      await reloadDates();
      $("#selectedDate").textContent = "ยังไม่ได้เลือกวันที่";
    } else {
      msg.textContent = "จองไม่สำเร็จ: " + (res?.msg || "");
    }
  } catch {
    msg.textContent = "เครือข่ายล้มเหลว";
  } finally {
    btn.disabled = false;
    btn.textContent = old;
  }
}

/* =========================================
   SLIDER
========================================= */

let slideIndex = 0;

function initSlider() {
  const slides = document.querySelector(".slides");
  const imgs = document.querySelectorAll(".slides img");

  if (!slides || imgs.length === 0) return;

  function showSlide(i) {
    slideIndex = (i + imgs.length) % imgs.length;
    slides.style.transform = `translateX(-${slideIndex * 100}%)`;
  }

  const nextBtn = document.querySelector(".slide-btn.next");
  const prevBtn = document.querySelector(".slide-btn.prev");

  if (nextBtn) nextBtn.onclick = () => showSlide(slideIndex + 1);
  if (prevBtn) prevBtn.onclick = () => showSlide(slideIndex - 1);

  setInterval(() => showSlide(slideIndex + 1), 5000);
}

/* =========================================
   THEMING (DARK MODE)
========================================= */

function initTheme() {
  const toggle = $("#themeToggle");
  const darkClass = "dark";

  if (localStorage.getItem("theme") === "dark") {
    document.documentElement.classList.add(darkClass);
    toggle.textContent = "☀️";
  }

  toggle.addEventListener("click", () => {
    const isDark = document.documentElement.classList.toggle(darkClass);
    toggle.textContent = isDark ? "☀️" : "🌙";
    localStorage.setItem("theme", isDark ? "dark" : "light");
  });
}

/* =========================================
   MAIN INIT
========================================= */

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initSlider();

  const now = new Date();
  viewYear = now.getFullYear();
  viewMonth = now.getMonth();

  renderCalendar();
  reloadDates();

  $("#prevMonth").onclick = () => {
    viewMonth--;
    if (viewMonth < 0) {
      viewMonth = 11;
      viewYear--;
    }
    renderCalendar();
  };

  $("#nextMonth").onclick = () => {
    viewMonth++;
    if (viewMonth > 11) {
      viewMonth = 0;
      viewYear++;
    }
    renderCalendar();
  };

  $("#bookForm").addEventListener("submit", onSubmit);
});

document.addEventListener("DOMContentLoaded", () => {
  const attachBtn = document.getElementById("attachBtn");
  const attachInput = document.getElementById("attachImg");
  const imgPreview = document.getElementById("imgPreview");

  let attachedFile = null;

  attachBtn.addEventListener("click", () => {
    attachInput.click();
  });

  attachInput.addEventListener("change", () => {
    const file = attachInput.files[0];
    attachedFile = file;

    if (!file) {
      imgPreview.innerHTML = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      imgPreview.innerHTML = `<img src="${e.target.result}" alt="preview">`;
    };
    reader.readAsDataURL(file);
  });
});
