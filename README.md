# 📚 LibraSync (ลิบราซิงค์)

ระบบจัดการห้องสมุดแบบครบวงจร พัฒนาด้วย Node.js + Express + EJS + Sequelize + SQLite

## ✨ ฟีเจอร์ปัจจุบัน

- 🔍 ค้นหา + แบ่งหน้า (10/25/50)
- 📦 รองรับจำนวนหนังสือหลายสำเนา (`total_copies`, `borrowed_copies`, `available_copies`)
- 🔢 ISBN อัตโนมัติ + ปุ่มสุ่ม ISBN ใหม่ + normalize รูปแบบ ISBN
- 👥 จัดการ ผู้แต่ง / หนังสือ / สมาชิก / ยืม-คืน
- 📊 รายงาน 3 หน้า: ยืมปัจจุบัน, ประวัติยืม-คืนทั้งหมด, สมาชิกยืมกี่ครั้ง
- 📄 ส่งออก CSV ทุกหน้ารายงาน
- 🧪 หน้าตรวจสุขภาพระบบ (`/admin/health`) และล้างข้อมูลทั้งหมดแบบยืนยันรหัส
- 🔐 Security middleware: `helmet`, `express-rate-limit`, `express-session`, flash messages
- 🌙 Dark mode + 🖨️ print-friendly

---

## 🧱 เทคโนโลยี

- Runtime: Node.js (แนะนำ LTS 20.x หรือใหม่กว่า)
- Framework: Express
- View Engine: EJS
- ORM: Sequelize
- Database: SQLite
- Validation: express-validator
- Session/Flash: express-session, connect-flash

---

## ⚙️ การติดตั้งและรัน

1) ติดตั้งแพ็กเกจ

```bash
npm install
```

2) รันโปรเจกต์

```bash
npm start
```

หรือถ้าต้องการเคลียร์พอร์ต 3000 ก่อนรันอัตโนมัติ:

```bash
npm run start:clean
```

> หมายเหตุ: สคริปต์ `npm run dev` ใช้ `nodemon` (มีใน devDependencies)
> และมี `npm run dev:clean` สำหรับเคลียร์พอร์ตก่อนรัน dev อัตโนมัติ

3) เปิด

```text
http://localhost:3000
```

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

- `SESSION_SECRET` ใช้เข้ารหัส session
- `ENABLE_SEED=false` ค่าเริ่มต้นไม่ seed ข้อมูลอัตโนมัติ
- `ADMIN_RESET_CODE` ใช้ยืนยันตอนกด “ล้างข้อมูลทั้งหมด”

---

## 🗄️ โครงสร้างข้อมูลหลัก

### Authors
- `id`, `full_name`, `biography`

### Books
- `id`, `title`, `isbn` (unique), `author_id`
- `status` (`Available`/`Borrowed`/`Lost`)
- `total_copies`, `borrowed_copies`

### Members
- `id`, `full_name`, `email` (unique), `phone_number`, `joined_date`

### LoanRecords
- `id`, `book_id`, `member_id`, `borrow_date`, `return_date`

### SystemMigrations
- ใช้บันทึก one-time migration ภายในระบบ

---

## 📁 โครงสร้างโปรเจกต์

```text
librasync2/
├─ app.js
├─ config/
│  └─ database.js
├─ middleware/
│  └─ validate.js
├─ models/
│  ├─ Author.js
│  ├─ Book.js
│  ├─ Member.js
│  ├─ LoanRecord.js
│  └─ index.js
├─ routes/
│  ├─ index.js
│  ├─ authors.js
│  ├─ books.js
│  ├─ members.js
│  ├─ loans.js
│  ├─ reports.js
│  └─ admin.js
├─ views/
│  ├─ partials/
│  ├─ authors/
│  ├─ books/
│  ├─ members/
│  ├─ loans/
│  ├─ reports/
│  ├─ admin/
│  ├─ dashboard.ejs
│  └─ error.ejs
├─ public/
│  ├─ css/style.css
│  └─ js/darkmode.js
├─ backups/
├─ database.sqlite
└─ README.md
```

---

## 🌐 Routes

### หน้าแอป
- `GET /` แดชบอร์ด

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
- เพิ่ม `?format=csv` เพื่อ export CSV

### แอดมิน
- `GET /admin/health`
- `POST /admin/reset-data` (ต้องกรอกรหัสยืนยัน)

---

## 🧩 พฤติกรรมสำคัญของระบบ

- ระบบคำนวณสถานะหนังสือจากจำนวนคงเหลือร่วมกับสถานะสูญหาย
- การยืม/คืนทำใน transaction เพื่อลดความเสี่ยงข้อมูลไม่ตรงกัน
- มี one-time migration สำหรับ normalize ISBN เก่า
- หน้าแอดมินมีการ backup ไฟล์ฐานข้อมูลก่อนล้างข้อมูลเสมอ

---

## 🧯 การล้างข้อมูลทั้งหมด

### วิธีผ่านหน้าเว็บ (แนะนำ)
1. ไปที่ `/admin/health`
2. กรอกรหัสยืนยัน (`ADMIN_RESET_CODE`)
3. กด “ล้างข้อมูลทั้งหมด”

ระบบจะ:
- backup DB ไปที่โฟลเดอร์ `backups/`
- ลบข้อมูลใน `LoanRecords`, `Books`, `Members`, `Authors`

### วิธี manual
ลบไฟล์ `database.sqlite` แล้ว `npm start` ใหม่

---

## 🛠️ Troubleshooting

### พอร์ต 3000 ถูกใช้งาน (`EADDRINUSE`)
ปิด process เดิมแล้วรันใหม่:

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue |
	Select-Object -ExpandProperty OwningProcess -Unique |
	ForEach-Object { Stop-Process -Id $_ -Force }
```

จากนั้นรัน `npm run dev` หรือ `npm start` ใหม่อีกครั้ง

ทางเลือกที่ง่ายกว่า (แนะนำ):

```bash
npm run dev:clean
```

### `npm run dev` ไม่ทำงาน
ให้ติดตั้ง dependencies ให้ครบก่อน (`npm install`) หรือใช้ `npm start`

### ข้อมูลตัวอย่างกลับมาเอง
ตรวจ `.env` ว่า `ENABLE_SEED=false`

---

## 📚 เอกสารช่วยพรีเซนต์

สำหรับอธิบายโค้ดกับอาจารย์ แนะนำเปิดไฟล์:

- `docs/CLASSROOM_CODE_WALKTHROUGH_TH.md`

ไฟล์นี้จัดทำเพื่ออธิบายแต่ละไฟล์และ flow การทำงานแบบสอนหน้าชั้น

---

## 📄 License

MIT
