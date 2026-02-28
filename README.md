# 📚 LibraSync (ลิบราซิงค์)

ระบบจัดการห้องสมุดด้วย Node.js + Express + EJS + Sequelize + SQLite
รองรับงานปฏิบัติการ (ยืม/คืน) และงานรายงานเชิงวิเคราะห์ในระบบเดียว

---

## ✨ ฟีเจอร์หลัก (อัปเดตตามโปรเจกต์ปัจจุบัน)

### 1) จัดการข้อมูลหลัก
- ผู้แต่ง / หนังสือ / สมาชิก / ยืม-คืน
- ค้นหา + แบ่งหน้า (10 / 25 / 50)
- Validation ฝั่งเซิร์ฟเวอร์ด้วย `express-validator`

### 2) ระบบหนังสือหลายสำเนา
- รองรับ `total_copies`, `borrowed_copies`, `available_copies`
- อัปเดตสถานะคงคลังเมื่อยืม/คืนแบบ transaction

### 3) ระบบ ISBN
- สร้าง ISBN อัตโนมัติ
- Normalize รูปแบบ ISBN
- one-time migration สำหรับ normalize ISBN เก่า

### 4) รายงานครบชุด
- รายงานการยืมปัจจุบัน (`/reports/active-loans`)
- รายงานประวัติยืม-คืนทั้งหมด (`/reports/loan-history`)
- รายงานสมาชิกยืมกี่ครั้ง (`/reports/member-borrow-summary`)
- ส่งออก CSV ทุกหน้ารายงานด้วย `?format=csv`

### 5) Dashboard เวอร์ชันวิเคราะห์ (เฟส 1-3)
- KPI สำคัญ: หนังสือทั้งหมด, กำลังถูกยืม, พร้อมให้ยืม, สมาชิกทั้งหมด, ยืมวันนี้, คืนวันนี้
- การ์ดเตือน: เกินกำหนด 7 วัน, ใกล้หมดสต็อก, สมาชิกค้างยืมหลายเล่ม
- การ์ดเตือนคลิกได้พร้อม query filter ที่เกี่ยวข้อง
- แนวโน้มยืม/คืน: 7 วัน + สวิตช์ช่วงเวลา 7/30/90 วัน
- Top 10 หนังสือที่ถูกยืมมากที่สุด
- Top 10 สมาชิกที่ยืมมากที่สุด
- Smart Search สมาชิกใน Dashboard (เลือกสมาชิกแล้วดูหนังสือที่เคยยืม + วันที่ล่าสุด)

### 6) ความปลอดภัยและแอดมิน
- `helmet`, `express-rate-limit`, `express-session`, `connect-flash`
- หน้าตรวจสุขภาพระบบ (`/admin/health`)
- ล้างข้อมูลทั้งหมดพร้อมรหัสยืนยัน (`ADMIN_RESET_CODE`) และสำรองฐานข้อมูลก่อนล้าง

---

## 🧱 เทคโนโลยี
- Runtime: Node.js (แนะนำ LTS 20+)
- Backend: Express
- View Engine: EJS
- ORM: Sequelize
- Database: SQLite
- Validation: express-validator

---

## ⚙️ การติดตั้งและรัน

### 1) ติดตั้งแพ็กเกจ
```bash
npm install
```

### 2) รันระบบ
```bash
npm start
```

### 3) เปิดใช้งาน
```text
http://localhost:3000
```

### สคริปต์ที่มีในโปรเจกต์
- `npm start` รันแอปด้วย Node
- `npm run dev` รันด้วย nodemon
- `npm run port:free` เคลียร์พอร์ต 3000
- `npm run start:clean` เคลียร์พอร์ตแล้วค่อย start
- `npm run dev:clean` เคลียร์พอร์ตก่อนรัน dev

---

## 🔐 Environment Variables
สร้างไฟล์ `.env` ที่ root:

```env
NODE_ENV=development
PORT=3000
SESSION_SECRET=change-this-secret
ENABLE_SEED=false
ADMIN_RESET_CODE=RESET-ALL
```

คำอธิบาย:
- `SESSION_SECRET` ควรเปลี่ยนเป็นค่า secret จริง
- `ENABLE_SEED=false` ปิด seed อัตโนมัติ (แนะนำสำหรับงานจริง)
- `ADMIN_RESET_CODE` รหัสยืนยันการล้างข้อมูลทั้งระบบ

---

## 🗄️ โครงสร้างข้อมูลหลัก

