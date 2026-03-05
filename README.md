# 📚 LibraSync

ระบบจัดการห้องสมุด (Library Management System) ที่พัฒนาแบบแยก **Frontend Server** และ **Backend API Server** โดยโฟกัสงานจริงของห้องสมุด: จัดการหนังสือ/สมาชิก/ยืม-คืน, ระบบผู้ใช้ตามบทบาท (RBAC), และรายงานพร้อมส่งออกไฟล์ Excel

---

## 🚀 Project Title

**LibraSync — Library Management System (Frontend + Backend + SQLite)**

LibraSync เป็นระบบเว็บสำหรับบริหารงานห้องสมุด รองรับการใช้งานทั้งผู้ดูแลระบบ (admin) และผู้ใช้ทั่วไป (user) พร้อมโครงสร้างที่แยกชัดเจนระหว่างฝั่งแสดงผลกับฝั่ง API เพื่อให้ดูแลง่ายและขยายระบบได้ในอนาคต

---

## 🎯 System Overview

ฟีเจอร์หลักที่มีอยู่ในโค้ดปัจจุบัน:

- 📖 จัดการข้อมูล **ผู้แต่ง / หนังสือ / สมาชิก / ประวัติยืม-คืน**
- 📦 รองรับหนังสือหลายสำเนา (`total_copies`, `borrowed_copies`, `available_copies`)
- 🔐 Authentication ครบ: สมัครสมาชิก, เข้าสู่ระบบ, ออกจากระบบ
- 🛡️ RBAC 2 บทบาท: `admin` และ `user`
- 🔗 ผูกบัญชีผู้ใช้กับสมาชิกแบบ 1:1 (`UserAccounts` ↔ `Members`)
- ⚙️ Transaction ในงานสำคัญ (เช่น ยืม/คืน และสร้างสมาชิกพร้อมบัญชี)
- ✅ บังคับสิทธิ์การยืม-คืน: ผู้ใช้ทั่วไปทำรายการได้เฉพาะของสมาชิกที่ผูกกับบัญชีตัวเอง
- 📊 Dashboard สรุป KPI และแนวโน้มการยืม-คืน
- 📑 รายงาน 3 แบบ พร้อมส่งออก **Excel (.xlsx)** ด้วย `exceljs`
- 🧪 Admin Health Check + รีเซ็ตข้อมูลทั้งระบบพร้อมสำรองฐานข้อมูล

---

## 🏗️ Architecture

ระบบทำงานแบบ 2 ชั้น + 1 ฐานข้อมูล:

1. **Frontend Server (`frontend/app.js`)**
	 - Render หน้าเว็บด้วย EJS
	 - จัดการ session/flash ฝั่งผู้ใช้
	 - ทำหน้าที่ proxy request ไป Backend API
	 - แนบ `x-proxy-secret` และ `x-auth-user` ไปยัง backend

2. **Backend API Server (`backend/app.js`)**
	 - จัดการ business logic, validation, RBAC และ database access
	 - ตรวจความน่าเชื่อถือจาก proxy ด้วย `AUTH_PROXY_SECRET`
	 - รับ auth context จาก frontend แล้วบังคับสิทธิ์ก่อนเข้าถึง route
	 - ตอบกลับเป็น payload สำหรับ render/redirect ให้ frontend

3. **Database (SQLite + Sequelize)**
	 - ใช้ไฟล์ `database.sqlite`
	 - มี model และ association ชัดเจน
	 - มีการตั้ง index/constraints และ migration ภายในระบบตอนเริ่มรัน

### 🔄 Communication Flow

```text
Browser
	│
	▼
Frontend Server (EJS + Session + Flash)
	│  (Proxy + Auth Context Headers)
	▼
Backend API (/api/*)
	│
	▼
SQLite (database.sqlite)
```

---

## 🧰 Technology Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Web Framework | Express.js |
| Template Engine | EJS |
| ORM | Sequelize |
| Database | SQLite |
| Frontend | HTML5, CSS3, JavaScript |
| Validation | express-validator |
| Security | helmet, cors, express-rate-limit |
| Session/Flash | express-session, connect-flash |
| Auth | bcrypt |
| Report Export | exceljs |
| Dev Tools | nodemon, concurrently |

---

## 📁 Project Structure

