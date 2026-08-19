const app = document.getElementById('app')
const ADMIN_USERNAME = 'meritesharma'
const ADMIN_EMAIL = 'meritesharma-admin@thepagecraft.in'
const SITE_URL = 'https://www.thepagecraft.in'
const SUPABASE_URL = 'https://plzlvgdlscwhbfrpcjtp.supabase.co'
const SUPABASE_KEY = 'sb_publishable_aI6w8Ve5aFrYxfG9b9Gi4w_Ste7yc5K'
const IDLE_LIMIT_MS = 5 * 60 * 1000
const LAST_ACTIVE_KEY = 'TPC_OWNER_LAST_ACTIVE'
let idleTimer = null

const state = {
  sb: null, user: null, role: 'none', view: 'dashboard',
  posts: [], products: [], users: [], orders: [], settings: [], admins: [], audit: [], media: [],
  mediaBucket: 'site-media', loading: false
}

const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))
const cfg=()=>({url:SUPABASE_URL,key:SUPABASE_KEY})
const formatDate=v=>v?new Date(v).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—'
const slugify=s=>String(s||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
const img=u=>u||'logo.jpg'
const money=v=>`₹${Number(v||0).toFixed(0)}`
const userById=id=>state.users.find(u=>u.user_id===id)
const productById=id=>state.products.find(p=>Number(p.id)===Number(id))
const roleLabel=r=>({owner:'Owner / Super Admin',super_admin:'Super Admin',admin:'Admin',editor:'Editor'}[r]||r)

function setupScreen(msg=''){
  app.innerHTML=`<div class="authWrap"><section class="card authCard premiumCard"><div class="brand"><img class="logo" src="logo.jpg"><div><div class="eyebrow">OWNER CONNECTION</div><h1>ThePageCraft Admin</h1></div></div><p class="muted">The owner console could not connect to ThePageCraft services.</p>${msg?`<div class="notice error">${esc(msg)}</div>`:''}<button class="btn primary wide" onclick="location.reload()">Try Again</button></section></div>`
}

function loginScreen(msg=''){
  clearIdleWatch()
  app.innerHTML=`<div class="authWrap authScene"><div class="authGlow authGlowA"></div><div class="authGlow authGlowB"></div><section class="card authCard premiumCard revealCard"><div class="brand loginBrand"><img class="logo" src="logo.jpg"><div><div class="eyebrow">PRIVATE OWNER CONTROL CENTER</div><h1>ThePageCraft Admin</h1></div></div><p class="muted authLead">Owner-only access to books, posts, customers, orders, media and website controls.</p>${msg?`<div class="notice error">${esc(msg)}</div>`:''}<form id="loginForm" class="formGrid"><div class="ownerIdentity"><span class="ownerDot"></span><div><span class="small muted">Owner account</span><strong>${ADMIN_USERNAME}</strong></div><span class="crownMini">♛</span></div><label>Password<input id="password" type="password" required autocomplete="current-password" placeholder="Enter owner password"></label><button id="loginBtn" class="btn primary">Unlock Owner Control</button></form><div class="securityLine"><span>◷</span><span>Auto-locks after 5 minutes of inactivity</span></div></section></div>`
  loginForm.onsubmit=async e=>{
    e.preventDefault(); const b=loginBtn
    b.disabled=true;b.textContent='Checking…'
    let {error}=await state.sb.auth.signInWithPassword({email:ADMIN_EMAIL,password:password.value})
    if(error){
      b.textContent='Activating owner account…'
      const created=await state.sb.auth.signUp({email:ADMIN_EMAIL,password:password.value,options:{data:{username:ADMIN_USERNAME,role:'owner'}}})
      if(created.error){b.disabled=false;return loginScreen('Invalid password, or the owner account already exists with a different password.')}
      if(!created.data?.session){b.disabled=false;return loginScreen('Owner account was created, but Supabase email confirmation is ON. Turn Confirm email OFF, then sign in again.')}
    }
  }
}

async function loadData(){
  const calls = await Promise.all([
    state.sb.from('daily_posts').select('*').order('published_at',{ascending:false}),
    state.sb.from('products').select('*').order('sort_order',{ascending:true}),
    state.sb.rpc('admin_list_users'),
    state.sb.from('purchases').select('*').order('created_at',{ascending:false}).limit(500),
    state.sb.from('site_settings').select('*').order('category').order('key'),
    state.sb.from('admin_audit_log').select('*').order('created_at',{ascending:false}).limit(100)
  ])
  for(const x of calls) if(x.error) throw x.error
  state.posts=calls[0].data||[]; state.products=calls[1].data||[]; state.users=calls[2].data||[]
  state.orders=calls[3].data||[]; state.settings=calls[4].data||[]; state.audit=calls[5].data||[]
  if(['owner','super_admin'].includes(state.role)){
    const a=await state.sb.rpc('admin_list_admins'); if(!a.error) state.admins=a.data||[]
  }
}

async function logAction(action, entityType='', entityId='', details={}){
  try{await state.sb.from('admin_audit_log').insert({admin_id:state.user.id,action,entity_type:entityType||null,entity_id:String(entityId||''),details})}catch{}
}

const NAV=[
  ['dashboard','⌂','Dashboard'],['posts','✎','Daily Posts'],['products','▣','Books / Products'],
  ['orders','₹','Orders & Payments'],['customers','◉','Customers & Access'],['media','▧','Media & Book Files'],
  ['site','⚙','Website Settings'],['team','♛','Admin Team'],['activity','↻','Activity Log']
]

function navButtons(){return NAV.map(([v,i,l])=>`<button data-view="${v}" class="${state.view===v?'active':''}"><span>${i}</span>${l}</button>`).join('')}
function mobileNav(){return [['dashboard','Home'],['posts','Posts'],['products','Books'],['orders','Orders'],['more','More']].map(([v,l])=>`<button data-view="${v}" class="${state.view===v?'active':''}">${l}</button>`).join('')}
function pageLabel(){return Object.fromEntries(NAV.map(([v,,l])=>[v,l]))[state.view]||'More Controls'}

function shell(){
  app.innerHTML=`<div class="appShell"><aside class="sidebar"><div class="sideBrand"><img src="logo.jpg"><div><strong>ThePageCraft</strong><span class="small muted">${esc(roleLabel(state.role))}</span></div></div><div class="ownerBadge">♛ ${esc(roleLabel(state.role))}</div><nav class="nav">${navButtons()}</nav><div class="sideFoot"><div class="idleBadge"><span class="pulseDot"></span><span>5-minute secure auto-lock</span></div><a class="btn ghost center" href="${SITE_URL}" target="_blank" rel="noreferrer">Open live website ↗</a><button id="logout" class="btn secondary">Sign out</button></div></aside><main class="main"><header class="topbar"><div><div class="eyebrow">OWNER CONTROL CENTER</div><h1>${esc(pageLabel())}</h1></div><div class="actions" id="topActions"></div></header><div id="view"></div></main><nav class="mobileNav">${mobileNav()}</nav></div>`
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{state.view=b.dataset.view;shell();renderView()})
  logout.onclick=()=>state.sb.auth.signOut()
  renderView()
}