### Authors
- `id`, `full_name`, `biography`

### Books
- `id`, `title`, `isbn` (unique), `author_id`
- `status` (`Available` / `Borrowed` / `Lost`)
- `total_copies`, `borrowed_copies`

### Members
- `id`, `full_name`, `email` (unique), `phone_number`, `joined_date`

### LoanRecords
- `id`, `book_id`, `member_id`, `borrow_date`, `return_date`

### SystemMigrations
- บันทึก one-time migration ภายในระบบ

---

## 🌐 Routes

### หน้าหลัก
- `GET /` Dashboard

### ผู้แต่ง
- `GET /authors`
- `GET /authors/new`
- `POST /authors`
- `GET /authors/:id/edit`
- `POST /authors/:id/update`
- `POST /authors/:id/delete`

### หนังสือ
- `GET /books`
- `GET /books/new`
- `GET /books/isbn/generate`
- `GET /books/check-duplicate`
- `POST /books`
- `GET /books/:id/edit`
- `POST /books/:id/update`
- `POST /books/:id/delete`

### สมาชิก
- `GET /members`
- `GET /members/new`
- `POST /members`
- `GET /members/:id/edit`
- `POST /members/:id/update`
- `POST /members/:id/delete`

### ยืม-คืน
- `GET /loans`
- `GET /loans/new`
- `POST /loans`
- `POST /loans/:id/return`

### รายงาน
- `GET /reports/active-loans`
- `GET /reports/loan-history`
- `GET /reports/member-borrow-summary`

### แอดมิน
- `GET /admin/health`
- `POST /admin/reset-data`

---

## 📊 Query ที่ใช้บ่อย

### รายงานการยืมปัจจุบัน
- `GET /reports/active-loans?from=YYYY-MM-DD&to=YYYY-MM-DD&member_id=ID`

### รายงานประวัติยืม-คืนทั้งหมด
- `GET /reports/loan-history?from=YYYY-MM-DD&to=YYYY-MM-DD&status=all|active|returned`
- `GET /reports/loan-history?returned_from=YYYY-MM-DD&returned_to=YYYY-MM-DD`

> หมายเหตุพฤติกรรมล่าสุด: ถ้ากรองด้วยช่วงวันที่ยืม (`from/to`) ระบบจะเน้นรายการที่ยังไม่คืนตามเงื่อนไขที่กำหนดไว้ในโค้ดปัจจุบัน

### รายงานสมาชิกยืมกี่ครั้ง
- `GET /reports/member-borrow-summary?from=YYYY-MM-DD&to=YYYY-MM-DD&keyword=...&min_borrows=0`
- `GET /reports/member-borrow-summary?detail_member_id=ID`

### ส่งออก CSV
- เติม `&format=csv`

---

## 🧠 พฤติกรรมสำคัญในระบบ
- ยืม/คืนทำด้วย transaction เพื่อความถูกต้องของคงคลัง
- สถานะบางรายงานใช้ effective-date (`return_date` เทียบวันปัจจุบัน)
- Dashboard รองรับสวิตช์ช่วงเวลา 7/30/90 วัน โดยใช้ query `trend_days`
- การ์ดเตือนใน Dashboard ผูกลิงก์ไปหน้ารายงานที่มี filter พร้อมใช้

---

## 🧯 Troubleshooting

### ปัญหา Port 3000 ถูกใช้งาน (`EADDRINUSE`)
```bash
npm run start:clean
```
หรือ
```bash
npm run dev:clean
```

### รันไม่ขึ้นหลังแก้โค้ด
1. ปิด process node เดิม
2. รันใหม่ด้วย `npm start`
3. hard refresh หน้าเว็บ (`Ctrl+F5`)

### ต้องการล้างข้อมูลทั้งระบบ
- ไปที่ `/admin/health`
- กรอก `ADMIN_RESET_CODE`
- ระบบจะ backup DB ก่อนล้างข้อมูล

---

## 📁 โครงสร้างโปรเจกต์โดยย่อ
```text
librasync2/
├─ app.js
├─ config/
├─ middleware/
├─ models/
├─ routes/
├─ views/
├─ public/
├─ scripts/
├─ docs/
├─ backups/
├─ database.sqlite
├─ package.json
└─ README.md
```

เอกสารอธิบายโค้ดสำหรับพรีเซนต์:
- `docs/CLASSROOM_CODE_WALKTHROUGH_TH.md`

---

## 📄 License
MIT
