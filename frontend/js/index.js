/* ===================== CONFIG ===================== */
const API = {
  dates: "/api/dates",
  times: (d) => `/api/times?date=${encodeURIComponent(d)}`,
};

const SERVICES = [
  {
    category: "✂️ บริการตัดผม",
    items: [
      {
        id: "haircut",
        name: "ตัดผม (รวมสระ + เซ็ตผม)",
        price: 800,
      },
      {
        id: "bang_trim",
        name: "ตัดหน้าม้า (ไม่รวมสระ)",
        price: 400,
      },
      {
        id: "shampoo_style",
        name: "สระผม + เซ็ทผม",
        price: 400,
      },
    ],
  },

  {
    category: "🎨 ทำสีผม (ไม่ฟอก)",
    items: [
      {
        id: "color_no_bleach",
        name: "ทำสีผม (ไม่ฟอก)",
        price: 1500,
      },
      {
        id: "root_touchup",
        name: "เติมโคนผม (ไม่ฟอก)",
        price: 1300,
      },
    ],
  },

  {
    category: "⚡️ ฟอก & สีพิเศษ",
    items: [
      {
        id: "bleach",
        name: "ฟอกผม",
        price: 2000,
        note: "ติดต่อร้านก่อนจอง",
      },
      {
        id: "highlight",
        name: "ไฮไลต์ผม (Design Color)",
        price: "เริ่มต้น 1500",
        note: "ติดต่อร้านก่อนจอง",
      },
    ],
  },

  {
    category: "💆🏻‍♀️ ดูแลเส้นผม",
    items: [
      {
        id: "head_spa",
        name: "สปาหัว",
        price: 1000,
      },
      {
        id: "treatment",
        name: "ทรีตเมนท์",
        price: 1000,
      },
    ],
  },

  {
    category: "🌈 Set Menu",
    items: [
      {
        id: "set_color_cut",
        name: "ทำสี (ไม่ฟอก) + ตัดผม",
        price: 2300,
      },
      {
        id: "set_full_bleach_color",
        name: "ฟอกทั้งหัว + ลงสี",
        price: 4000,
        note: "ติดต่อร้านก่อนจอง",
      },
      {
        id: "set_full_bleach_color_cut",
        name: "ฟอกทั้งหัว + ลงสี + ตัดผม",
        price: 4800,
        note: "ติดต่อร้านก่อนจอง",
      },
    ],
  },
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
  image: null,
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
  if (!grid) return;
  grid.innerHTML = "";

  const first = new Date(viewYear, viewMonth, 1);
  const start = first.getDay();
  const days = new Date(viewYear, viewMonth + 1, 0).getDate();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  setMonthLabel(viewYear, viewMonth);

  for (let i = 0; i < start; i++) {
    grid.appendChild(document.createElement("div"));
  }

  for (let d = 1; d <= days; d++) {
    const dateObj = new Date(viewYear, viewMonth, d);
    const dateStr = `${dateObj.getFullYear()}-${pad(
      dateObj.getMonth() + 1
    )}-${pad(d)}`;

    const el = document.createElement("button");
    el.type = "button";
    el.className = "day";
    el.textContent = d;

    if (dateObj < today) el.classList.add("muted");

    if (availableDates.has(dateStr)) {
      el.classList.add("available");
      el.onclick = () => {
        $$(".day").forEach((x) => x.classList.remove("selected"));
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

  document.querySelector(".modal-box")?.scrollTo(0, 0);
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
    image: null,
  };

  $("#popupName") && ($("#popupName").value = "");
  $("#popupPhone") && ($("#popupPhone").value = "");
  $("#popupEmail") && ($("#popupEmail").value = "");
  $("#popupNotes") && ($("#popupNotes").value = "");
  $("#popupImgPreview") && ($("#popupImgPreview").innerHTML = "");

  // ล้าง active service
  $("#popupServices")
    ?.querySelectorAll(".service-item")
    .forEach((b) => b.classList.remove("active"));
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

    times.forEach((t) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = t;
      b.onclick = () => {
        selectedTime = t;
        [...box.children].forEach((x) => x.classList.remove("active"));
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

  SERVICES.forEach((group) => {
    /* ===== หัวข้อหมวด ===== */
    const title = document.createElement("div");
    title.className = "service-category";
    title.textContent = group.category;
    box.appendChild(title);

    /* ===== รายการบริการ ===== */
    group.items.forEach((s) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "service-item";

      b.innerHTML = `
        <div class="svc-name">${s.name}</div>
        <div class="svc-meta">
          <span class="svc-price">${s.price.toLocaleString()}฿</span>
        </div>
        ${s.note ? `<div class="svc-note">${s.note}</div>` : ""}
      `;

      b.onclick = () => {
        selectedService = s;

        // ล้าง active ทุกปุ่ม
        box
          .querySelectorAll(".service-item")
          .forEach((x) => x.classList.remove("active"));

        b.classList.add("active");
        updateConfirmState();
      };

      box.appendChild(b);
    });
  });
}

function updateConfirmState() {
  $("#confirmPopup").disabled = !(
    selectedDate &&
    selectedTime &&
    selectedService
  );
}

/* ===================== FORM / ATTACH ===================== */
function initPopupAttach() {
  const btn = $("#popupAttachBtn");
  const input = $("#popupAttachImg");
  const preview = $("#popupImgPreview");

  if (!btn || !input || !preview) return;

  btn.onclick = () => input.click();

  input.onchange = () => {
    const file = input.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast("กรุณาเลือกไฟล์รูปภาพเท่านั้น");
      input.value = "";
      return;
    }

    customerData.image = file;

    preview.innerHTML = "";

    const img = document.createElement("img");
    const url = URL.createObjectURL(file);

    img.src = url;
    img.style.maxWidth = "100%";
    img.style.borderRadius = "12px";
    img.style.marginTop = "10px";

    img.onload = () => URL.revokeObjectURL(url);

    preview.appendChild(img);
  };
}

/* ===================== CONFIRM ===================== */
async function postJSON(url, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.msg || `HTTP ${r.status}`);
  return data;
}

$("#confirmPopup")?.addEventListener("click", async () => {
  customerData.name = $("#popupName")?.value.trim();
  customerData.phone = $("#popupPhone")?.value.trim();
  customerData.email = $("#popupEmail")?.value.trim();
  customerData.notes = $("#popupNotes")?.value.trim();

  if (!customerData.name || !customerData.phone) {
    toast("กรุณากรอกชื่อและเบอร์โทร");
    return;
  }

  let slipDataUrl = "";
  try {
    if (customerData.image) {
      // กันไฟล์ใหญ่มาก
      const maxMB = 2;
      if (customerData.image.size > maxMB * 1024 * 1024) {
        toast(`รูปใหญ่เกิน ${maxMB}MB กรุณาเลือกรูปที่เล็กลง`);
        return;
      }
      slipDataUrl = await fileToDataUrl(customerData.image);
    }
  } catch (e) {
    console.error(e);
    toast("อ่านไฟล์รูปไม่สำเร็จ");
    return;
  }

  const payload = {
    date: selectedDate,
    time: selectedTime,
    customerName: customerData.name,
    phone: customerData.phone,
    email: customerData.email,
    notes: customerData.notes,
    serviceName: selectedService?.name,
    amount: Number(selectedService?.price || 0),
    slipDataUrl,
  };

  try {
    $("#confirmPopup").disabled = true;
    toast("กำลังบันทึก...");

    const res = await postJSON("/api/book", payload);

    console.log("BOOK OK:", res);
    toast("บันทึกการจองเรียบร้อย");
    closeBookingPopup();
    await reloadDates();
  } catch (err) {
    console.error(err);
    toast(`บันทึกไม่สำเร็จ: ${err.message}`);
  } finally {
    $("#confirmPopup").disabled = false;
  }
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
  initPopupAttach(); // ✅ เรียกครั้งเดียวพอ

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

function initQrPopup() {
  const qrBtn = document.getElementById("popupQrBtn");
  const qrModal = document.getElementById("qrModal");
  const closeQr = document.getElementById("closeQr");

  if (!qrBtn || !qrModal) return;

  qrBtn.onclick = () => {
    qrModal.classList.add("show");
  };

  closeQr.onclick = () => {
    qrModal.classList.remove("show");
  };
}

document.addEventListener("DOMContentLoaded", () => {
  initQrPopup();
});

/* ===================== LANGUAGE TOGGLE ===================== */
let currentLang = "th";

const langBtn = document.getElementById("langToggle");

function applyLanguage(lang) {
  document.querySelectorAll("[data-th]").forEach((el) => {
    el.innerHTML = el.dataset[lang];
  });

  langBtn.textContent = lang === "th" ? "EN" : "TH";
  currentLang = lang;
}

// ✅ โหลดภาษาไทยทันทีเมื่อหน้าเว็บเสร็จ
document.addEventListener("DOMContentLoaded", () => {
  applyLanguage("th");
});

// ✅ ปุ่มสลับภาษา
langBtn.addEventListener("click", () => {
  applyLanguage(currentLang === "th" ? "en" : "th");
});

/* ===================== SAVE IMAGE SLIP ===================== */
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result || ""));
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}
