// ==============================
// File: Code.gs  (เสิร์ฟหน้า + API ใน Apps Script)
// ==============================
const SPREADSHEET_ID = 'PUT_YOUR_SPREADSHEET_ID_HERE'; // << ใส่ ID ของชีทที่มีแท็บ Config + Schedule
const SHEET = 'Schedule';
const CFG = 'Config';

function doGet(e) {
  const a = e?.parameter?.action || '';
  if (a === 'dates') return json(getDates_());
  if (a === 'times') return json(getTimes_(e?.parameter?.date));
  if (a === 'seed' && e?.parameter?.key === 'MY_SECRET') {
    seedQuick();
    return ContentService.createTextOutput('seeded');
  }
  const t = HtmlService.createTemplateFromFile('index');
  t.webAppUrl = ScriptApp.getService().getUrl();
  return t.evaluate()
    .setTitle('ร้านทำผม | จองคิวออนไลน์')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function doPost(e) {
  const payload = JSON.parse(e.postData?.contents || '{}');
  return json(createBooking_(payload));
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Helpers
function ss_() { return SpreadsheetApp.openById(SPREADSHEET_ID); }
function sh_(name){ const s = ss_().getSheetByName(name); if (!s) throw new Error('Missing sheet: '+name); return s; }
function cfg_() {
  const s = ss_().getSheetByName(CFG);
  const tz = s ? String(s.getRange('B2').getValue() || 'Asia/Bangkok').trim() : 'Asia/Bangkok';
  return { tz };
}
function headMap_(headers) { const m={}; headers.forEach((h,i)=>m[String(h).trim()]=i); return m; }

// APIs
function getDates_() {
  const { tz } = cfg_();
  const sh = sh_(SHEET);
  const last = sh.getLastRow(); if (last < 2) return [];
  const head = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  const H = headMap_(head);
  const rows = sh.getRange(2,1,last-1,head.length).getValues();
  const today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  const set = new Set();
  rows.forEach(r=>{
    if (!r[H['Date']] || !r[H['Time']]) return;
    const s = String(r[H['Status']]||'').toUpperCase();
    const d = Utilities.formatDate(new Date(r[H['Date']]), tz, 'yyyy-MM-dd');
    if (s==='AVAILABLE' && d>=today) set.add(d);
  });
  return Array.from(set).sort();
}

function getTimes_(dateStr) {
  if (!dateStr) return [];
  const { tz } = cfg_();
  const sh = sh_(SHEET);
  const last = sh.getLastRow(); if (last < 2) return [];
  const head = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  const H = headMap_(head);
  const rows = sh.getRange(2,1,last-1,head.length).getValues();
  const out = [];
  rows.forEach(r=>{
    if (!r[H['Date']] || !r[H['Time']]) return;
    const s = String(r[H['Status']]||'').toUpperCase();
    const d = Utilities.formatDate(new Date(r[H['Date']]), tz, 'yyyy-MM-dd');
    const t = Utilities.formatDate(new Date(r[H['Time']]), tz, 'HH:mm');
    if (s==='AVAILABLE' && d===dateStr) out.push(t);
  });
  return Array.from(new Set(out)).sort();
}

function createBooking_(p) {
  const { tz } = cfg_();
  const sh = sh_(SHEET);
  const last = sh.getLastRow(); if (last < 2) return { ok:false, msg:'no data' };
  const head = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  const H = headMap_(head);
  const vals = sh.getRange(2,1,last-1,head.length).getValues();

  const { customerName, phone, customerEmail, notes, dateStr, timeStr } = p || {};
  if (!customerName || !phone || !dateStr || !timeStr) return { ok:false, msg:'missing fields' };

  const lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try {
    let idx = -1;
    for (let i=0;i<vals.length;i++){
      const r = vals[i];
      if (!r[H['Date']] || !r[H['Time']]) continue;
      const d = Utilities.formatDate(new Date(r[H['Date']]), tz, 'yyyy-MM-dd');
      const t = Utilities.formatDate(new Date(r[H['Time']]), tz, 'HH:mm');
      const s = String(r[H['Status']]||'').toUpperCase();
      if (d===dateStr && t===timeStr && s==='AVAILABLE'){ idx = i; break; }
    }
    if (idx===-1) return { ok:false, msg:'taken' };

    const row = idx + 2;
    const nowISO = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd'T'HH:mm:ssXXX");
    const updates = {
      'Status':'BOOKED','CustomerName':customerName,'Phone':phone,
      'CustomerEmail':customerEmail||'','Notes':notes||'','BookedAt':nowISO
    };
    Object.keys(updates).forEach(k=>{ if (H[k]!=null) sh.getRange(row, H[k]+1).setValue(updates[k]); });
    return { ok:true };
  } finally { lock.releaseLock(); }
}

// Seed example: tomorrow 10:00–12:00
function seedQuick() {
  const sh = ss_().getSheetByName(SHEET) || ss_().insertSheet(SHEET);
  const head = ['Date','Time','Status','CustomerName','Phone','CustomerEmail','Notes','BookedAt'];
  if (sh.getLastRow() === 0) sh.appendRow(head);
  const now = new Date(); now.setHours(0,0,0,0);
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate()+1);
  const rows = [];
  for (const t of ['10:00','10:30','11:00','11:30','12:00']){
    const [hh,mm]=t.split(':').map(Number);
    const time = new Date(date); time.setHours(hh,mm,0,0);
    rows.push([date, time, 'AVAILABLE','','','','','']);
  }
  sh.getRange(sh.getLastRow()+1,1,rows.length,head.length).setValues(rows);
  sh.getRange('A2:A').setNumberFormat('yyyy-mm-dd');
  sh.getRange('B2:B').setNumberFormat('hh:mm');
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Booking')
    .addItem('เติมสลอตตัวอย่าง', 'seedQuick')
    .addToUi();
}
