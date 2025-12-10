# Salon Booking (Frontend แยก + Apps Script Backend)

## โครงสร้าง
- `apps_script/` : โค้ด Apps Script (เสิร์ฟหน้าแบบ single page ได้ในตัว)
- `frontend/` : HTML/CSS/JS (โฮสต์ที่ Netlify/GitHub Pages ได้)
- `netlify/functions/api.js` : Proxy → เรียก Apps Script (แก้ CORS)
- `netlify.toml` : คอนฟิก Netlify

## ใช้งานแบบแยกโค้ด (แนะนำสำหรับทำงานเป็นทีม)
1) **Deploy Apps Script** เป็น Web App → ได้ URL `/exec`
2) ขึ้น Netlify (ต่อ Git repo โปรเจ็กต์นี้)
3) ตั้ง Environment variable ใน Netlify: `APPS_SCRIPT_URL=<URL /exec>`
4) Deploy → หน้าเว็บจะเรียกผ่าน `/api/...` (proxy) ไม่ติด CORS

## ใช้งานแบบ Single Page ใน Apps Script
- นำไฟล์ใน `apps_script/` ไปใส่ในโปรเจกต์ Apps Script (สร้างไฟล์ `Code.gs` และไฟล์ HTML ชื่อ `index`)
- แก้ `SPREADSHEET_ID` ให้ชี้ไฟล์ชีทของคุณ
- กด Deploy → Web app → Anyone
- เปิด `/exec` ก็ใช้งานได้เลย

## เติมสลอตตัวอย่าง
- รันฟังก์ชัน `seedQuick` ใน Apps Script หนึ่งครั้ง หรือเปิด `/exec?action=seed&key=MY_SECRET` (ถ้าคุณเปิดโค้ดส่วน seed ใน doGet)
