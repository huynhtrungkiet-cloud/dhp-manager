/* ============================================================
   DHP CORE — lõi dùng chung cho mọi app DHP (Manager / Coding / Tools)
   Nạp SAU thư viện supabase-js:
     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
     <script src="dhp_core.js"></script>
   Dùng:
     DHPCore.gate(async function(){ ...khởi động app khi đã đăng nhập... });
   ============================================================ */
(function (global) {
  'use strict';

  const VIEW_PASSCODE  = 'dhp368';
  const WORK_PASSCODE  = 'tho368';
  const EDIT_PASSCODE  = 'edit368';
  const ADMIN_PASSCODE = 'admin368';
  const CFG_KEY = 'dhp_hub_v3';   // dùng chung config Supabase với DHP Manager (cùng origin)

  let _sb = null;

  // ---- Vai trò (4 cấp, DÙNG CHUNG dhp_role với DHP Manager / Coding cùng origin) ----
  // Mọi mật khẩu cấp sửa từ app nào (edit368/admin368, kể cả 'tech'/'admin' của Coding) đều = quyền sửa ở đây.
  function roleFromPass(v){
    if (v === ADMIN_PASSCODE) return 'admin';
    if (v === EDIT_PASSCODE)  return 'editor';
    if (v === WORK_PASSCODE)  return 'worker';
    if (v === VIEW_PASSCODE)  return 'viewer';
    return null;
  }
  function role() { return localStorage.getItem('dhp_role') || 'viewer'; }
  // Advisor: quyền SỬA giá/báo giá = điều phối/admin (Manager) hoặc tech/admin (Coding)
  function canEdit() { return ['editor','admin','tech'].includes(role()); }

  // ---- Cấu hình Supabase ----
  function readCfg() {
    try {
      const d = JSON.parse(localStorage.getItem(CFG_KEY) || '{}');
      return { url: (d.meta && d.meta.supaUrl) || '', key: (d.meta && d.meta.supaKey) || '' };
    } catch (e) { return { url: '', key: '' }; }
  }
  function saveCfg(url, key) {
    let d = {};
    try { d = JSON.parse(localStorage.getItem(CFG_KEY) || '{}'); } catch (e) {}
    d.meta = d.meta || {};
    d.meta.supaUrl = url; d.meta.supaKey = key;
    localStorage.setItem(CFG_KEY, JSON.stringify(d));
  }
  function cleanUrl(u) { return String(u || '').trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, ''); }

  function connect() {
    const c = readCfg();
    if (!c.url || !c.key) return false;
    if (typeof supabase === 'undefined') { console.error('[dhp_core] thiếu thư viện supabase-js'); return false; }
    try { _sb = supabase.createClient(cleanUrl(c.url), c.key.trim()); return true; }
    catch (e) { console.error('[dhp_core] connect', e); return false; }
  }
  function connected() { return !!_sb; }
  function sb() { return _sb; }

  // ---- Helpers cho bảng kiểu {id, data, updated_at} (jsonb) ----
  async function list(table) {
    if (!_sb && !connect()) throw new Error('Chưa kết nối Supabase');
    const { data, error } = await _sb.from(table).select('id,data');
    if (error) throw new Error(error.message);
    return (data || []).map(r => r.data).filter(Boolean);
  }
  async function upsert(table, rec) {
    if (!_sb && !connect()) throw new Error('Chưa kết nối Supabase');
    if (!rec || !rec.id) throw new Error('Bản ghi thiếu id');
    const { error } = await _sb.from(table).upsert({ id: rec.id, data: rec, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return rec;
  }
  async function upsertMany(table, recs) {
    if (!_sb && !connect()) throw new Error('Chưa kết nối Supabase');
    const rows = (recs || []).map(r => ({ id: r.id, data: r, updated_at: new Date().toISOString() }));
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await _sb.from(table).upsert(rows.slice(i, i + 500));
      if (error) throw new Error(error.message);
    }
  }
  async function remove(table, id) {
    if (!_sb && !connect()) throw new Error('Chưa kết nối Supabase');
    const { error } = await _sb.from(table).delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
  function subscribe(table, cb) {
    if (!_sb) return null;
    return _sb.channel('rt_' + table)
      .on('postgres_changes', { event: '*', schema: 'public', table: table }, cb)
      .subscribe();
  }

  // ---- Số chạy dự án (nguyên tử, không trùng) qua RPC ----
  async function nextProjectSeq() {
    if (!_sb && !connect()) throw new Error('Chưa kết nối Supabase');
    const { data, error } = await _sb.rpc('cs_next_project_seq');
    if (error) throw new Error(error.message);
    return Number(data);
  }

  // ---- Catalogue ----
  async function loadProducts() { return list('products'); }

  // ---- Cổng đăng nhập dùng chung ----
  function ensureGateStyles() {
    if (document.getElementById('dhpGateStyle')) return;
    const s = document.createElement('style'); s.id = 'dhpGateStyle';
    s.textContent =
      "#dhpGate{position:fixed;inset:0;z-index:9999;background:#b91c1c;display:flex;align-items:center;justify-content:center;font-family:'Segoe UI',Arial,sans-serif}" +
      "#dhpGate .box{background:#fff;border-radius:16px;padding:28px;width:330px;max-width:90vw;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.3)}" +
      "#dhpGate h2{color:#b91c1c;margin:0 0 4px;font-size:22px}" +
      "#dhpGate .sub{color:#64748b;font-size:13px;margin-bottom:14px}" +
      "#dhpGate input{width:100%;padding:11px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:8px;font-size:15px;box-sizing:border-box}" +
      "#dhpGate button{width:100%;padding:11px;background:#b91c1c;color:#fff;border:0;border-radius:8px;font-weight:700;font-size:14px;cursor:pointer}" +
      "#dhpGate .hint{color:#64748b;font-size:12px;margin-top:10px}" +
      "#dhpGate .err{color:#b91c1c;font-size:12px;min-height:14px}";
    document.head.appendChild(s);
  }
  function showCfgPrompt() {
    const url = prompt('Dán Supabase Project URL (giống DHP Manager):', '');
    if (url === null) return false;
    const key = prompt('Dán anon public key:', '');
    if (key === null) return false;
    saveCfg(url.trim(), key.trim());
    return connect();
  }

  // gate(onAuthed): hiện cổng nếu chưa đăng nhập; gọi onAuthed() khi đã đăng nhập + kết nối được
  function gate(onAuthed) {
    function start() {
      if (!connect()) {
        if (!showCfgPrompt()) { alert('Cần cấu hình Supabase để dùng app.'); return; }
      }
      if (typeof onAuthed === 'function') onAuthed();
    }
    if (localStorage.getItem('dhp_coding_ok') === '1') { start(); return; }
    ensureGateStyles();
    const g = document.createElement('div'); g.id = 'dhpGate';
    g.innerHTML =
      '<div class="box"><h2>Đại Hồng Phát</h2>' +
      '<div class="sub">Đăng nhập hệ thống</div>' +
      '<input id="dhpGatePass" type="password" placeholder="Mật khẩu">' +
      '<div class="err" id="dhpGateErr"></div>' +
      '<button id="dhpGateBtn">Đăng nhập</button>' +
      '<div class="hint">👁 dhp368 · 👷 tho368 · 🛠 edit368 · 👑 admin368</div></div>';
    document.body.appendChild(g);
    const tryLogin = () => {
      const v = document.getElementById('dhpGatePass').value;
      const r = roleFromPass(v);
      if (!r) { document.getElementById('dhpGateErr').textContent = 'Sai mật khẩu.'; return; }
      localStorage.setItem('dhp_role', r);
      localStorage.setItem('dhp_coding_ok', '1');
      g.remove(); start();
    };
    document.getElementById('dhpGateBtn').onclick = tryLogin;
    document.getElementById('dhpGatePass').addEventListener('keydown', e => { if (e.key === 'Enter') tryLogin(); });
    document.getElementById('dhpGatePass').focus();
  }
  function unlockEdit() {
    const v = prompt('Nhập mật khẩu cấp quyền (Thợ / Điều phối / Quản lý):');
    if (v === null) return false;
    const r = roleFromPass(v);
    if (r) { localStorage.setItem('dhp_role', r); return true; }
    alert('Sai mật khẩu.');
    return false;
  }
  function logout() {
    localStorage.removeItem('dhp_coding_ok'); localStorage.removeItem('dhp_role');
    location.reload();
  }

  global.DHPCore = {
    VIEW_PASSCODE, WORK_PASSCODE, EDIT_PASSCODE, ADMIN_PASSCODE, CFG_KEY,
    role, canEdit, roleFromPass, readCfg, saveCfg, connect, connected, sb,
    list, upsert, upsertMany, remove, subscribe,
    nextProjectSeq, loadProducts,
    gate, unlockEdit, logout
  };
})(window);
