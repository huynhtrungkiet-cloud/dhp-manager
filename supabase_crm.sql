-- =====================================================================
-- DHP CRM / Sales Pipeline — bảng dữ liệu dùng chung trên Supabase
-- Dán toàn bộ file này vào Supabase → SQL Editor → Run (1 lần).
-- Dùng CHUNG project Supabase với DHP Manager / Coding / Advisor.
-- Shape {id text, data jsonb} giống các bảng khác (DHPCore đọc/ghi).
-- =====================================================================

-- 1) Cơ hội bán hàng (Lead → Hỏi hàng → Báo giá → Theo dõi → Thắng/Thua)
create table if not exists public.crm_opps (
  id          text primary key,
  data        jsonb,
  updated_at  timestamptz default now()
);

-- 2) Khách hàng + lịch sử kỹ thuật (đã mua gì · máy gì · lỗi gì)
create table if not exists public.crm_customers (
  id          text primary key,
  data        jsonb,
  updated_at  timestamptz default now()
);

-- 3) Mở quyền (RLS permissive — giống mô hình hiện tại của DHP Manager:
--    bảo vệ thật dựa vào anon key + URL không công khai trong code).
alter table public.crm_opps      enable row level security;
alter table public.crm_customers enable row level security;

drop policy if exists p_all on public.crm_opps;
create policy p_all on public.crm_opps      for all using (true) with check (true);
drop policy if exists p_all on public.crm_customers;
create policy p_all on public.crm_customers for all using (true) with check (true);

-- 4) Realtime để mọi máy thấy cơ hội/khách mới ngay
alter publication supabase_realtime add table public.crm_opps;
alter publication supabase_realtime add table public.crm_customers;

-- Xong. Mở dhp_crm.html → "⬇ Nạp dữ liệu mẫu" để thử, rồi nhập thật.
