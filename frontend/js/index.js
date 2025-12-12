/* index.js — REPLACE your js/index.js with this file
   - Calendar (loads dates/times)
   - When user clicks a time -> opens modal to choose service
   - Attach image preview
   - Confirm in modal -> POST to GGSHEET_WEBAPP_URL (JSON)
   - Theme, slider, toast, fallback form submit
*/

/* ===== CONFIG ===== */
const API = {
  dates: "/api/dates",
  times: (d) => `/api/times?date=${encodeURIComponent(d)}`,
  book: "/api/book",
};

// <-- เปลี่ยนเป็น URL ของ Web App ที่ deploy จาก Google Apps Script ของเพื่อน
const GGSHEET_WEBAPP_URL = "https://script.google.com/macros/s/YOUR_DEPLOY_ID/exec";

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const pad = (n) => (n < 10 ? "0" + n : "" + n);
const d2str = (d) => d.toISOString().slice(0, 10);

let availableDates = new Set();
let viewYear, viewMonth;
let selectedDate = null;
let selectedTime = null;

/* ===== Toast ===== */
const toast = (m) => {
  const t = $(".toast");
  if (!t) return;
  t.textContent = m;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 1600);
};

/* ===== Fetch helper ===== */
async function j(url, opt) {
  const r = await fetch(url, opt);
  if (!r.ok) throw new Error("network");
  return r.json();
}
const fetchDates = () => j(API.dates);
const fetchTimes = (d) => j(API.times(d));
const bookAPI = (payload) =>
  j(API.book, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

/* ===== Calendar ===== */
function setMonthLabel(y, m) {
  const th = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
  const lbl = $("#monthLabel");
  if (lbl) lbl.textContent = `${th[m]} ${y + 543}`;
}

function renderCalendar() {
  const grid = $("#calGrid");
  if (!grid) return;
  grid.innerHTML = "";

  const first = new Date(viewYear, viewMonth, 1);
  const start = first.getDay();
  const days = new Date(viewYear, viewMonth + 1, 0).getDate();
  const today = new Date(); today.setHours(0,0,0,0);

  setMonthLabel(viewYear, viewMonth);

  for (let i = 0; i < start; i++) grid.appendChild(document.createElement("div"));

  for (let d = 1; d <= days; d++) {
    const dateObj = new Date(viewYear, viewMonth, d);
    const el = document.createElement("button");
    el.type = "button";
    el.className = "day";
    el.textContent = d;
    const dateStr = `${dateObj.getFullYear()}-${pad(dateObj.getMonth()+1)}-${pad(d)}`;

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
  const apiMsg = $("#apiMsg");
  if (apiMsg) apiMsg.textContent = "กำลังโหลดวันว่าง...";
  try {
    const arr = await fetchDates();
    availableDates = new Set(Array.isArray(arr) ? arr : []);
    if (apiMsg) apiMsg.textContent = `พบวันว่าง ${availableDates.size} วัน`;
    renderCalendar();
  } catch {
    if (apiMsg) apiMsg.textContent = "โหลดวันว่างไม่สำเร็จ";
  }
}

async function selectDate(dateStr, el) {
  selectedDate = dateStr;
  selectedTime = null;
  const sd = $("#selectedDate");
  if (sd) sd.textContent = `วันที่เลือก: ${dateStr}`;

  document.querySelectorAll(".day").forEach(x => x.classList.remove("selected"));
  if (el) el.classList.add("selected");

  const box = $("#times");
  if (!box) return;
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
      b.type = "button";
      b.className = "chip";
      b.textContent = t;

      b.onclick = () => {
        // visual
        [...box.children].forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        // set and open modal for selecting service
        selectedTime = t;
        openServiceModal(dateStr, t);
      };

      box.appendChild(b);
    });
  } catch {
    box.innerHTML = `<span class="muted">โหลดเวลาไม่สำเร็จ</span>`;
  }
}

/* ===== Slider ===== */
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

/* ===== Theme ===== */
function initTheme() {
  const toggle = $("#themeToggle");
  const darkClass = "dark";
  if (!toggle) return;
  if (localStorage.getItem("theme") === "dark") {
    document.documentElement.classList.add(darkClass);
    toggle.textContent = "☀️";
  } else {
    toggle.textContent = "🌙";
  }
  toggle.addEventListener("click", () => {
    const isDark = document.documentElement.classList.toggle(darkClass);
    toggle.textContent = isDark ? "☀️" : "🌙";
    localStorage.setItem("theme", isDark ? "dark" : "light");
  });
}

/* ===== Attach image preview (store dataURL) ===== */
let attachedDataURL = null;
function initAttachImage() {
  const attachBtn = $("#attachBtn");
  const attachInput = $("#attachImg");
  const imgPreview = $("#imgPreview");
  if (!attachBtn || !attachInput) return;

  attachBtn.addEventListener("click", () => attachInput.click());

  attachInput.addEventListener("change", () => {
    const file = attachInput.files[0];
    attachedDataURL = null;
    if (!file) {
      if (imgPreview) imgPreview.innerHTML = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
      attachedDataURL = e.target.result; // data:image/...
      if (imgPreview) imgPreview.innerHTML = `<img src="${attachedDataURL}" alt="preview">`;
    };
    reader.readAsDataURL(file);
  });
}

