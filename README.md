# Berrypink Showcase - Web Product Showcase & Admin System

เว็บโชว์รูมสินค้า (Product Showcase) พร้อมระบบ Admin จัดการข้อมูลสินค้าและรูปภาพแบบครบวงจร พัฒนาด้วย Next.js (App Router), Tailwind CSS และ Supabase (PostgreSQL + Supabase Storage + Auth)

---

## 🚀 ฟังก์ชันหลักของระบบ

### 1. หน้าบ้าน (Showcase - Public):
- **Responsive Product Grid**: แสดงสินค้าแบบ Grid Card สวยงาม ทันสมัย รองรับทั้งมือถือและเดสก์ท็อป
- **ข้อมูลครบถ้วน**: แสดงรูปภาพคมชัด, ป้ายราคา (฿), ชื่อสินค้า, และรายละเอียด
- **ระบบค้นหาและกรอง**: ค้นหาตามคำและแยกตามหมวดหมู่ได้ทันที
- **Quick View Modal**: คลิกเพื่อดูภาพและรายละเอียดสินค้าแบบเต็มจอ

### 2. ระบบหลังบ้าน (Admin - Protected):
- **ระบบยืนยันตัวตน (Auth)**: หน้าเข้าสู่ระบบและสมัครผู้ดูแลผ่าน Supabase Auth พร้อม Middleware ป้องกันเส้นทาง
- **Admin Dashboard**: ตารางจัดการสินค้า พร้อมสรุปสถิติจำนวนสินค้าและมูลค่ารวม
- **ระบบ CRUD สินค้า**:
  - เพิ่มสินค้าใหม่ (ชื่อ, ราคา, รายละเอียด, หมวดหมู่, สถานะ)
  - แก้ไขสินค้า (เปลี่ยนราคา, ข้อความ, หรือเลือกอัปโหลดรูปภาพใหม่เพื่อเปลี่ยนรูปเดิม)
  - ลบสินค้า (มีหน้าต่างยืนยัน และลบรูปภาพจาก Storage อัตโนมัติ)
- **การจัดการรูปภาพ (Supabase Storage)**:
  - อัปโหลดไฟล์รูปไปยัง Bucket `products`
  - นำ Public URL มาบันทึกลงฐานข้อมูลอัตโนมัติ

---

## 🛠️ ขั้นตอนการติดตั้งและใช้งาน

### 1. ตั้งค่าฐานข้อมูล Supabase
1. สร้างโปรเจกต์ใหม่ที่ [Supabase Dashboard](https://supabase.com)
2. ไปที่เมนู **SQL Editor**
3. คัดลอกเนื้อหาทั้งหมดในไฟล์ [`supabase/schema.sql`](./supabase/schema.sql) ไปวางแล้วกด **Run**
   - คำสั่งนี้จะสร้างตาราง `products`
   - ตั้งค่าความปลอดภัย Row Level Security (RLS)
   - สร้าง Storage Bucket ชื่อ `products` พร้อม Policies
   - บันทึก Mock Data สินค้าตัวอย่าง 4 ชิ้น

### 2. ตั้งค่า Environment Variables
คัดลอกไฟล์ `.env.local.example` เป็น `.env.local`:
```bash
cp .env.local.example .env.local
```
จากนั้นเข้าไปที่ Supabase Dashboard > **Project Settings** > **API** แล้วนำค่ามากรอก:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

### 3. รันโปรเจกต์
```bash
# รันโหมด Development
npm run dev

# หรือ Build สำหรับ Production
npm run build
npm start
```
เปิดเบราว์เซอร์ไปที่ [http://localhost:3000](http://localhost:3000)

---

## 📁 โครงสร้างโปรเจกต์

```
firststep/
├── supabase/
│   └── schema.sql                  # สคริปต์ SQL (ตาราง, RLS, Storage Bucket, Mock Data)
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root Layout (Navbar, Footer, สไตล์หลัก)
│   │   ├── page.tsx                # หน้าแรก โชว์รูมสินค้า (Showcase)
│   │   ├── globals.css             # Tailwind CSS Base & Theme
│   │   └── admin/
│   │       ├── page.tsx            # หน้า Dashboard จัดการสินค้า
│   │       ├── login/page.tsx      # หน้า Login Admin (Supabase Auth)
│   │       └── products/
│   │           ├── new/page.tsx    # หน้าเพิ่มสินค้าใหม่
│   │           └── [id]/edit/page.tsx # หน้าแก้ไขสินค้าเดิม
│   ├── components/
│   │   ├── Navbar.tsx              # เมนูนำทางด้านบน
│   │   ├── Footer.tsx              # ส่วนท้ายเว็บ
│   │   ├── ProductCard.tsx         # การ์ดแสดงสินค้าหน้าบ้าน
│   │   ├── ProductModal.tsx        # ป๊อปอัปดูรายละเอียดสินค้า
│   │   ├── ProductForm.tsx         # ฟอร์มเพิ่ม/แก้ไข พร้อม Drag & Drop Uploader
│   │   └── DeleteConfirmModal.tsx  # หน้าต่างยืนยันการลบสินค้า
│   ├── lib/
│   │   ├── mock-data.ts            # ข้อมูลตัวอย่างสำหรับทดสอบ
│   │   ├── types.ts                # TypeScript Interfaces
│   │   └── supabase/
│   │       ├── client.ts           # Browser Supabase Client
│   │       ├── server.ts           # Server Supabase Client
│   │       └── storage.ts          # Storage Image Uploader / Deleter
│   └── middleware.ts               # ระบบป้องกันหน้า Admin
├── .env.local.example              # ตัวอย่างไฟล์ Environment
└── package.json
```
