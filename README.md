# 📚 LibraSync

## 🚀 Project Title

**LibraSync — ระบบจัดการห้องสมุดแบบแยก Frontend/Backend พร้อม RBAC และรายงาน Excel**

LibraSync คือระบบบริหารงานห้องสมุดที่ออกแบบให้แยกชั้นการทำงานชัดเจน: ฝั่งหน้าเว็บ (Frontend Server) ทำหน้าที่ render UI และจัดการ session ของผู้ใช้, ส่วนฝั่ง API (Backend Server) รับผิดชอบ business logic, validation, สิทธิ์การเข้าถึง และจัดการข้อมูลในฐานข้อมูล SQLite ผ่าน Sequelize

---

## 🎯 System Overview

ระบบรองรับงานหลักของห้องสมุดดังนี้

- 📖 จัดการข้อมูลผู้แต่ง, หนังสือ, สมาชิก, ประวัติยืม-คืน
- 👤 ระบบผู้ใช้พร้อมสิทธิ์ `admin` / `user`
- 🔐 Authentication: สมัครสมาชิก, เข้าสู่ระบบ, ออกจากระบบ
- 🔗 ผูกบัญชีผู้ใช้กับสมาชิกแบบ 1:1 (`UserAccounts` ↔ `Members`)
- ⚙️ ใช้ transaction กับงานสำคัญ (สมัครสมาชิก, เพิ่ม/แก้ไขสมาชิก, ยืม-คืน)
- 🧾 รายงาน 3 แบบพร้อม export เป็นไฟล์ Excel (`.xlsx`) ผ่าน `exceljs`
- 🧪 หน้า Admin Health สำหรับตรวจความถูกต้องข้อมูลและ index
- 🗂️ รีเซ็ตข้อมูลทั้งระบบพร้อมสร้างไฟล์ backup ก่อนล้างข้อมูล
- 🌙 รองรับ Dark Mode ที่ฝั่งหน้าเว็บ

พฤติกรรมตาม role ปัจจุบัน

- `admin` เห็นข้อมูลรวมทั้งระบบ
- `user` เห็นข้อมูล/รายการที่ scope เฉพาะ `member_id` ของตนเองใน dashboard, loans และ reports
- บางการ์ดใน dashboard แสดงเฉพาะ `admin` (เช่น สมาชิกทั้งหมด, หนังสือใกล้หมดสต็อก, สมาชิกค้างยืมหลายเล่ม)

---

## 🏗️ Architecture

### 1) Frontend Server

- อยู่ที่ `frontend/app.js`
- ใช้ EJS render หน้าเว็บ (`frontend/views/*`)
- จัดการ session/flash (`express-session`, `connect-flash`)
- รับ request จาก browser แล้ว proxy ต่อไป backend ทุกเส้นทาง (`app.all('*')`)
- แนบ header ไป backend:
  - `x-proxy-secret` (ตรวจความน่าเชื่อถือ proxy)
  - `x-auth-user` (auth context จาก session)

### 2) Backend API Server

- อยู่ที่ `backend/app.js`
- Route หลักอยู่ใต้ prefix `/api`
- ใช้ middleware สำคัญ:
  - `requireProxyTrust` ตรวจ `AUTH_PROXY_SECRET`
  - `attachCurrentUser` อ่าน auth context จาก header
  - `requireLogin` บังคับ login ก่อนเข้า route ที่ต้องล็อกอิน
  - RBAC (`requireAdmin`, `requireUserOrAdmin`)
- backend ส่งผลกลับเป็น JSON payload ที่มี `view` / `redirect` เพื่อให้ frontend ตัดสินใจ render/redirect

### 3) Database

- ใช้ SQLite ไฟล์ `database.sqlite`
- จัดการด้วย Sequelize models + associations
- มีการตั้งข้อจำกัดและดัชนีสำคัญตอนเริ่มระบบ
- มี one-time migration ภายในสำหรับ normalize ISBN

### 🔄 Communication Flow (ASCII)

