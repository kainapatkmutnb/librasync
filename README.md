# 📚 LibraSync

ระบบจัดการห้องสมุด (Library Management System) ที่แยกการทำงานเป็น **Frontend Server** และ **Backend API Server** ชัดเจน เพื่อรองรับงานจัดการข้อมูลหนังสือ/สมาชิก/ยืม-คืน และรายงานเชิงวิเคราะห์ในระบบเดียว

---

## 🎯 System Overview

LibraSync รองรับงานหลักของห้องสมุดดังนี้

- จัดการข้อมูล **ผู้แต่ง / หนังสือ / สมาชิก / รายการยืม-คืน**
- รองรับหนังสือหลายสำเนา (`total_copies`, `borrowed_copies`, `available_copies`)
- ยืม/คืนแบบปลอดภัยด้วย transaction และอัปเดตสถานะหนังสืออัตโนมัติ
- มีรายงานหลัก 3 แบบ และส่งออก CSV ได้
- มี Dashboard สรุป KPI, แนวโน้มการยืม-คืน, top books/members
- มีหน้า Admin Health Check และรีเซ็ตข้อมูลพร้อม backup ฐานข้อมูล
- มี Dark Mode ที่ฝั่งหน้าเว็บ

---

## 🏗️ Architecture

โปรเจกต์นี้ใช้สถาปัตยกรรมแบบ 2 ชั้น

1. **Frontend Server (EJS) - `frontend/app.js`**
	- รันที่ `http://localhost:5173`
	- Render หน้า EJS
	- รับ request จาก browser แล้ว forward ไปยัง Backend API
	- จัดการ session + flash message ฝั่งผู้ใช้

2. **Backend API Server - `backend/app.js`**
	- รันที่ `http://localhost:3000/api`
	- ประมวลผล business logic, validation, query ข้อมูล
	- ตอบกลับเป็น JSON payload (รวมข้อมูลสำหรับ render/redirect)

3. **Database (SQLite + Sequelize)**
	- ไฟล์ฐานข้อมูล: `database.sqlite` (ที่ root)
	- ORM: Sequelize
	- มีการตั้งดัชนี, migration ภายในระบบ, และ data constraints ตอนเริ่มระบบ

### 🔄 Communication Flow

```text
Browser
	│
	▼
Frontend Server (EJS, Session, Flash)
	│  HTTP (proxy/forward)
	▼
Backend API (/api/...)
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
| Security/Middleware | helmet, cors, express-rate-limit, express-session, connect-flash |
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
│  │  └─ validate.js
│  ├─ models/
│  │  ├─ Author.js
│  │  ├─ Book.js
│  │  ├─ Member.js
│  │  ├─ LoanRecord.js
│  │  └─ index.js
│  └─ routes/
│     ├─ index.js
│     ├─ authors.js
│     ├─ books.js
│     ├─ members.js
│     ├─ loans.js
│     ├─ reports.js
│     └─ admin.js
├─ frontend/
│  ├─ app.js
│  ├─ public/
│  │  ├─ css/style.css
│  │  └─ js/darkmode.js
│  └─ views/
│     ├─ dashboard.ejs
│     ├─ error.ejs
│     ├─ admin/
│     ├─ authors/
│     ├─ books/
│     ├─ loans/
│     ├─ members/
│     ├─ reports/
│     └─ partials/
├─ scripts/
│  └─ kill-port.js
├─ docs/
├─ backups/
├─ database.sqlite
├─ package.json
└─ README.md
```

### ความหมายโฟลเดอร์หลัก

- `backend/` โค้ด API, model, route, business logic
- `frontend/` โค้ด render หน้า EJS และ static assets
- `scripts/` เครื่องมือช่วย dev เช่นเคลียร์พอร์ต
- `backups/` เก็บไฟล์ backup ก่อน reset data
- `docs/` เอกสารประกอบโปรเจกต์

---

## 🚀 How to Run the Project

### 1) Install dependencies

```bash
npm install
```

### 2) Start backend server

```bash
npm run start:backend
```

Backend API จะรันที่:

```text
http://localhost:3000/api
```

### 3) Start frontend server

เปิดอีก terminal แล้วรัน:

```bash
npm run start:frontend
```

Frontend จะรันที่:

```text
http://localhost:5173
```

### 4) Access the application

เปิด browser ไปที่:

```text
http://localhost:5173
```

### ✅ ทางลัดรันพร้อมกันทั้งสองเซิร์ฟเวอร์

```bash
npm start
```

สคริปต์สำคัญเพิ่มเติม:

```bash
npm run dev
npm run start:clean
npm run dev:clean
```

---

## ⚙️ Environment Variables

สร้างไฟล์ `.env` ที่ root (ตัวอย่าง):

```env
NODE_ENV=development
BACKEND_PORT=3000
FRONTEND_PORT=5173
BACKEND_API_URL=http://localhost:3000/api
FRONTEND_ORIGIN=http://localhost:5173
SESSION_SECRET=change-this-secret
ENABLE_SEED=false
ADMIN_RESET_CODE=RESET-ALL
```

