// Cloudflare Worker auth API for GitHub Pages.
// Bind a D1 database as DB. Secrets: MAIL_FROM, RESEND_API_KEY, SESSION_SECRET.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response('', {headers: cors()});
    try {
      if (url.pathname === '/auth/register' && request.method === 'POST') return register(request, env);
      if (url.pathname === '/auth/login' && request.method === 'POST') return login(request, env);
      if (url.pathname === '/auth/send-reset-code' && request.method === 'POST') return sendReset(request, env);
      if (url.pathname === '/auth/reset-password' && request.method === 'POST') return resetPassword(request, env);
      return json({ok:false,error:'Not found'},404);
    } catch(e) { return json({ok:false,error:'Server error'},500); }
  }
};
function cors(){return {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Content-Type':'application/json'}}
function json(x,status=200){return new Response(JSON.stringify(x),{status,headers:cors()})}
function normalizeEmail(s){return String(s||'').trim().toLowerCase()}
async function hash(s){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function validPass(p){return typeof p==='string'&&p.length>=8}
async function register(req,env){const {email,password}=await req.json();const e=normalizeEmail(email);if(!e.includes('@')||!validPass(password))return json({ok:false,error:'Email hoặc mật khẩu không hợp lệ'},400);const exists=await env.DB.prepare('SELECT id FROM users WHERE email=?').bind(e).first();if(exists)return json({ok:false,error:'Email đã được đăng ký'},409);await env.DB.prepare('INSERT INTO users(email,password_hash,created_at) VALUES(?,?,?)').bind(e,await hash(password),Date.now()).run();return json({ok:true})}
async function login(req,env){const {email,password}=await req.json();const e=normalizeEmail(email);const u=await env.DB.prepare('SELECT id,email,password_hash FROM users WHERE email=?').bind(e).first();if(!u||u.password_hash!==(await hash(password)))return json({ok:false,error:'Email hoặc mật khẩu không đúng'},401);const token=await sign(`${u.id}:${u.email}`,env.SESSION_SECRET);return json({ok:true,token,email:u.email})}
async function sendReset(req,env){const {email}=await req.json();const e=normalizeEmail(email);const u=await env.DB.prepare('SELECT id FROM users WHERE email=?').bind(e).first();if(!u)return json({ok:true});const code=String(Math.floor(100000+Math.random()*900000));const h=await hash(`${e}:${code}:${env.SESSION_SECRET}`);await env.DB.prepare('INSERT INTO reset_codes(email,code_hash,expires_at,attempts) VALUES(?,?,?,0) ON CONFLICT(email) DO UPDATE SET code_hash=excluded.code_hash,expires_at=excluded.expires_at,attempts=0').bind(e,h,Date.now()+10*60*1000).run();const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:env.MAIL_FROM,to:[e],subject:'Mã đặt lại mật khẩu — Minna N5 Hub',html:`<div style="font-family:Arial"><h2>Minna N5 Hub</h2><p>Mã đặt lại mật khẩu của bạn:</p><p style="font-size:32px;font-weight:700;letter-spacing:8px">${code}</p><p>Mã hết hạn sau 10 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.</p></div>`})});if(!r.ok)return json({ok:false,error:'Không gửi được email'},502);return json({ok:true})}
async function resetPassword(req,env){const {email,code,newPassword}=await req.json();const e=normalizeEmail(email);if(!validPass(newPassword)||!/^[0-9]{6}$/.test(String(code)))return json({ok:false,error:'Mã hoặc mật khẩu mới không hợp lệ'},400);const row=await env.DB.prepare('SELECT * FROM reset_codes WHERE email=?').bind(e).first();if(!row||row.expires_at<Date.now()||row.attempts>=5)return json({ok:false,error:'Mã hết hạn hoặc đã vượt quá số lần thử'},400);const h=await hash(`${e}:${code}:${env.SESSION_SECRET}`);if(h!==row.code_hash){await env.DB.prepare('UPDATE reset_codes SET attempts=attempts+1 WHERE email=?').bind(e).run();return json({ok:false,error:'Mã xác nhận không đúng'},400)}await env.DB.prepare('UPDATE users SET password_hash=? WHERE email=?').bind(await hash(newPassword),e).run();await env.DB.prepare('DELETE FROM reset_codes WHERE email=?').bind(e).run();return json({ok:true})}
async function sign(payload,secret){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const sig=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(payload));return btoa(payload+'.'+[...new Uint8Array(sig)].map(x=>x.toString(16).padStart(2,'0')).join(''))}