```text
Browser
  │
  ▼
Frontend Server (EJS + Session + Flash)
  │  HTTP Proxy + x-proxy-secret + x-auth-user
  ▼
Backend API (/api/*)
  │
  ▼
SQLite (database.sqlite)
```

---

## 🧰 Technology Stack

| หมวด | เทคโนโลยี |
|---|---|
| Runtime | Node.js |
| Web Framework | Express.js |
| Template Engine | EJS |
| ORM | Sequelize |
| Database | SQLite (`sqlite3`) |
| Frontend | HTML5, CSS3, JavaScript |
| Validation | express-validator |
| Security | helmet, cors, express-rate-limit |
| Session & Flash | express-session, connect-flash |
| Password Hashing | bcrypt |
| Excel Export | exceljs |
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
├─ backups/
├─ docs/
├─ scripts/
│  └─ kill-port.js
├─ database.sqlite
├─ package.json
└─ README.md
```

ความหมายโฟลเดอร์หลัก

- `backend/` — API, business logic, validation, RBAC, database access
- `frontend/` — web UI (EJS), static assets และ proxy layer
- `scripts/` — utility script สำหรับจัดการพอร์ตระหว่างพัฒนา
- `backups/` — เก็บไฟล์สำรองฐานข้อมูลตอน reset-data
- `docs/` — เอกสารเสริมของโปรเจกต์

---

## ▶️ How to Run the Project

### 1) Install dependencies

```bash
npm install
```

### 2) Create `.env`

ตัวอย่างค่าที่ใช้ได้กับเครื่อง local

```env
NODE_ENV=development
PORT=3000
SESSION_SECRET=change-this-session-secret

BACKEND_PORT=3000
FRONTEND_PORT=5173
BACKEND_API_URL=http://localhost:3000/api
FRONTEND_ORIGIN=http://localhost:5173

AUTH_PROXY_SECRET=replace-with-random-secret

ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin1234
ADMIN_EMAIL=admin@librasync.local
ADMIN_FULL_NAME=System Admin
ADMIN_PHONE=000-000-0000

