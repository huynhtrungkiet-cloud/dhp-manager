// =====================================================================================
// Supabase Edge Function: kho-mail — gửi thư báo kho cho tech.manager       (25-11-2026)
// App DHP Manager gọi: _sb.functions.invoke('kho-mail', {body:{kind, subject, text}})
//
// • Người nhận CỐ ĐỊNH ở máy chủ (secret KHO_MAIL_TO, mặc định tech.manager@dhp-corp.com.vn)
//   → app / người ngoài không đổi được người nhận.
// • Khóa của app phải hợp lệ: function gọi RPC kho_mail_claim bằng chính khóa đó; khóa sai → 401.
// • Giới hạn 60 thư / 24 giờ + nhật ký kho_mail_log (file supabase_kho_mail_2026-11-25.sql).
// • Cách gửi — đặt trong Supabase → Edge Functions → Secrets (chọn 1):
//     SMTP công ty:  SMTP_HOST, SMTP_USER, SMTP_PASS, [SMTP_PORT=465], [SMTP_FROM]
//                    (Supabase chặn cổng 25 và 587 → dùng 465 SSL)
//     hoặc Resend:   RESEND_API_KEY, [KHO_MAIL_FROM]
// • Khi deploy: TẮT "Verify JWT" (app dùng khóa sb_publishable_…, không phải JWT).
// =====================================================================================
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const env = (k: string) => (Deno.env.get(k) || "").trim();
const escHtml = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

async function rpc(fn: string, args: unknown, key: string) {
  const r = await fetch(`${env("SUPABASE_URL")}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const txt = await r.text();
  let data: any = null;
  try { data = JSON.parse(txt); } catch { data = txt; }
  return { ok: r.ok, status: r.status, data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "Chỉ nhận POST" }, 405);

  const key = req.headers.get("apikey") || (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!key) return json({ ok: false, error: "Thiếu khóa app" }, 401);

  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, error: "Dữ liệu gửi lên không đọc được" }, 400); }
  const kind = String(body?.kind || "report").slice(0, 20);
  let subject = String(body?.subject || "").replace(/[\r\n]+/g, " ").trim().slice(0, 180);
  const text = String(body?.text || "").slice(0, 20000);
  if (!subject || !text) return json({ ok: false, error: "Thiếu tiêu đề hoặc nội dung" }, 400);
  if (!/^\[DHP Kho\]/.test(subject)) subject = "[DHP Kho] " + subject;

  // 1) khóa app hợp lệ + còn hạn mức trong ngày (ghi nhật ký)
  const claim = await rpc("kho_mail_claim", { p_kind: kind, p_subject: subject }, key);
  if (!claim.ok) {
    return json({ ok: false, error: claim.status === 401 ? "Khóa app không hợp lệ" : "Chưa chạy SQL kho_mail trên Supabase (" + claim.status + ")" },
      claim.status === 401 ? 401 : 500);
  }
  if (!claim.data?.ok) return json({ ok: false, error: claim.data?.reason || "Vượt giới hạn thư trong ngày" }, 429);
  const seq = claim.data.seq;

  // 2) gửi
  const to = env("KHO_MAIL_TO") || "tech.manager@dhp-corp.com.vn";
  const html = `<pre style="font-family:Consolas,Menlo,monospace;font-size:13px;line-height:1.5;white-space:pre-wrap">${escHtml(text)}</pre>`;
  let ok = false, err = "", id = "";
  try {
    if (env("RESEND_API_KEY")) {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${env("RESEND_API_KEY")}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: env("KHO_MAIL_FROM") || "DHP Kho <onboarding@resend.dev>", to: [to], subject, text, html }),
      });
      const j: any = await r.json().catch(() => ({}));
      ok = r.ok; id = j?.id || "";
      if (!ok) err = j?.message || ("Resend lỗi " + r.status);
    } else if (env("SMTP_HOST") && env("SMTP_USER") && env("SMTP_PASS")) {
      const port = parseInt(env("SMTP_PORT") || "465", 10);
      const client = new SMTPClient({
        connection: { hostname: env("SMTP_HOST"), port, tls: port === 465, auth: { username: env("SMTP_USER"), password: env("SMTP_PASS") } },
      });
      await client.send({ from: env("SMTP_FROM") || env("SMTP_USER"), to, subject, content: text, html });
      await client.close();
      ok = true;
    } else {
      err = "Chưa cài cách gửi thư: thêm SMTP_HOST, SMTP_USER, SMTP_PASS (hoặc RESEND_API_KEY) ở Supabase → Edge Functions → Secrets";
    }
  } catch (e) {
    err = String((e as Error)?.message || e).slice(0, 300);
  }

  // 3) ghi kết quả vào nhật ký
  await rpc("kho_mail_done", { p_seq: seq, p_ok: ok, p_err: err }, key).catch(() => {});
  return ok ? json({ ok: true, id, to }) : json({ ok: false, error: err }, 502);
});