function renderView(){
  topActions.innerHTML=''
  if(state.view==='dashboard')renderDashboard()
  else if(state.view==='posts')renderPosts()
  else if(state.view==='products')renderProducts()
  else if(state.view==='orders')renderOrders()
  else if(state.view==='customers')renderCustomers()
  else if(state.view==='media')renderMedia()
  else if(state.view==='site')renderSiteSettings()
  else if(state.view==='team')renderTeam()
  else if(state.view==='activity')renderActivity()
  else renderMore()
}

function renderDashboard(){
  const live=state.posts.filter(x=>x.published).length, active=state.products.filter(x=>x.active).length
  const paid=state.orders.filter(x=>x.status==='paid'&&x.source!=='admin_grant'), grants=state.orders.filter(x=>x.source==='admin_grant'&&x.status==='paid').length
  const revenue=paid.reduce((s,o)=>s+Number(o.amount||0),0)
  view.innerHTML=`<div class="stats stats5"><div class="stat"><span class="muted">Customers</span><b>${state.users.length}</b><span class="small muted">Supabase accounts</span></div><div class="stat"><span class="muted">Books</span><b>${state.products.length}</b><span class="small muted">${active} visible</span></div><div class="stat"><span class="muted">Daily Posts</span><b>${state.posts.length}</b><span class="small muted">${live} published</span></div><div class="stat"><span class="muted">Paid orders</span><b>${paid.length}</b><span class="small muted">${money(revenue)} recorded</span></div><div class="stat"><span class="muted">Manual access</span><b>${grants}</b><span class="small muted">Owner/admin grants</span></div></div><div class="dashboardGrid"><section class="panel"><div class="eyebrow">OWNER POWERS</div><h2>Full website control from one app</h2><p class="muted">Edit live content, manage customer book access, view orders, upload book files and manage your admin team.</p><div class="quickGrid"><button class="quick" data-jump="posts">+ Publish Daily Post</button><button class="quick" data-jump="products">Edit book / price</button><button class="quick" data-jump="customers">Grant book access</button><button class="quick" data-jump="orders">Check payments</button><button class="quick" data-jump="media">Upload files</button><button class="quick" data-jump="site">Website settings</button></div></section><section class="panel"><div class="eyebrow">OWNER ACCOUNT</div><h2>${esc(state.user.email)}</h2><div class="ownerHero">♛ ${esc(roleLabel(state.role))}</div><p class="muted small">The primary private admin identity is treated as Owner / Super Admin by the database security rules.</p><button id="ownerAccessBtn" class="btn primary">Give my website account all books</button><p class="small muted">Choose the email you use on the public website, then grant all books in one click.</p></section></div>`
  document.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>{state.view=b.dataset.jump;shell()})
  ownerAccessBtn.onclick=()=>ownerAccessModal()
}