# Optional
ENABLE_SEED=false
ADMIN_RESET_CODE=RESET-ALL
```

### 3) Start backend server

```bash
npm run start:backend
```

### 4) Start frontend server

เปิด terminal อีกอันแล้วรัน

```bash
npm run start:frontend
```

### 5) Access the application

```text
http://localhost:5173
```

คำสั่งลัดที่ใช้บ่อย

```bash
npm start
npm run dev
npm run start:clean
npm run dev:clean
```

---

## 🗄️ Database Configuration

- Dialect: `sqlite`
- Config file: `backend/config/database.js`
- Database file: `database.sqlite`
- ตารางหลัก:
  - `Authors`
  - `Books`
  - `Members`
  - `LoanRecords`
  - `UserAccounts`
- ความสัมพันธ์สำคัญ:
  - `Author` 1:N `Book`
  - `Book` 1:N `LoanRecord`
  - `Member` 1:N `LoanRecord`
  - `Member` 1:1 `UserAccount` (ลบ member แล้วลบ account ตาม)
- มีการตั้งดัชนีสำคัญ เช่น ISBN unique, email unique, loan indexes

---

## 🔌 API Endpoints

> หมายเหตุ: backend ใช้ prefix `/api` ทุก route

### Auth

| Method | Endpoint | คำอธิบาย |
|---|---|---|
| GET | `/api/auth/login` | หน้าเข้าสู่ระบบ |
| POST | `/api/auth/login` | ตรวจสอบบัญชีและ login |
| GET | `/api/auth/register` | หน้าสมัครสมาชิก |
| POST | `/api/auth/register` | สมัครสมาชิกและสร้างบัญชีผู้ใช้ |
| POST | `/api/auth/logout` | ออกจากระบบ |

### Dashboard

| Method | Endpoint | คำอธิบาย |
|---|---|---|
| GET | `/api/` | โหลดข้อมูล dashboard ตาม role |

### Authors

| Method | Endpoint | คำอธิบาย |
|---|---|---|
| GET | `/api/authors` | รายการผู้แต่ง (search/pagination) |
| GET | `/api/authors/new` | ฟอร์มเพิ่มผู้แต่ง (admin) |
| GET | `/api/authors/check-duplicate` | ตรวจชื่อผู้แต่งซ้ำ (admin) |
| POST | `/api/authors` | เพิ่มผู้แต่ง (admin) |
| GET | `/api/authors/:id/edit` | ฟอร์มแก้ไขผู้แต่ง (admin) |
| POST | `/api/authors/:id/update` | อัปเดตผู้แต่ง (admin) |
| POST | `/api/authors/:id/delete` | ลบผู้แต่ง (admin) |

### Books

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

### Members (admin)

| Method | Endpoint | คำอธิบาย |
|---|---|---|
| GET | `/api/members` | รายการสมาชิก |
| GET | `/api/members/new` | ฟอร์มเพิ่มสมาชิก |
| GET | `/api/members/check-duplicate` | ตรวจชื่อสมาชิกซ้ำ |
| POST | `/api/members` | เพิ่มสมาชิก + บัญชีผู้ใช้ |
| GET | `/api/members/:id/edit` | ฟอร์มแก้ไขสมาชิก |
| POST | `/api/members/:id/update` | อัปเดตสมาชิก + บัญชีผู้ใช้ |
| POST | `/api/members/:id/delete` | ลบสมาชิก |

### Loans (user/admin)

| Method | Endpoint | คำอธิบาย |
|---|---|---|
| GET | `/api/loans` | รายการยืม-คืน (user เห็นเฉพาะของตัวเอง) |
| GET | `/api/loans/new` | ฟอร์มยืมหนังสือ |
| POST | `/api/loans` | สร้างรายการยืม (user บังคับ member_id เป็นของตัวเอง) |
| POST | `/api/loans/:id/return` | คืนหนังสือ (user คืนได้เฉพาะรายการของตัวเอง) |

### Reports (user/admin)

| Method | Endpoint | คำอธิบาย |
|---|---|---|
| GET | `/api/reports` | redirect ไป active-loans |
| GET | `/api/reports/active-loans` | รายงานการยืมปัจจุบัน |
| GET | `/api/reports/loan-history` | รายงานประวัติยืม-คืน |
| GET | `/api/reports/member-borrow-summary` | สรุปการยืมของสมาชิก |

การ export รายงาน

- ใช้ query `?format=csv`
- ระบบจะส่งไฟล์จริงเป็น Excel `.xlsx`
- มีการใส่สีแถวตามสถานะและมี worksheet “คำอธิบายสี”

### Admin

| Method | Endpoint | คำอธิบาย |
|---|---|---|
| GET | `/api/admin/health` | ตรวจสุขภาพข้อมูล, ดัชนี, consistency |
| POST | `/api/admin/reset-data` | สำรองฐานข้อมูลแล้วล้างข้อมูลทั้งหมด |

---

## 🧭 Additional Notes

- ระบบ frontend ใช้แนวทาง server-side proxy ไม่ใช่ SPA ที่เรียก backend ตรงจาก browser
- ฝั่ง backend มี fallback 404/500 เป็น JSON
- มี default admin bootstrap จาก `.env` เมื่อยังไม่มีบัญชี `admin` ในระบบ

---

## 🔮 Future Improvements

- 🧪 เพิ่ม automated tests (unit/integration) สำหรับ route สำคัญ
- 🔁 เพิ่ม CI pipeline สำหรับ lint/test ก่อน merge
- 📘 เพิ่ม API documentation แบบ OpenAPI/Swagger
- 🔐 เพิ่มฟีเจอร์เปลี่ยนรหัสผ่าน/รีเซ็ตรหัสผ่าน
- 🧾 เพิ่ม audit log สำหรับกิจกรรมสำคัญ (login, reset-data, role changes)
- 🐳 เพิ่ม Docker setup สำหรับ deploy หลาย environment

---

## 📄 License

MIT
