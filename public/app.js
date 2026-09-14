/* نسخهٔ رابط کاربری — برای تشخیص اینکه مرورگر کد تازه را گرفته یا نه */
const APP_BUILD='r6-report';
console.log('%cرابط کاربری نسخهٔ '+APP_BUILD,'color:#4ade80;font-weight:bold');

/* ---- شناسه‌ساز ----
   شناسه در مرورگر ساخته می‌شود، نه در دیتابیس. همان روشی که «کیف پول»
   استفاده می‌کند. نتیجه: ستون‌ها varchar(64) هستند و اسکیما روی MySQL،
   MariaDB، PostgreSQL و SQLite یکسان کار می‌کند. */
function newId(){
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}


/* ============ داده‌ها + ذخیره‌سازی محلی ============ */
const KEY='alu_equity_v1';
let partners = [], txs = [], uid = 1, curPrice = '';

function save(){
  if(typeof CLOUD!=='undefined' && CLOUD) return;   // در حالت ابری، منبع حقیقت سرور است
  try{
    localStorage.setItem(KEY, JSON.stringify({v:1,partners,txs,uid,curPrice,at:Date.now()}));
    flash('ذخیره شد');
  }catch(e){ flash('خطا در ذخیره‌سازی', true); }
}
function load(){
  try{
    const r=localStorage.getItem(KEY); if(!r) return;
    const d=JSON.parse(r);
    partners=d.partners||[]; txs=d.txs||[]; uid=d.uid||1; curPrice=d.curPrice||'';
  }catch(e){ console.warn('بازیابی ناموفق',e); }
}
let ft=null;
function flash(msg,err){
  const el=document.querySelector('#saved'); if(!el) return;
  el.textContent='✓ '+msg; el.style.color=err?'var(--down)':'var(--up)';
  clearTimeout(ft); ft=setTimeout(()=>{el.textContent='';},1600);
}

const COLORS=['#4ade80','#f472b6','#fbbf24','#a78bfa','#22d3ee','#fb923c','#60a5fa','#f87171'];
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];

/* ============ اعداد: ارقام فارسی + جداکنندهٔ پایین‌نشین «,» ============ */
const FA='۰۱۲۳۴۵۶۷۸۹';
const toFa = s => String(s).replace(/\d/g, d => FA[d]);
// ارقام فارسی/عربی -> لاتین، و حذف هر چیز غیر رقم
const digits = s => String(s??'').replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
                                 .replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d))
                                 .replace(/\D/g,'');
const group = s => String(s).replace(/\B(?=(\d{3})+(?!\d))/g, ',');   // «,» پایین‌نشین
const fa  = n => toFa(group(Math.round(Math.abs(n)))) ;               // عدد صحیح
const kg  = n => { const v=Math.abs(n); const [i,d]=v.toFixed(2).split('.');
                   return toFa(group(i)+'.'+d); };                    // دو رقم اعشار
const parseNum = s => { const d=digits(s); return d?+d:0; };

/* فرمت خودکار ورودی مبلغ هنگام تایپ */
function bindMoney(el){
  el.addEventListener('input',()=>{
    const pos = el.selectionStart, before = el.value.length;
    const d = digits(el.value);
    el.value = d ? toFa(group(d)) : '';
    const diff = el.value.length - before;
    try{ el.setSelectionRange(pos+diff, pos+diff); }catch(e){}
  });
}
/* فرمت خودکار تاریخ شمسی: 14050622 -> 1405/06/22 */
function bindDate(el){
  el.addEventListener('input',()=>{
    let d = digits(el.value).slice(0,8), out = d;
    if(d.length>6) out = d.slice(0,4)+'/'+d.slice(4,6)+'/'+d.slice(6);
    else if(d.length>4) out = d.slice(0,4)+'/'+d.slice(4);
    el.value = toFa(out);
  });
}
const dkey = el => digits(el.value);                 // 'YYYYMMDD' برای مرتب‌سازی
const dshow = k => k && k.length===8 ? toFa(k.slice(0,4)+'/'+k.slice(4,6)+'/'+k.slice(6)) : '—';
const validDate = k => { if(k.length!==8) return false;
  const m=+k.slice(4,6), d=+k.slice(6);
  return m>=1&&m<=12&&d>=1&&d<=31; };
function todayJ(){
  try{
    const p=new Intl.DateTimeFormat('en-US-u-ca-persian',{year:'numeric',month:'2-digit',day:'2-digit'})
      .formatToParts(new Date()).reduce((o,x)=>(o[x.type]=x.value,o),{});
    return String(+p.year).padStart(4,'0')+p.month.padStart(2,'0')+p.day.padStart(2,'0');
  }catch(e){ return ''; }
}

/* ============ محاسبات ============ */
const price = () => parseNum($('#price').value);
const W = t => (t.s==='pending' || !t.pr) ? 0 : (t.k==='IN'?1:-1) * t.a / t.pr;

function stats(){
  const m={}; partners.forEach(p=>m[p.id]={...p,w:0,cash:0,inSum:0,n:0});
  txs.forEach(t=>{ const x=m[t.p]; if(!x) return;
    if(t.s==='pending') return;              // منتظر قیمت: خارج از همهٔ محاسبات
    const w=W(t); if(!isFinite(w)) return;   // رکورد خراب کل صفحه را از کار نیندازد
    x.w+=w; x.n++;
    if(t.k==='IN'){x.cash+=t.a; x.inSum+=t.a;} else x.cash-=t.a; });
  const list=Object.values(m);
  const tw=list.reduce((s,x)=>s+x.w,0);
  const px=price();
  list.forEach(x=>{ x.pct = tw? x.w/tw*100 : 0; x.val=x.w*px;
    x.pl=x.val-x.cash; x.roi = x.inSum? x.pl/x.inSum*100 : 0; });
  return {list, tw};
}

/* ============ رندر ============ */
function render(){
  const {list,tw}=stats(), px=price();
  const tval=tw*px, tcash=list.reduce((s,x)=>s+x.cash,0), tpl=tval-tcash;
  const sign=n=> n>=0?'+':'−';

  $('#tot').innerHTML=`
   <div><span>وزن کل</span><b>${kg(tw)} <small style="font-size:12px;color:var(--dim)">kg</small></b></div>
   <div><span>ارزش روز کل</span><b>${fa(tval)}</b></div>
   <div><span>خالص نقدی واردشده</span><b>${fa(tcash)}</b></div>
   <div><span>سود / زیان کل</span><b class="${tpl>=0?'up':'down'}">${tcash?sign(tpl)+fa(tpl):'۰'}</b></div>
   <div><span>تعداد تراکنش</span><b>${toFa(txs.filter(t=>t.s!=='pending').length)}${
     (()=>{const n=txs.filter(t=>t.s==='pending').length;
      return n?` <small style="font-size:12px;color:#fcd34d">+${toFa(n)} منتظر</small>`:'';})()
   }</b></div>`;

  if(!partners.length){
    $('#cards').innerHTML=`<div class="card empty"><b>هنوز شریکی ثبت نشده است</b>
      از بخش «شرکا» شریک‌ها را اضافه کنید، سپس تراکنش ثبت کنید.</div>`;
    $('#charts').classList.add('hide');
  }else{
    $('#charts').classList.remove('hide');
    $('#cards').innerHTML=list.map(p=>`
     <div class="card">
       <div class="ph"><i class="dot" style="background:${p.color}"></i>
         <span class="pname">${esc(p.name)}</span>
         <span class="pct" style="color:${p.color}">${kg(p.pct)}٪</span></div>
       <div class="kg">${p.w<0?'−':''}${kg(p.w)} <small>kg</small></div>
       <div class="bar"><i style="width:${Math.max(0,Math.min(100,p.pct))}%;background:${p.color}"></i></div>
       <div class="rows">
         <div class="row"><span>ارزش روز</span><span class="num">${fa(p.val)} ریال</span></div>
         <div class="row"><span>خالص نقدی</span><span class="num">${fa(p.cash)} ریال</span></div>
         <div class="row"><span>سود / زیان</span><span class="num ${p.pl>=0?'up':'down'}">${p.inSum?sign(p.pl)+fa(p.pl):'۰'}</span></div>
         <div class="row"><span>بازده</span><span class="num ${p.roi>=0?'up':'down'}">${p.inSum?sign(p.roi)+kg(p.roi)+'٪':'—'}</span></div>
       </div></div>`).join('');
    drawPie(list,tw); drawLine(list);
  }
  renderTx(); renderPend(); renderPartners(); renderStor();
}

function drawPie(list,tw){
  if(tw<=0){ $('#pie').innerHTML='<div class="empty">پس از ثبت تراکنش، نمودار سهم نمایش داده می‌شود.</div>'; return; }
  let ang=-90, seg='';
  list.forEach(p=>{ const a=Math.max(0,p.pct)/100*360; if(a<=0) return;
    const r=80,cx=100,cy=100;
    const x1=cx+r*Math.cos(ang*Math.PI/180), y1=cy+r*Math.sin(ang*Math.PI/180);
    const x2=cx+r*Math.cos((ang+a)*Math.PI/180), y2=cy+r*Math.sin((ang+a)*Math.PI/180);
    seg+= a>=359.99
      ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${p.color}"/>`
      : `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${a>180?1:0},1 ${x2},${y2} Z" fill="${p.color}" stroke="#161b22" stroke-width="2"/>`;
    ang+=a; });
  $('#pie').innerHTML=`<svg width="200" height="200" viewBox="0 0 200 200">${seg}
    <circle cx="100" cy="100" r="48" fill="#161b22"/>
    <text x="100" y="95" text-anchor="middle" fill="#e6edf3" font-size="15" font-weight="700" font-family="Vazirmatn">${kg(tw)}</text>
    <text x="100" y="114" text-anchor="middle" fill="#8b949e" font-size="11" font-family="Vazirmatn">کیلوگرم</text></svg>
    <div style="display:flex;gap:16px;flex-wrap:wrap;justify-content:center;margin-top:12px;font-size:13px">
    ${list.map(p=>`<span style="display:flex;align-items:center;gap:6px"><i class="dot" style="background:${p.color}"></i>${esc(p.name)} — ${kg(p.pct)}٪</span>`).join('')}</div>`;
}

function drawLine(){
  const sorted=[...txs].sort((a,b)=>a.d.localeCompare(b.d));
  if(!sorted.length){ $('#line').innerHTML='<div class="empty">پس از ثبت تراکنش، روند وزن نمایش داده می‌شود.</div>'; return; }
  const cum={}, series={}; partners.forEach(p=>{cum[p.id]=0;series[p.id]=[0];});
  sorted.forEach(t=>{ if(cum[t.p]===undefined) return; cum[t.p]+=W(t);
    partners.forEach(p=>series[p.id].push(cum[p.id])); });
  const N=sorted.length+1, all=Object.values(series).flat();
  const mx=Math.max(1,...all), w=440,h=210,pd=34;
  const px=i=>pd+(i/Math.max(1,N-1))*(w-pd*2), py=v=>h-pd-(v/mx)*(h-pd*2);
  let paths='';
  partners.forEach(p=>{ const s=series[p.id]; if(!s) return;
    paths+=`<polyline fill="none" stroke="${p.color}" stroke-width="2.5" stroke-linejoin="round"
      points="${s.map((v,i)=>px(i)+','+py(v)).join(' ')}"/>`
      + s.map((v,i)=>`<circle cx="${px(i)}" cy="${py(v)}" r="2.5" fill="${p.color}"/>`).join(''); });
  let gl=''; for(let i=0;i<=4;i++){ const y=pd+(i/4)*(h-pd*2);
    gl+=`<line x1="${pd}" y1="${y}" x2="${w-pd}" y2="${y}" stroke="#2a3441"/>
    <text x="${w-pd+4}" y="${y+4}" fill="#8b949e" font-size="9">${toFa(group(Math.round(mx*(1-i/4))))}</text>`; }
  $('#line').innerHTML=`<svg width="100%" viewBox="0 0 ${w} ${h}">${gl}${paths}</svg>
    <div style="display:flex;gap:16px;flex-wrap:wrap;justify-content:center;font-size:12.5px;color:var(--dim)">
    ${partners.map(p=>`<span style="display:flex;align-items:center;gap:6px"><i class="dot" style="background:${p.color}"></i>${esc(p.name)}</span>`).join('')}</div>`;
}