> หมายเหตุ: `PORT` ไม่ได้ถูกใช้งานโดยตรงในโค้ดปัจจุบัน (เซิร์ฟเวอร์ใช้ `BACKEND_PORT` และ `FRONTEND_PORT`)

---

## 🗃️ Database Configuration

- Dialect: `sqlite`
- Sequelize config อยู่ที่ `backend/config/database.js`
- Database file: `database.sqlite` (root)
- ตารางหลัก: `Authors`, `Books`, `Members`, `LoanRecords`
- ตาราง migration ภายในระบบ: `SystemMigrations`
- มีการสร้าง index ที่สำคัญ (เช่น unique ISBN, unique email) ตอน backend เริ่มทำงาน

---

## 🔌 API Endpoints

> หมายเหตุ: endpoint ด้านล่างคือ endpoint ที่ Backend เปิดจริงภายใต้ prefix `/api`

### Dashboard / Home

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/` | โหลดข้อมูล Dashboard (KPI, trends, top books/members, recent activity) |

### Authors

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/authors` | รายการผู้แต่ง (ค้นหา + แบ่งหน้า) |
| GET | `/api/authors/new` | ข้อมูลสำหรับฟอร์มเพิ่มผู้แต่ง |
| GET | `/api/authors/check-duplicate` | ตรวจชื่อผู้แต่งซ้ำ |
| POST | `/api/authors` | เพิ่มผู้แต่ง |
| GET | `/api/authors/:id/edit` | ข้อมูลฟอร์มแก้ไขผู้แต่ง |
| POST | `/api/authors/:id/update` | อัปเดตผู้แต่ง |
| POST | `/api/authors/:id/delete` | ลบผู้แต่ง (ถ้าไม่มีหนังสืออ้างอิง) |

### Books

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/books` | รายการหนังสือ (ค้นหา/filter/แบ่งหน้า) |
| GET | `/api/books/new` | ข้อมูลสำหรับฟอร์มเพิ่มหนังสือ |
| GET | `/api/books/isbn/generate` | สร้าง ISBN อัตโนมัติ |
| GET | `/api/books/check-duplicate` | ตรวจชื่อหนังสือซ้ำ |
| POST | `/api/books` | เพิ่มหนังสือ |
| GET | `/api/books/:id/edit` | ข้อมูลฟอร์มแก้ไขหนังสือ |
| POST | `/api/books/:id/update` | อัปเดตหนังสือ |
| POST | `/api/books/:id/delete` | ลบหนังสือ (ถ้าไม่มีประวัติยืม-คืน) |

### Members

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/members` | รายการสมาชิก (ค้นหา + แบ่งหน้า) |
| GET | `/api/members/new` | ข้อมูลสำหรับฟอร์มเพิ่มสมาชิก |
| GET | `/api/members/check-duplicate` | ตรวจชื่อสมาชิกซ้ำ |
| POST | `/api/members` | เพิ่มสมาชิก |
| GET | `/api/members/:id/edit` | ข้อมูลฟอร์มแก้ไขสมาชิก |
| POST | `/api/members/:id/update` | อัปเดตสมาชิก |
| POST | `/api/members/:id/delete` | ลบสมาชิก (ถ้าไม่มีประวัติยืม-คืน) |

### Loans

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/loans` | รายการประวัติยืม-คืน |
| GET | `/api/loans/new` | ข้อมูลสำหรับฟอร์มยืมหนังสือ |
| POST | `/api/loans` | สร้างรายการยืม (transaction) |
| POST | `/api/loans/:id/return` | คืนหนังสือและอัปเดต stock |

### Reports

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/reports` | redirect ไป active loans report |
| GET | `/api/reports/active-loans` | รายงานการยืมปัจจุบัน (+ CSV เมื่อใส่ `?format=csv`) |
| GET | `/api/reports/loan-history` | รายงานประวัติยืม-คืน (+ CSV) |
| GET | `/api/reports/member-borrow-summary` | รายงานสรุปการยืมของสมาชิก (+ CSV) |

### Admin

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/health` | ตรวจสุขภาพข้อมูลและ index |
| POST | `/api/admin/reset-data` | สำรอง DB แล้วล้างข้อมูลทั้งหมด (ต้องใช้ confirmation code) |

---

## 🖼️ Screenshots (Optional)

สามารถเพิ่มภาพหน้าจอในโฟลเดอร์ `docs/images/` แล้วอ้างอิงใน README ได้ เช่น

```markdown
![Dashboard](docs/images/dashboard.png)
![Books](docs/images/books.png)
![Reports](docs/images/reports.png)
```

---

## 🔮 Future Improvements

- เพิ่ม automated tests (unit/integration) สำหรับ routes และ business logic
- เพิ่ม authentication/authorization แบบ role-based
- แยก service layer จาก route handler ให้ชัดเจนขึ้น
- เพิ่ม API documentation แบบ OpenAPI/Swagger
- รองรับ deployment ด้วย Docker และ CI/CD pipeline

---

## 📄 License

MIT
