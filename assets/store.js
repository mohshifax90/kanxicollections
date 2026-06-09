/* ════════════════════════════════════════
   KANXI COLLECTION — DATA STORE
   Supabase in production, localStorage on localhost.
═══════════════════════════════════════════ */
const Store = (() => {
  const KEY = 'kanxi_db';
  const VERSION = 3;
  const CLOUD_EVENT = 'kanxi:store-changed';
  const CLOUD_STATUS_EVENT = 'kanxi:store-sync';
  const USE_LOCAL = location.protocol === 'file:' || ['localhost','127.0.0.1','::1'].includes(location.hostname);
  const uid = (p='') => p + Math.random().toString(36).slice(2,8);
  const im = (photo, w=600) => `https://images.unsplash.com/${photo}?w=${w}&q=80`;
  let saveTimer = null;
  let lastCloudHash = '';
  let cloudDb = null;
  let cloudLoaded = false;

  const ORDER_FLOW = ['Pending Payment','Pending Slip Verification','Paid','Order Accepted','Packing','Ready to Dispatch','Out for Delivery','Delivered','Returned'];
  const PAYMENT_METHODS = [
    { key:'card', label:'Card', enabled:true },
    { key:'paypal', label:'PayPal', enabled:true },
    { key:'transfer', label:'Bank Transfer', enabled:true },
    { key:'cod', label:'Cash on Delivery', enabled:true },
  ];
  const VARIANT_TYPES = [
    { key:'none',   label:'No variants' },
    { key:'size',   label:'Size',   hint:'e.g. S, M, L, XL' },
    { key:'volume', label:'Volume', hint:'e.g. 30ml, 50ml, 200ml' },
    { key:'shade',  label:'Shade',  hint:'colour-pick each shade' },
  ];

  function seed() {
    const cats = [
      { id:'c_cloth', name:'Clothing', slug:'clothing', icon:'shirt', active:true, variantType:'size', brands:[], title:'Clothing & Apparel', description:'Curated fashion crafted from premium fabrics — tailored blazers, silk dresses and effortless co-ords designed to elevate your everyday wardrobe with timeless elegance.' },
      { id:'c_skin',  name:'Skincare', slug:'skincare', icon:'sparkles', active:true, variantType:'volume', brands:[], title:'Skincare & Beauty', description:'Science-backed, clean formulas that nourish and glow. From brightening serums to deep hydration, discover skincare made to love your skin every single day.' },
      { id:'c_make',  name:'Makeup',   slug:'makeup',   icon:'palette', active:true, variantType:'shade', brands:[], title:'Makeup & Colour', description:'Bold shades and silky textures for every look. Long-wear lipsticks, luminous foundations and blushes in colours made to flatter.' },
      { id:'c_bags',  name:'Bags',     slug:'bags',     icon:'shopping-bag', active:true, variantType:'none', brands:[], title:'Bags & Accessories', description:'Handcrafted leather and canvas bags built to last. Structured totes, sleek crossbodies and weekend carryalls — timeless pieces for the modern individual.' },
      { id:'c_watch', name:'Watches',  slug:'watches',  icon:'watch', active:true, variantType:'none', brands:[], title:'Watches & Timepieces', description:'Precision engineering meets refined design. From minimalist classics to bold complications, mark every moment with a Kanxi timepiece built to endure.' },
    ];
    const subs = [
      { id:'s1', name:'Blazers & Jackets', categoryId:'c_cloth' },
      { id:'s2', name:'Dresses', categoryId:'c_cloth' },
      { id:'s3', name:'Trousers', categoryId:'c_cloth' },
      { id:'s4', name:'Serums', categoryId:'c_skin' },
      { id:'s5', name:'Moisturisers', categoryId:'c_skin' },
      { id:'s6', name:'Sun Care', categoryId:'c_skin' },
      { id:'s11', name:'Lips', categoryId:'c_make' },
      { id:'s12', name:'Face', categoryId:'c_make' },
      { id:'s7', name:'Tote Bags', categoryId:'c_bags' },
      { id:'s8', name:'Crossbody', categoryId:'c_bags' },
      { id:'s9', name:'Minimalist', categoryId:'c_watch' },
      { id:'s10', name:'Sport', categoryId:'c_watch' },
    ];
    const tags = [
      { id:'t1', name:'New' }, { id:'t2', name:'Sale' }, { id:'t3', name:'Bestseller' },
      { id:'t4', name:'Limited' }, { id:'t5', name:'Luxury' }, { id:'t6', name:'Clean Beauty' },
    ];

    const V = (vals) => vals.map(v => typeof v==='string' ? { id:uid('v_'), value:v, color:null } : { id:uid('v_'), value:v.value, color:v.color||null });
    const P = (id,name,brand,categoryId,subId,base,oldPrice,photo,tagIds,variantType,values) => ({
      id,name,brand,categoryId,subId,price:base,oldPrice:oldPrice||null,status:'active',tags:tagIds,
      image:im(photo,600),images:[im(photo,600)],photo,variantType,variants:V(values||[])
    });

    const products = [
      // ── Clothing (size) ──
      P('cl-001','Tailored Linen Blazer','Kanxi Studio','c_cloth','s1',2910,3545,'photo-1594938298603-c8148c4b4e7b',['t2','t3'],'size',['XS','S','M','L','XL']),
      P('cl-002','Silk Midi Dress','Kanxi Atelier','c_cloth','s2',3775,null,'photo-1539109136881-3be0616acf4b',['t1'],'size',['XS','S','M','L']),
      P('cl-003','Wide Leg Trousers','Kanxi Studio','c_cloth','s3',1990,2545,'photo-1551488831-00ddcb6c6bd3',['t2'],'size',['XS','S','M','L','XL']),
      P('cl-005','Classic Trench Coat','Kanxi Studio','c_cloth','s1',6550,7865,'photo-1572804013309-59a88b7e92f1',['t1'],'size',['S','M','L','XL']),
      P('cl-006','Linen Co-ord Set','Kanxi Atelier','c_cloth','s2',3010,null,'photo-1469334031218-e382a71b716b',['t3'],'size',['XS','S','M','L']),
      P('cl-010','Soft Leather Jacket','Kanxi Leather','c_cloth','s1',8940,null,'photo-1548123378-bde4eca81d2d',['t5'],'size',['S','M','L','XL']),
      // ── Skincare (volume) ──
      P('sk-001','Vitamin C Brightening Serum','Kanxi Glow','c_skin','s4',1048,null,'photo-1620916566398-39f1143ab7be',['t3','t6'],'volume',['30ml','50ml']),
      P('sk-004','Retinol Night Renewal Cream','Kanxi Glow','c_skin','s5',1356,null,'photo-1556228720-195a672e8a03',['t3','t6'],'volume',['50ml']),
      P('sk-008','Daily SPF 50 Sunscreen','Kanxi Glow','c_skin','s6',586,740,'photo-1512290923902-8a9f81dc236c',['t2','t6'],'volume',['50ml']),
      P('sk-002','Deep Hydration Face Cream','Kanxi Glow','c_skin','s5',832,1079,'photo-1608248597279-f99d160bfcbc',['t2','t6'],'volume',['50ml']),
      P('sk-006','Hyaluronic Acid Toner','Kanxi Glow','c_skin','s4',740,null,'photo-1615397349754-cfa2066a298e',['t1','t6'],'volume',['200ml']),
      // ── Makeup (shade) ──
      P('mk-001','Velvet Matte Lipstick','Kanxi Beauty','c_make','s11',690,null,'photo-1586495777744-4413f21062fa',['t3'],'shade',[{value:'Rose',color:'#C46A6A'},{value:'Plum',color:'#7D3C5A'},{value:'Coral',color:'#E5736A'},{value:'Nude',color:'#C8967A'}]),
      P('mk-002','Luminous Silk Foundation','Kanxi Beauty','c_make','s12',1180,null,'photo-1631214540242-3cd8c4b0b3aa',['t1'],'shade',[{value:'Ivory',color:'#F0D9C0'},{value:'Beige',color:'#E0BE9A'},{value:'Sand',color:'#C99B70'},{value:'Caramel',color:'#A06B43'}]),
      P('mk-003','Silk Powder Blush','Kanxi Beauty','c_make','s12',540,690,'photo-1599733589046-75e8d9d0e2b9',['t2'],'shade',[{value:'Peach',color:'#F0A98C'},{value:'Berry',color:'#B05070'},{value:'Mauve',color:'#C98CA0'}]),
      // ── Bags (none) ──
      P('bg-001','Structured Leather Tote','Kanxi Leather','c_bags','s7',4934,null,'photo-1584917865442-de89df76afd3',['t1'],'none',[]),
      P('bg-002','Mini Crossbody Bag','Kanxi Leather','c_bags','s8',2745,3238,'photo-1566150905458-1bf1fc113f0d',['t2'],'none',[]),
      P('bg-006','Leather Bucket Bag','Kanxi Leather','c_bags','s7',3701,null,'photo-1547949003-9792a18a2601',['t3'],'none',[]),
      P('bg-010','Leather Weekend Bag','Kanxi Leather','c_bags','s7',6940,8020,'photo-1548036328-c9fa89d128fa',['t5'],'none',[]),
      // ── Watches (none) ──
      P('wt-001','Gold Minimalist Watch','Kanxi Time','c_watch','s9',7480,null,'photo-1542496658-e33a6d0d50f6',['t5'],'none',[]),
      P('wt-004','Rose Gold Dress Watch','Kanxi Time','c_watch','s9',9565,null,'photo-1614164185128-e4ec99c436d7',['t5'],'none',[]),
      P('wt-003','Chronograph Sport Watch','Kanxi Sport','c_watch','s10',4474,null,'photo-1587836374828-4dbafa94cf0e',['t1'],'none',[]),
      P('wt-009','Moonphase Complication','Kanxi Time','c_watch','s9',15121,null,'photo-1466685700116-4b62c77f3c27',['t4'],'none',[]),
      P('wt-002','Classic Silver Timepiece','Kanxi Time','c_watch','s9',5630,6478,'photo-1524592094714-0f0654e20314',['t2'],'none',[]),
    ];

    // ── Auto SKU per variant ──
    const SLUG = s => (s||'').toString().toUpperCase().replace(/[^A-Z0-9]+/g,'').slice(0,8);
    products.forEach(p => (p.variants||[]).forEach(v => { v.sku = 'KNX-'+p.id.replace(/-/g,'').toUpperCase()+'-'+SLUG(v.value); }));

    // ── Inventory batches (cost + selling price + stock per variant) ──
    let bn = 1;
    const batches = [];
    const lowStockIds = ['wt-009'];
    products.forEach(p => {
      const margin = Math.round(p.price * 0.58); // cost ≈ 58% of selling
      const expiry = (p.categoryId==='c_skin'||p.categoryId==='c_make')
        ? new Date(Date.now()+365*864e5).toISOString().slice(0,10) : '';
      const targets = p.variants.length ? p.variants : [{ id:null }];
      targets.forEach(v => {
        batches.push({
          id:uid('b_'), productId:p.id, variantId:v.id,
          batchNo:'B-'+String(bn++).padStart(4,'0'),
          costPrice:margin, sellingPrice:p.price,
          stock: lowStockIds.includes(p.id) ? 2 : (p.categoryId==='c_skin'||p.categoryId==='c_make'?18:8),
          expiry, date:Date.now()-Math.floor(Math.random()*20)*864e5
        });
      });
    });

    const users = [
      { id:uid('u_'), name:'Aishath Ibrahim', phone:'+960 777-1234', gender:'Female', dob:'1996-04-12', createdAt:Date.now()-86400000*30,
        addresses:[{ id:uid('a_'), label:'Home', line:'Hithigasdhoshuge, Fareedhee Magu', city:'Malé', atoll:'Kaafu', postcode:'20026', country:'Maldives', lat:4.1755, lng:73.5093, isDefault:true }] },
      { id:uid('u_'), name:'Mohamed Naseem', phone:'+960 999-8765', gender:'Male', dob:'1990-11-03', createdAt:Date.now()-86400000*8, addresses:[] },
    ];
    const orders = [];
    const payments = [];

    return { _v:VERSION, categories:cats, subcategories:subs, tags, products, batches, users, orders, payments, paymentSettings:defaultPaymentSettings() };
  }

  function defaultHomepage(){
    return {
      collections: { title:'Collections', cards:[
        { id:uid('cc_'), caption:'New Season', tagId:'t1', linkType:'tag', linkValue:'t1', image:'' },
        { id:uid('cc_'), caption:'On Sale', tagId:'t2', linkType:'tag', linkValue:'t2', image:'' },
        { id:uid('cc_'), caption:'Bestsellers', tagId:'t3', linkType:'tag', linkValue:'t3', image:'' },
        { id:uid('cc_'), caption:'Limited Edition', tagId:'t4', linkType:'tag', linkValue:'t4', image:'' },
      ]},
      menu: { items:[
        { id:uid('hm_'), label:'Clothing', linkType:'category', linkValue:'clothing' },
        { id:uid('hm_'), label:'Skincare', linkType:'category', linkValue:'skincare' },
        { id:uid('hm_'), label:'Bags', linkType:'category', linkValue:'bags' },
        { id:uid('hm_'), label:'Watches', linkType:'category', linkValue:'watches' },
      ]},
      brands: { title:'Shop by Brand', brandIds:[] },
      bestsellers: { title:'Best Sellers', limit:8 },
      offers: { title:'Offers', limit:8 },
    };
  }

  function defaultPaymentSettings(){
    return {
      methods: PAYMENT_METHODS.map(m=>({ ...m })),
      bankTransfer: { bankName:'Kanxi Collection', accountNumber:'' }
    };
  }

  function normalizeDelivery(address){
    const info = address && address.deliveryInfo || {};
    return {
      type: address && address.deliveryType || 'standard',
      boatName: info.boatName || '',
      contactNumber: info.contactNumber || '',
      departureTime: info.departureTime || '',
      note: info.note || ''
    };
  }

  function normalizeAddress(address, index){
    if(!address) return null;
    const delivery = normalizeDelivery(address);
    return {
      id: address.id || uid('a_'),
      label: address.label || `Address ${index + 1}`,
      line: address.line || '',
      city: address.city || '',
      atoll: address.atoll || '',
      postcode: address.postcode || '',
      country: address.country || 'Maldives',
      lat: address.lat || null,
      lng: address.lng || null,
      isDefault: !!address.isDefault,
      deliveryType: delivery.type,
      deliveryInfo: {
        boatName: delivery.boatName,
        contactNumber: delivery.contactNumber,
        departureTime: delivery.departureTime,
        note: delivery.note
      }
    };
  }

  function normalizeUser(user){
    const addresses = (user && user.addresses || []).map(normalizeAddress).filter(Boolean);
    if(addresses.length && !addresses.some(a=>a.isDefault)) addresses[0].isDefault = true;
    return {
      id: user.id || uid('u_'),
      name: user.name || 'Kanxi Customer',
      phone: user.phone || '',
      gender: user.gender || '',
      dob: user.dob || '',
      createdAt: user.createdAt || Date.now(),
      addresses
    };
  }

  function readLocal(){ try{ return JSON.parse(localStorage.getItem(KEY)||'null'); }catch(_){ return null; } }
  function writeLocal(db){ localStorage.setItem(KEY, JSON.stringify(db)); }
  function normalize(db){
    if(!db || db._v!==VERSION) db=seed();
    const catBrandMap={};
    (db.categories||[]).forEach(c=>{
      const seen={};
      const own=(c.brands||[]).filter(b=>(b.name||'').trim()).map(b=>({
        id:b.id||uid('br_'),
        name:(b.name||'').trim(),
        logo:b.logo||''
      })).filter(b=>seen[b.name.toLowerCase()]?false:(seen[b.name.toLowerCase()]=true));
      catBrandMap[c.id]=own;
      c.brands=own;
    });
    (db.subcategories||[]).forEach(s=>{
      if(!Array.isArray(s.brands) || !s.brands.length) return;
      const list=catBrandMap[s.categoryId] || (catBrandMap[s.categoryId]=[]);
      const seen=new Set(list.map(b=>(b.name||'').toLowerCase()));
      s.brands.forEach(b=>{
        const name=(b.name||'').trim();
        if(!name || seen.has(name.toLowerCase())) return;
        list.push({ id:b.id||uid('br_'), name, logo:b.logo||'' });
        seen.add(name.toLowerCase());
      });
      s.brands=[];
    });
    if(!db.homepage) db.homepage=defaultHomepage();
    const hp=db.homepage;
    if(!hp.menu || !Array.isArray(hp.menu.items)) hp.menu={items:defaultHomepage().menu.items};
    hp.menu.items = hp.menu.items.map(it=>({
      id:it.id||uid('hm_'),
      label:it.label||'',
      linkType:it.linkType||'category',
      linkValue:it.linkValue||''
    }));
    if(hp.collections && Array.isArray(hp.collections.cards)){
      hp.collections.cards = hp.collections.cards.map(c=>({
        id:c.id||uid('cc_'),
        caption:c.caption||'',
        tagId:c.tagId||'',
        linkType:c.linkType || (c.categorySlug ? 'category' : (c.brandId ? 'brand' : 'tag')),
        linkValue:c.linkValue || c.categorySlug || c.brandId || c.tagId || '',
        image:c.image||''
      }));
    }
    if(!db.paymentSettings) db.paymentSettings = defaultPaymentSettings();
    const paymentDefaults = defaultPaymentSettings();
    const savedMethods = Array.isArray(db.paymentSettings.methods) ? db.paymentSettings.methods : [];
    db.paymentSettings.methods = paymentDefaults.methods.map(def=>{
      const existing = savedMethods.find(m=>m && m.key===def.key) || {};
      return { key:def.key, label:existing.label || def.label, enabled:existing.enabled !== false };
    });
    db.paymentSettings.bankTransfer = {
      bankName: db.paymentSettings.bankTransfer && db.paymentSettings.bankTransfer.bankName || paymentDefaults.bankTransfer.bankName,
      accountNumber: db.paymentSettings.bankTransfer && db.paymentSettings.bankTransfer.accountNumber || paymentDefaults.bankTransfer.accountNumber,
    };
    db.users = (db.users||[]).map(normalizeUser);
    db.orders = (db.orders||[]).map(o=>({ transferSlip:'', bankName:'', accountNumber:'', deliveryType:'standard', deliveryInfo:null, ...o }));
    db.payments = (db.payments||[]).map(p=>({ slipImage:'', bankName:'', accountNumber:'', verifiedAt:null, ...p }));
    return db;
  }
  function cloudConfig(){ return window.KANXI_SUPABASE || {}; }
  function cloudClient(){
    const cfg=cloudConfig();
    if(!window.supabase || !cfg.url || !cfg.publishableKey) return null;
    if(!window._kanxiSupabaseClient) window._kanxiSupabaseClient = window.supabase.createClient(cfg.url, cfg.publishableKey);
    return window._kanxiSupabaseClient;
  }
  function emitSync(status, detail={}){ window.dispatchEvent(new CustomEvent(CLOUD_STATUS_EVENT,{detail:{status,...detail}})); }
  function cloudRow(){ const cfg=cloudConfig(); return { table:cfg.table||'kanxi_site_data', id:cfg.rowId||'main' }; }
  function cloudRest(method, query='', body){
    const cfg=cloudConfig(), row=cloudRow();
    if(!cfg.url || !cfg.publishableKey) throw new Error('Missing Supabase config');
    const xhr = new XMLHttpRequest();
    xhr.open(method, `${cfg.url}/rest/v1/${row.table}${query}`, false);
    xhr.setRequestHeader('apikey', cfg.publishableKey);
    xhr.setRequestHeader('Authorization', `Bearer ${cfg.publishableKey}`);
    xhr.setRequestHeader('Content-Type', 'application/json');
    if(method==='POST') xhr.setRequestHeader('Prefer', 'resolution=merge-duplicates,return=minimal');
    xhr.send(body ? JSON.stringify(body) : null);
    if(xhr.status < 200 || xhr.status >= 300) throw new Error(xhr.responseText || `Supabase ${method} failed`);
    return xhr.responseText ? JSON.parse(xhr.responseText) : null;
  }
  function saveCloudNow(db){
    const row=cloudRow();
    const clean=normalize(db);
    cloudDb = clean;
    lastCloudHash = JSON.stringify(clean);
    emitSync('saving');
    try{
      cloudRest('POST', '', { id:row.id, data:clean, updated_at:new Date().toISOString() });
      emitSync('saved');
    }catch(e){
      console.warn('Kanxi Supabase save failed:', e.message);
      emitSync('error',{message:e.message});
    }
  }
  function loadCloud(force=false){
    if(cloudLoaded && !force) return cloudDb;
    const row=cloudRow();
    emitSync('loading');
    try{
      const rows = cloudRest('GET', `?id=eq.${encodeURIComponent(row.id)}&select=data,updated_at&limit=1`);
      cloudDb = normalize(rows && rows[0] && rows[0].data);
      cloudLoaded = true;
      lastCloudHash = JSON.stringify(cloudDb);
      if(!rows || !rows.length) saveCloudNow(cloudDb);
      emitSync('loaded');
      return cloudDb;
    }catch(e){
      console.warn('Kanxi Supabase load failed:', e.message);
      cloudDb = normalize(cloudDb || seed());
      cloudLoaded = true;
      emitSync('error',{message:e.message});
      return cloudDb;
    }
  }
  function load(){
    if(USE_LOCAL){
      const db=normalize(readLocal());
      writeLocal(db);
      return db;
    }
    return loadCloud();
  }
  async function pushCloud(db){
    if(USE_LOCAL) return;
    const client=cloudClient(); if(!client){ saveCloudNow(db); return; }
    const row=cloudRow(), raw=JSON.stringify(db);
    if(raw===lastCloudHash) return;
    emitSync('saving');
    const { error } = await client.from(row.table).upsert({
      id: row.id,
      data: db,
      updated_at: new Date().toISOString()
    }, { onConflict:'id' });
    if(error){ console.warn('Kanxi Supabase save failed:', error.message); emitSync('error',{message:error.message}); return; }
    lastCloudHash = raw;
    emitSync('saved');
  }
  function queueCloudSave(db){
    if(USE_LOCAL) return;
    if(!cloudClient()) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(()=>pushCloud(db), 400);
  }
  function save(db){
    const clean=normalize(db);
    if(USE_LOCAL){ writeLocal(clean); return; }
    cloudDb = clean;
    saveCloudNow(clean);
  }
  async function syncFromCloud(){
    if(USE_LOCAL) return { ok:true, local:true };
    const client=cloudClient(); if(!client) return { ok:false, reason:'missing-client' };
    const row=cloudRow();
    emitSync('loading');
    const { data, error } = await client.from(row.table).select('data,updated_at').eq('id', row.id).maybeSingle();
    if(error){ console.warn('Kanxi Supabase load failed:', error.message); emitSync('error',{message:error.message}); return { ok:false, error }; }
    if(!data || !data.data){ await pushCloud(load()); return { ok:true, seeded:true }; }
    const db=normalize(data.data), cloudRaw=JSON.stringify(db), localRaw=JSON.stringify(load());
    lastCloudHash = cloudRaw;
    if(cloudRaw!==localRaw){
      cloudDb = db;
      window.dispatchEvent(new CustomEvent(CLOUD_EVENT,{detail:{source:'supabase'}}));
    }
    emitSync('loaded');
    return { ok:true };
  }

  const api = {
    ORDER_FLOW, VARIANT_TYPES, PAYMENT_METHODS, uid, im,
    useLocalStorage: USE_LOCAL,
    all(){ return load(); },
    reset(){ const db=normalize(seed()); save(db); return db; },
    syncFromCloud,
    list(c){ return load()[c]||[]; },
    get(c,id){ return (load()[c]||[]).find(x=>x.id===id); },
    upsert(c,item){ const db=load(); if(!db[c])db[c]=[]; if(!item.id){ item.id=uid(c[0]+'_'); db[c].push(item);} else { const i=db[c].findIndex(x=>x.id===item.id); if(i===-1)db[c].push(item); else db[c][i]={...db[c][i],...item}; } save(db); return item; },
    remove(c,id){ const db=load(); db[c]=(db[c]||[]).filter(x=>x.id!==id); if(c==='products') db.batches=(db.batches||[]).filter(b=>b.productId!==id); save(db); },

    categoryName(id){ const c=this.get('categories',id); return c?c.name:'—'; },
    subName(id){ const s=(load().subcategories||[]).find(x=>x.id===id); return s?s.name:'—'; },
    brandsOfCategory(categoryId){ const c=this.get('categories',categoryId); return (c&&c.brands)||[]; },
    allBrands(){ return this.list('categories').flatMap(c=>(c.brands||[]).map(b=>({...b,categoryId:c.id,categoryName:c.name}))); },
    tagNames(ids=[]){ const t=load().tags; return ids.map(id=>(t.find(x=>x.id===id)||{}).name).filter(Boolean); },
    variantTypeLabel(k){ return (VARIANT_TYPES.find(v=>v.key===k)||{}).label || '—'; },

    /* ── SKU ── */
    slug(s){ return (s||'').toString().toUpperCase().replace(/[^A-Z0-9]+/g,'').slice(0,8); },
    skuFor(pid, variant){ const base='KNX-'+String(pid||'').replace(/-/g,'').toUpperCase(); return (variant&&variant.value)?base+'-'+this.slug(variant.value):base; },
    skuOfVariant(p, v){ return (v&&v.sku) || this.skuFor(p.id, v); },
    findBySku(sku){
      sku=(sku||'').trim().toUpperCase(); if(!sku) return null;
      for(const p of this.list('products')){
        const vs=p.variants||[];
        if(vs.length){ const v=vs.find(x=>this.skuOfVariant(p,x).toUpperCase()===sku); if(v) return {product:p,variant:v}; }
        else if(this.skuFor(p.id,null).toUpperCase()===sku) return {product:p,variant:null};
      }
      return null;
    },

    /* ── inventory-derived ── */
    batchesOf(pid){ return this.list('batches').filter(b=>b.productId===pid); },
    activeBatchOf(pid, vid){
      const batches=this.batchesOf(pid)
        .filter(b=>(vid==null ? true : b.variantId===vid))
        .slice()
        .sort((a,b)=>(+a.date||0)-(+b.date||0));
      return batches.find(b=>(+b.stock||0)>0) || batches[0] || null;
    },
    stockOf(p){ const id=typeof p==='string'?p:p.id; return this.batchesOf(id).reduce((s,b)=>s+(+b.stock||0),0); },
    stockOfVariant(pid,vid){ return this.batchesOf(pid).filter(b=>b.variantId===vid).reduce((s,b)=>s+(+b.stock||0),0); },
    priceOf(p){
      const active=this.activeBatchOf(p.id, null);
      if(active && +active.sellingPrice>0) return +active.sellingPrice;
      const any=this.batchesOf(p.id).map(b=>+b.sellingPrice).filter(n=>n>0);
      if(any.length) return any[0];
      return p.price||0;
    },
    priceOfVariant(pid,vid){
      const active=this.activeBatchOf(pid, vid);
      if(active && +active.sellingPrice>0) return +active.sellingPrice;
      const bs=this.batchesOf(pid).filter(b=>b.variantId===vid).map(b=>+b.sellingPrice).filter(n=>n>0);
      return bs.length?bs[0]:null;
    },

    /* ── storefront ── */
    categoryBySlug(slug){ return this.list('categories').find(c=>c.slug===slug); },
    subcategoriesOf(categoryId){ return this.list('subcategories').filter(s=>s.categoryId===categoryId); },
    imageForSub(subId){ const s=this.get('subcategories',subId); if(s&&s.image) return s.image; const p=this.storeProducts().find(p=>p.subId===subId); return p?p.image:''; },
    cardsBySub(subId){ return this.storeProducts().filter(p=>p.subId===subId).map(p=>this.card(p)); },
    optionValues(p){ return (p.variants||[]).map(v=>v.value); },
    badgeOf(p){ const tn=this.tagNames(p.tags||[]);
      if(tn.includes('Limited')) return {text:'Limited',gold:true};
      if(tn.includes('Luxury'))  return {text:'Luxury',gold:true};
      if(tn.includes('Bestseller')) return {text:'Bestseller',gold:true};
      if(tn.includes('Sale')) return {text:'Sale',gold:false};
      if(tn.includes('New')) return {text:'New',gold:false};
      return null; },
    statusOf(p){ const st=this.stockOf(p), tn=this.tagNames(p.tags||[]);
      if(st===0) return {text:'Out of stock',cls:'low'};
      if(st<6) return {text:'Only a few left',cls:'low'};
      if(tn.includes('New')) return {text:'New arrival',cls:'new'};
      if(tn.includes('Bestseller')) return {text:'Bestseller',cls:''};
      return {text:'Selling fast',cls:'fast'}; },
    card(p){
      const cat=this.get('categories',p.categoryId)||{}; const b=this.badgeOf(p), s=this.statusOf(p);
      const vals=this.optionValues(p);
      return { id:p.id, cat:cat.slug||'', name:p.name, brand:p.brand||'Kanxi Collection',
        price:this.priceOf(p), old:null, img:p.image, images:p.images||[p.image],
        badge:b?b.text:null, bgold:b?b.gold:false, status:s.text, sclass:s.cls,
        variantType:p.variantType||'none', options:p.variants||[],
        sizes: (['size','volume'].includes(p.variantType)?vals:[]),
        colors: (p.variantType==='shade'?vals:[]),
        stock:this.stockOf(p) };
    },
    storeProducts(){ return this.list('products').filter(p=>p.status==='active'); },
    cardsBySlug(slug){ const ps=this.storeProducts(); let list;
      if(slug==='sale') list=ps.filter(p=>this.tagNames(p.tags).includes('Sale'));
      else if(slug==='new') list=ps.filter(p=>this.tagNames(p.tags).includes('New'));
      else { const c=this.categoryBySlug(slug); list=c?ps.filter(p=>p.categoryId===c.id):ps; }
      return list.map(p=>this.card(p)); },

    /* ── homepage CMS ── */
    getHomepage(){ return load().homepage || defaultHomepage(); },
    saveHomepage(hp){ const db=load(); db.homepage=hp; save(db); },
    getPaymentSettings(){ return load().paymentSettings || defaultPaymentSettings(); },
    savePaymentSettings(settings){
      const db=load();
      db.paymentSettings = {
        methods: PAYMENT_METHODS.map(def=>{
          const existing = (settings && settings.methods || []).find(m=>m && m.key===def.key) || {};
          return { key:def.key, label:existing.label || def.label, enabled:existing.enabled !== false };
        }),
        bankTransfer: {
          bankName: settings && settings.bankTransfer && settings.bankTransfer.bankName || '',
          accountNumber: settings && settings.bankTransfer && settings.bankTransfer.accountNumber || ''
        }
      };
      save(db);
      return db.paymentSettings;
    },
    imageForTag(tagId){ const p=this.storeProducts().find(p=>(p.tags||[]).includes(tagId)); return p?p.image:''; },
    brandById(id){ return this.allBrands().find(b=>b.id===id); },
    productsByTag(tagId){ return this.storeProducts().filter(p=>(p.tags||[]).includes(tagId)).map(p=>this.card(p)); },
    productsByBrand(name){ const n=(name||'').toLowerCase(); return this.storeProducts().filter(p=>(p.brand||'').toLowerCase()===n).map(p=>this.card(p)); },
    offers(limit=12){ return this.storeProducts().filter(p=>this.tagNames(p.tags).includes('Sale')).slice(0,limit).map(p=>this.card(p)); },
    productSales(){ const map={}; const ps=this.list('products');
      this.list('orders').forEach(o=>(o.items||[]).forEach(it=>{ let pid=it.productId; if(!pid){ const m=ps.find(p=>it.name && it.name.indexOf(p.name)===0); pid=m&&m.id; } if(pid) map[pid]=(map[pid]||0)+(it.qty||1); }));
      return map; },
    bestSellers(limit=8){ const sales=this.productSales(); let ps=this.storeProducts().slice();
      if(Object.keys(sales).length){ ps.sort((a,b)=>(sales[b.id]||0)-(sales[a.id]||0)); ps=ps.filter(p=>sales[p.id]); }
      if(!ps.length) ps=this.storeProducts().filter(p=>this.tagNames(p.tags).includes('Bestseller'));
      if(!ps.length) ps=this.storeProducts().slice();
      return ps.slice(0,limit).map(p=>{ const c=this.card(p); c.sold=sales[p.id]||0; return c; }); },

    /* ── place a real order from storefront checkout ── */
    placeOrder(o){ const db=load();
      const id='KNX-'+Math.floor(100000+Math.random()*900000);
      const methodKey=String(o.payMethod||'card').toLowerCase();
      const settings=db.paymentSettings || defaultPaymentSettings();
      const method=(settings.methods||[]).find(m=>m.key===methodKey) || PAYMENT_METHODS.find(m=>m.key===methodKey) || PAYMENT_METHODS[0];
      const transfer=methodKey==='transfer';
      const cod=methodKey==='cod';
      const bankTransfer=settings.bankTransfer || defaultPaymentSettings().bankTransfer;
      const orderStatus=transfer?'Pending Slip Verification':(cod?'Order Accepted':'Paid');
      const payStatus=transfer?'Pending Slip Verification':(cod?'Pending':'Paid');
      const delivery = o.deliveryInfo ? {
        boatName:o.deliveryInfo.boatName || '',
        contactNumber:o.deliveryInfo.contactNumber || '',
        departureTime:o.deliveryInfo.departureTime || '',
        note:o.deliveryInfo.note || ''
      } : null;
      const order={ id, userName:o.userName||'Guest', userPhone:o.userPhone||'', date:Date.now(),
        status:orderStatus, payStatus, payMethod:method.label,
        items:(o.items||[]).map(i=>({ productId:i.productId||null, name:i.name, qty:i.qty, price:i.price, image:i.image||'' })),
        shipping:o.shipping||0, address:o.address||'', transferSlip:o.transferSlip||'',
        bankName:transfer?(o.bankName||bankTransfer.bankName||''):'',
        accountNumber:transfer?(o.accountNumber||bankTransfer.accountNumber||''):'',
        deliveryType:o.deliveryType || 'standard',
        deliveryInfo:delivery
      };
      db.orders.push(order);
      db.payments.push({
        id:uid('p_'),
        orderId:id,
        amount:o.total||order.items.reduce((s,i)=>s+i.price*i.qty,0),
        method:order.payMethod,
        status:payStatus,
        date:Date.now(),
        slipImage:o.transferSlip||'',
        bankName:order.bankName||'',
        accountNumber:order.accountNumber||'',
        verifiedAt:null
      });
      save(db); return order; },

    advanceOrder(id){ const db=load(),o=db.orders.find(x=>x.id===id); if(!o)return; const i=ORDER_FLOW.indexOf(o.status); if(i>=0&&i<ORDER_FLOW.length-1)o.status=ORDER_FLOW[i+1]; if(['Paid','Order Accepted','Packing','Ready to Dispatch','Out for Delivery','Delivered'].includes(o.status))o.payStatus='Paid'; save(db); return o; },
    setOrderStatus(id,st){ const db=load(),o=db.orders.find(x=>x.id===id); if(o){o.status=st; if(['Paid','Order Accepted','Packing','Ready to Dispatch','Out for Delivery','Delivered'].includes(st))o.payStatus='Paid'; save(db);} return o; },
    setPaymentStatus(id,status){
      const db=load(), p=db.payments.find(x=>x.id===id);
      if(!p) return null;
      p.status=status;
      if(status==='Paid') p.verifiedAt=Date.now();
      const o=db.orders.find(x=>x.id===p.orderId);
      if(o){
        o.payStatus=status;
        if(status==='Paid' && ['Pending Payment','Pending Slip Verification'].includes(o.status)) o.status='Paid';
      }
      save(db);
      return p;
    },

    currentUser(){
      if(USE_LOCAL) return JSON.parse(localStorage.getItem('kanxi_session')||'null');
      if(window._kanxiSession) return window._kanxiSession;
      try{ return JSON.parse(sessionStorage.getItem('kanxi_session')||'null'); }catch(_){ return null; }
    },
    login(u){
      if(USE_LOCAL) localStorage.setItem('kanxi_session', JSON.stringify(u));
      else {
        window._kanxiSession = u;
        try{ sessionStorage.setItem('kanxi_session', JSON.stringify(u)); }catch(_){}
      }
    },
    logout(){
      if(USE_LOCAL) localStorage.removeItem('kanxi_session');
      else {
        window._kanxiSession = null;
        try{ sessionStorage.removeItem('kanxi_session'); }catch(_){}
      }
    },
    findUserByPhone(phone){ return (load().users||[]).find(u=>u.phone.replace(/\D/g,'')===phone.replace(/\D/g,'')); },
  };
  return api;
})();
