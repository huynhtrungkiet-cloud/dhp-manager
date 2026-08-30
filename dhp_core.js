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

  // 3 cấp quyền (không hiển thị trong app — cấp riêng cho từng người):
  //  Quản lý = admin · Điều phối chung (admin+điều phối+thợ) = editor · Xem (kinh doanh + phòng khác) = viewer
  // 30-08-2026: bỏ mật khẩu chữ thường khỏi mã nguồn (repo công khai) — chỉ giữ hash SHA-256 có salt.
  // Đổi mật khẩu: dùng doi-mat-khau.html, dán hash mới vào ĐÂY và vào index.html cho khớp.
  // SHA-256 gọn, chạy đồng bộ, không cần crypto.subtle (chạy được cả khi mở file:// )
  function dhpSha256(ascii){
    function rr(v,a){ return (v>>>a)|(v<<(32-a)); }
    var mm=Math.pow, mf=Math.floor, maxW=mm(2,32), lW=ascii.length*8, hash=[], k=[], primeC=2, i=0, j, w=[], H=[];
    var b=[], res='';
    // hằng số
    outer: for(; i<64; primeC++){
      for(j=2; j*j<=primeC; j++) if(primeC%j===0) continue outer;
      if(i<8) H[i] = (mm(primeC,.5)%1*maxW)|0;
      k[i] = (mm(primeC,1/3)%1*maxW)|0;
      i++;
    }
    // padding theo byte UTF-8
    var bytes=[];
    for(i=0;i<ascii.length;i++){
      var c=ascii.charCodeAt(i);
      if(c<128) bytes.push(c);
      else if(c<2048){ bytes.push(192|(c>>6),128|(c&63)); }
      else if(c<55296||c>=57344){ bytes.push(224|(c>>12),128|((c>>6)&63),128|(c&63)); }
      else { i++; var cp=65536+(((c&1023)<<10)|(ascii.charCodeAt(i)&1023));
        bytes.push(240|(cp>>18),128|((cp>>12)&63),128|((cp>>6)&63),128|(cp&63)); }
    }
    lW = bytes.length*8;
    bytes.push(0x80);
    while(bytes.length%64!==56) bytes.push(0);
    for(i=7;i>=0;i--) bytes.push((lW/mm(2,i*8))&255);
    hash = H.slice(0);
    for(var blk=0; blk<bytes.length; blk+=64){
      for(i=0;i<16;i++) w[i]=(bytes[blk+i*4]<<24)|(bytes[blk+i*4+1]<<16)|(bytes[blk+i*4+2]<<8)|bytes[blk+i*4+3];
      for(i=16;i<64;i++){
        var s0=rr(w[i-15],7)^rr(w[i-15],18)^(w[i-15]>>>3);
        var s1=rr(w[i-2],17)^rr(w[i-2],19)^(w[i-2]>>>10);
        w[i]=(w[i-16]+s0+w[i-7]+s1)|0;
      }
      var a=hash[0],bb=hash[1],c2=hash[2],d=hash[3],e=hash[4],f=hash[5],g=hash[6],h=hash[7];
      for(i=0;i<64;i++){
        var S1=rr(e,6)^rr(e,11)^rr(e,25), ch=(e&f)^((~e)&g), t1=(h+S1+ch+k[i]+w[i])|0;
        var S0=rr(a,2)^rr(a,13)^rr(a,22), mj=(a&bb)^(a&c2)^(bb&c2), t2=(S0+mj)|0;
        h=g; g=f; f=e; e=(d+t1)|0; d=c2; c2=bb; bb=a; a=(t1+t2)|0;
      }
      hash[0]=(hash[0]+a)|0; hash[1]=(hash[1]+bb)|0; hash[2]=(hash[2]+c2)|0; hash[3]=(hash[3]+d)|0;
      hash[4]=(hash[4]+e)|0; hash[5]=(hash[5]+f)|0; hash[6]=(hash[6]+g)|0; hash[7]=(hash[7]+h)|0;
    }
    for(i=0;i<8;i++) res += ((hash[i]>>>0).toString(16)).padStart(8,'0');
    return res;
  }
  const PASS_SALT = 'dhp-ck368-2026';
  const PASS_HASHES = {
    viewer: '37be4d9020617879be5435f90fd31a974b2774bb25436340488dad028ecf961e',
    worker: '080acd5ea24498f27c4d6d777d3b4ee1a8c9fc78d49a0ce2deae5d6bf7b40f73',
    editor: '080acd5ea24498f27c4d6d777d3b4ee1a8c9fc78d49a0ce2deae5d6bf7b40f73',
    admin:  'fd626bf170f5125cac038ca187f55c553a8184cbbeced8ce9d57745fe405a3f6',
  };
  const CFG_KEY = 'dhp_hub_v3';   // dùng chung config Supabase với DHP Manager (cùng origin)

  let _sb = null;

  // ---- Vai trò (4 cấp, DÙNG CHUNG dhp_role với DHP Manager / Coding cùng origin) ----
  // Mọi mật khẩu cấp sửa (Điều phối / Quản lý, kể cả 'tech'/'admin' của Coding) đều = quyền sửa ở đây.
  function roleFromPass(v){
    v = String(v == null ? '' : v).trim();
    if (!v) return null;
    const h = dhpSha256(PASS_SALT + ':' + v);
    if (h === PASS_HASHES.admin)  return 'admin';
    if (h === PASS_HASHES.editor) return 'editor';
    if (h === PASS_HASHES.worker) return 'worker';
    if (h === PASS_HASHES.viewer) return 'viewer';
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
      '<div class="hint">Nhập mật khẩu được cấp. Chưa có? Liên hệ quản lý.</div></div>';
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
