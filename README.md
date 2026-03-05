# 📚 LibraSync

**LibraSync** คือระบบจัดการห้องสมุดแบบแยก **Frontend Server** และ **Backend API** รองรับสิทธิ์ `admin` / `user`, จัดการข้อมูลหลักของห้องสมุด, และมีรายงานพร้อมส่งออก Excel

---

## ✨ Features

- 🔐 ระบบยืนยันตัวตน: สมัครสมาชิก / เข้าสู่ระบบ / ออกจากระบบ
- 👥 RBAC: แยกสิทธิ์ `admin` และ `user` ชัดเจน
- 📖 CRUD ผู้แต่ง, หนังสือ, สมาชิก, รายการยืม-คืน
- 🔗 ผูกบัญชีผู้ใช้กับสมาชิกแบบ 1:1 (`UserAccounts` ↔ `Members`)
- 📊 Dashboard สถิติ + แนวโน้ม 7/30/90 วัน + Top 10 (แสดงตาม role)
- 🧾 Reports 3 แบบ พร้อม export ไฟล์ Excel (`.xlsx`) ด้วย `exceljs`
- 🎨 รายงาน Excel มีสี 4 ระดับ + sheet คำอธิบายสี + auto filter + frozen header
- 🧪 Admin Health ตรวจ integrity, duplicate, index, และ consistency
- 🗂️ รีเซ็ตข้อมูลทั้งระบบพร้อม backup ฐานข้อมูลก่อนล้าง
- 🌙 รองรับ Dark Mode

---

## 🏗️ Architecture

### Frontend Server (`frontend/app.js`)
- Render หน้าเว็บด้วย EJS
- จัดการ session/flash (`express-session`, `connect-flash`)
- รับ request จาก browser และ proxy ไป backend (`app.all('*')`)
- ส่ง header สำคัญไป backend:
  - `x-proxy-secret`
  - `x-auth-user` (ส่งเป็น URL-encoded JSON เพื่อรองรับอักขระ non-ASCII)

### Backend API (`backend/app.js`)
- Endpoint ทุกตัวอยู่ใต้ prefix `/api`
- middleware หลัก:
  - `requireProxyTrust`
  - `attachCurrentUser`
  - `requireLogin`
  - RBAC: `requireAdmin`, `requireUserOrAdmin`
- ส่งผลลัพธ์เป็น JSON รูปแบบ `view` / `redirect` ให้ frontend ตัดสินใจ render/redirect

### Database
- SQLite (`database.sqlite`) ผ่าน Sequelize
- มี schema/data constraint setup ตอนเริ่มระบบ
- มี one-time migration สำหรับ normalize ISBN

```text
Browser
  -> Frontend Server (EJS + Session)
  -> Backend API (/api/*, proxy-trusted)
  -> SQLite (database.sqlite)
```

---

## 🧰 Tech Stack

| หมวด | เทคโนโลยี |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Template Engine | EJS |
| ORM | Sequelize |
| Database | SQLite (`sqlite3`) |
| Auth & Security | bcrypt, helmet, cors, express-rate-limit |
| Validation | express-validator |
| Session & Flash | express-session, connect-flash |
| Report Export | exceljs |
| Dev Tools | nodemon, concurrently |

---

## 📁 Project Structure

```text
librasync/
├─ backend/
│  ├─ app.js
│  ├─ config/database.js
│  ├─ middleware/{auth,rbac,validate}.js
│  ├─ models/{Author,Book,Member,LoanRecord,UserAccount,index}.js
│  └─ routes/{index,auth,authors,books,members,loans,reports,admin}.js
├─ frontend/
│  ├─ app.js
│  ├─ public/{css/style.css,js/darkmode.js}
│  └─ views/
├─ backups/
├─ scripts/kill-port.js
├─ database.sqlite
├─ package.json
└─ README.md
```

---

## ▶️ Run (Local)

### 1) Install

```bash
npm install
```

### 2) Create `.env`