```text
librasync2_net/
├─ backend/
│  ├─ app.js
│  ├─ config/
│  │  └─ database.js
│  ├─ middleware/
│  │  ├─ auth.js
│  │  ├─ rbac.js
│  │  └─ validate.js
│  ├─ models/
│  │  ├─ Author.js
│  │  ├─ Book.js
│  │  ├─ LoanRecord.js
│  │  ├─ Member.js
│  │  ├─ UserAccount.js
│  │  └─ index.js
│  └─ routes/
│     ├─ admin.js
│     ├─ auth.js
│     ├─ authors.js
│     ├─ books.js
│     ├─ index.js
│     ├─ loans.js
│     ├─ members.js
│     └─ reports.js
├─ frontend/
│  ├─ app.js
│  ├─ public/
│  │  ├─ css/style.css
│  │  └─ js/darkmode.js
│  └─ views/
│     ├─ admin/
│     ├─ auth/
│     ├─ authors/
│     ├─ books/
│     ├─ loans/
│     ├─ members/
│     ├─ partials/
│     ├─ reports/
│     ├─ dashboard.ejs
│     └─ error.ejs
├─ scripts/
│  └─ kill-port.js
├─ backups/
├─ docs/
├─ database.sqlite
├─ package.json
└─ README.md
```

### ความหมายโฟลเดอร์หลัก

- `backend/` โค้ด API ทั้งหมด (logic, route, model, middleware)
- `frontend/` โค้ดแสดงผลเว็บ (EJS + static assets)
- `scripts/` utility script สำหรับช่วยรันงาน dev
- `backups/` ที่เก็บไฟล์สำรองฐานข้อมูลจากฟังก์ชันรีเซ็ตข้อมูล
- `docs/` เอกสารประกอบโปรเจกต์

---

## ▶️ How to Run the Project

### 1) Install dependencies

```bash
npm install
```

### 2) Create `.env`

ตัวอย่างค่าพื้นฐาน:

```env
NODE_ENV=development
BACKEND_PORT=3000
FRONTEND_PORT=5173
BACKEND_API_URL=http://localhost:3000/api
FRONTEND_ORIGIN=http://localhost:5173
SESSION_SECRET=change-this-secret
AUTH_PROXY_SECRET=dev-proxy-secret-change-me
ENABLE_SEED=false
ADMIN_RESET_CODE=RESET-ALL

# Optional: bootstrap admin อัตโนมัติเมื่อระบบเริ่มครั้งแรก
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin1234
ADMIN_EMAIL=admin@librasync.local
ADMIN_FULL_NAME=System Admin
ADMIN_PHONE=000-000-0000
```

> หมายเหตุ: ตัวแปร `PORT` ไม่ได้ถูกใช้งานโดยตรงในโค้ดหลัก (ระบบใช้ `BACKEND_PORT` และ `FRONTEND_PORT`)

### 3) Start backend server

```bash
npm run start:backend
```

### 4) Start frontend server

เปิดอีก terminal แล้วรัน:

```bash
npm run start:frontend
```

### 5) Access the application

```text
http://localhost:5173
```

### ✅ คำสั่งลัดที่ใช้บ่อย

```bash
npm start
npm run dev
npm run start:clean
npm run dev:clean
```

---

## 🗃️ Database Configuration

- Dialect: `sqlite`
- Config: `backend/config/database.js`
- Database file: `database.sqlite`
- ตารางหลัก:
	- `Authors`
	- `Books`
	- `Members`
	- `LoanRecords`
	- `UserAccounts`
- ตาราง migration ภายในระบบ: `SystemMigrations`
- มี index สำคัญ เช่น unique `isbn`, unique `email`, และ index ของตารางยืม-คืน

---

## 🔌 API Endpoints

> ทุก endpoint ของ backend อยู่ภายใต้ prefix `/api`

### 1) Authentication

| Method | Endpoint | คำอธิบาย |
|---|---|---|
| GET | `/api/auth/login` | แสดงหน้า login |
| POST | `/api/auth/login` | เข้าสู่ระบบ |
| GET | `/api/auth/register` | แสดงหน้าสมัครสมาชิก |
| POST | `/api/auth/register` | สมัครสมาชิก (สร้าง Member + UserAccount ใน transaction เดียว) |
| POST | `/api/auth/logout` | ออกจากระบบ |

### 2) Dashboard

| Method | Endpoint | คำอธิบาย |
|---|---|---|
| GET | `/api/` | โหลดข้อมูลสรุป dashboard |

### 3) Authors

