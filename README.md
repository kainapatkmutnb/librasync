# 📚 LibraSync (ลิบราซิงค์)

ระบบจัดการห้องสมุดแบบครบวงจร พัฒนาด้วย Express.js + EJS + Sequelize + SQLite

## ✨ ฟีเจอร์หลัก

- 🔍 **ค้นหาและแบ่งหน้า** - ค้นหาแบบ Partial Match พร้อมระบบแบ่งหน้า (10/25/50 รายการต่อหน้า)
- ✅ **Validation** - ตรวจสอบความถูกต้องของข้อมูลด้วย express-validator
- 📊 **Dashboard** - แดชบอร์ดแสดงสถิติและกิจกรรมล่าสุด
- 🌙 **Dark Mode** - สลับธีมสว่าง/มืด พร้อมจดจำการตั้งค่า
- 🖨️ **Print Reports** - พิมพ์รายงานได้โดยซ่อน UI ที่ไม่จำเป็น
- 📋 **Active Loans Report** - รายงานการยืมปัจจุบันพร้อมตรวจสอบวันที่เกินกำหนด

## 🗄️ ฐานข้อมูล

ระบบใช้ SQLite เป็นฐานข้อมูล ประกอบด้วย 4 ตารางหลัก:

- **Authors** - ข้อมูลผู้แต่ง
- **Books** - ข้อมูลหนังสือ
- **Members** - ข้อมูลสมาชิก
- **LoanRecords** - ประวัติการยืม-คืน

## 🚀 การติดตั้ง

### ข้อกำหนดเบื้องต้น
- Node.js (เวอร์ชัน 14 ขึ้นไป)
- npm หรือ yarn

### ขั้นตอนการติดตั้ง

1. ติดตั้ง dependencies:
```bash
npm install
```

2. รันเซิร์ฟเวอร์ในโหมดพัฒนา:
```bash
npm run dev
```

หรือรันในโหมด production:
```bash
npm start
```

3. เปิดเบราว์เซอร์และเข้าไปที่:
```
http://localhost:3000
```

## 📁 โครงสร้างโปรเจกต์

```
LibraSync/
├── config/
│   └── database.js          # การตั้งค่า Sequelize
├── models/
│   ├── index.js             # รวม associations
│   ├── Author.js            # โมเดลผู้แต่ง
│   ├── Book.js              # โมเดลหนังสือ
│   ├── Member.js            # โมเดลสมาชิก
│   └── LoanRecord.js        # โมเดลประวัติการยืม
├── routes/
│   ├── index.js             # หน้าแดชบอร์ด
│   ├── authors.js           # จัดการผู้แต่ง
│   ├── books.js             # จัดการหนังสือ
│   ├── members.js           # จัดการสมาชิก
│   ├── loans.js             # จัดการการยืม-คืน
│   └── reports.js           # รายงาน
├── views/
│   ├── partials/            # ส่วนประกอบหน้า
│   ├── authors/             # หน้าผู้แต่ง
│   ├── books/               # หน้าหนังสือ
│   ├── members/             # หน้าสมาชิก
│   ├── loans/               # หน้าการยืม-คืน
│   ├── reports/             # หน้ารายงาน
│   ├── dashboard.ejs        # หน้าแดชบอร์ด
│   └── error.ejs            # หน้าแสดงข้อผิดพลาด
├── public/
│   ├── css/
│   │   └── style.css        # สไตล์หลัก + Dark Mode + Print
│   └── js/
│       └── darkmode.js      # สคริปต์สลับธีม
├── middleware/
│   └── validate.js          # Middleware ตรวจสอบข้อมูล
├── app.js                   # ไฟล์หลักของแอป
├── package.json
└── README.md
```

## 🌐 เส้นทาง (Routes)

### หน้าหลัก
- `GET /` - แดชบอร์ด