function renderTx(){
  const fp=$('#f_p').value, fk=$('#f_k').value, d1=dkey($('#f_d1')), d2=dkey($('#f_d2'));
  const rows=[...txs].filter(t=>t.s!=='pending').sort((a,b)=>b.d.localeCompare(a.d)||String(b.id).localeCompare(String(a.id)))
    .filter(t=>(!fp||t.p===fp)&&(!fk||t.k===fk)
      &&(d1.length!==8||t.d>=d1)&&(d2.length!==8||t.d<=d2));
  if(!txs.length){ $('#txwrap').innerHTML=`<div class="empty"><b>هنوز تراکنشی ثبت نشده است</b>
    از بخش «ثبت تراکنش» اولین ورود یا خروج پول را وارد کنید.</div>`; return; }
  $('#txwrap').innerHTML=`<div style="overflow-x:auto"><table>
    <thead><tr><th>تاریخ</th><th>شریک</th><th>نوع</th><th>مبلغ (ریال)</th>
      <th>قیمت شمش</th><th>وزن (kg)</th><th>شرح</th><th></th></tr></thead>
    <tbody>${ rows.map(t=>{
      const p=partners.find(x=>x.id===t.p)||{name:'—',color:'#888'};
      return `<tr><td class="num">${dshow(t.d)}</td>
        <td><span style="display:flex;align-items:center;gap:6px"><i class="dot" style="background:${p.color}"></i>${esc(p.name)}</span></td>
        <td><span class="tag ${t.k==='IN'?'t-in':'t-out'}">${t.k==='IN'?'ورود':'خروج'}</span></td>
        <td class="num">${fa(t.a)}</td><td class="num">${fa(t.pr)}</td>
        <td class="num ${t.k==='IN'?'up':'down'}">${t.k==='IN'?'+':'−'}${kg(t.a/t.pr)}</td>
        <td style="color:var(--dim)">${esc(t.t)||'—'}</td>
        <td style="white-space:nowrap"><button class="btn gh" onclick="editTx('${t.id}')">ویرایش</button>
          <button class="btn gh dg" onclick="delTx('${t.id}')">حذف</button></td></tr>`;
    }).join('') || '<tr><td colspan="8" class="empty">با این فیلترها موردی یافت نشد</td></tr>' }
  </tbody></table></div>`;
}


/* ============ در انتظار قیمت‌گذاری ============ */
const pendList = () => txs.filter(t=>t.s==='pending')
                          .sort((a,b)=>a.d.localeCompare(b.d)||String(a.id).localeCompare(String(b.id)));

function renderPend(){
  const rows = pendList();
  const n = rows.length;

  // نشان روی تب
  const b=$('#pendbadge');
  if(b){ if(n){ b.textContent=toFa(n); b.classList.remove('hide'); }
         else b.classList.add('hide'); }

  // هشدار داشبورد
  let note=$('#pendnote');
  if(n){
    if(!note){ note=document.createElement('div'); note.id='pendnote';
      note.className='pendnote'; $('#dash').prepend(note); }
    note.innerHTML = `<b>⏳ ${toFa(n)} تراکنش منتظر قیمت‌گذاری است.</b>
      <span style="color:#d6b16a">تا زمانی که قیمت شمش وارد نشود، در وزن و درصد سهم محاسبه نمی‌شوند.</span>
      <button class="btn" style="padding:5px 12px;font-size:13px"
        onclick="gotoPend()">رسیدگی</button>`;
  } else if(note) note.remove();

  const bb=$('#bulkbox'); if(bb) bb.classList.toggle('hide', !n);

  if(!n){ $('#pendwrap').innerHTML=`<div class="card empty">
      <b>موردی در انتظار قیمت‌گذاری نیست</b>
      همهٔ تراکنش‌ها قیمت‌گذاری شده‌اند و در محاسبات لحاظ می‌شوند.</div>`; return; }

  $('#pendwrap').innerHTML=`<div class="card"><div style="overflow-x:auto"><table>
    <thead><tr>
      <th style="width:34px"><input type="checkbox" id="pk_all" checked></th>
      <th>تاریخ</th><th>شریک</th><th>نوع</th><th>مبلغ (ریال)</th>
      <th>شرح</th><th style="width:170px">قیمت شمش</th><th></th></tr></thead>
    <tbody>${rows.map(t=>{
      const p=partners.find(x=>x.id===t.p)||{name:'—',color:'#888'};
      return `<tr class="pendrow" data-id="${t.id}">
        <td><input type="checkbox" class="pk" value="${t.id}" checked></td>
        <td class="num">${dshow(t.d)}</td>
        <td><span style="display:flex;align-items:center;gap:6px"><i class="dot" style="background:${p.color}"></i>${esc(p.name)}</span></td>
        <td><span class="tag ${t.k==='IN'?'t-in':'t-out'}">${t.k==='IN'?'ورود':'خروج'}</span></td>
        <td class="num">${fa(t.a)}</td>
        <td style="color:var(--dim)">${esc(t.t)||'—'}</td>
        <td><input class="money pinp" inputmode="numeric" data-id="${t.id}" placeholder="قیمت"></td>
        <td style="white-space:nowrap">
          <button class="btn" style="padding:5px 10px;font-size:13px" onclick="confirmOne('${t.id}')">تأیید</button>
          <button class="btn gh dg" style="padding:5px 10px;font-size:13px" onclick="delTx('${t.id}')">حذف</button>
        </td></tr>`;
    }).join('')}</tbody></table></div></div>`;

  $$('#pendwrap .money').forEach(bindMoney);
  const all=$('#pk_all');
  if(all) all.onclick=()=>$$('.pk').forEach(c=>c.checked=all.checked);
}

function gotoPend(){
  const b=[...$$('nav button')].find(x=>x.dataset.t==='pend'); if(b) b.click();
}

function applyPrice(t, pr){
  t.pr = pr; t.s = 'confirmed';
  push(()=>cTxUpd(t), 'txConfirm');
}

function confirmOne(id){
  const t=txs.find(x=>String(x.id)===String(id)); if(!t) return;
  const inp=[...$$('.pinp')].find(i=>String(i.dataset.id)===String(id));
  const pr=parseNum(inp? inp.value : '');
  if(!pr) return alert('قیمت شمش را برای این تراکنش وارد کنید.');
  applyPrice(t, pr);
  if(!price()) $('#price').value=toFa(group(pr));
  render(); save();
  flash('✓ تراکنش قیمت‌گذاری و وارد محاسبات شد');
}

function confirmBulk(){
  const pr=parseNum($('#bulk_pr').value);
  if(!pr) return alert('قیمت شمش را برای تأیید دسته‌ای وارد کنید.');
  const ids=[...$$('.pk')].filter(c=>c.checked).map(c=>c.value);
  if(!ids.length) return alert('حداقل یک تراکنش را انتخاب کنید.');
  if(!confirm(`قیمت ${toFa(group(pr))} ریال برای ${toFa(ids.length)} تراکنش ثبت شود؟`)) return;
  ids.forEach(id=>{ const t=txs.find(x=>String(x.id)===String(id)); if(t) applyPrice(t, pr); });
  if(!price()) $('#price').value=toFa(group(pr));
  $('#bulk_pr').value='';
  render(); save();
  flash(`✓ ${toFa(ids.length)} تراکنش قیمت‌گذاری شد`);
}

function renderPartners(){
  if(!partners.length){ $('#pwrap').innerHTML=`<div class="empty"><b>هنوز شریکی ثبت نشده است</b>
    از فرم پایین اولین شریک را اضافه کنید.</div>`; return; }
  const {list}=stats();
  $('#pwrap').innerHTML=`<div style="overflow-x:auto"><table>
    <thead><tr><th>نام</th><th>وزن (kg)</th><th>سهم</th><th>تعداد تراکنش</th><th>یادداشت</th><th></th></tr></thead>
    <tbody>${list.map(p=>`<tr>
      <td><span style="display:flex;align-items:center;gap:7px"><i class="dot" style="background:${p.color}"></i><b>${esc(p.name)}</b></span></td>
      <td class="num">${p.w<0?'−':''}${kg(p.w)}</td>
      <td class="num" style="color:${p.color};font-weight:700">${kg(p.pct)}٪</td>
      <td class="num">${toFa(p.n)}</td>
      <td style="color:var(--dim)">${esc(p.note)||'—'}</td>
      <td style="white-space:nowrap"><button class="btn gh" onclick="editP('${p.id}')">ویرایش</button>
        <button class="btn gh dg" onclick="delP('${p.id}')">حذف</button></td></tr>`).join('')}
  </tbody></table></div>`;
}
const esc = s => String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ============ پیش‌نمایش وزن ============ */
function prevCalc(aEl,prEl,kEl,out,out2){
  const a=parseNum(aEl.value), p=parseNum(prEl.value), k=kEl.value;
  if(!a||!p){ out.textContent='— کیلوگرم'; out.style.color='var(--acc)'; out2.textContent=''; return; }
  out.textContent=(k==='IN'?'+':'−')+kg(a/p)+' کیلوگرم';
  out.style.color = k==='IN'?'var(--up)':'var(--down)';
  out2.textContent=`${fa(a)} ریال ÷ ${fa(p)} ریال بر کیلوگرم`;
}
const prev  = ()=>prevCalc($('#n_a'),$('#n_pr'),$('#n_k'),$('#prev'),$('#prev2'));
const eprev = ()=>prevCalc($('#e_a'),$('#e_pr'),$('#e_k'),$('#eprev'),$('#eprev2'));

/* ============ عملیات ============ */
function fillSel(){
  // اگر عناصر هنوز در DOM نیستند (بارگذاری اولیه)، بی‌صدا رد شو
  if(!$('#n_p')||!$('#r_p')) return;
  const o=partners.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');
  const keep1=$('#n_p').value, keep2=$('#f_p').value;
  $('#n_p').innerHTML=o||'<option value="">— شریکی ثبت نشده —</option>';
  $('#e_p').innerHTML=o;
  $('#f_p').innerHTML='<option value="">همه</option>'+o;
  const kr=$('#r_p').value;
  $('#r_p').innerHTML=o||'<option value="">— سرمایه‌گذاری ثبت نشده —</option>';
  const has=v=>partners.some(p=>p.id===v);
  if(keep1&&has(keep1)) $('#n_p').value=keep1;
  if(keep2&&has(keep2)) $('#f_p').value=keep2;
  if(kr&&has(kr))       $('#r_p').value=kr;
}
function closeM(){ $$('.ov').forEach(m=>m.classList.add('hide')); }

