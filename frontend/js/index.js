/* ===================== CONFIG ===================== */
const API = {
  dates: "/api/dates",
  times: (d) => `/api/times?date=${encodeURIComponent(d)}`
};

const SERVICES = [
  { id: "cut", name: "ตัดผม", price: 250 },
  { id: "color", name: "ทำสี", price: 1200 },
  { id: "treat", name: "ทรีตเมนต์", price: 890 }
];

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const pad = (n) => (n < 10 ? "0" + n : "" + n);

/* ===================== STATE ===================== */
let availableDates = new Set();
let viewYear, viewMonth;

let selectedDate = null;
let selectedTime = null;
let selectedService = null;

let customerData = {
  name: "",
  phone: "",
  email: "",
  notes: "",
  image: null
};

/* ===================== TOAST ===================== */
function toast(msg) {
  const t = $("#toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 1600);
}

/* ===================== FETCH ===================== */
async function j(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error("network");
  return r.json();
}

const fetchDates = () => j(API.dates);
const fetchTimes = (d) => j(API.times(d));

/* ===================== CALENDAR ===================== */
function setMonthLabel(y, m) {
  const th = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
  $("#monthLabel").textContent = `${th[m]} ${y + 543}`;
}

function renderCalendar() {
  const grid = $("#calGrid");
  if (!grid) return;
  grid.innerHTML = "";

  const first = new Date(viewYear, viewMonth, 1);
  const start = first.getDay();
  const days = new Date(viewYear, viewMonth + 1, 0).getDate();

  const today = new Date();
  today.setHours(0,0,0,0);

  setMonthLabel(viewYear, viewMonth);

  for (let i = 0; i < start; i++) {
    grid.appendChild(document.createElement("div"));
  }

  for (let d = 1; d <= days; d++) {
    const dateObj = new Date(viewYear, viewMonth, d);
    const dateStr = `${dateObj.getFullYear()}-${pad(dateObj.getMonth()+1)}-${pad(d)}`;

    const el = document.createElement("button");
    el.type = "button";
    el.className = "day";
    el.textContent = d;

    if (dateObj < today) el.classList.add("muted");

    if (availableDates.has(dateStr)) {
      el.classList.add("available");
      el.onclick = () => {
        $$(".day").forEach(x => x.classList.remove("selected"));
        el.classList.add("selected");
        openBookingPopup(dateStr);
      };
    }

    if (dateObj.getTime() === today.getTime()) {
      el.classList.add("today");
    }

    grid.appendChild(el);
  }
}

async function reloadDates() {
  const apiMsg = $("#apiMsg");
  if (apiMsg) apiMsg.textContent = "กำลังโหลดวันว่าง...";

  try {
    const arr = await fetchDates();
    availableDates = new Set(Array.isArray(arr) ? arr : []);
    if (apiMsg) apiMsg.textContent = `พบวันว่าง ${availableDates.size} วัน`;
  } catch {
    availableDates = new Set();
    if (apiMsg) apiMsg.textContent = "โหลดวันว่างไม่สำเร็จ";
  }

  renderCalendar();
}

/* ===================== POPUP ===================== */
function openBookingPopup(dateStr) {
  selectedDate = dateStr;
  selectedTime = null;
  selectedService = null;

  $("#popupDate").textContent = `วันที่ ${dateStr}`;
  $("#bookingModal").classList.add("show");
  $("#bookingModal").setAttribute("aria-hidden", "false");

  resetForm();
  loadPopupTimes(dateStr);
  renderServices();
  updateConfirmState();
}

function closeBookingPopup() {
  $("#bookingModal").classList.remove("show");
  $("#bookingModal").setAttribute("aria-hidden", "true");
}

function resetForm() {
  customerData = {
    name: "",
    phone: "",
    email: "",
    notes: "",
    image: null
  };

  if ($("#popupName")) $("#popupName").value = "";
  if ($("#popupPhone")) $("#popupPhone").value = "";
  if ($("#popupEmail")) $("#popupEmail").value = "";
  if ($("#popupNotes")) $("#popupNotes").value = "";
  if ($("#popupImgPreview")) $("#popupImgPreview").innerHTML = "";
}

async function loadPopupTimes(dateStr) {
  const box = $("#popupTimes");
  box.innerHTML = "กำลังโหลด...";

  try {
    const times = await fetchTimes(dateStr);
    box.innerHTML = "";

    if (!times || !times.length) {
      box.innerHTML = `<span class="muted">ไม่มีเวลาว่าง</span>`;
      return;
    }

    times.forEach(t => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = t;
      b.onclick = () => {
        selectedTime = t;
        [...box.children].forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        updateConfirmState();
      };
      box.appendChild(b);
    });
  } catch {
    box.innerHTML = `<span class="muted">โหลดเวลาไม่สำเร็จ</span>`;
  }
}

function renderServices() {
  const box = $("#popupServices");
  box.innerHTML = "";

  SERVICES.forEach(s => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = `${s.name} — ${s.price}฿`;
    b.onclick = () => {
      selectedService = s;
      [...box.children].forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      updateConfirmState();
    };
    box.appendChild(b);
  });
}

function updateConfirmState() {
  $("#confirmPopup").disabled = !(selectedDate && selectedTime && selectedService);
}

/* ===================== FORM / ATTACH ===================== */
function initPopupAttach() {
  const btn = $("#popupAttachBtn");
  const input = $("#popupAttachImg");
  const preview = $("#popupImgPreview");

  if (!btn || !input) return;

  btn.onclick = () => input.click();

  input.onchange = () => {
    const file = input.files[0];
    if (!file) return;

    customerData.image = file;

    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    img.style.maxWidth = "100%";
    img.style.borderRadius = "10px";

    preview.innerHTML = "";
    preview.appendChild(img);
  };
}

/* ===================== CONFIRM ===================== */
$("#confirmPopup")?.addEventListener("click", () => {
  customerData.name = $("#popupName")?.value.trim();
  customerData.phone = $("#popupPhone")?.value.trim();
  customerData.email = $("#popupEmail")?.value.trim();
  customerData.notes = $("#popupNotes")?.value.trim();

  if (!customerData.name || !customerData.phone) {
    toast("กรุณากรอกชื่อและเบอร์โทร");
    return;
  }

  const payload = {
    date: selectedDate,
    time: selectedTime,
    service: selectedService,
    customer: customerData
  };

  console.log("BOOKING DATA", payload);
  toast("บันทึกการจองเรียบร้อย");
  closeBookingPopup();
});

/* ===================== THEME ===================== */
function initTheme() {
  const toggle = $("#themeToggle");
  if (!toggle) return;

  if (localStorage.getItem("theme") === "dark") {
    document.documentElement.classList.add("dark");
    toggle.textContent = "☀️";
  }

  toggle.onclick = () => {
    const isDark = document.documentElement.classList.toggle("dark");
    toggle.textContent = isDark ? "☀️" : "🌙";
    localStorage.setItem("theme", isDark ? "dark" : "light");
  };
}

/* ===================== SLIDER ===================== */
function initSlider() {
  const slides = document.querySelector(".slides");
  if (!slides || slides.children.length === 0) return;

  let idx = 0;
  setInterval(() => {
    idx = (idx + 1) % slides.children.length;
    slides.style.transform = `translateX(-${idx * 100}%)`;
  }, 5000);
}

/* ===================== INIT ===================== */
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initSlider();
  initPopupAttach();

  const now = new Date();
  viewYear = now.getFullYear();
  viewMonth = now.getMonth();

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

  $("#closePopup").onclick = closeBookingPopup;
});
