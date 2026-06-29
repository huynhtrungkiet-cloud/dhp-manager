-- =====================================================================
-- DHP Engineering Advisor — bảng dữ liệu dùng chung trên Supabase
-- Dán toàn bộ file này vào Supabase → SQL Editor → Run (1 lần).
-- Dùng CHUNG project Supabase với DHP Manager / DHP Coding.
-- Shape {id text, data jsonb} giống các bảng khác (DHPCore đọc/ghi).
-- =====================================================================

-- 1) Thư viện CA TƯ VẤN thực tế (case study) — tài sản tri thức DHP
create table if not exists public.tools_cases (
  id          text primary key,
  data        jsonb,
  updated_at  timestamptz default now()
);

-- (tùy chọn) Báo giá dùng chung nhiều máy — bật nếu muốn chia sẻ báo giá
create table if not exists public.tools_quotes (
  id          text primary key,
  data        jsonb,
  updated_at  timestamptz default now()
);

-- 2) Mở quyền (RLS permissive — giống mô hình hiện tại của DHP Manager:
--    bảo vệ thật dựa vào việc anon key + URL không công khai trong code).
alter table public.tools_cases  enable row level security;
alter table public.tools_quotes enable row level security;

drop policy if exists p_all on public.tools_cases;
create policy p_all on public.tools_cases  for all using (true) with check (true);
drop policy if exists p_all on public.tools_quotes;
create policy p_all on public.tools_quotes for all using (true) with check (true);

-- 3) (tùy chọn) Realtime để mọi máy thấy ca mới ngay
alter publication supabase_realtime add table public.tools_cases;
-- alter publication supabase_realtime add table public.tools_quotes;

-- Xong. Mở app → tab "🗂 Ca thực tế" → "⟲ Tải ca từ Supabase".
