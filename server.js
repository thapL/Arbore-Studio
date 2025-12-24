// server.js (เฉพาะบรรทัดที่เปลี่ยน/เพิ่ม)
require("dotenv").config();
const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
const path = require("path");
const https = require("https");

// อ่าน env
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
const PORT = process.env.PORT || 5173;

// *** เพิ่ม: เปิดโหมด DEV_TLS_INSECURE=1 เพื่อข้ามตรวจ TLS เฉพาะตอน dev ***
const DEV_TLS_INSECURE = process.env.DEV_TLS_INSECURE === "1";

// *** เพิ่ม: สร้าง agent สำหรับข้ามตรวจ TLS เฉพาะ dev ***
const insecureAgent = new https.Agent({ rejectUnauthorized: false });

// *** เพิ่ม: ห่อ fetch ให้เลือก agent อัตโนมัติ ***
function appFetch(url, opts = {}) {
  if (DEV_TLS_INSECURE) {
    return fetch(url, { agent: insecureAgent, ...opts });
  }
  return fetch(url, opts);
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// health
app.get("/health", async (req, res) => {
  try {
    const r = await appFetch(`${APPS_SCRIPT_URL}?action=dates`, {
      cache: "no-store",
    });
    const text = await r.text();
    res
      .status(200)
      .json({ ok: true, status: r.status, sample: text.slice(0, 120) });
  } catch (e) {
    console.error("Health failed =>", e && e.message);
    res.status(500).json({ ok: false, msg: "proxy-error" });
  }
});

// proxy
app.get("/api/dates", async (req, res) => {
  try {
    const r = await appFetch(`${APPS_SCRIPT_URL}?action=dates`, {
      cache: "no-store",
    });
    if (!r.ok)
      return res
        .status(502)
        .json({ ok: false, msg: `apps-script ${r.status}` });
    res.json(await r.json());
  } catch (e) {
    console.error("dates fetch error:", e.message);
    res.status(500).json({ ok: false, msg: "proxy-error" });
  }
});

app.get("/api/times", async (req, res) => {
  try {
    const d = req.query.date || "";
    const r = await appFetch(
      `${APPS_SCRIPT_URL}?action=times&date=${encodeURIComponent(d)}`,
      { cache: "no-store" }
    );
    if (!r.ok)
      return res
        .status(502)
        .json({ ok: false, msg: `apps-script ${r.status}` });
    res.json(await r.json());
  } catch (e) {
    console.error("times fetch error:", e.message);
    res.status(500).json({ ok: false, msg: "proxy-error" });
  }
});

app.post("/api/book", async (req, res) => {
  try {
    const r = await appFetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body || {}),
    });
    if (!r.ok)
      return res
        .status(502)
        .json({ ok: false, msg: `apps-script ${r.status}` });
    res.json(await r.json());
  } catch (e) {
    console.error("book fetch error:", e.message);
    res.status(500).json({ ok: false, msg: "proxy-error" });
  }
});

// serve frontend
const frontendDir = path.join(__dirname, "frontend");
app.use(express.static(frontendDir));
app.get("/*", (_, res) => res.sendFile(path.join(frontendDir, "index.html")));

console.log("APPS_SCRIPT_URL =", APPS_SCRIPT_URL);
console.log("DEV_TLS_INSECURE =", DEV_TLS_INSECURE);
app.listen(PORT, () => console.log(`Ready: http://localhost:${PORT}`));