```env
NODE_ENV=development
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

### 3) Start

```bash
npm start
```

หรือแยก terminal:

```bash
npm run start:backend
npm run start:frontend
```

เข้าใช้งานที่ `http://localhost:5173`

คำสั่งที่ใช้บ่อย:

```bash
npm run dev
npm run start:clean
npm run dev:clean
```

---

## 🗄️ Data Model

ตารางหลัก:
- `Authors`
- `Books`
- `Members`
- `LoanRecords`
- `UserAccounts`

ความสัมพันธ์:
- `Author` 1:N `Book`
- `Book` 1:N `LoanRecord`
- `Member` 1:N `LoanRecord`
- `Member` 1:1 `UserAccount` (cascade delete)

ดัชนีสำคัญที่ระบบตรวจ/สร้าง:
- `idx_books_isbn_unique`
- `idx_members_email_unique`
- `idx_loanrecords_book_return`
- `idx_loanrecords_member_return`
- `idx_loanrecords_borrow_date`
- `idx_useraccounts_username_unique`
- `idx_useraccounts_member_unique`

---

## 🔌 API Endpoints

> ทุก endpoint อยู่ภายใต้ `/api`

### Auth

| Method | Endpoint | Access | คำอธิบาย |
|---|---|---|---|
| GET | `/api/auth/login` | Public | หน้าเข้าสู่ระบบ |
| POST | `/api/auth/login` | Public | ตรวจบัญชีและสร้าง auth session |
| GET | `/api/auth/register` | Public | หน้าสมัครสมาชิก |
| POST | `/api/auth/register` | Public | สร้าง `Member` + `UserAccount(role=user)` |
| POST | `/api/auth/logout` | Login | ออกจากระบบ |

### Dashboard

| Method | Endpoint | Access | คำอธิบาย |
|---|---|---|---|
| GET | `/api/` | Login | dashboard ตาม role + trend 7/30/90 + quick member lookup |

### Authors

| Method | Endpoint | Access | คำอธิบาย |
|---|---|---|---|
| GET | `/api/authors` | Login | รายการผู้แต่ง + search/pagination |
| GET | `/api/authors/new` | Admin | ฟอร์มเพิ่มผู้แต่ง |
| GET | `/api/authors/check-duplicate` | Admin | ตรวจชื่อผู้แต่งซ้ำ |
| POST | `/api/authors` | Admin | เพิ่มผู้แต่ง |
| GET | `/api/authors/:id/edit` | Admin | ฟอร์มแก้ไขผู้แต่ง |
| POST | `/api/authors/:id/update` | Admin | อัปเดตผู้แต่ง |
| POST | `/api/authors/:id/delete` | Admin | ลบผู้แต่ง |

### Books

| Method | Endpoint | Access | คำอธิบาย |
|---|---|---|---|
| GET | `/api/books` | Login | รายการหนังสือ + search/filter/pagination |
| GET | `/api/books/new` | Admin | ฟอร์มเพิ่มหนังสือ |
| GET | `/api/books/isbn/generate` | Admin | สร้าง ISBN อัตโนมัติ |
| GET | `/api/books/check-duplicate` | Admin | ตรวจชื่อหนังสือซ้ำ |
| POST | `/api/books` | Admin | เพิ่มหนังสือ |
| GET | `/api/books/:id/edit` | Admin | ฟอร์มแก้ไขหนังสือ |
| POST | `/api/books/:id/update` | Admin | อัปเดตหนังสือ |
| POST | `/api/books/:id/delete` | Admin | ลบหนังสือ |

### Members

| Method | Endpoint | Access | คำอธิบาย |
|---|---|---|---|
| GET | `/api/members` | Admin | รายการสมาชิก |
| GET | `/api/members/new` | Admin | ฟอร์มเพิ่มสมาชิก |
| GET | `/api/members/check-duplicate` | Admin | ตรวจชื่อสมาชิกซ้ำ |
| POST | `/api/members` | Admin | เพิ่มสมาชิก + บัญชีผู้ใช้ |
| GET | `/api/members/:id/edit` | Admin | ฟอร์มแก้ไขสมาชิก |
| POST | `/api/members/:id/update` | Admin | อัปเดตสมาชิก + บัญชีผู้ใช้ |
| POST | `/api/members/:id/delete` | Admin | ลบสมาชิก |