function renderPosts(){
  topActions.innerHTML='<button id="newPost" class="btn primary">+ New Post</button>'; newPost.onclick=()=>postModal()
  view.innerHTML=state.posts.length?`<div class="grid">${state.posts.map(p=>`<article class="item"><img src="${esc(img(p.cover_image))}" onerror="this.src='logo.jpg'"><div class="itemBody"><div class="itemMeta">${esc(p.category)} · ${formatDate(p.published_at)}</div><h3>${esc(p.title)}</h3><span class="pill ${p.published?'live':'draft'}">${p.published?'Published':'Draft'}</span><p class="muted small">${esc(p.excerpt||'No excerpt')}</p><div class="itemActions"><button class="btn secondary" data-edit-post="${p.id}">Edit</button><button class="btn danger" data-del-post="${p.id}">Delete</button></div></div></article>`).join('')}</div>`:'<div class="empty">No Daily Posts yet.</div>'
  document.querySelectorAll('[data-edit-post]').forEach(b=>b.onclick=()=>postModal(state.posts.find(x=>String(x.id)===b.dataset.editPost)))
  document.querySelectorAll('[data-del-post]').forEach(b=>b.onclick=()=>deleteRow('daily_posts',b.dataset.delPost,'post'))
}

function postModal(p=null){
  const content=Array.isArray(p?.content)?p.content.join('\n\n'):''
  modal(`<div class="modalHead"><h2>${p?'Edit Post':'New Daily Post'}</h2><button id="closeModal" class="btn ghost">Close</button></div><form id="postForm" class="formGrid"><div class="two"><label>Title<input id="ptitle" required value="${esc(p?.title||'')}"></label><label>Category<input id="pcategory" value="${esc(p?.category||"Author's Journal")}"></label></div><div class="two"><label>Slug<input id="pslug" value="${esc(p?.slug||'')}"></label><label>Read time<input id="pread" value="${esc(p?.read_time||'3 min read')}"></label></div><label>Short description<textarea id="pexcerpt">${esc(p?.excerpt||'')}</textarea></label><label>Full article <span class="small muted">Separate paragraphs with a blank line</span><textarea id="pcontent" style="min-height:230px">${esc(content)}</textarea></label><div class="two"><label>Cover image URL<input id="pcover" value="${esc(p?.cover_image||'')}"></label><label>Or upload image<input id="pfile" type="file" accept="image/*"></label></div><div class="two"><label>Publication date<input id="pdate" type="datetime-local" value="${p?.published_at?new Date(new Date(p.published_at).getTime()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16):new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16)}"></label><label>Author<input id="pauthor" value="${esc(p?.author||'Ritesh Sharma')}"></label></div><label class="check"><input id="ppublished" type="checkbox" ${p?.published?'checked':''}> Publish this post</label><button id="savePost" class="btn primary">${p?'Save Changes':'Create Post'}</button></form>`)
  closeModal.onclick=closeModalFn
  postForm.onsubmit=async e=>{e.preventDefault();savePost.disabled=true;savePost.textContent='Saving…';try{let cover=pcover.value.trim();if(pfile.files[0])cover=await uploadMedia(pfile.files[0],'site-media');const title=ptitle.value.trim();const row={title,slug:pslug.value.trim()||slugify(title),category:pcategory.value.trim()||"Author's Journal",read_time:pread.value.trim()||'3 min read',excerpt:pexcerpt.value.trim(),content:pcontent.value.split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean),cover_image:cover,author:pauthor.value.trim()||'Ritesh Sharma',published_at:new Date(pdate.value).toISOString(),published:ppublished.checked};const q=p?state.sb.from('daily_posts').update(row).eq('id',p.id):state.sb.from('daily_posts').insert(row);const {data,error}=await q.select();if(error)throw error;await logAction(p?'post_updated':'post_created','daily_post',p?.id||data?.[0]?.id,{title});await refreshAndShow('posts')}catch(err){alert(err.message);savePost.disabled=false;savePost.textContent='Save'}}
}

function renderProducts(){
  topActions.innerHTML='<button id="newProduct" class="btn primary">+ New Book</button>';newProduct.onclick=()=>productModal()
  view.innerHTML=state.products.length?`<div class="grid">${state.products.map(p=>`<article class="item"><img src="${esc(img(p.image))}" onerror="this.src='logo.jpg'"><div class="itemBody"><div class="itemMeta">${esc(p.category)} · Product #${p.id}</div><h3>${esc(p.title)}</h3><div class="priceLine"><b>${money(p.price)}</b>${p.mrp?` <span class="muted"><s>${money(p.mrp)}</s></span>`:''}</div><span class="pill ${p.active?'live':'draft'}">${p.active?'Visible':'Hidden'}</span><span class="pill">${esc(p.status)}</span><div class="itemActions"><button class="btn secondary" data-edit-product="${p.id}">Edit</button><button class="btn danger" data-del-product="${p.id}">Delete</button></div></div></article>`).join('')}</div>`:'<div class="empty">No books/products yet.</div>'
  document.querySelectorAll('[data-edit-product]').forEach(b=>b.onclick=()=>productModal(state.products.find(x=>String(x.id)===b.dataset.editProduct)))
  document.querySelectorAll('[data-del-product]').forEach(b=>b.onclick=()=>deleteRow('products',b.dataset.delProduct,'product'))
}