let editingTx=null, editingP=null;
function editTx(id){
  const t=txs.find(x=>String(x.id)===String(id)); if(!t) return; editingTx=id;
  fillSel();
  $('#e_p').value=t.p; $('#e_k').value=t.k;
  $('#e_a').value=toFa(group(t.a)); $('#e_pr').value=toFa(group(t.pr));
  $('#e_d').value=dshow(t.d)==='—'?'':dshow(t.d); $('#e_t').value=t.t||'';
  eprev(); $('#m_tx').classList.remove('hide');
}
$('#e_save').onclick=()=>{
  const a=parseNum($('#e_a').value), p=parseNum($('#e_pr').value), d=dkey($('#e_d'));
  if(!a||!p) return alert('مبلغ و قیمت شمش را وارد کنید.');
  if(!validDate(d)) return alert('تاریخ شمسی را کامل و معتبر وارد کنید، مثلاً ۱۴۰۵۰۶۲۲');
  const t=txs.find(x=>String(x.id)===String(editingTx));
  Object.assign(t,{p:$('#e_p').value,k:$('#e_k').value,a,pr:p,d,t:$('#e_t').value.trim()});
  push(()=>cTxUpd(t), 'txUpd');
  closeM(); render(); save();
};
function delTx(id){
  const t=txs.find(x=>String(x.id)===String(id)); if(!t) return;
  if(confirm(`این تراکنش حذف شود؟\n${dshow(t.d)} — ${fa(t.a)} ریال`)){
    txs=txs.filter(x=>String(x.id)!==String(id)); push(()=>cTxDel(id),'txDel'); render(); save(); }
}
function editP(id){
  const p=partners.find(x=>String(x.id)===String(id)); if(!p) return; editingP=id;
  $('#ep_n').value=p.name; $('#ep_c').value=p.color; $('#ep_note').value=p.note||'';
  $('#m_p').classList.remove('hide');
}
$('#ep_save').onclick=()=>{
  const n=$('#ep_n').value.trim(); if(!n) return alert('نام شریک را وارد کنید.');
  const p=partners.find(x=>String(x.id)===String(editingP));
  Object.assign(p,{name:n,color:$('#ep_c').value,note:$('#ep_note').value.trim()});
  push(()=>cPartnerUpd(p), 'pUpd');
  closeM(); fillSel(); render(); save();
};
function delP(id){
  const p=partners.find(x=>String(x.id)===String(id)); if(!p) return;
  const n=txs.filter(t=>t.p===id).length;
  const msg = n ? `«${p.name}» ${toFa(n)} تراکنش دارد.\nبا حذف شریک، تمام تراکنش‌های او هم حذف می‌شود. مطمئنید؟`
                : `شریک «${p.name}» حذف شود؟`;
  if(confirm(msg)){ partners=partners.filter(x=>String(x.id)!==String(id)); txs=txs.filter(t=>t.p!==id);
    push(()=>cPartnerDel(id),'pDel'); fillSel(); render(); save(); }
}

/* ============ رویدادها ============ */
$$('.money').forEach(bindMoney);
$$('.jdate').forEach(bindDate);
$$('nav button').forEach(b=>b.onclick=()=>{
  $$('nav button').forEach(x=>x.classList.remove('on')); b.classList.add('on');
  $$('section').forEach(s=>s.classList.add('hide')); $('#'+b.dataset.t).classList.remove('hide');
  // فهرست شرکا را هنگام ورود به هر تب تازه کن؛ وگرنه اگر داده‌ها بعد از
  // نخستین رسم از سرور برسند، کشوی «سرمایه‌گذار» خالی می‌ماند.
  fillSel(); });
['#n_a','#n_pr','#n_k'].forEach(s=>$(s).addEventListener('input',prev));
['#e_a','#e_pr','#e_k'].forEach(s=>$(s).addEventListener('input',eprev));
let _pt=null;
$('#price').addEventListener('input',()=>{curPrice=$('#price').value;render();save();
  clearTimeout(_pt); _pt=setTimeout(()=>push(()=>cPrice(curPrice),'price'), 800);});
['#f_p','#f_k'].forEach(s=>$(s).addEventListener('change',renderTx));
['#f_d1','#f_d2'].forEach(s=>$(s).addEventListener('input',renderTx));
window.addEventListener('beforeunload', e=>{
  if(typeof FAILED!=='undefined' && FAILED>0){ e.preventDefault(); e.returnValue=''; }
});
$$('.ov').forEach(o=>o.addEventListener('click',e=>{ if(e.target===o) closeM(); }));
document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeM(); });

$('#save').onclick=()=>{
  if(!partners.length) return alert('ابتدا از بخش «شرکا» حداقل یک شریک اضافه کنید.');
  const a=parseNum($('#n_a').value), p=parseNum($('#n_pr').value), d=dkey($('#n_d'));
  if(!a||!p) return alert('مبلغ و قیمت شمش را وارد کنید.');
  if(!validDate(d)) return alert('تاریخ شمسی را کامل و معتبر وارد کنید، مثلاً ۱۴۰۵۰۶۲۲');
  const pid=$('#n_p').value || (partners[0] && partners[0].id);
  if(!pid) return alert('ابتدا سرمایه‌گذار را انتخاب کنید.');
  const ntx={id:newId(),p:pid,k:$('#n_k').value,a,pr:p,d,t:$('#n_t').value.trim()};
  txs.push(ntx);
  push(async()=>{ ntx.id = await cTxAdd(ntx); }, 'txAdd');
  if(!price()) { $('#price').value=toFa(group(p)); }   // اولین قیمت را قیمت جاری بگیر
  $('#n_a').value=''; $('#n_t').value=''; prev(); render(); save();
  $$('nav button')[0].click();
};
$('#bulk_go').onclick=confirmBulk;
$('#r_go').onclick=buildReport;
// نمایش نسخهٔ رابط کنار دکمهٔ گزارش، برای اطمینان از تازه بودن کد
(()=>{ const b=$('#r_go'); if(!b||$('#r_ver'))return;
  const sp=document.createElement('span'); sp.id='r_ver';
  sp.style.cssText='margin-right:10px;font-size:12px;color:var(--dim)';
  sp.textContent='نسخهٔ '+APP_BUILD; b.parentNode.appendChild(sp); })();
if($('#cv_go')) $('#cv_go').onclick=convertToRial;
$('#np_b').onclick=()=>{
  const n=$('#np_n').value.trim(); if(!n) return alert('نام شریک را وارد کنید.');
  const np={id:newId(),name:n,color:$('#np_c').value,note:''};
  partners.push(np);
  push(async()=>{ const old=np.id; np.id=await cPartnerAdd(np);
    txs.forEach(t=>{ if(t.p===old) t.p=np.id; });
    ['#n_p','#f_p','#r_p','#e_p'].forEach(sel=>{ const el=$(sel);
      if(el && el.value===old){ fillSel(); el.value=np.id; } });
    fillSel(); render(); }, 'pAdd');
  $('#np_n').value=''; $('#np_c').value=COLORS[partners.length%COLORS.length];
  fillSel(); render(); save();
};



/* ============ لایهٔ سرور (API داخلی) ============
   نسخهٔ ۲: دیگر مستقیم به Supabase وصل نمی‌شویم.
   همه‌چیز از /api/* رد می‌شود که روی بک‌اند خودمان است.
   مزیت: کلید دیتابیس هرگز به مرورگر نمی‌رسد و انتقال به هر هاستی ممکن است. */

const CLOUD = true;          // همیشه سرور داریم
let LOADED = false;          // آیا داده‌ها با موفقیت آمده‌اند؟
let USER = '';

const jfetch = async (path, opt = {}) => {
  const r = await fetch(path, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(opt.headers || {}) },
    ...opt,
  });
  let d = null;
  try { d = await r.json(); } catch (e) { d = {}; }
  if (!r.ok) {
    const err = new Error((d && d.error) || 'خطا در ارتباط با سرور');
    err.status = r.status;
    throw err;
  }
  return d;
};

/* ---------------- احراز هویت ---------------- */

async function login(username, pass) {
  const d = await jfetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password: pass }),
  });
  USER = (d.user && d.user.username) || username;
  return true;
}

async function whoami() {
  try {
    const d = await jfetch('/api/auth/me');
    if (d.user) { USER = d.user.username; return true; }
  } catch (e) {}
  return false;
}

async function logout() {
  try { await jfetch('/api/auth/logout', { method: 'POST' }); } catch (e) {}
  location.reload();
}

/* ---------------- خواندن همهٔ داده‌ها ---------------- */

async function cloudLoad() {
  const [dp, dt, ds] = await Promise.all([
    jfetch('/api/partners'),
    jfetch('/api/transactions'),
    jfetch('/api/settings').catch(() => ({ price: null })),
  ]);

  partners = (dp.partners || []).map(x => ({
    id: x.id, name: x.name, color: x.color, note: x.note || '',
  }));

  txs = (dt.transactions || []).map(x => ({
    id: x.id,
    p: x.partner_id,
    k: x.kind,
    a: +x.amount_rial,
    pr: x.price_rial_per_kg == null ? 0 : +x.price_rial_per_kg,
    d: x.jdate,
    t: x.description || '',
    s: x.status || 'confirmed',
    src: x.source || null,
  }));

  curPrice = ds && ds.price ? toFa(group(digits(ds.price))) : '';
}

/* ---------------- نوشتن ---------------- */

const rowOf = t => ({
  id: String(t.id),
  partner_id: t.p,
  kind: t.k,
  amount_rial: String(t.a),
  price_rial_per_kg: t.pr ? String(t.pr) : null,
  status: t.s || 'confirmed',
  jdate: t.d,
  description: t.t || '',
});

async function cPartnerAdd(p) {
  const d = await jfetch('/api/partners', {
    method: 'POST',
    body: JSON.stringify({ id: String(p.id), name: p.name,
                           color: p.color, note: p.note || '' }),
  });
  return (d.partner && d.partner.id) || p.id;
}

const cPartnerUpd = p => jfetch('/api/partners', {
  method: 'PUT',
  body: JSON.stringify({ id: p.id, name: p.name, color: p.color, note: p.note || '' }),
});

const cPartnerDel = id =>
  jfetch('/api/partners?id=' + encodeURIComponent(id), { method: 'DELETE' });

async function cTxAdd(t) {
  const d = await jfetch('/api/transactions', {
    method: 'POST', body: JSON.stringify(rowOf(t)),
  });
  return (d.transaction && d.transaction.id) || t.id;
}

const cTxUpd = t => jfetch('/api/transactions', {
  method: 'PUT', body: JSON.stringify(rowOf(t)),
});

const cTxDel = id =>
  jfetch('/api/transactions?id=' + encodeURIComponent(id), { method: 'DELETE' });

const cPrice = v => jfetch('/api/settings', {
  method: 'POST', body: JSON.stringify({ price: String(digits(v) || '') }),
}).catch(e => { console.warn('price sync skipped', e); });

/* ---------------- صف نوشتن با تلاش مجدد ---------------- */

const sleep = ms => new Promise(r => setTimeout(r, ms));
let Q = Promise.resolve();
let FAILED = 0;

