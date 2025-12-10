// server.js
require("dotenv").config();
const express = require("express");
const fetch = require("node-fetch"); // v2
const cors = require("cors");
const path = require("path");

const APPS_SCRIPT_URL = (process.env.APPS_SCRIPT_URL || "").trim();
if (!APPS_SCRIPT_URL) {
  console.error("Missing APPS_SCRIPT_URL in .env");
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json());

// === Diagnostics ===
app.get("/diag", async (req, res) => {
  try {
    const url = `${APPS_SCRIPT_URL}?action=dates`;
    const r = await fetch(url, { cache: "no-store", timeout: 15000 });
    const text = await r.text();
    res.json({
      ok: true,
      envLen: APPS_SCRIPT_URL.length,
      startsWithHttps: APPS_SCRIPT_URL.startsWith("https://"),
      url,
      status: r.status,
      bodySample: text.slice(0, 200),
    });
  } catch (e) {
    console.error("DIAG error:", e && (e.stack || e.message));
    res
      .status(500)
      .json({ ok: false, msg: "diag-failed", err: String(e.message || e) });
  }
});

// ---- health check ----
app.get("/health", async (req, res) => {
  try {
    const r = await fetch(`${APPS_SCRIPT_URL}?action=dates`, {
      cache: "no-store",
      timeout: 15000,
    });
    const text = await r.text();
    res
      .status(200)
      .json({ ok: true, status: r.status, sample: text.slice(0, 120) });
  } catch (e) {
    console.error("Health failed =>", e && (e.stack || e.message));
    res.status(500).json({ ok: false, msg: "proxy-error" });
  }
});

// ---- proxy endpoints (log error detail) ----
app.get("/api/dates", async (req, res) => {
  try {
    const r = await fetch(`${APPS_SCRIPT_URL}?action=dates`, {
      cache: "no-store",
      timeout: 15000,
    });
    if (!r.ok) {
      const text = await r.text();
      console.error("dates failed:", r.status, text.slice(0, 200));
      return res
        .status(502)
        .json({ ok: false, msg: `apps-script ${r.status}` });
    }
    res.json(await r.json());
  } catch (e) {
    console.error("dates fetch error:", e && (e.stack || e.message));
    res.status(500).json({ ok: false, msg: "proxy-error" });
  }
});

app.get("/api/times", async (req, res) => {
  try {
    const d = req.query.date || "";
    const r = await fetch(
      `${APPS_SCRIPT_URL}?action=times&date=${encodeURIComponent(d)}`,
      { cache: "no-store", timeout: 15000 }
    );
    if (!r.ok) {
      const text = await r.text();
      console.error("times failed:", r.status, text.slice(0, 200));
      return res
        .status(502)
        .json({ ok: false, msg: `apps-script ${r.status}` });
    }
    res.json(await r.json());
  } catch (e) {
    console.error("times fetch error:", e && (e.stack || e.message));
    res.status(500).json({ ok: false, msg: "proxy-error" });
  }
});

app.post("/api/book", async (req, res) => {
  try {
    const r = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body || {}),
      timeout: 15000,
    });
    if (!r.ok) {
      const text = await r.text();
      console.error("book failed:", r.status, text.slice(0, 200));
      return res
        .status(502)
        .json({ ok: false, msg: `apps-script ${r.status}` });
    }
    res.json(await r.json());
  } catch (e) {
    console.error("book fetch error:", e && (e.stack || e.message));
    res.status(500).json({ ok: false, msg: "proxy-error" });
  }
});

// ---- serve frontend ----
const frontendDir = path.join(__dirname, "frontend");
app.use(express.static(frontendDir));
app.get("/*", (_, res) => res.sendFile(path.join(frontendDir, "index.html")));

const PORT = process.env.PORT || 5173;
console.log("APPS_SCRIPT_URL =", APPS_SCRIPT_URL);
console.log("APPS_SCRIPT_URL length =", APPS_SCRIPT_URL.length);
app.listen(PORT, () => console.log(`Ready: http://localhost:${PORT}`));
