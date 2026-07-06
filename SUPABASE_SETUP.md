# Hướng dẫn nâng cấp đồng bộ lên Supabase (real-time, nhanh)

Supabase = database thật (PostgreSQL) + đồng bộ tức thì giữa các máy. **Miễn phí** cho quy mô xưởng.
Sau khi setup: máy A sửa → máy B thấy ngay, **không cần F5**. Hết cảnh chậm/junk như Google Sheets.

Bạn chỉ làm ~15 phút theo 4 bước. Phần code app tôi đã viết sẵn.

---

## Bước 1 — Tạo tài khoản & project Supabase

1. Vào [supabase.com](https://supabase.com) → **Start your project** → đăng nhập bằng GitHub (hoặc email).
2. Bấm **New project**:
   - **Name**: `dhp-manager`
   - **Database Password**: đặt 1 mật khẩu mạnh (lưu lại, ít dùng tới)
   - **Region**: chọn **Southeast Asia (Singapore)** cho nhanh
3. Bấm **Create new project** → đợi ~2 phút cho nó khởi tạo.

## Bước 2 — Tạo các bảng dữ liệu (chạy SQL có sẵn)

1. Trong project, menu trái bấm **SQL Editor** → **New query**
2. Dán **toàn bộ** đoạn SQL dưới đây vào → bấm **Run** (góc dưới phải)

```sql
-- 7 bảng dữ liệu chung. Mỗi dòng = 1 bản ghi, cột "data" chứa toàn bộ nội dung (JSON).
create table if not exists orders               (id text primary key, data jsonb not null, updated_at timestamptz default now());
create table if not exists customers            (id text primary key, data jsonb not null, updated_at timestamptz default now());
create table if not exists staff                (id text primary key, data jsonb not null, updated_at timestamptz default now());
create table if not exists assignments          (id text primary key, data jsonb not null, updated_at timestamptz default now());
create table if not exists outsource_shipments  (id text primary key, data jsonb not null, updated_at timestamptz default now());
create table if not exists ncr_records          (id text primary key, data jsonb not null, updated_at timestamptz default now());
create table if not exists products             (id text primary key, data jsonb not null, updated_at timestamptz default now());  -- Catalogue sản phẩm

-- Cho phép app truy cập (công cụ nội bộ). Có thể siết chặt hơn sau bằng Supabase Auth.
do $$
declare t text;
begin
  foreach t in array array['orders','customers','staff','assignments','outsource_shipments','ncr_records','products'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists dhp_all on %I', t);
    execute format('create policy dhp_all on %I for all using (true) with check (true)', t);
  end loop;
end $$;

-- Bật đồng bộ real-time cho 7 bảng (tự bỏ qua bảng đã có → không báo lỗi)
do $$
declare t text;
begin
  foreach t in array array['orders','customers','staff','assignments','outsource_shipments','ncr_records','products'] loop
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end $$;
```

> 🆕 **Nếu bạn đã setup Supabase trước đây** (chỉ có 6 bảng), chạy lại TOÀN BỘ đoạn SQL trên — nó idempotent (an toàn chạy lại), chỉ thêm bảng `products` còn thiếu. App vẫn chạy bình thường kể cả khi chưa tạo `products` (chỉ là chưa đồng bộ catalogue giữa các máy).

→ Báo **Success** là xong.

## Bước 3 — Lấy 2 thông tin để dán vào app

1. Menu trái → **Project Settings** (bánh răng) → **API**
2. Copy 2 thứ:
   - **Project URL** — dạng `https://xxxxx.supabase.co`
   - **anon public** key (dưới mục *Project API keys*) — chuỗi dài bắt đầu `eyJ...`

## Bước 4 — Dán vào app

1. Mở app → tab **Dữ liệu & Đồng bộ** → mục **Supabase (real-time)**
2. Dán **Project URL** + **anon key** → bấm **💾 Lưu & Kết nối**
3. App sẽ tự kết nối, tải dữ liệu chung về, và **lắng nghe thay đổi real-time**.

**Đưa dữ liệu sạch lên lần đầu** (làm trên máy có 12 đơn sạch):
- Bấm **⬆ Đẩy toàn bộ lên Supabase** một lần.

**Máy khác**: chỉ cần dán **cùng Project URL + anon key** → tự nhận dữ liệu + cập nhật real-time.

---

## Lợi ích so với Google Sheets
| | Google Sheets cũ | Supabase mới |
|---|---|---|
| Tốc độ | Chậm (1-2s mỗi lần) | Nhanh |
| Real-time | ❌ phải F5 | ✅ thấy ngay |
| Dung lượng | Hạn chế | Thoải mái (500MB free) |
| Ổn định | Hay kẹt | Ổn định |

## Bảo mật
anon key nằm trong app (giống URL Apps Script trước đây) — đủ cho công cụ nội bộ + có lớp mật khẩu đăng nhập. Khi cần chặt hơn (mỗi người 1 tài khoản), nâng lên **Supabase Auth** sau.