| Method | Endpoint | คำอธิบาย |
|---|---|---|
| GET | `/api/authors` | รายการผู้แต่ง (search + pagination) |
| GET | `/api/authors/new` | ฟอร์มเพิ่มผู้แต่ง (admin) |
| GET | `/api/authors/check-duplicate` | ตรวจชื่อผู้แต่งซ้ำ (admin) |
| POST | `/api/authors` | เพิ่มผู้แต่ง (admin) |
| GET | `/api/authors/:id/edit` | ฟอร์มแก้ไขผู้แต่ง (admin) |
| POST | `/api/authors/:id/update` | อัปเดตผู้แต่ง (admin) |
| POST | `/api/authors/:id/delete` | ลบผู้แต่ง (admin) |

### 4) Books

| Method | Endpoint | คำอธิบาย |
|---|---|---|
| GET | `/api/books` | รายการหนังสือ (search/filter/pagination) |
| GET | `/api/books/new` | ฟอร์มเพิ่มหนังสือ (admin) |
| GET | `/api/books/isbn/generate` | สร้าง ISBN อัตโนมัติ (admin) |
| GET | `/api/books/check-duplicate` | ตรวจชื่อหนังสือซ้ำ (admin) |
| POST | `/api/books` | เพิ่มหนังสือ (admin) |
| GET | `/api/books/:id/edit` | ฟอร์มแก้ไขหนังสือ (admin) |
| POST | `/api/books/:id/update` | อัปเดตหนังสือ (admin) |
| POST | `/api/books/:id/delete` | ลบหนังสือ (admin) |

### 5) Members (admin only)

| Method | Endpoint | คำอธิบาย |
|---|---|---|
| GET | `/api/members` | รายการสมาชิก |
| GET | `/api/members/new` | ฟอร์มเพิ่มสมาชิก |
| GET | `/api/members/check-duplicate` | ตรวจชื่อสมาชิกซ้ำ |
| POST | `/api/members` | เพิ่มสมาชิกพร้อมบัญชีผู้ใช้ |
| GET | `/api/members/:id/edit` | ฟอร์มแก้ไขสมาชิก |
| POST | `/api/members/:id/update` | อัปเดตสมาชิกและบัญชีผู้ใช้ |
| POST | `/api/members/:id/delete` | ลบสมาชิก (ถ้าไม่มีประวัติยืม-คืน) |

### 6) Loans (admin/user)

| Method | Endpoint | คำอธิบาย |
|---|---|---|
| GET | `/api/loans` | รายการยืม-คืน (user เห็นเฉพาะของตัวเอง) |
| GET | `/api/loans/new` | ฟอร์มยืมหนังสือ |
| POST | `/api/loans` | สร้างรายการยืม (user ถูกบังคับ `member_id` เป็นของตัวเอง) |
| POST | `/api/loans/:id/return` | คืนหนังสือ (user คืนได้เฉพาะรายการของตัวเอง) |

### 7) Reports (admin/user)

| Method | Endpoint | คำอธิบาย |
|---|---|---|
| GET | `/api/reports` | redirect ไปหน้ารายงาน active loans |
| GET | `/api/reports/active-loans` | รายงานการยืมปัจจุบัน |
| GET | `/api/reports/loan-history` | รายงานประวัติยืม-คืนทั้งหมด |
| GET | `/api/reports/member-borrow-summary` | รายงานสรุปการยืมของสมาชิก |

> การ export รายงานใช้ query `?format=csv` เพื่อ trigger การดาวน์โหลดไฟล์ **Excel (.xlsx)** ตาม implementation ปัจจุบัน

### 8) Admin Tools (admin only)

| Method | Endpoint | คำอธิบาย |
|---|---|---|
| GET | `/api/admin/health` | ตรวจสุขภาพข้อมูลและ index ในฐานข้อมูล |
| POST | `/api/admin/reset-data` | สำรองฐานข้อมูลและล้างข้อมูลทั้งหมด |

---

## 🖼️ Screenshots (Optional)

สามารถเพิ่มรูปได้ที่ `docs/images/` แล้วอ้างอิงใน README เช่น:

```markdown
![Dashboard](docs/images/dashboard.png)
![Books](docs/images/books.png)
![Loans](docs/images/loans.png)
![Reports](docs/images/reports.png)
```

---

## 🔮 Future Improvements

- 🧪 เพิ่ม test อัตโนมัติ (unit/integration) สำหรับ auth, loans, reports
- 📚 เพิ่มเอกสาร API แบบ OpenAPI/Swagger
- 🧱 แยก service layer ออกจาก route ให้ชัดเจนขึ้น
- 🔑 เพิ่มฟีเจอร์จัดการรหัสผ่าน (change password / forgot password)
- 🐳 เตรียม deployment ด้วย Docker และ CI/CD pipeline

---

## 📄 License

MIT