function productModal(p=null){
  modal(`<div class="modalHead"><h2>${p?'Edit Book / Product':'New Book / Product'}</h2><button id="closeModal" class="btn ghost">Close</button></div><form id="productForm" class="formGrid"><div class="two"><label>Title<input id="btitle" required value="${esc(p?.title||'')}"></label><label>Subtitle<input id="bsubtitle" value="${esc(p?.subtitle||'')}"></label></div><div class="two"><label>Price ₹<input id="bprice" type="number" min="0" step="0.01" required value="${esc(p?.price??0)}"></label><label>MRP ₹<input id="bmrp" type="number" min="0" step="0.01" value="${esc(p?.mrp??'')}"></label></div><div class="two"><label>Category<input id="bcategory" value="${esc(p?.category||'General')}"></label><label>Status<select id="bstatus"><option value="available">Available</option><option value="coming_soon">Coming Soon</option><option value="unavailable">Unavailable</option></select></label></div><label>Short description<textarea id="bdesc">${esc(p?.description||'')}</textarea></label><label>Full description<textarea id="bfull" style="min-height:170px">${esc(p?.full_description||'')}</textarea></label><div class="two"><label>Cover image URL<input id="bimage" value="${esc(p?.image||'')}"></label><label>Or upload cover<input id="bfile" type="file" accept="image/*"></label></div><div class="two"><label>Author<input id="bauthor" value="${esc(p?.author||'Ritesh Sharma')}"></label><label>Badge<input id="bbadge" value="${esc(p?.badge||'')}"></label></div><label>Amazon link<input id="bamazon" value="${esc(p?.amazon_link||'')}"></label><div class="two"><label>Sort order<input id="bsort" type="number" value="${esc(p?.sort_order??0)}"></label><label>Visibility<select id="bactive"><option value="true">Show on website</option><option value="false">Hide from website</option></select></label></div><button id="saveProduct" class="btn primary">${p?'Save Changes':'Create Product'}</button></form>`)
  bstatus.value=p?.status||'available';bactive.value=String(p?.active??true);closeModal.onclick=closeModalFn
  productForm.onsubmit=async e=>{e.preventDefault();saveProduct.disabled=true;saveProduct.textContent='Saving…';try{let image=bimage.value.trim();if(bfile.files[0])image=await uploadMedia(bfile.files[0],'site-media');const row={title:btitle.value.trim(),subtitle:bsubtitle.value.trim(),price:Number(bprice.value),mrp:bmrp.value?Number(bmrp.value):null,category:bcategory.value.trim()||'General',status:bstatus.value,description:bdesc.value.trim(),full_description:bfull.value.trim(),image,author:bauthor.value.trim()||'Ritesh Sharma',badge:bbadge.value.trim()||null,amazon_link:bamazon.value.trim()||null,sort_order:Number(bsort.value||0),active:bactive.value==='true'};const q=p?state.sb.from('products').update(row).eq('id',p.id):state.sb.from('products').insert(row);const {data,error}=await q.select();if(error)throw error;await logAction(p?'product_updated':'product_created','product',p?.id||data?.[0]?.id,{title:row.title,price:row.price});await refreshAndShow('products')}catch(err){alert(err.message);saveProduct.disabled=false;saveProduct.textContent='Save'}}
}