/* ===== Service modal + booking flow ===== */
const SERVICES = [
  { id: "cut", name: "ตัดผม", price: 250 },
  { id: "color", name: "ทำสี", price: 1200 },
  { id: "treat", name: "ทรีตเมนต์", price: 890 }
];

let modal, serviceListEl, cancelServiceBtn, confirmServiceBtn;
let selectedServiceId = null;
let pendingBooking = null;

function cacheModalEls() {
  modal = document.getElementById("serviceModal");
  serviceListEl = document.getElementById("serviceList");
  cancelServiceBtn = document.getElementById("cancelService");
  confirmServiceBtn = document.getElementById("confirmService");
}

function populateServices(list = SERVICES) {
  if (!serviceListEl) return;
  serviceListEl.innerHTML = "";
  list.forEach(s => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "service-item";
    btn.dataset.id = s.id;
    btn.textContent = `${s.name} — ${s.price}฿`;
    btn.onclick = () => {
      [...serviceListEl.children].forEach(x => x.classList.remove("active"));
      btn.classList.add("active");
      selectedServiceId = s.id;
      if (confirmServiceBtn) confirmServiceBtn.disabled = false;
    };
    serviceListEl.appendChild(btn);
  });
}

function openServiceModal(dateStr, timeStr) {
  if (!modal) return;
  pendingBooking = { dateStr, timeStr };
  selectedServiceId = null;
  if (confirmServiceBtn) confirmServiceBtn.disabled = true;
  populateServices();
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden"; // disable background scroll
}

function closeServiceModal() {
  if (!modal) return;
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
  pendingBooking = null;
  selectedServiceId = null;
  document.body.style.overflow = ""; // restore scroll
}

async function confirmServiceAndBook() {
  if (!pendingBooking || !selectedServiceId) return alert("กรุณาเลือกบริการก่อน");
  const svc = SERVICES.find(s => s.id === selectedServiceId);
  if (!svc) return alert("บริการไม่ถูกต้อง");

  const payload = {
    action: "createBooking",
    dateStr: pendingBooking.dateStr,
    timeStr: pendingBooking.timeStr,
    serviceId: svc.id,
    serviceName: svc.name,
    price: svc.price,
    customerName: $("#name") ? $("#name").value.trim() : "",
    phone: $("#phone") ? $("#phone").value.trim() : "",
    email: $("#email") ? $("#email").value.trim() : "",
    notes: $("#notes") ? $("#notes").value.trim() : "",
    imageData: attachedDataURL || null
  };

  if (!payload.customerName || !payload.phone) {
    alert("กรุณากรอกชื่อและเบอร์โทรก่อนยืนยันการจอง");
    return;
  }

  try {
    if (confirmServiceBtn) {
      confirmServiceBtn.disabled = true;
      confirmServiceBtn.textContent = "กำลังบันทึก...";
    }

    const res = await fetch(GGSHEET_WEBAPP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data && data.result === "success") {
      toast("จองสำเร็จแล้ว");
      if (document.querySelector("#bookForm")) document.querySelector("#bookForm").reset();
      attachedDataURL = null;
      if ($("#imgPreview")) $("#imgPreview").innerHTML = "";
      if ($("#times")) $("#times").innerHTML = "";
      selectedTime = null;
      pendingBooking = null;
      await reloadDates();
      if ($("#selectedDate")) $("#selectedDate").textContent = "ยังไม่ได้เลือกวันที่";
      closeServiceModal();
    } else {
      alert("บันทึกไม่สำเร็จ: " + (data?.message || "unknown"));
      if (confirmServiceBtn) {
        confirmServiceBtn.disabled = false;
        confirmServiceBtn.textContent = "ยืนยันการจอง";
      }
    }
  } catch (err) {
    console.error(err);
    alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    if (confirmServiceBtn) {
      confirmServiceBtn.disabled = false;
      confirmServiceBtn.textContent = "ยืนยันการจอง";
    }
  }
}

/* ===== Fallback form submit (if user presses submit btn) ===== */
async function onSubmit(e) {
  e.preventDefault();
  const msg = $("#formMsg");
  if (msg) msg.textContent = "";

  if (!selectedDate) { if (msg) msg.textContent = "กรุณาเลือกวัน"; return; }
  if (!selectedTime) { if (msg) msg.textContent = "กรุณาเลือกเวลา"; return; }

  // if user submits via form (not via modal), just call open modal so they pick service
  openServiceModal(selectedDate, selectedTime);
}

/* ===== Init ===== */
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initSlider();

  cacheModalEls();
  if (cancelServiceBtn) cancelServiceBtn.onclick = closeServiceModal;
  if (confirmServiceBtn) confirmServiceBtn.onclick = confirmServiceAndBook;
  if (modal) modal.addEventListener("click", (e) => { if (e.target === modal) closeServiceModal(); });

  initAttachImage();

  const now = new Date();
  viewYear = now.getFullYear();
  viewMonth = now.getMonth();

  renderCalendar();
  reloadDates();

  const prev = $("#prevMonth"), next = $("#nextMonth");
  if (prev) prev.onclick = () => { viewMonth--; if (viewMonth<0){viewMonth=11;viewYear--;} renderCalendar(); };
  if (next) next.onclick = () => { viewMonth++; if (viewMonth>11){viewMonth=0;viewYear++;} renderCalendar(); };

  const bookForm = document.getElementById("bookForm");
  if (bookForm) bookForm.addEventListener("submit", onSubmit);
});
