-- =====================================================================
--  DHP MANAGER — NHẬT KÝ + HẠN MỨC THƯ BÁO KHO (function kho-mail)   25-11-2026
--  Dán TOÀN BỘ vào Supabase → SQL Editor → Run (1 lần, chạy lại vẫn an toàn).
-- =====================================================================
create table if not exists kho_mail_log (
  seq      bigserial primary key,
  at       timestamptz not null default now(),
  kind     text,
  subject  text,
  ok       boolean,
  err      text
);
create index if not exists kho_mail_log_at on kho_mail_log (at desc);
-- Khóa của app KHÔNG đọc / sửa thẳng bảng này — chỉ đi qua 3 hàm dưới
alter table kho_mail_log enable row level security;
revoke all on kho_mail_log from anon, authenticated;

-- Xin "suất" gửi 1 thư: tối đa 60 thư / 24 giờ (chống gửi tràn). Trả {ok, seq} hoặc {ok:false, reason}
create or replace function kho_mail_claim(p_kind text, p_subject text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare n int; s bigint;
begin
  select count(*) into n from kho_mail_log where at > now() - interval '1 day';
  if n >= 60 then
    return jsonb_build_object('ok', false, 'reason', 'Đã gửi 60 thư báo kho trong 24 giờ — tạm dừng để tránh gửi tràn');
  end if;
  insert into kho_mail_log(kind, subject) values (left(coalesce(p_kind,''), 20), left(coalesce(p_subject,''), 200)) returning seq into s;
  return jsonb_build_object('ok', true, 'seq', s);
end $$;

create or replace function kho_mail_done(p_seq bigint, p_ok boolean, p_err text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update kho_mail_log set ok = p_ok, err = left(coalesce(p_err,''), 300) where seq = p_seq;
end $$;

-- 30 thư gần nhất — app hiện ở tab Kho → 📨 Thư báo kho đã gửi
create or replace function kho_mail_recent() returns table(seq bigint, at timestamptz, kind text, subject text, ok boolean, err text)
language sql security definer set search_path = public as $$
  select seq, at, kind, subject, ok, err from kho_mail_log order by seq desc limit 30;
$$;

revoke all on function kho_mail_claim(text, text), kho_mail_done(bigint, boolean, text), kho_mail_recent() from public;
grant execute on function kho_mail_claim(text, text), kho_mail_done(bigint, boolean, text), kho_mail_recent() to anon, authenticated;

-- Kiểm tra:
select kho_mail_recent();