function renderOrders(){
  topActions.innerHTML='<button id="refreshOrders" class="btn secondary">Refresh</button>'; refreshOrders.onclick=async()=>{await reload();state.view='orders';shell()}
  const rows=state.orders
  view.innerHTML=`<div class="panel"><div class="toolbar"><div><h2>Orders & Payments</h2><p class="muted small">Paid purchases, refunds and manual book-access grants.</p></div></div>${rows.length?`<div class="tableWrap"><table><thead><tr><th>Customer</th><th>Book</th><th>Amount</th><th>Source</th><th>Status</th><th>Date</th></tr></thead><tbody>${rows.map(o=>{const u=userById(o.user_id),p=productById(o.product_id);return `<tr><td><b>${esc(u?.display_name||u?.email||'Unknown')}</b><div class="small muted">${esc(u?.email||o.user_id)}</div></td><td>${esc(p?.title||`Product #${o.product_id}`)}</td><td>${o.source==='admin_grant'?'Access grant':money(o.amount)}</td><td><span class="pill ${o.source==='admin_grant'?'draft':'live'}">${esc(o.source||'payment')}</span></td><td><select data-order-status="${o.id}" class="miniSelect"><option value="paid" ${o.status==='paid'?'selected':''}>paid</option><option value="refunded" ${o.status==='refunded'?'selected':''}>refunded</option><option value="pending" ${o.status==='pending'?'selected':''}>pending</option></select></td><td>${formatDate(o.created_at)}</td></tr>`}).join('')}</tbody></table></div>`:'<div class="empty">No purchase records yet.</div>'}</div>`
  document.querySelectorAll('[data-order-status]').forEach(s=>s.onchange=()=>updateOrderStatus(s.dataset.orderStatus,s.value))
}

async function updateOrderStatus(id,status){
  const {error}=await state.sb.from('purchases').update({status,updated_at:new Date().toISOString()}).eq('id',id);if(error)return alert(error.message)
  await logAction('order_status_changed','purchase',id,{status});await reload();state.view='orders';shell()
}

function renderCustomers(){
  topActions.innerHTML='<input id="customerSearch" class="search" placeholder="Search name or email">'
  const draw=()=>{const q=(customerSearch?.value||'').toLowerCase().trim();const users=state.users.filter(u=>!q||String(u.email).toLowerCase().includes(q)||String(u.display_name).toLowerCase().includes(q));view.innerHTML=users.length?`<div class="customerGrid">${users.map(u=>{const owned=new Set(state.orders.filter(o=>o.user_id===u.user_id&&o.status==='paid').map(o=>Number(o.product_id))).size;return `<article class="customerCard"><div class="avatar">${esc((u.display_name||u.email||'?').slice(0,1).toUpperCase())}</div><div class="grow"><h3>${esc(u.display_name||'Reader')}</h3><p class="small muted">${esc(u.email||'No email')}</p><div class="tags"><span class="pill">${esc(u.provider||'email')}</span><span class="pill live">${owned} book${owned===1?'':'s'}</span></div><p class="small muted">Joined ${formatDate(u.created_at)}</p></div><div class="customerActions"><button class="btn primary" data-access-user="${u.user_id}">Manage Book Access</button>${['owner','super_admin'].includes(state.role)?`<button class="btn secondary" data-team-user="${u.user_id}">Admin Role</button>`:''}</div></article>`}).join('')}</div>`:'<div class="empty">No customers found.</div>';document.querySelectorAll('[data-access-user]').forEach(b=>b.onclick=()=>accessModal(state.users.find(u=>u.user_id===b.dataset.accessUser)));document.querySelectorAll('[data-team-user]').forEach(b=>b.onclick=()=>roleModal(state.users.find(u=>u.user_id===b.dataset.teamUser)))}
  draw(); customerSearch.oninput=draw
}

function ownerAccessModal(){
  modal(`<div class="modalHead"><h2>Give your website account all books</h2><button id="closeModal" class="btn ghost">Close</button></div><p class="muted">Choose the account/email you personally use on the public ThePageCraft website. This is separate from the private admin identity.</p><label>Website account<select id="ownerUserSelect">${state.users.map(u=>`<option value="${u.user_id}">${esc(u.display_name||u.email)} — ${esc(u.email)}</option>`).join('')}</select></label><button id="grantOwnerAll" class="btn primary wide">Grant ALL books to this account</button>`)
  closeModal.onclick=closeModalFn;grantOwnerAll.onclick=async()=>{if(!ownerUserSelect.value)return;grantOwnerAll.disabled=true;const {data,error}=await state.sb.rpc('admin_grant_all_books',{target_user:ownerUserSelect.value,access_note:'All books granted to owner website account'});if(error){grantOwnerAll.disabled=false;return alert(error.message)}await logAction('all_books_granted','user',ownerUserSelect.value,{added:data});alert(`Done. ${data} new book access record(s) added.`);await refreshAndShow('customers')}
}

function accessModal(u){
  const owned=state.orders.filter(o=>o.user_id===u.user_id&&o.status==='paid')
  modal(`<div class="modalHead"><div><div class="eyebrow">BOOK ACCESS</div><h2>${esc(u.display_name||u.email)}</h2><p class="small muted">${esc(u.email)}</p></div><button id="closeModal" class="btn ghost">Close</button></div><button id="grantAll" class="btn primary">Grant ALL Books</button><div class="accessList">${state.products.map(p=>{const o=owned.find(x=>Number(x.product_id)===Number(p.id));return `<div class="accessRow"><div><b>${esc(p.title)}</b><div class="small muted">Product #${p.id} · ${money(p.price)}</div></div><div class="actions">${o?`<span class="pill live">✓ Access · ${esc(o.source||'payment')}</span>${o.source==='admin_grant'?`<button class="btn danger" data-revoke="${p.id}">Revoke grant</button>`:''}`:`<button class="btn secondary" data-grant="${p.id}">Grant Access</button>`}</div></div>`}).join('')}</div>`)
  closeModal.onclick=closeModalFn
  grantAll.onclick=async()=>{grantAll.disabled=true;const {data,error}=await state.sb.rpc('admin_grant_all_books',{target_user:u.user_id,access_note:'All books granted from owner control'});if(error){grantAll.disabled=false;return alert(error.message)}await logAction('all_books_granted','user',u.user_id,{added:data});await reload();accessModal(userById(u.user_id))}
  document.querySelectorAll('[data-grant]').forEach(b=>b.onclick=async()=>{b.disabled=true;const {error}=await state.sb.rpc('admin_grant_book_access',{target_user:u.user_id,target_product:Number(b.dataset.grant),access_note:'Book access granted from owner control'});if(error)return alert(error.message);await logAction('book_access_granted','user',u.user_id,{product_id:Number(b.dataset.grant)});await reload();accessModal(userById(u.user_id))})
  document.querySelectorAll('[data-revoke]').forEach(b=>b.onclick=async()=>{if(!confirm('Revoke this manual book grant? Paid purchases are never removed by this action.'))return;const {error}=await state.sb.rpc('admin_revoke_manual_book_access',{target_user:u.user_id,target_product:Number(b.dataset.revoke)});if(error)return alert(error.message);await logAction('book_access_revoked','user',u.user_id,{product_id:Number(b.dataset.revoke)});await reload();accessModal(userById(u.user_id))})
}

async function loadMedia(bucket=state.mediaBucket){
  state.mediaBucket=bucket
  const path=bucket==='site-media'?'admin':''
  const {data,error}=await state.sb.storage.from(bucket).list(path,{limit:100,sortBy:{column:'created_at',order:'desc'}})
  if(error){state.media=[];return error}
  state.media=(data||[]).filter(x=>x.name!=='.emptyFolderPlaceholder').map(x=>({...x,path:path?`${path}/${x.name}`:x.name}))
  return null
}

async function renderMedia(){
  topActions.innerHTML='<button id="uploadFile" class="btn primary">+ Upload File</button>'
  view.innerHTML=`<div class="tabs"><button class="tab ${state.mediaBucket==='site-media'?'active':''}" data-bucket="site-media">Site Media</button><button class="tab ${state.mediaBucket==='books'?'active':''}" data-bucket="books">Private Book Files</button></div><div id="mediaBody"><div class="empty">Loading files…</div></div>`
  const err=await loadMedia(state.mediaBucket)
  if(err){mediaBody.innerHTML=`<div class="notice error">${esc(err.message)}</div>`;return}
  const bucket=state.mediaBucket
  mediaBody.innerHTML=state.media.length?`<div class="mediaGrid">${state.media.map(f=>{const url=bucket==='site-media'?state.sb.storage.from(bucket).getPublicUrl(f.path).data.publicUrl:'';return `<article class="mediaCard"><div class="mediaIcon">${/\.(png|jpe?g|webp|gif)$/i.test(f.name)?'🖼️':/\.pdf$/i.test(f.name)?'📕':'📄'}</div><div class="grow"><b>${esc(f.name)}</b><div class="small muted">${bucket} · ${f.metadata?.size?Math.round(f.metadata.size/1024)+' KB':'file'}</div>${url?`<input readonly value="${esc(url)}" onclick="this.select()">`:''}</div><button class="btn danger" data-del-media="${esc(f.path)}">Delete</button></article>`}).join('')}</div>`:'<div class="empty">No files in this bucket yet.</div>'
  uploadFile.onclick=()=>mediaUploadModal(bucket)
  document.querySelectorAll('[data-bucket]').forEach(b=>b.onclick=()=>{state.mediaBucket=b.dataset.bucket;renderMedia()})
  document.querySelectorAll('[data-del-media]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this file?'))return;const {error}=await state.sb.storage.from(bucket).remove([b.dataset.delMedia]);if(error)return alert(error.message);await logAction('media_deleted','storage',b.dataset.delMedia,{bucket});renderMedia()})
}

function mediaUploadModal(bucket){
  modal(`<div class="modalHead"><h2>Upload to ${esc(bucket)}</h2><button id="closeModal" class="btn ghost">Close</button></div><form id="mediaForm" class="formGrid"><label>Choose file<input id="mediaFile" type="file" required ${bucket==='site-media'?'accept="image/*"':'accept="application/pdf,image/*"'}></label><label>File name / path (optional)<input id="mediaName" placeholder="Leave blank to use original filename"></label><div class="notice">${bucket==='books'?'This bucket is private. Use the exact PDF filename expected by your reader, for example echoes-of-freedom.pdf.':'Images uploaded here can be used as public cover/post URLs.'}</div><button id="mediaSave" class="btn primary">Upload</button></form>`)
  closeModal.onclick=closeModalFn
  mediaForm.onsubmit=async e=>{e.preventDefault();mediaSave.disabled=true;try{const f=mediaFile.files[0];let name=(mediaName.value.trim()||f.name).replace(/[^a-zA-Z0-9._\/-]/g,'-');let path=bucket==='site-media'?`admin/${Date.now()}-${name}`:name;const {error}=await state.sb.storage.from(bucket).upload(path,f,{upsert:true});if(error)throw error;await logAction('media_uploaded','storage',path,{bucket});closeModalFn();renderMedia()}catch(err){alert(err.message);mediaSave.disabled=false}}
}

function renderSiteSettings(){
  topActions.innerHTML='<button id="newSetting" class="btn primary">+ Add Setting</button>';newSetting.onclick=()=>settingModal()
  view.innerHTML=`<div class="notice">These values are stored centrally in Supabase. Settings only affect public pages that are wired to read the matching key. Books and Daily Posts are already wired separately.</div>${state.settings.length?`<div class="settingsGrid">${state.settings.map(s=>`<article class="settingCard"><div><span class="pill">${esc(s.category)}</span><h3>${esc(s.key)}</h3><p>${esc(s.value)}</p><p class="small muted">${esc(s.description||'')}</p></div><div class="itemActions"><button class="btn secondary" data-edit-setting="${esc(s.key)}">Edit</button>${['owner','super_admin'].includes(state.role)?`<button class="btn danger" data-del-setting="${esc(s.key)}">Delete</button>`:''}</div></article>`).join('')}</div>`:'<div class="empty">No settings yet.</div>'}`
  document.querySelectorAll('[data-edit-setting]').forEach(b=>b.onclick=()=>settingModal(state.settings.find(s=>s.key===b.dataset.editSetting)))
  document.querySelectorAll('[data-del-setting]').forEach(b=>b.onclick=()=>deleteSetting(b.dataset.delSetting))
}

function settingModal(s=null){
  modal(`<div class="modalHead"><h2>${s?'Edit Setting':'New Setting'}</h2><button id="closeModal" class="btn ghost">Close</button></div><form id="settingForm" class="formGrid"><label>Key<input id="skey" required ${s?'readonly':''} value="${esc(s?.key||'')}"></label><label>Value<textarea id="svalue">${esc(s?.value||'')}</textarea></label><div class="two"><label>Category<input id="scategory" value="${esc(s?.category||'general')}"></label><label>Visibility<select id="spublic"><option value="true">Public-readable</option><option value="false">Admin only</option></select></label></div><label>Description<textarea id="sdesc">${esc(s?.description||'')}</textarea></label><button id="saveSetting" class="btn primary">Save Setting</button></form>`)
  spublic.value=String(s?.public??true);closeModal.onclick=closeModalFn
  settingForm.onsubmit=async e=>{e.preventDefault();saveSetting.disabled=true;const row={key:skey.value.trim(),value:svalue.value,category:scategory.value.trim()||'general',description:sdesc.value.trim(),public:spublic.value==='true',updated_at:new Date().toISOString(),updated_by:state.user.id};const q=s?state.sb.from('site_settings').update(row).eq('key',s.key):state.sb.from('site_settings').insert(row);const {error}=await q;if(error){saveSetting.disabled=false;return alert(error.message)}await logAction(s?'setting_updated':'setting_created','site_setting',row.key,{value:row.value});await refreshAndShow('site')}
}
async function deleteSetting(key){if(!confirm(`Delete setting ${key}?`))return;const {error}=await state.sb.from('site_settings').delete().eq('key',key);if(error)return alert(error.message);await logAction('setting_deleted','site_setting',key,{});await refreshAndShow('site')}

function renderTeam(){
  if(!['owner','super_admin'].includes(state.role)){view.innerHTML='<div class="notice error">Only the Owner / Super Admin can manage admin roles.</div>';return}
  topActions.innerHTML='<button id="addTeam" class="btn primary">+ Add Admin</button>';addTeam.onclick=()=>teamPickerModal()
  view.innerHTML=state.admins.length?`<div class="customerGrid">${state.admins.map(a=>`<article class="customerCard"><div class="avatar crown">♛</div><div class="grow"><h3>${esc(a.display_name||a.email)}</h3><p class="small muted">${esc(a.email)}</p><span class="pill live">${esc(roleLabel(a.role))}</span></div><div class="customerActions">${a.role==='owner'?'<span class="small muted">Primary owner</span>':`<button class="btn secondary" data-edit-admin="${a.user_id}">Change Role</button><button class="btn danger" data-remove-admin="${a.user_id}">Remove</button>`}</div></article>`).join('')}</div>`:'<div class="empty">No admin team records.</div>'
  document.querySelectorAll('[data-edit-admin]').forEach(b=>b.onclick=()=>roleModal(state.users.find(u=>u.user_id===b.dataset.editAdmin)))
  document.querySelectorAll('[data-remove-admin]').forEach(b=>b.onclick=()=>removeAdmin(b.dataset.removeAdmin))
}
function teamPickerModal(){modal(`<div class="modalHead"><h2>Add Admin Team Member</h2><button id="closeModal" class="btn ghost">Close</button></div><label>Choose existing website user<select id="teamUser">${state.users.map(u=>`<option value="${u.user_id}">${esc(u.display_name||u.email)} — ${esc(u.email)}</option>`).join('')}</select></label><button id="chooseTeam" class="btn primary wide">Choose role</button>`);closeModal.onclick=closeModalFn;chooseTeam.onclick=()=>{const u=userById(teamUser.value);closeModalFn();roleModal(u)}}
function roleModal(u){if(!u)return;const current=state.admins.find(a=>a.user_id===u.user_id)?.role||'admin';modal(`<div class="modalHead"><h2>Admin Role</h2><button id="closeModal" class="btn ghost">Close</button></div><p><b>${esc(u.display_name||u.email)}</b><br><span class="small muted">${esc(u.email)}</span></p><label>Role<select id="roleSelect"><option value="editor">Editor — posts/products</option><option value="admin">Admin — operational control</option><option value="super_admin">Super Admin — owner-level admin management</option></select></label><button id="saveRole" class="btn primary wide">Save Role</button>`);roleSelect.value=current==='owner'?'super_admin':current;closeModal.onclick=closeModalFn;saveRole.onclick=async()=>{saveRole.disabled=true;const {error}=await state.sb.rpc('admin_set_role',{target_user:u.user_id,new_role:roleSelect.value,display:u.display_name||null});if(error){saveRole.disabled=false;return alert(error.message)}await logAction('admin_role_set','user',u.user_id,{role:roleSelect.value});await reload();state.view='team';closeModalFn();shell()}}
async function removeAdmin(id){if(!confirm('Remove this user from the admin team? Their normal customer account will remain.'))return;const {error}=await state.sb.rpc('admin_remove_role',{target_user:id});if(error)return alert(error.message);await logAction('admin_role_removed','user',id,{});await reload();state.view='team';shell()}

function renderActivity(){
  view.innerHTML=state.audit.length?`<div class="timeline">${state.audit.map(a=>{const u=userById(a.admin_id);return `<div class="timelineItem"><div class="dot"></div><div><b>${esc(a.action.replaceAll('_',' '))}</b><div class="small muted">${esc(a.entity_type||'system')} ${a.entity_id?`· ${esc(a.entity_id)}`:''} · ${formatDate(a.created_at)}</div><div class="small muted">${esc(u?.email||'Admin')}</div></div></div>`}).join('')}</div>`:'<div class="empty">No admin activity logged yet.</div>'
}

function renderMore(){
  view.innerHTML=`<div class="moreGrid">${[['customers','Customers & Access','Grant/revoke books and give yourself all books'],['media','Media & Book Files','Upload covers, images and private PDFs'],['site','Website Settings','Manage central site settings'],['team','Admin Team','Owner roles and permissions'],['activity','Activity Log','See recent admin actions']].map(([v,t,d])=>`<button class="moreCard" data-more="${v}"><b>${t}</b><span>${d}</span></button>`).join('')}</div>`
  document.querySelectorAll('[data-more]').forEach(b=>b.onclick=()=>{state.view=b.dataset.more;shell()})
}

async function uploadMedia(file,bucket='site-media'){
  const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'-'), path=`admin/${Date.now()}-${safe}`
  const {error}=await state.sb.storage.from(bucket).upload(path,file,{upsert:false});if(error)throw error
  const {data}=state.sb.storage.from(bucket).getPublicUrl(path);return data.publicUrl
}