function push(fn, tag) {
  Q = Q.then(async () => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await fn();
        if (FAILED > 0) { FAILED--; if (!FAILED) clearSaveNotice(); }
        return;
      } catch (e) {
        if (e && e.status === 401) {       // نشست منقضی شده
          showBanner('نشست شما منقضی شده است. دوباره وارد شوید.');
          return;
        }
        if (attempt === 3) {
          console.error('save failed', tag, e);
          FAILED++;
          saveFailureNotice();
          return;
        }
        await sleep(attempt * 700);
      }
    }
  });
  return Q;
}

/* ---------------- نوارهای هشدار ---------------- */

function showBanner(msg) {
  let b = $('#errbar');
  if (!b) {
    b = document.createElement('div');
    b.id = 'errbar';
    b.style.cssText = 'position:sticky;top:0;z-index:90;background:#7f1d1d;color:#fee2e2;' +
      'padding:12px 16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;' +
      'font-size:14px;border-bottom:1px solid #b91c1c';
    b.innerHTML = '<b>⚠ <span id="errhint"></span></b>' +
      '<button class="btn" id="errRetry" style="padding:5px 12px;font-size:13px">تلاش دوباره</button>' +
      '<button class="btn gh" id="errOut" style="padding:5px 12px;font-size:13px">خروج</button>';
    document.body.prepend(b);
    $('#errRetry').onclick = async () => {
      try { await cloudLoad(); LOADED = true; hideBanner(); fillSel(); render(); }
      catch (e) { setBannerHint(e.message || 'باز هم نشد'); }
    };
    $('#errOut').onclick = logout;
  }
  setBannerHint(msg);
  b.style.display = 'flex';
}
const setBannerHint = m => { const e = $('#errhint'); if (e) e.textContent = m; };
const hideBanner = () => { const b = $('#errbar'); if (b) b.style.display = 'none'; };

function saveFailureNotice() {
  let b = $('#savebar');
  if (!b) {
    b = document.createElement('div');
    b.id = 'savebar';
    b.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:95;background:#7c2d12;' +
      'color:#fed7aa;padding:12px 16px;display:flex;align-items:center;gap:12px;' +
      'flex-wrap:wrap;font-size:14px;border-top:1px solid #c2410c';
    b.innerHTML = '<b>⚠ تغییرات روی سرور ذخیره نشد.</b>' +
      '<span>صفحه را رفرش نکنید.</span>' +
      '<button class="btn" id="sbSync" style="padding:5px 12px;font-size:13px">همگام‌سازی دوباره</button>' +
      '<button class="btn gh" id="sbBackup" style="padding:5px 12px;font-size:13px">گرفتن پشتیبان</button>';
    document.body.appendChild(b);
    $('#sbSync').onclick = async () => {
      try { await cloudLoad(); FAILED = 0; clearSaveNotice(); fillSel(); render(); flash('✓ همگام شد'); }
      catch (e) { alert('همگام‌سازی نشد: ' + (e.message || '')); }
    };
    $('#sbBackup').onclick = () => $('#b_exp').click();
  }
  b.style.display = 'flex';
}
const clearSaveNotice = () => { const b = $('#savebar'); if (b) b.style.display = 'none'; };

/* ---------------- ورود و راه‌اندازی ---------------- */

function showLogin() { $('#m_login').classList.remove('hide'); }

async function afterLogin() {
  try {
    await cloudLoad();
    LOADED = true;
    $('#m_login').classList.add('hide');
    hideBanner();
  } catch (e) {
    $('#m_login').classList.add('hide');
    console.error(e);
    showBanner(e.message || 'خطا در دریافت اطلاعات');
  }
  $('#price').value = curPrice;
  const c = $('#cloud');
  if (c) {
    c.classList.remove('hide');
    c.innerHTML = `<span>☁ ${esc(USER)}</span>` +
      `<button class="btn gh" onclick="logout()" style="padding:4px 10px;font-size:12px">خروج</button>`;
  }
  fillSel(); render();
}

async function boot() {
  if (await whoami()) await afterLogin();
  else showLogin();
}

$('#lg_go').onclick = async () => {
  const u = $('#lg_e').value.trim(), p = $('#lg_p').value;
  if (!u || !p) return alert('نام کاربری و رمز عبور را وارد کنید.');
  const btn = $('#lg_go'); btn.disabled = true; btn.textContent = 'در حال ورود…';
  try {
    await login(u, p);
    $('#lg_p').value = '';
    await afterLogin();
  } catch (e) {
    const m = $('#lg_msg'); if (m) { m.style.color = 'var(--down)'; m.textContent = e.message || 'ورود ناموفق'; }
  } finally {
    btn.disabled = false; btn.textContent = 'ورود';
  }
};
$('#lg_p').addEventListener('keydown', e => { if (e.key === 'Enter') $('#lg_go').click(); });

/* ============ ورود گروهی از CSV ============ */
let X = null;   // {head:[], rows:[[]]}

function parseCSV(text){
  text = text.replace(/^\uFEFF/,'');
  // تشخیص جداکننده
  const first = text.slice(0, 5000);
  const cnt = ch => (first.match(new RegExp('\\'+ch,'g'))||[]).length;
  const sep = cnt(';') > cnt(',') ? ';' : (cnt('\t') > cnt(',') ? '\t' : ',');
  const rows=[]; let row=[], cell='', q=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(q){
      if(c==='"'){ if(text[i+1]==='"'){cell+='"';i++;} else q=false; }
      else cell+=c;
    } else if(c==='"') q=true;
    else if(c===sep){ row.push(cell); cell=''; }
    else if(c==='\n'){ row.push(cell); rows.push(row); row=[]; cell=''; }
    else if(c!=='\r') cell+=c;
  }
  if(cell||row.length){ row.push(cell); rows.push(row); }
  return rows.filter(r=>r.some(c=>String(c).trim()!==''));
}

/* تشخیص خودکار نقش ستون‌ها از روی عنوان */
const PAT = {
  date:   /تاریخ|زمان|date|روز/i,
  partner:/شریک|نام|طرف|شخص|partner|name|سرمایه/i,
  // «بدهکار» و «بستانکار» جداگانه، پیش از الگوی عمومی مبلغ بررسی می‌شوند
  debit:  /بدهکار|برداشت|خروج|debit|withdraw/i,
  credit: /بستانکار|واریز|ورود|credit|deposit/i,
  kind:   /^(?!.*تاریخ).*?(نوع|type|kind|وضعیت)/i,
  amount: /مبلغ|ریال|تومان|amount|پرداخت|وجه|value/i,
  price:  /قیمت|نرخ|شمش|price|rate|کیلو/i,
  desc:   /شرح|توضیح|بابت|desc|note|comment/i,
};
function guessCols(head){
  const g={}; const used=new Set();
  for(const k of ['date','partner','debit','credit','kind','price','amount','desc']){
    for(let i=0;i<head.length;i++){
      if(used.has(i)) continue;
      if(PAT[k].test(head[i]||'')){ g[k]=i; used.add(i); break; }
    }
  }
  return g;
}

/* تبدیل هر شکل تاریخی به YYYYMMDD شمسی */
function normDate(v){
  const d = digits(v);
  if(d.length===8) return d;                                  // 14050622
  if(d.length===7) return '0'+d;                              // 9050622 (بعید)
  if(d.length===6){                                           // 050622 -> 1405/06/22
    return '14'+d;
  }
  return '';
}
/* تشخیص ورود/خروج */
function normKind(v, amountRaw){
  const s=String(v||'').trim();
  if(/خروج|برداشت|out|debit|بدهکار|کسر|منفی|-/i.test(s)) return 'OUT';
  if(/ورود|واریز|in|credit|بستانکار|اضافه|مثبت/i.test(s))  return 'IN';
  if(String(amountRaw||'').trim().startsWith('-')) return 'OUT';
  return 'IN';
}

/* ---- چسباندن مستقیم از اکسل (جداشده با Tab) ---- */
function parseTSV(text){
  const rows = text.replace(/\r/g,'').split('\n')
    .filter(l=>l.trim()!=='')
    .map(l=>l.split('\t'));
  // اگر Tab نبود، شاید کاربر CSV چسبانده باشد
  if(rows.length && rows[0].length===1) return parseCSV(text);
  return rows;
}
$('#x_read').onclick=()=>{
  const t=$('#x_ta').value;
  if(!t.trim()) return alert('ابتدا داده‌ها را از اکسل کپی و در کادر بچسبانید.');
  const rows=parseTSV(t);
  if(rows.length<2) return alert('حداقل یک سطر عنوان و یک سطر داده لازم است.');
  X={head:rows[0].map(h=>String(h).trim()), rows:rows.slice(1)};
  showMap(guessCols(X.head));
};
$('#x_clr').onclick=()=>{ $('#x_ta').value=''; resetImport(); };

