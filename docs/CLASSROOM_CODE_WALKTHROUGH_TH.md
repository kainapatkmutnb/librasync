# Classroom Code Walkthrough (TH)

เอกสารนี้ทำมาเพื่อใช้ตอบคำถามอาจารย์หน้าชั้นว่า “โค้ดส่วนนี้ทำอะไร” โดยอธิบายแยกตามไฟล์และลำดับการทำงาน

## 1) ภาพรวมการไหลของระบบ

1. `app.js` บูตเซิร์ฟเวอร์ + middleware + route
2. `models/*` กำหนดโครงสร้างข้อมูลและความสัมพันธ์
3. `routes/*` ทำ business logic และ query
4. `views/*` แสดงผลหน้าเว็บด้วย EJS
5. `public/*` จัดการ UI/UX (CSS + dark mode)

---

## 2) app.js อธิบายตามลำดับ

- โหลด dependency (`express`, `session`, `flash`, `helmet`, `rateLimit`, `dotenv`)
- ตั้งค่า view engine เป็น EJS
- เปิด security middleware
- ตั้งค่า session/cookie
- inject flash ไป `res.locals` เพื่อแสดงผลทุกหน้า
- map route (`/authors`, `/books`, `/members`, `/loans`, `/reports`, `/admin`)
- 404/500 handler
- `startServer()`
  - `sequelize.sync()`
  - `ensureDataConstraints()`
  - one-time migration ISBN
  - optional seed (เมื่อ `ENABLE_SEED=true`)

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

### index.js
- กำหนด association:
  - Author 1:N Book
  - Book 1:N LoanRecord
  - Member 1:N LoanRecord

---

## 4) middleware/validate.js

- รวม validation rules สำหรับ authors/books/members/loans
- ฟังก์ชัน `validate()`:
  - รัน rule ทั้งหมด
  - ถ้าผิด: flash error + flash formData + redirect กลับ

---

## 5) routes สำคัญ

### routes/index.js (Dashboard)
- คำนวณตัวเลข summary
- ดึง recent activities

### routes/books.js
- ค้นหา + filter + pagination
- สร้าง ISBN อัตโนมัติ
- normalize ISBN
- update จำนวนสำเนา และป้องกันกรณี total น้อยกว่าจำนวนที่ถูกยืม

### routes/loans.js
- ยืมและคืนแบบ transaction
- ยืม: เพิ่ม LoanRecord + เพิ่ม `borrowed_copies`
- คืน: ใส่ `return_date` + ลด `borrowed_copies`

### routes/reports.js
- active loans
- loan history
- member borrow summary
- export CSV
- helper: `normalizeDate`, `parseMemberId`

### routes/admin.js
- `/admin/health` ตรวจสุขภาพฐานข้อมูล
- `/admin/reset-data` ล้างข้อมูลทั้งหมดพร้อม backup และยืนยันรหัส

---

## 6) views ที่ควรอธิบายให้อาจารย์ฟัง

### views/partials/header.ejs
- เมนูหลักของระบบ
- แสดง flash success/error

### views/dashboard.ejs
- stats cards
- recent activities
- quick actions

### views/books/form.ejs
- ISBN readonly + ปุ่มสุ่ม ISBN ใหม่
- กำหนดจำนวนเล่มรวม

### views/books/index.ejs
- filter ค้นหา/ผู้แต่ง/ความพร้อมยืม
- ตารางแสดงคงเหลือ/ถูกยืม/ทั้งหมด

### views/reports/loan-history.ejs
- ฟิลเตอร์แบบช่วงวันที่ยืม + ช่วงวันที่คืน
- สรุปรายการ

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

---

## 9) หมายเหตุสำคัญเรื่อง “คอมเมนต์ทุกบรรทัด”

แนวทางที่ปลอดภัยสำหรับงานจริงคือไม่ใส่คอมเมนต์ทุกบรรทัดลงโค้ดโดยตรง เพราะ:
- ทำให้โค้ดยาวมากและอ่านยาก
- เสี่ยงแก้แล้ว syntax พังใน EJS/HTML/JSON
- เพิ่มภาระเวลาปรับโค้ด

เอกสารนี้จึงถูกทำมาแทน เพื่อใช้สอน/พรีเซนต์ได้ครบโดยไม่กระทบการทำงานของระบบ

ถ้าต้องการแบบเข้มมากขึ้น สามารถขยายเอกสารนี้ให้เป็น “รายไฟล์แบบ line-by-line จริง” ได้ต่อเป็นรอบถัดไป