### จัดการผู้แต่ง
- `GET /authors` - รายการผู้แต่ง (ค้นหา + แบ่งหน้า)
- `GET /authors/new` - ฟอร์มเพิ่มผู้แต่ง
- `POST /authors` - บันทึกผู้แต่งใหม่
- `GET /authors/:id/edit` - ฟอร์มแก้ไขผู้แต่ง
- `POST /authors/:id/update` - อัพเดทผู้แต่ง
- `POST /authors/:id/delete` - ลบผู้แต่ง

### จัดการหนังสือ
- `GET /books` - รายการหนังสือ (ค้นหา + แบ่งหน้า)
- `GET /books/new` - ฟอร์มเพิ่มหนังสือ
- `POST /books` - บันทึกหนังสือใหม่
- `GET /books/:id/edit` - ฟอร์มแก้ไขหนังสือ
- `POST /books/:id/update` - อัพเดทหนังสือ
- `POST /books/:id/delete` - ลบหนังสือ

### จัดการสมาชิก
- `GET /members` - รายการสมาชิก (ค้นหา + แบ่งหน้า)
- `GET /members/new` - ฟอร์มเพิ่มสมาชิก
- `POST /members` - บันทึกสมาชิกใหม่
- `GET /members/:id/edit` - ฟอร์มแก้ไขสมาชิก
- `POST /members/:id/update` - อัพเดทสมาชิก
- `POST /members/:id/delete` - ลบสมาชิก

### จัดการการยืม-คืน
- `GET /loans` - ประวัติการยืมทั้งหมด
- `GET /loans/new` - ฟอร์มยืมหนังสือ
- `POST /loans` - บันทึกการยืม
- `POST /loans/:id/return` - บันทึกการคืน

### รายงาน
- `GET /reports/active-loans` - รายงานการยืมปัจจุบัน

## 🎨 ธีมสี

### โหมดสว่าง (Light Mode)
- พื้นหลัง: #ffffff
- ข้อความ: #2c3e50
- สีเน้น: #3498db

### โหมดมืด (Dark Mode)
- พื้นหลัง: #1a1a2e
- ข้อความ: #eaeaea
- สีเน้น: #e94560

## 🖨️ การพิมพ์รายงาน

กดปุ่ม "พิมพ์รายงาน" บนหน้าที่ต้องการ ระบบจะ:
- ซ่อน Navbar, Sidebar, ปุ่มต่างๆ
- แสดงเฉพาะหัวรายงานและตารางข้อมูล
- แสดงวันที่พิมพ์และจำนวนรายการ
- หัวตารางซ้ำทุกหน้า

## 📝 ตัวอย่างข้อมูลเริ่มต้น

ระบบจะสร้างข้อมูลตัวอย่างอัตโนมัติเมื่อรันครั้งแรก:

**ผู้แต่ง:**
- Robert C. Martin - เจ้าพ่อ Clean Code
- J.K. Rowling - ผู้เขียน Harry Potter
- วรรณกรรมไทย - นักเขียนไทย

**หนังสือ:**
- Clean Code (พร้อมให้ยืม)
- Harry Potter 1 (ถูกยืม)
- กุหลาบแดง (พร้อมให้ยืม)

**สมาชิก:**
- สมชาย ใจดี
- สมหญิง รักเรียน

## 🔧 การพัฒนา

### สคริปต์ที่ใช้
- `npm run dev` - รันด้วย nodemon (auto-reload)
- `npm start` - รันในโหมด production

### Dependencies หลัก
- express - เว็บเฟรมเวิร์ก
- ejs - เทมเพลตเอนจิน
- sequelize - ORM
- sqlite3 - ฐานข้อมูล
- express-validator - ตรวจสอบข้อมูล
- express-session - จัดการเซสชัน
- connect-flash - แสดงข้อความแจ้งเตือน

## 📄 License

MIT License - สามารถใช้งานได้ฟรี

---

พัฒนาด้วย ❤️ โดย LibraSync Team