### Loans

| Method | Endpoint | Access | คำอธิบาย |
|---|---|---|---|
| GET | `/api/loans` | User/Admin | รายการยืม-คืน (user เห็นเฉพาะของตัวเอง) |
| GET | `/api/loans/new` | User/Admin | ฟอร์มยืมหนังสือ |
| POST | `/api/loans` | User/Admin | บันทึกยืม (user ถูกบังคับ member_id ของตนเอง) |
| POST | `/api/loans/:id/return` | User/Admin | คืนหนังสือ (user คืนได้เฉพาะรายการตนเอง) |

### Reports

| Method | Endpoint | Access | คำอธิบาย |
|---|---|---|---|
| GET | `/api/reports` | User/Admin | redirect ไป `/api/reports/active-loans` |
| GET | `/api/reports/active-loans` | User/Admin | รายงานยืมปัจจุบัน |
| GET | `/api/reports/loan-history` | User/Admin | รายงานประวัติยืม-คืน |
| GET | `/api/reports/member-borrow-summary` | User/Admin | สรุปจำนวนการยืมต่อสมาชิก |

### Admin

| Method | Endpoint | Access | คำอธิบาย |
|---|---|---|---|
| GET | `/api/admin/health` | Admin | ตรวจสุขภาพฐานข้อมูลและ index |
| POST | `/api/admin/reset-data` | Admin | backup แล้วล้างข้อมูลหลักทั้งหมด |

---

## 📊 Reports & Excel Export

- หน้า report ใช้ query `format=csv` เพื่อ trigger การ export
- ไฟล์ที่ดาวน์โหลดจริงเป็น `.xlsx` (`Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`)
- รองรับ report 3 แบบ:
  - Active Loans
  - Loan History
  - Member Borrow Summary
- สีใน Excel 4 ระดับ:
  - ยืมเกิน 14 วัน
  - ยืมเกิน 7 วัน
  - ปกติ (active)
  - คืนแล้ว
- มี worksheet `คำอธิบายสี`
- กำหนด style เพิ่มเติม: เลขลำดับ, header style, border, auto filter, freeze top row, ฟอนต์ `Sukhumvit Set`

---

## 👮 RBAC Behavior

- `admin`
  - เห็นข้อมูลรวมระบบ
  - เข้าถึงเมนู Members และ Admin Health
  - เห็นการ์ด/ตาราง Dashboard ส่วน admin (Top 10 + quick actions + cards เพิ่มเติม)

- `user`
  - scope ข้อมูลตาม `member_id` ของตัวเองใน dashboard/loans/reports
  - ไม่เห็นเมนู Members และ Admin Health
  - ไม่เห็นส่วน admin-only ใน dashboard

---

## 🧪 Admin Health & Reset

หน้า `GET /api/admin/health` ตรวจ:
- `PRAGMA integrity_check`
- index จำเป็น
- duplicate ISBN / duplicate email
- mismatch ของสถานะหนังสือและจำนวนคงเหลือ
- orphan loan records

`POST /api/admin/reset-data`:
- ต้องส่ง `confirmation_code` ให้ตรง `ADMIN_RESET_CODE`
- สร้าง backup ไฟล์ในโฟลเดอร์ `backups/`
- ล้างข้อมูล `LoanRecords`, `Books`, `Members`, `Authors`

> หมายเหตุ: ตาม implementation ปัจจุบัน endpoint นี้ **ไม่ได้ลบ `UserAccounts`** โดยตรง

---

## 🔮 Suggested Next Improvements

- เพิ่ม automated tests (unit/integration)
- เพิ่ม CI สำหรับ lint/test ก่อน merge
- เพิ่ม OpenAPI/Swagger docs
- เพิ่ม change-password / reset-password flow
- เพิ่ม audit log สำหรับ action สำคัญ
- เพิ่ม Docker setup

---

## 📄 License

MIT