async function deleteRow(table,id,label){
  if(!confirm(`Delete this ${label}?`))return
  const {error}=await state.sb.from(table).delete().eq('id',id);if(error)return alert(error.message)
  await logAction(`${label}_deleted`,label,id,{});await refreshAndShow(state.view)
}

async function reload(){await loadData()}
async function refreshAndShow(viewName){closeModalFn();await reload();state.view=viewName;shell()}
function modal(html){closeModalFn();const d=document.createElement('div');d.id='modalBack';d.className='modalBack';d.innerHTML=`<section class="modal">${html}</section>`;document.body.appendChild(d)}
function closeModalFn(){document.getElementById('modalBack')?.remove()}


function clearIdleWatch(){
  if(idleTimer){clearTimeout(idleTimer);idleTimer=null}
  for(const e of ['pointerdown','keydown','touchstart','scroll']) window.removeEventListener(e,markActive,true)
}
function markActive(){
  if(!state.user)return
  localStorage.setItem(LAST_ACTIVE_KEY,String(Date.now()))
  if(idleTimer)clearTimeout(idleTimer)
  idleTimer=setTimeout(()=>secureIdleLogout(),IDLE_LIMIT_MS)
}
async function secureIdleLogout(){
  clearIdleWatch()
  localStorage.removeItem(LAST_ACTIVE_KEY)
  try{await state.sb?.auth.signOut()}catch{}
  state.user=null
  loginScreen('For your security, Owner Control was locked after 5 minutes of inactivity.')
}
function startIdleWatch(){
  clearIdleWatch()
  const last=Number(localStorage.getItem(LAST_ACTIVE_KEY)||0)
  if(last && Date.now()-last>=IDLE_LIMIT_MS){secureIdleLogout();return false}
  localStorage.setItem(LAST_ACTIVE_KEY,String(Date.now()))
  for(const e of ['pointerdown','keydown','touchstart','scroll']) window.addEventListener(e,markActive,true)
  idleTimer=setTimeout(()=>secureIdleLogout(),IDLE_LIMIT_MS)
  return true
}
async function authorize(){
  try{
    const role=await state.sb.rpc('admin_role')
    if(role.error)return loginScreen('Owner database upgrade is incomplete. Run RUN_THIS_OWNER_UPGRADE.sql in Supabase SQL Editor first.')
    state.role=role.data||'none'
    if(!['owner','super_admin','admin','editor'].includes(state.role)){await state.sb.auth.signOut();return loginScreen('This account is not authorized for ThePageCraft Admin.')}
    await loadData();if(startIdleWatch())shell()
  }catch(e){loginScreen(e.message)}
}

async function boot(){
  const c=cfg()
  if(!window.supabase)return setupScreen('Supabase library could not load. Check your internet connection and reopen the app.')
  try{
    state.sb=window.supabase.createClient(c.url,c.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}})
    const {data:{session},error}=await state.sb.auth.getSession();if(error)throw error
    const last=Number(localStorage.getItem(LAST_ACTIVE_KEY)||0)
    if(session && last && Date.now()-last>=IDLE_LIMIT_MS){await state.sb.auth.signOut();localStorage.removeItem(LAST_ACTIVE_KEY)}
    const fresh=await state.sb.auth.getSession()
    state.user=fresh.data.session?.user||null
    state.sb.auth.onAuthStateChange(async(_e,s)=>{
      state.user=s?.user||null
      if(!state.user){clearIdleWatch();return loginScreen()}
      await authorize()
    })
    if(!state.user)return loginScreen();await authorize()
  }catch(e){setupScreen(e.message)}
}

if('serviceWorker' in navigator && location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{})
boot()