/* ---- خواندن مستقیم xlsx (ZIP + XML، بدون کتابخانهٔ بیرونی) ---- */
async function unzip(buf){
  const dv=new DataView(buf), u8=new Uint8Array(buf);
  // پیدا کردن End Of Central Directory
  let eo=-1;
  for(let i=u8.length-22;i>=Math.max(0,u8.length-66000);i--)
    if(dv.getUint32(i,true)===0x06054b50){eo=i;break;}
  if(eo<0) throw new Error('فایل فشردهٔ معتبر نیست');
  let n=dv.getUint16(eo+10,true), off=dv.getUint32(eo+16,true);
  const out={};
  for(let k=0;k<n;k++){
    if(dv.getUint32(off,true)!==0x02014b50) break;
    const meth=dv.getUint16(off+10,true), csz=dv.getUint32(off+20,true);
    const nl=dv.getUint16(off+28,true), el=dv.getUint16(off+30,true),
          cl=dv.getUint16(off+32,true), lho=dv.getUint32(off+42,true);
    const name=new TextDecoder().decode(u8.subarray(off+46,off+46+nl));
    const lnl=dv.getUint16(lho+26,true), lel=dv.getUint16(lho+28,true);
    const ds=lho+30+lnl+lel;
    const raw=u8.subarray(ds,ds+csz);
    out[name]= meth===0 ? Promise.resolve(raw) : inflate(raw);
    off+=46+nl+el+cl;
  }
  for(const k in out) out[k]=await out[k];
  return out;
}
async function inflate(raw){
  if(typeof DecompressionStream==='undefined')
    throw new Error('مرورگر شما از خواندن مستقیم xlsx پشتیبانی نمی‌کند؛ از روش «کپی و چسباندن» استفاده کنید.');
  const ds=new DecompressionStream('deflate-raw');
  const ab=await new Response(new Blob([raw]).stream().pipeThrough(ds)).arrayBuffer();
  return new Uint8Array(ab);
}
const td=u8=>new TextDecoder('utf-8').decode(u8);
/* رمزگشایی موجودیت‌های XML — شامل حالت عددی که فارسی را &#1578; ذخیره می‌کند */
function dx(s){
  return String(s)
    .replace(/&#x([0-9a-fA-F]+);/g,(_,h)=>String.fromCodePoint(parseInt(h,16)))
    .replace(/&#(\d+);/g,(_,d)=>String.fromCodePoint(+d))
    .replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&#39;/g,"'")
    .replace(/&amp;/g,'&');
}
const colNum=ref=>{ let c=0; for(const ch of ref.replace(/\d+/g,'')) c=c*26+(ch.charCodeAt(0)-64); return c-1; };

function sheetToRows(xml, shared){
  const rows=[];
  const rowRe=/<row[^>]*>([\s\S]*?)<\/row>|<row[^>]*\/>/g;
  let rm;
  while((rm=rowRe.exec(xml))){
    const inner=rm[1]||''; const cells=[];
    const cRe=/<c([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g; let cm;
    while((cm=cRe.exec(inner))){
      const attr=cm[1]||'', body=cm[2]||'';
      const ref=(attr.match(/r="([A-Z]+\d+)"/)||[])[1];
      const t=(attr.match(/t="([^"]+)"/)||[])[1];
      let v='';
      if(t==='inlineStr'){ v=(body.match(/<t[^>]*>([\s\S]*?)<\/t>/)||[])[1]||''; }
      else{
        const vm=body.match(/<v>([\s\S]*?)<\/v>/);
        v=vm?vm[1]:'';
        if(t==='s') v=shared[+v]??'';
      }
      v=dx(v);
      const i = ref ? colNum(ref) : cells.length;
      while(cells.length<i) cells.push('');
      cells[i]=v;
    }
    rows.push(cells);
  }
  return rows.filter(r=>r.some(c=>String(c).trim()!==''));
}

let XLSX_SHEETS=null;
$('#x_pick').onclick=()=>$('#x_file').click();
$('#x_file').onchange=async e=>{
  const f=e.target.files[0]; if(!f) return;
  $('#x_fname').textContent=f.name;
  try{
    if(/\.(csv|txt)$/i.test(f.name)){
      const rows=parseCSV(await f.text());
      if(rows.length<2) throw new Error('فایل خالی است');
      X={head:rows[0].map(h=>String(h).trim()),rows:rows.slice(1)};
      $('#x_sheets').classList.add('hide'); showMap(guessCols(X.head)); return;
    }
    if(/\.xls$/i.test(f.name))
      throw new Error('فرمت قدیمی .xls پشتیبانی نمی‌شود. در اکسل Save As → Excel Workbook (.xlsx) کنید، یا از روش «کپی و چسباندن» استفاده کنید.');

    const files=await unzip(await f.arrayBuffer());
    // رشته‌های مشترک
    let shared=[];
    if(files['xl/sharedStrings.xml']){
      const sx=td(files['xl/sharedStrings.xml']);
      shared=[...sx.matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m=>
        dx([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(x=>x[1]).join('')));
    }
    // نام و مسیر شیت‌ها
    const wb=td(files['xl/workbook.xml']||new Uint8Array());
    const rels=td(files['xl/_rels/workbook.xml.rels']||new Uint8Array());
    const relMap={};
    [...rels.matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)]
      .forEach(m=>relMap[m[1]]=m[2].replace(/^\/?xl\//,'').replace(/^\//,''));
    const sheets=[...wb.matchAll(/<sheet[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)]
      .map(m=>({name:dx(m[1]), path:'xl/'+(relMap[m[2]]||'')}))
      .filter(s=>files[s.path]);
    if(!sheets.length) throw new Error('شیتی در فایل پیدا نشد');
    XLSX_SHEETS=sheets.map(s=>({name:s.name, rows:sheetToRows(td(files[s.path]), shared)}));
    showSheets();
  }catch(err){ alert('خطا در خواندن فایل:\n'+(err.message||err)); }
  finally{ e.target.value=''; }
};

function showSheets(){
  const s=XLSX_SHEETS;
  if(s.length===1){ $('#x_sheets').classList.add('hide'); useSheet(0); return; }
  $('#x_sheets').classList.remove('hide');
  $('#x_sheets').innerHTML=`<label style="font-size:12px;color:var(--dim);display:block;margin-bottom:5px">شیت</label>
    <select id="x_sh" style="background:#0b0f14;border:1px solid var(--line);color:var(--txt);
      border-radius:9px;padding:9px 11px;font:inherit;font-size:13.5px;min-width:220px">
      ${s.map((x,i)=>`<option value="${i}">${esc(x.name)} (${toFa(Math.max(0,x.rows.length-1))} ردیف)</option>`).join('')}
    </select>`;
  $('#x_sh').onchange=e=>useSheet(+e.target.value);
  useSheet(0);
}
function useSheet(i){
  const r=XLSX_SHEETS[i].rows;
  if(r.length<2){ $('#x_map').classList.add('hide');
    $('#x_prev').innerHTML='<div class="empty">این شیت داده‌ای ندارد.</div>'; return; }
  X={head:r[0].map(h=>String(h).trim()), rows:r.slice(1)};
  showMap(guessCols(X.head));
}
function resetImport(){
  X=null; PEND=null; XLSX_SHEETS=null;
  $('#x_map').classList.add('hide'); $('#x_prev').innerHTML='';
  $('#x_sheets').classList.add('hide'); $('#x_fname').textContent='';
}
$$('.xt').forEach(b=>b.onclick=()=>{
  $$('.xt').forEach(x=>{x.classList.remove('on');x.style.background='';x.style.color='';});
  b.classList.add('on'); b.style.background='var(--acc)'; b.style.color='#06101f';
  $('#xp_paste').classList.toggle('hide', b.dataset.x!=='paste');
  $('#xp_file').classList.toggle('hide', b.dataset.x!=='file');
  resetImport();
});
if($$('.xt')[0]){ $$('.xt')[0].style.background='var(--acc)'; $$('.xt')[0].style.color='#06101f'; }

function showMap(g){
  const opts = i => '<option value="">— ندارد —</option>' +
    X.head.map((h,j)=>`<option value="${j}" ${j===i?'selected':''}>${esc(h||'ستون '+toFa(j+1))}</option>`).join('');
  $('#x_map').classList.remove('hide');
  $('#x_map').innerHTML=`
    <div style="font-size:13px;color:var(--dim);margin-bottom:10px">
      ${toFa(X.rows.length)} ردیف خوانده شد. تطبیق ستون‌ها را بررسی و در صورت نیاز اصلاح کنید:</div>
    <div class="form f">
      <div><label>تاریخ *</label><select id="c_date">${opts(g.date)}</select></div>
      <div><label>شریک *</label><select id="c_partner">${opts(g.partner)}</select></div>
      <div><label>مبلغ (ریال)</label><select id="c_amount">${opts(g.amount)}</select></div>
      <div><label>بدهکار / برداشت</label><select id="c_debit">${opts(g.debit)}</select></div>
      <div><label>بستانکار / واریز</label><select id="c_credit">${opts(g.credit)}</select></div>
      <div><label>قیمت شمش</label><select id="c_price">${opts(g.price)}</select></div>
      <div><label>نوع (ورود/خروج)</label><select id="c_kind">${opts(g.kind)}</select></div>
      <div><label>شرح</label><select id="c_desc">${opts(g.desc)}</select></div>
    </div>
    <div class="hint">اگر فایل شما دو ستون جدا برای <b>بدهکار</b> و <b>بستانکار</b> دارد، همان دو را انتخاب کنید و «مبلغ» را خالی بگذارید.<br>
      اگر یک ستون مبلغ دارید، «مبلغ» را پر کنید؛ مبالغ منفی به‌عنوان خروج در نظر گرفته می‌شوند.<br><b>ستون «قیمت شمش» اختیاری است</b> — اگر نداشته باشید، تراکنش‌ها با وضعیت «در انتظار قیمت» وارد می‌شوند و بعداً می‌توانید از تب «در انتظار قیمت» برایشان قیمت بگذارید.</div>`;
  ['c_date','c_partner','c_amount','c_debit','c_credit','c_price','c_kind','c_desc']
    .forEach(id=>$('#'+id).addEventListener('change',buildPrev));
  buildPrev();
}

let PEND=null;
function buildPrev(){
  const ci = id => { const v=$('#'+id).value; return v===''?-1:+v; };
  const c={date:ci('c_date'),partner:ci('c_partner'),amount:ci('c_amount'),
           debit:ci('c_debit'),credit:ci('c_credit'),
           price:ci('c_price'),kind:ci('c_kind'),desc:ci('c_desc')};
  const twoCol = c.debit>=0 || c.credit>=0;
  if(c.date<0||c.partner<0||(c.amount<0 && !twoCol)){
    $('#x_prev').innerHTML='<div class="empty">ستون‌های تاریخ و شریک را مشخص کنید، و یا ستون «مبلغ» یا جفت «بدهکار/بستانکار» را.</div>';
    PEND=null; return;
  }
  const ok=[], bad=[], names=new Set();
  X.rows.forEach((r,i)=>{
    const dRaw=r[c.date], pName=String(r[c.partner]||'').trim();
    const prRaw=(c.price>=0? r[c.price] : '');
    const d=normDate(dRaw), pr=parseNum(prRaw);

    // مبلغ و جهت: یا از جفت بدهکار/بستانکار، یا از ستون تکی
    let a=0, kindFromCols=null, aRaw='';
    if(twoCol){
      const dv=c.debit >=0 ? parseNum(r[c.debit ]) : 0;
      const cv=c.credit>=0 ? parseNum(r[c.credit]) : 0;
      if(cv>0){ a=cv; kindFromCols='IN';  aRaw=r[c.credit]; }
      else if(dv>0){ a=dv; kindFromCols='OUT'; aRaw=r[c.debit]; }
    } else {
      aRaw=r[c.amount]; a=parseNum(aRaw);
    }

    const errs=[];
    if(!validDate(d)) errs.push('تاریخ نامعتبر');
    if(!pName)        errs.push('شریک خالی');
    if(!a)            errs.push(twoCol?'هر دو ستون بدهکار و بستانکار خالی‌اند':'مبلغ صفر/نامعتبر');
    if(errs.length) bad.push({n:i+2, raw:[dRaw,pName,aRaw||'(خالی)',prRaw].join(' | '), e:errs.join('، ')});
    else { names.add(pName);
      ok.push({d, name:pName, k: kindFromCols || normKind(c.kind>=0?r[c.kind]:'', aRaw), a, pr: pr||null,
               s: pr? 'confirmed':'pending',
               t:c.desc>=0?String(r[c.desc]||'').trim():''}); }
  });
  PEND={ok,bad,names:[...names]};
  const exist=new Set(partners.map(p=>p.name.trim()));
  const isNew=PEND.names.filter(n=>!exist.has(n));
  const sample=ok.slice(0,8).map(t=>`<tr>
      <td class="num">${dshow(t.d)}</td><td>${esc(t.name)}</td>
      <td><span class="tag ${t.k==='IN'?'t-in':'t-out'}">${t.k==='IN'?'ورود':'خروج'}</span></td>
      <td class="num">${fa(t.a)}</td><td class="num">${t.pr? fa(t.pr) : '<span style="color:#d6b16a">در انتظار</span>'}</td>
      <td class="num ${t.k==='IN'?'up':'down'}">${t.pr? (t.k==='IN'?'+':'−')+kg(t.a/t.pr) : '—'}</td>
      <td style="color:var(--dim)">${esc(t.t)||'—'}</td></tr>`).join('');
  $('#x_prev').innerHTML=`
    <div class="tot" style="margin-bottom:14px">
      <div><span>آمادهٔ ورود</span><b class="up">${toFa(ok.length)}</b></div>
      <div><span>دارای خطا</span><b class="${bad.length?'down':''}">${toFa(bad.length)}</b></div>
      <div><span>شرکای شناسایی‌شده</span><b>${toFa(PEND.names.length)}</b></div>
      <div><span>شرکای جدید</span><b>${toFa(isNew.length)}</b></div>
      ${(()=>{const np=ok.filter(t=>!t.pr).length; return np?`<div><span>در انتظار قیمت</span><b style="color:#d6b16a">${toFa(np)}</b></div>`:'';})()}
    </div>
    ${isNew.length?`<div style="font-size:13px;color:var(--dim);margin-bottom:12px">
      شرکای جدیدی که خودکار ساخته می‌شوند: ${isNew.map(n=>'<b style="color:var(--txt)">'+esc(n)+'</b>').join('، ')}</div>`:''}
    ${ok.length?`<div style="font-size:12px;color:var(--dim);margin-bottom:6px">پیش‌نمایش ۸ ردیف اول:</div>
      <div style="overflow-x:auto"><table><thead><tr><th>تاریخ</th><th>شریک</th><th>نوع</th>
      <th>مبلغ</th><th>قیمت شمش</th><th>وزن (kg)</th><th>شرح</th></tr></thead><tbody>${sample}</tbody></table></div>`:''}
    ${bad.length?`<details style="margin-top:14px"><summary style="cursor:pointer;color:var(--down);font-size:13px">
      نمایش ${toFa(bad.length)} ردیف دارای خطا</summary>
      <div style="overflow-x:auto;max-height:260px;margin-top:8px"><table><thead><tr>
      <th>ردیف در فایل</th><th>محتوا</th><th>ایراد</th></tr></thead><tbody>
      ${bad.slice(0,80).map(b=>`<tr><td class="num">${toFa(b.n)}</td>
        <td style="color:var(--dim)">${esc(b.raw)}</td><td class="down">${esc(b.e)}</td></tr>`).join('')}
      </tbody></table></div></details>`:''}
    ${ok.length?`<div class="acts"><button class="btn" id="x_go">افزودن ${toFa(ok.length)} تراکنش</button>
      <button class="btn gh" style="padding:10px 20px;font-size:14px" id="x_cancel">انصراف</button></div>`:''}`;
  if(ok.length){
    $('#x_go').onclick=doImport;
    $('#x_cancel').onclick=()=>{X=null;PEND=null;$('#x_map').classList.add('hide');$('#x_prev').innerHTML='';};
  }
}

function doImport(){
  if(!PEND||!PEND.ok.length) return;
  if(!confirm(`${toFa(PEND.ok.length)} تراکنش به داده‌های فعلی افزوده شود؟\nاین کار تراکنش‌های موجود را پاک نمی‌کند.`)) return;
  const map={}, newNames=[];
  partners.forEach(p=>map[p.name.trim()]=p.id);
  PEND.names.forEach(n=>{
    if(map[n]) return;
    newNames.push(n);
    const id=newId();
    partners.push({id,name:n,color:COLORS[partners.length%COLORS.length],note:''});
    map[n]=id;
  });
  const fresh=PEND.ok.map(t=>({id:newId(),p:map[t.name],k:t.k,a:t.a,pr:t.pr,d:t.d,t:t.t,s:t.s}));
  fresh.forEach(t=>txs.push(t));
  if(CLOUD) push(async()=>{
    for(const n of newNames){ const old=map[n]; const nid=await cPartnerAdd(partners.find(x=>x.id===old));
      partners.find(x=>x.id===old).id=nid; fresh.forEach(t=>{ if(t.p===old) t.p=nid; }); }
    for(const t of fresh){ t.id = await cTxAdd(t); }
    fillSel(); render();
  }, 'bulk');
  if(!price()){
    const last=[...PEND.ok].filter(t=>t.pr).sort((a,b)=>a.d.localeCompare(b.d)).pop();
    if(last){ curPrice=toFa(group(last.pr)); $('#price').value=curPrice; }
  }
  const n=PEND.ok.length;
  X=null;PEND=null;$('#x_map').classList.add('hide');$('#x_prev').innerHTML='';
  fillSel(); render(); save();
  alert(`${toFa(n)} تراکنش با موفقیت وارد شد.`);
  $$('nav button')[0].click();
}

/* ============ پشتیبان‌گیری ============ */

function dl(name, content, mime){
  const b=new Blob([content],{type:mime+';charset=utf-8'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(b); a.download=name; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),2000);
}
$('#b_exp').onclick=()=>{
  dl(`backup-${todayJ()||'data'}.json`,
     JSON.stringify({v:1,partners,txs,uid,curPrice,at:new Date().toISOString()},null,2),
     'application/json');
};
$('#b_csv').onclick=()=>{
  if(!txs.length) return alert('تراکنشی برای خروجی وجود ندارد.');
  const nm=id=>(partners.find(p=>p.id===id)||{name:'—'}).name;
  const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  const head=['تاریخ','شریک','نوع','مبلغ (ریال)','قیمت شمش','وزن (kg)','شرح'];
  const body=[...txs].sort((a,b)=>a.d.localeCompare(b.d)).map(t=>[
    t.d.slice(0,4)+'/'+t.d.slice(4,6)+'/'+t.d.slice(6), nm(t.p),
    t.k==='IN'?'ورود':'خروج', t.a, t.pr, ((t.k==='IN'?1:-1)*t.a/t.pr).toFixed(6), t.t||''
  ].map(q).join(','));
  dl(`transactions-${todayJ()||'data'}.csv`, '\uFEFF'+[head.map(q).join(','),...body].join('\r\n'), 'text/csv');
};
$('#b_imp').onclick=()=>$('#b_file').click();
$('#b_file').onchange=e=>{
  const f=e.target.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=()=>{
    try{
      const d=JSON.parse(r.result);
      if(!Array.isArray(d.partners)||!Array.isArray(d.txs)) throw 0;
      if(!confirm(`بازیابی ${toFa(d.partners.length)} شریک و ${toFa(d.txs.length)} تراکنش؟\nداده‌های فعلی جایگزین می‌شوند.`)) return;
      partners=d.partners; txs=d.txs; curPrice=d.curPrice||'';
      uid=d.uid || (Math.max(0,...txs.map(t=>+t.id||0))+1);
      $('#price').value=curPrice; fillSel(); render(); save();
      if(CLOUD){
        if(!confirm('داده‌ها روی سرور ابری هم جایگزین شوند؟\nاطلاعات فعلی سرور پاک می‌شود.')) return;
        push(async()=>{
          await jfetch('/api/transactions?all=1',{method:'DELETE'}).catch(()=>{});
          for(const t of txs) await cTxDel(t.id).catch(()=>{});
          for(const p of partners) await cPartnerDel(p.id).catch(()=>{});
          for(const p of partners) await cPartnerAdd(p);
          for(const t of txs) await cTxAdd(t);
          await cPrice(curPrice); fillSel(); render();
        },'restore');
      }
      alert('بازیابی با موفقیت انجام شد.');
    }catch(err){ alert('فایل معتبر نیست.'); }
  };
  r.readAsText(f); e.target.value='';
};
$('#b_clr').onclick=()=>{
  if(!confirm('همهٔ شرکا و تراکنش‌ها برای همیشه پاک شوند؟')) return;
  if(!confirm('تأیید نهایی — آیا پشتیبان گرفته‌اید؟')) return;
  partners=[]; txs=[]; uid=1; curPrice=''; $('#price').value='';
  if(CLOUD) push(async()=>{
    const d1=await jfetch('/api/transactions'); 
    for(const t of (d1.transactions||[])) await cTxDel(t.id).catch(()=>{});
    const d2=await jfetch('/api/partners');
    for(const p of (d2.partners||[])) await cPartnerDel(p.id).catch(()=>{});
  },'clear');
  fillSel(); render(); save();
};
/* ============ تبدیل تومان به ریال (یک‌بار مصرف) ============ */

async function convertToRial(){
  const msg = $('#cv_msg');
  const say = (t,c) => { msg.innerHTML = `<b style="color:${c}">${t}</b>`; };

  if(($('#cv_ok').value||'').trim() !== 'تبدیل')
    return say('برای اجرا، عبارت «تبدیل» را دقیقاً در کادر بنویسید.', 'var(--down)');

  const targets = txs.filter(t => t.a || t.pr);
  if(!targets.length) return say('تراکنشی برای تبدیل وجود ندارد.', 'var(--dim)');

  if(!confirm(
    `${toFa(targets.length)} تراکنش تبدیل می‌شود:\n`+
    `• مبلغ و قیمت شمش هر کدام در ۱۰ ضرب می‌شوند\n`+
    `• وزن و درصد سهم تغییری نمی‌کند\n\n`+
    `این کار برگشت‌ناپذیر است. ادامه می‌دهید؟`)) return;

  // ابتدا نسخهٔ پشتیبان خودکار، تا اگر چیزی خراب شد داده از دست نرود
  try{
    dl(`backup-before-rial-${todayJ()||'now'}.json`,
       JSON.stringify({v:1,partners,txs,uid,curPrice,at:new Date().toISOString()},null,2),
       'application/json');
  }catch(e){ /* اگر دانلود نشد هم ادامه می‌دهیم */ }

  say('در حال تبدیل…', 'var(--dim)');

  // تغییر محلی
  targets.forEach(t => {
    if(t.a)  t.a  = Math.round(t.a  * 10);
    if(t.pr) t.pr = Math.round(t.pr * 10);
  });
  // قیمت جاری هم باید هم‌واحد شود
  const cp = parseNum(curPrice);
  if(cp) { curPrice = toFa(group(cp*10)); const el=$('#price'); if(el) el.value=curPrice; }

  save(); fillSel(); render();

  // همگام‌سازی با سرور، دانه‌دانه تا یک خطا کل کار را متوقف نکند
  if(CLOUD){
    let done=0, fail=0;
    for(const t of targets){
      try{ await cTxUpd(t); done++; }catch(e){ fail++; }
      if(done % 10 === 0) say(`در حال ذخیره… ${toFa(done)} از ${toFa(targets.length)}`, 'var(--dim)');
    }
    try{ await cPrice(curPrice); }catch(e){}
    say(fail
      ? `${toFa(done)} تراکنش ذخیره شد، ${toFa(fail)} مورد ناموفق بود. صفحه را تازه کنید و دوباره بررسی کنید.`
      : `✓ ${toFa(done)} تراکنش با موفقیت به ریال تبدیل شد.`,
      fail ? 'var(--down)' : 'var(--up)');
  } else {
    say(`✓ ${toFa(targets.length)} تراکنش به ریال تبدیل شد.`, 'var(--up)');
  }
  $('#cv_ok').value='';
}

/* ============ گزارش سرمایه‌گذار ============ */

function buildReport(){
  const out = $('#r_out');
  const pid = $('#r_p').value;
  if(!pid){ out.innerHTML='<div class="card"><div class="empty">ابتدا یک سرمایه‌گذار انتخاب کنید.</div></div>'; return; }
  const P = partners.find(x=>x.id===pid);
  if(!P){ out.innerHTML='<div class="card"><div class="empty">سرمایه‌گذار یافت نشد.</div></div>'; return; }

  const d1 = digits($('#r_d1').value), d2 = digits($('#r_d2').value);
  if(d1 && !validDate(d1)) return alert('تاریخ «از» معتبر نیست.');
  if(d2 && !validDate(d2)) return alert('تاریخ «تا» معتبر نیست.');
  if(d1 && d2 && d1 > d2)  return alert('تاریخ «از» نباید بزرگ‌تر از «تا» باشد.');

  const mine    = txs.filter(t=>t.p===pid);
  const inRange = t => (!d1 || t.d>=d1) && (!d2 || t.d<=d2);
  const byDate  = (a,b)=>a.d.localeCompare(b.d)||String(a.id).localeCompare(String(b.id));

  const rows    = mine.filter(t=>inRange(t) && t.s!=='pending').sort(byDate);
  const pendCnt = mine.filter(t=>inRange(t) && t.s==='pending').length;

  const outs = rows.filter(t=>t.k==='OUT');
  const ins  = rows.filter(t=>t.k==='IN');
  const outR = outs.reduce((s,t)=>s+t.a,0);
  const inR  = ins .reduce((s,t)=>s+t.a,0);

  /* مانده وزنی: از نخستین تراکنش تا پایان بازهٔ انتخاب‌شده */
  const balW = mine.filter(t=>(!d2 || t.d<=d2) && t.s!=='pending')
                   .reduce((s,t)=>s+W(t),0);

  /* قیمت مبنا: قیمت آخرین تراکنشِ قیمت‌دار داخل بازه */
  const priced = rows.filter(t=>t.pr).sort(byDate);
  const lastTx = priced[priced.length-1] || null;
  const basePr = lastTx ? lastTx.pr : 0;

  const line = t => `<tr>
      <td class="num">${dshow(t.d)}</td>
      <td class="num">${fa(t.a)}</td>
      <td style="color:var(--dim)">${esc(t.t)||'—'}</td></tr>`;

  const tbl = (arr, sum, cls, empty) => arr.length
    ? `<div style="overflow-x:auto"><table><thead><tr>
         <th style="width:130px">تاریخ</th><th style="width:190px">مبلغ (ریال)</th><th>شرح</th>
       </tr></thead><tbody>${arr.map(line).join('')}
       <tr class="sumrow"><td><b>جمع کل</b></td>
         <td class="num"><b class="${cls}">${fa(sum)}</b></td>
         <td style="color:var(--dim)">${toFa(arr.length)} مورد</td></tr>
       </tbody></table></div>`
    : `<div class="empty">${empty}</div>`;

  const period = (d1||d2) ? `${d1?dshow(d1):'ابتدا'} تا ${d2?dshow(d2):'انتها'}` : 'کل دوره';

  out.innerHTML = `
  <div class="card pr-off" style="margin-bottom:16px">
    <h2>گزارش سرمایه‌گذار — ${esc(P.name)}</h2>
    <div style="color:var(--dim);font-size:13.5px;line-height:2">
      بازهٔ گزارش: <b style="color:var(--txt)">${period}</b>
      ${pendCnt?` · <span style="color:#d6b16a">${toFa(pendCnt)} تراکنش در انتظار قیمت (خارج از محاسبه)</span>`:''}
    </div>
  </div>

  <div class="card" style="margin-bottom:16px">
    <h2>برداشت‌ها</h2>
    ${tbl(outs, outR, 'down', 'در این بازه برداشتی ثبت نشده است.')}
  </div>

  <div class="card" style="margin-bottom:16px">
    <h2>واریزها</h2>
    ${tbl(ins, inR, 'up', 'در این بازه واریزی ثبت نشده است.')}
  </div>

  <div class="card" style="margin-bottom:16px">
    <h2>مانده وزنی سرمایه‌گذار</h2>
    <div class="tot"><div><span>کیلوگرم</span><b>${kg(balW)}</b></div></div>
  </div>

  <div class="card">
    <h2>مانده ریالی</h2>
    <div class="tot"><div><span>ریال</span><b>${basePr? fa(balW*basePr) : '—'}</b></div></div>
    <div class="hint no-print">${basePr
      ? `مانده وزنی × ${toFa(group(basePr))} ریال — قیمت آخرین تراکنش بازه، مورخ ${dshow(lastTx.d)}.`
      : 'در این بازه تراکنش قیمت‌گذاری‌شده‌ای نیست، بنابراین مانده ریالی محاسبه نشد.'}</div>
    <div class="acts no-print" style="margin-top:16px">
      <button class="btn" id="r_print">چاپ / خروجی PDF</button>
    </div>
  </div>`;

  const pb = $('#r_print');
  if(pb) pb.onclick = () => window.print();
}

/* ============ تبدیل تومان به ریال (یک‌بار مصرف) ============ */

async function convertToRial(){
  const msg = $('#cv_msg');
  const say = (t,c) => { msg.innerHTML = `<b style="color:${c}">${t}</b>`; };

  if(($('#cv_ok').value||'').trim() !== 'تبدیل')
    return say('برای اجرا، عبارت «تبدیل» را دقیقاً در کادر بنویسید.', 'var(--down)');

  const targets = txs.filter(t => t.a || t.pr);
  if(!targets.length) return say('تراکنشی برای تبدیل وجود ندارد.', 'var(--dim)');

  if(!confirm(
    `${toFa(targets.length)} تراکنش تبدیل می‌شود:\n`+
    `• مبلغ و قیمت شمش هر کدام در ۱۰ ضرب می‌شوند\n`+
    `• وزن و درصد سهم تغییری نمی‌کند\n\n`+
    `این کار برگشت‌ناپذیر است. ادامه می‌دهید؟`)) return;

  // ابتدا نسخهٔ پشتیبان خودکار، تا اگر چیزی خراب شد داده از دست نرود
  try{
    dl(`backup-before-rial-${todayJ()||'now'}.json`,
       JSON.stringify({v:1,partners,txs,uid,curPrice,at:new Date().toISOString()},null,2),
       'application/json');
  }catch(e){ /* اگر دانلود نشد هم ادامه می‌دهیم */ }

  say('در حال تبدیل…', 'var(--dim)');

  // تغییر محلی
  targets.forEach(t => {
    if(t.a)  t.a  = Math.round(t.a  * 10);
    if(t.pr) t.pr = Math.round(t.pr * 10);
  });
  // قیمت جاری هم باید هم‌واحد شود
  const cp = parseNum(curPrice);
  if(cp) { curPrice = toFa(group(cp*10)); const el=$('#price'); if(el) el.value=curPrice; }

  save(); fillSel(); render();

  // همگام‌سازی با سرور، دانه‌دانه تا یک خطا کل کار را متوقف نکند
  if(CLOUD){
    let done=0, fail=0;
    for(const t of targets){
      try{ await cTxUpd(t); done++; }catch(e){ fail++; }
      if(done % 10 === 0) say(`در حال ذخیره… ${toFa(done)} از ${toFa(targets.length)}`, 'var(--dim)');
    }
    try{ await cPrice(curPrice); }catch(e){}
    say(fail
      ? `${toFa(done)} تراکنش ذخیره شد، ${toFa(fail)} مورد ناموفق بود. صفحه را تازه کنید و دوباره بررسی کنید.`
      : `✓ ${toFa(done)} تراکنش با موفقیت به ریال تبدیل شد.`,
      fail ? 'var(--down)' : 'var(--up)');
  } else {
    say(`✓ ${toFa(targets.length)} تراکنش به ریال تبدیل شد.`, 'var(--up)');
  }
  $('#cv_ok').value='';
}

/* ============ گزارش سرمایه‌گذار ============ */

function buildReport(){
  const out = $('#r_out');
  const pid = $('#r_p').value;
  if(!pid){ out.innerHTML='<div class="card"><div class="empty">ابتدا یک سرمایه‌گذار انتخاب کنید.</div></div>'; return; }
  const P = partners.find(x=>x.id===pid);
  if(!P){ out.innerHTML='<div class="card"><div class="empty">سرمایه‌گذار یافت نشد.</div></div>'; return; }

  const d1 = digits($('#r_d1').value), d2 = digits($('#r_d2').value);
  if(d1 && !validDate(d1)) return alert('تاریخ «از» معتبر نیست.');
  if(d2 && !validDate(d2)) return alert('تاریخ «تا» معتبر نیست.');
  if(d1 && d2 && d1 > d2)  return alert('تاریخ «از» نباید بزرگ‌تر از «تا» باشد.');

  const mine    = txs.filter(t=>t.p===pid);
  const inRange = t => (!d1 || t.d>=d1) && (!d2 || t.d<=d2);
  const byDate  = (a,b)=>a.d.localeCompare(b.d)||String(a.id).localeCompare(String(b.id));

  // فقط تراکنش‌های قیمت‌گذاری‌شده وارد محاسبه می‌شوند
  const rows    = mine.filter(t=>inRange(t) && t.s!=='pending').sort(byDate);
  const pendCnt = mine.filter(t=>inRange(t) && t.s==='pending').length;

  const ins  = rows.filter(t=>t.k==='IN');
  const outs = rows.filter(t=>t.k==='OUT');
  const inR  = ins .reduce((s,t)=>s+t.a,0);
  const outR = outs.reduce((s,t)=>s+t.a,0);

  /* مانده وزنی: از روز اول تا پایان بازهٔ انتخاب‌شده (بدون کف تاریخی) */
  const upto    = mine.filter(t=>(!d2 || t.d<=d2) && t.s!=='pending');
  const balW    = upto.reduce((s,t)=>s+W(t),0);

  /* قیمت مبنا: قیمت آخرین تراکنشِ قیمت‌دار در بازهٔ انتخاب‌شده */
  const priced  = rows.filter(t=>t.pr).sort(byDate);
  const lastTx  = priced[priced.length-1] || null;
  const basePr  = lastTx ? lastTx.pr : 0;
  const balR    = basePr ? balW * basePr : 0;

  const line = t => `<tr>
      <td class="num">${dshow(t.d)}</td>
      <td class="num">${fa(t.a)}</td>
      <td style="color:var(--dim)">${esc(t.t)||'—'}</td></tr>`;

  const tbl = (arr, sum, cls, label) => arr.length
    ? `<div style="overflow-x:auto"><table><thead><tr>
         <th style="width:130px">تاریخ</th><th style="width:190px">مبلغ (ریال)</th><th>شرح</th>
       </tr></thead><tbody>${arr.map(line).join('')}
       <tr class="sumrow"><td><b>جمع کل</b></td>
         <td class="num"><b class="${cls}">${fa(sum)}</b></td>
         <td style="color:var(--dim)">${toFa(arr.length)} مورد</td></tr>
       </tbody></table></div>`
    : `<div class="empty">${label}</div>`;

  const period = (d1||d2)
    ? `${d1?dshow(d1):'ابتدا'} تا ${d2?dshow(d2):'انتها'}`
    : 'کل دوره';

  out.innerHTML = `
  <div class="card pr-off" style="margin-bottom:16px">
    <h2>گزارش سرمایه‌گذار — ${esc(P.name)}</h2>
    <div style="color:var(--dim);font-size:13.5px;line-height:2">
      بازهٔ گزارش: <b style="color:var(--txt)">${period}</b>
      ${pendCnt?` · <span style="color:#d6b16a">${toFa(pendCnt)} تراکنش در انتظار قیمت (خارج از محاسبه)</span>`:''}
    </div>
  </div>

  <div class="card" style="margin-bottom:16px">
    <h2>واریزها</h2>
    ${tbl(ins, inR, 'up', 'در این بازه واریزی ثبت نشده است.')}
  </div>

  <div class="card" style="margin-bottom:16px">
    <h2>برداشت‌ها</h2>
    ${tbl(outs, outR, 'down', 'در این بازه برداشتی ثبت نشده است.')}
  </div>

  <div class="card">
    <h2>مانده</h2>
    <div class="tot">
      <div><span>مانده وزنی</span><b>${kg(balW)}</b></div>
      <div><span>مانده ریالی</span><b>${basePr? fa(balR) : '—'}</b></div>
    </div>
    <div class="hint no-print">
      مانده وزنی از نخستین تراکنش تا ${d2?dshow(d2):'آخرین تراکنش'} محاسبه شده است.
      ${basePr
        ? `مانده ریالی = مانده وزنی × ${toFa(group(basePr))} ریال (قیمت آخرین تراکنش بازه، مورخ ${dshow(lastTx.d)}).`
        : 'در این بازه تراکنش قیمت‌گذاری‌شده‌ای نیست، بنابراین مانده ریالی محاسبه نشد.'}
    </div>
    <div class="acts no-print" style="margin-top:16px">
      <button class="btn" id="r_print">چاپ / خروجی PDF</button>
    </div>
  </div>`;

  const pb = $('#r_print');
  if(pb) pb.onclick = () => window.print();
}

/* ============ تبدیل تومان به ریال (یک‌بار مصرف) ============ */

async function convertToRial(){
  const msg = $('#cv_msg');
  const say = (t,c) => { msg.innerHTML = `<b style="color:${c}">${t}</b>`; };

  if(($('#cv_ok').value||'').trim() !== 'تبدیل')
    return say('برای اجرا، عبارت «تبدیل» را دقیقاً در کادر بنویسید.', 'var(--down)');

  const targets = txs.filter(t => t.a || t.pr);
  if(!targets.length) return say('تراکنشی برای تبدیل وجود ندارد.', 'var(--dim)');

  if(!confirm(
    `${toFa(targets.length)} تراکنش تبدیل می‌شود:\n`+
    `• مبلغ و قیمت شمش هر کدام در ۱۰ ضرب می‌شوند\n`+
    `• وزن و درصد سهم تغییری نمی‌کند\n\n`+
    `این کار برگشت‌ناپذیر است. ادامه می‌دهید؟`)) return;

  // ابتدا نسخهٔ پشتیبان خودکار، تا اگر چیزی خراب شد داده از دست نرود
  try{
    dl(`backup-before-rial-${todayJ()||'now'}.json`,
       JSON.stringify({v:1,partners,txs,uid,curPrice,at:new Date().toISOString()},null,2),
       'application/json');
  }catch(e){ /* اگر دانلود نشد هم ادامه می‌دهیم */ }

  say('در حال تبدیل…', 'var(--dim)');

  // تغییر محلی
  targets.forEach(t => {
    if(t.a)  t.a  = Math.round(t.a  * 10);
    if(t.pr) t.pr = Math.round(t.pr * 10);
  });
  // قیمت جاری هم باید هم‌واحد شود
  const cp = parseNum(curPrice);
  if(cp) { curPrice = toFa(group(cp*10)); const el=$('#price'); if(el) el.value=curPrice; }

  save(); fillSel(); render();

  // همگام‌سازی با سرور، دانه‌دانه تا یک خطا کل کار را متوقف نکند
  if(CLOUD){
    let done=0, fail=0;
    for(const t of targets){
      try{ await cTxUpd(t); done++; }catch(e){ fail++; }
      if(done % 10 === 0) say(`در حال ذخیره… ${toFa(done)} از ${toFa(targets.length)}`, 'var(--dim)');
    }
    try{ await cPrice(curPrice); }catch(e){}
    say(fail
      ? `${toFa(done)} تراکنش ذخیره شد، ${toFa(fail)} مورد ناموفق بود. صفحه را تازه کنید و دوباره بررسی کنید.`
      : `✓ ${toFa(done)} تراکنش با موفقیت به ریال تبدیل شد.`,
      fail ? 'var(--down)' : 'var(--up)');
  } else {
    say(`✓ ${toFa(targets.length)} تراکنش به ریال تبدیل شد.`, 'var(--up)');
  }
  $('#cv_ok').value='';
}

/* ============ گزارش سرمایه‌گذار ============ */

function buildReport(){
  const out = $('#r_out');
  const pid = $('#r_p').value;
  if(!pid){ out.innerHTML='<div class="card"><div class="empty">ابتدا یک سرمایه‌گذار انتخاب کنید.</div></div>'; return; }
  const P = partners.find(x=>x.id===pid);
  if(!P){ out.innerHTML='<div class="card"><div class="empty">سرمایه‌گذار یافت نشد.</div></div>'; return; }

  const d1 = digits($('#r_d1').value), d2 = digits($('#r_d2').value);
  if(d1 && !validDate(d1)) return alert('تاریخ «از» معتبر نیست.');
  if(d2 && !validDate(d2)) return alert('تاریخ «تا» معتبر نیست.');
  if(d1 && d2 && d1 > d2)  return alert('تاریخ «از» نباید بزرگ‌تر از «تا» باشد.');

  const mine = txs.filter(t=>t.p===pid);
  const inRange = t => (!d1 || t.d>=d1) && (!d2 || t.d<=d2);
  const before  = mine.filter(t=>d1 && t.d<d1 && t.s!=='pending');
  const rows    = mine.filter(t=>inRange(t) && t.s!=='pending')
                      .sort((a,b)=>a.d.localeCompare(b.d)||String(a.id).localeCompare(String(b.id)));
  const pendCnt = mine.filter(t=>inRange(t) && t.s==='pending').length;

  const px = price();
  const sumW = a => a.reduce((s,t)=>s+W(t),0);
  const openW = sumW(before);                       // مانده وزنی ابتدای دوره
  const inW   = rows.filter(t=>t.k==='IN').reduce((s,t)=>s+W(t),0);
  const outW  = -rows.filter(t=>t.k==='OUT').reduce((s,t)=>s+W(t),0);
  const closeW= openW + inW - outW;
  const inR   = rows.filter(t=>t.k==='IN').reduce((s,t)=>s+t.a,0);
  const outR  = rows.filter(t=>t.k==='OUT').reduce((s,t)=>s+t.a,0);

  // سهم از کل (بر اساس همهٔ تراکنش‌های تأییدشده تا پایان بازه)
  const upto = t => (!d2 || t.d<=d2) && t.s!=='pending';
  const totalW = txs.filter(upto).reduce((s,t)=>s+W(t),0);
  const myW    = mine.filter(upto).reduce((s,t)=>s+W(t),0);
  const share  = totalW>0 ? (myW/totalW*100) : 0;

  let run = openW;
  const body = rows.map(t=>{
    const w = W(t); run += w;
    return `<tr>
      <td class="num">${dshow(t.d)}</td>
      <td><span class="tag ${t.k==='IN'?'t-in':'t-out'}">${t.k==='IN'?'ورود':'خروج'}</span></td>
      <td class="num">${fa(t.a)}</td>
      <td class="num">${fa(t.pr)}</td>
      <td class="num ${t.k==='IN'?'up':'down'}">${t.k==='IN'?'+':'−'}${kg(Math.abs(w))}</td>
      <td class="num">${kg(run)}</td>
      <td style="color:var(--dim)">${esc(t.t)||'—'}</td></tr>`;
  }).join('');

  const period = (d1||d2)
    ? `${d1?dshow(d1):'ابتدا'} تا ${d2?dshow(d2):'امروز'}`
    : 'کل دوره';

  out.innerHTML = `
  <div class="card rep-head" style="margin-bottom:16px">
    <h2>گزارش سرمایه‌گذار — ${esc(P.name)}</h2>
    <div style="color:var(--dim);font-size:13.5px;line-height:2">
      بازهٔ گزارش: <b style="color:var(--txt)">${period}</b>
      · تعداد تراکنش: <b style="color:var(--txt)">${toFa(rows.length)}</b>
      ${pendCnt?` · <span style="color:#d6b16a">${toFa(pendCnt)} تراکنش در انتظار قیمت (خارج از محاسبه)</span>`:''}
    </div>
  </div>

  <div class="card sec-w" style="margin-bottom:16px">
    <h2>۳. گردش وزنی (کیلوگرم)</h2>
    <div class="tot pr-solo">
      <div class="pr-off"><span>مانده ابتدای دوره</span><b>${kg(openW)}</b></div>
      <div class="pr-off"><span>ورودی دوره</span><b class="up">+${kg(inW)}</b></div>
      <div class="pr-off"><span>خروجی دوره</span><b class="down">−${kg(outW)}</b></div>
      <div><span>مانده وزنی</span><b>${kg(closeW)}</b></div>
    </div>
  </div>

  <div class="card sec-r" style="margin-bottom:16px">
    <h2>۴. گردش ریالی</h2>
    <div class="tot pr-solo">
      <div class="pr-off"><span>جمع واریز</span><b class="up">${fa(inR)}</b></div>
      <div class="pr-off"><span>جمع برداشت</span><b class="down">${fa(outR)}</b></div>
      <div class="pr-off"><span>خالص دوره</span><b>${fa(inR-outR)}</b></div>
      <div><span>مانده ریالی</span><b>${px? fa(closeW*px) : '—'}</b></div>
    </div>
    ${px?`<div class="hint no-print">بر مبنای قیمت جاری ${toFa(group(px))} ریال به ازای هر کیلوگرم.</div>`
        :`<div class="hint no-print">برای محاسبهٔ مانده ریالی، قیمت شمش را در بالای صفحه وارد کنید.</div>`}
  </div>

  <div class="card" style="margin-bottom:16px">
    <h2>سهم از کل سرمایه</h2>
    <div class="tot">
      <div><span>وزن این سرمایه‌گذار</span><b>${kg(myW)}</b></div>
      <div><span>وزن کل شرکا</span><b>${kg(totalW)}</b></div>
      <div><span>درصد سهم</span><b class="up">${toFa(share.toFixed(2))}٪</b></div>
    </div>
  </div>

  <div class="card">
    <h2>ریز تراکنش‌ها</h2>
    ${rows.length?`<div style="overflow-x:auto"><table><thead><tr>
      <th>تاریخ</th><th>نوع</th><th>مبلغ (ریال)</th><th>قیمت شمش</th>
      <th>وزن (kg)</th><th>مانده وزنی</th><th>شرح</th>
    </tr></thead><tbody>${body}</tbody></table></div>`
    :'<div class="empty">در این بازه تراکنش تأییدشده‌ای وجود ندارد.</div>'}
    <div class="acts no-print" style="margin-top:16px">
      <button class="btn" id="r_print">چاپ / خروجی PDF</button>
    </div>
  </div>`;

  const pb = $('#r_print');
  if(pb) pb.onclick = () => window.print();
}

function renderStor(){
  const el=$('#stor'); if(!el) return;
  let sz=0; try{ sz=(localStorage.getItem(KEY)||'').length; }catch(e){}
  let at='—'; try{ const d=JSON.parse(localStorage.getItem(KEY)||'{}');
    if(d.at) at=new Intl.DateTimeFormat('fa-IR',{dateStyle:'full',timeStyle:'short'}).format(new Date(d.at)); }catch(e){}
  el.innerHTML=`
    <div class="row"><span>محل ذخیره‌سازی</span><span>حافظهٔ همین مرورگر</span></div>
    <div class="row"><span>تعداد شرکا</span><span class="num">${toFa(partners.length)}</span></div>
    <div class="row"><span>تعداد تراکنش‌ها</span><span class="num">${toFa(txs.length)}</span></div>
    <div class="row"><span>حجم داده</span><span class="num">${toFa(group(Math.ceil(sz/1024)))} کیلوبایت</span></div>
    <div class="row"><span>آخرین ذخیره</span><span>${at}</span></div>`;
}

$('#n_d').value = dshow(todayJ())==='—' ? '' : dshow(todayJ());
$('#np_c').value = COLORS[0];
boot();
