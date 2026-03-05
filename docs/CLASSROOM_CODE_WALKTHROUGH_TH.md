# Classroom Code Walkthrough (TH)

เอกสารนี้ทำมาเพื่อใช้ตอบคำถามอาจารย์หน้าชั้นว่า “โค้ดส่วนนี้ทำอะไร” โดยอธิบายแยกตามไฟล์และลำดับการทำงาน

## 1) ภาพรวมการไหลของระบบ

1. Browser เรียก `frontend/app.js` (EJS + session + flash)
2. Frontend proxy request ไป `backend/app.js` พร้อม header (`x-proxy-secret`, `x-auth-user`)
3. Backend ตรวจ proxy trust + attach user + RBAC แล้วทำ business logic ใน `routes/*`
4. Backend ตอบกลับเป็น JSON payload แบบ `view` / `redirect`
5. Frontend แปลง payload ไป render EJS หรือ redirect ให้ผู้ใช้
6. ข้อมูลจริงเก็บใน SQLite (`database.sqlite`) ผ่าน Sequelize models

---

## 2) app.js อธิบายตามลำดับ

### `frontend/app.js`
- ตั้งค่า EJS, static files, session cookie และ flash
- ตั้ง `res.locals.currentUser`, `success`, `error` ให้ทุกหน้า
- ทุกเส้นทางใช้ `app.all('*')` เพื่อ proxy ไป backend
- ส่ง `x-auth-user` แบบ URL-encoded JSON (แก้ปัญหาอักขระไทยใน header)
- รองรับ response พิเศษ:
  - JSON payload (`view`/`redirect`)
  - ไฟล์ Excel (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`)

### `backend/app.js`
- เปิด `cors`, `helmet`, `express-rate-limit`
- ใช้ `requireProxyTrust` + `attachCurrentUser` ที่ prefix `/api`
- override `res.render`/`res.redirect` ให้ตอบเป็น JSON payload กลับ frontend
- map routes:
  - `/api/auth`
  - `/api` (dashboard)
  - `/api/authors`, `/api/books`, `/api/members`, `/api/loans`, `/api/reports`, `/api/admin`
- `startServer()`:
  - `sequelize.sync()`
  - `ensureDataConstraints()` (index/constraint + data fix)
  - one-time ISBN normalization migration
  - bootstrap admin จาก `.env` ถ้ายังไม่มี admin
  - optional seed เมื่อ `ENABLE_SEED=true`

---

## 3) models

### Author.js
- เก็บชื่อผู้แต่งและประวัติ

### Book.js
- เก็บข้อมูลหนังสือ
- จุดสำคัญ: `isbn` unique, `total_copies`, `borrowed_copies`

### Member.js
- เก็บข้อมูลสมาชิก
- จุดสำคัญ: `email` unique

### LoanRecord.js
- เก็บประวัติยืม-คืน
- `return_date = null` หมายถึงยังไม่คืน

### UserAccount.js
- เก็บบัญชีล็อกอิน
- ผูกกับสมาชิกผ่าน `member_id` (unique)
- มี role: `admin` / `user`

### index.js
- กำหนด association:
  - Author 1:N Book
  - Book 1:N LoanRecord
  - Member 1:N LoanRecord
  - Member 1:1 UserAccount (ลบสมาชิกแล้วลบบัญชีตาม)

---

## 4) middleware

### `middleware/auth.js`
- `requireProxyTrust`: ตรวจ `AUTH_PROXY_SECRET`
- `attachCurrentUser`: parse `x-auth-user` (รองรับทั้ง raw JSON และ decodeURIComponent)
- `requireLogin`: บังคับล็อกอินก่อนเข้าระบบหลัก

### `middleware/rbac.js`
- `requireAdmin`: จำกัดสิทธิ์เฉพาะ admin
- `requireUserOrAdmin`: ให้ผ่านเฉพาะ role ที่อนุญาต

### `middleware/validate.js`
- รวม validation rules สำหรับ `authors/books/members/auth/loans`
- ฟังก์ชัน `validate()`:
  - รัน rule ทั้งหมด
  - ถ้าผิด: flash error + flash formData + redirect กลับ
- มี duplicate validators (ชื่อผู้แต่ง/หนังสือ/สมาชิก/username)


---

## 5) routes สำคัญ

### `routes/auth.js`
- `GET /auth/login`, `POST /auth/login`
- `GET /auth/register`, `POST /auth/register`
- register ทำ transaction: สร้าง `Member` + `UserAccount`
- login/logout ใช้ `req._authSession` เพื่อ sync session ผ่าน frontend proxy

### routes/index.js (Dashboard)
- คำนวณ stats หลัก + trends 7/30/90 วัน
- ดึง top books / top members / recent activities
- รองรับ member quick lookup (ดึงประวัติการยืมรายสมาชิก)
- มี role-based scope: user เห็นเฉพาะข้อมูลของตัวเอง

### routes/authors.js
- list + search + pagination
- duplicate check endpoint
- create/update/delete จำกัด admin

### routes/books.js
- ค้นหา + filter + pagination
- สร้าง ISBN อัตโนมัติ
- normalize ISBN
- update จำนวนสำเนา และป้องกันกรณี total น้อยกว่าจำนวนที่ถูกยืม
- ตรวจชื่อหนังสือซ้ำแบบ realtime

### routes/loans.js
- ยืมและคืนแบบ transaction
- ยืม: เพิ่ม LoanRecord + เพิ่ม `borrowed_copies`
- คืน: ใส่ `return_date` + ลด `borrowed_copies`
- user ถูกบังคับให้ใช้ `member_id` ของตัวเอง

### routes/reports.js
- active loans
- loan history
- member borrow summary
- filter หลายเงื่อนไข (วันที่, member, status, keyword, min borrows)
- export ด้วย query `?format=csv` แต่ไฟล์ที่ส่งจริงเป็น Excel (`.xlsx`)
- helper: `normalizeDate`, `parseMemberId`
- ใส่สีตามสถานะ + worksheet คำอธิบายสี + ฟอนต์ `Sukhumvit Set`

### routes/admin.js
- `/admin/health` ตรวจ integrity/index/duplicate/consistency
- `/admin/reset-data` สำรองฐานข้อมูลก่อน แล้วล้างตารางหลัก โดยต้องใช้ `ADMIN_RESET_CODE`

### routes/members.js
- จัดการสมาชิก (admin only)
- create/update แบบ transaction ร่วมกับ `UserAccount`
- ป้องกันข้อมูลซ้ำ (อีเมล/username)

---

## 6) views ที่ควรอธิบายให้อาจารย์ฟัง

### views/partials/header.ejs
- เมนูหลักของระบบ
- แสดงเมนูตาม role
- มีปุ่มสลับธีม + ปุ่ม logout

### views/dashboard.ejs
- stats cards
- trend charts 7/30/90
- member quick lookup
- recent activities
- quick actions และตาราง Top 10 (เฉพาะ admin)

### views/books/form.ejs
- ISBN readonly + ปุ่มสุ่ม ISBN ใหม่
- กำหนดจำนวนเล่มรวม

### views/books/index.ejs
- filter ค้นหา/ผู้แต่ง/ความพร้อมยืม
- ตารางแสดงคงเหลือ/ถูกยืม/ทั้งหมด

### views/reports/loan-history.ejs
- ฟิลเตอร์แบบช่วงวันที่ยืม + ช่วงวันที่คืน
- สรุปรายการ + สถานะกำลังยืม/คืนแล้ว

### views/reports/active-loans.ejs
- ฟิลเตอร์วันที่และสมาชิก
- ปุ่ม "ดาวน์โหลด Excel"

### views/reports/member-borrow-summary.ejs
- ฟิลเตอร์ keyword/min borrows/เลือกสมาชิกเจาะรายละเอียด
- ตารางสรุป + ตารางรายละเอียดหนังสือรายสมาชิก

### views/admin/health.ejs
- integrity/index/consistency checks
- danger zone (ล้างข้อมูลทั้งหมด)

---

## 7) public/css/style.css

- ธีมสี light/dark
- data table
- report filter layout
- loan history date-range layout
- danger-zone style
- report controls + excel button
- nav/logout alignment + role-based dashboard blocks

---

## 8) คำถามที่อาจารย์มักถาม + คำตอบสั้น

1. ทำไมใช้ transaction ตอนยืม/คืน?
- เพื่อป้องกันข้อมูลครึ่งหนึ่งสำเร็จอีกครึ่งล้มเหลว

2. ทำไมต้อง normalize ISBN?
- เพื่อให้ข้อมูลรูปแบบเดียวกัน ค้นหาและตรวจซ้ำง่าย

3. ทำไมต้องมี ADMIN_RESET_CODE?
- กันการกดล้างข้อมูลโดยไม่ตั้งใจ

4. ทำไมไม่ seed อัตโนมัติทุกครั้ง?
- เพื่อไม่ให้ข้อมูลทดสอบเดิมย้อนกลับมาเอง

5. ทำไมระบบแยก frontend กับ backend?
- แยกหน้าที่ชัดเจน: frontend จัดการ session/UI, backend รวม business logic และ data access

6. ทำไม query `format=csv` แต่ได้ไฟล์ `.xlsx`?
- legacy query name เดิมถูกคงไว้ แต่ implementation ปัจจุบัน export ผ่าน `exceljs` เป็น Excel จริง

---

## 9) หมายเหตุสำคัญเรื่อง “คอมเมนต์ทุกบรรทัด”

แนวทางที่ปลอดภัยสำหรับงานจริงคือไม่ใส่คอมเมนต์ทุกบรรทัดลงโค้ดโดยตรง เพราะ:
- ทำให้โค้ดยาวมากและอ่านยาก
- เสี่ยงแก้แล้ว syntax พังใน EJS/HTML/JSON
- เพิ่มภาระเวลาปรับโค้ด

เอกสารนี้จึงถูกทำมาแทน เพื่อใช้สอน/พรีเซนต์ได้ครบโดยไม่กระทบการทำงานของระบบ

ถ้าต้องการแบบเข้มมากขึ้น สามารถขยายเอกสารนี้ให้เป็น “รายไฟล์แบบ line-by-line จริง” ได้ต่อเป็นรอบถัดไป
