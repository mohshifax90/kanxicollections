/* ════════════════════════════════════════
   KANXI COLLECTION — DATA STORE
   Supabase in production, localStorage on localhost.
═══════════════════════════════════════════ */
const Store = window.Store = (() => {
  const KEY = 'kanxi_db';
  const CLOUD_CACHE_KEY = 'kanxi_cloud_cache';
  const VERSION = 4;
  const CLOUD_EVENT = 'kanxi:store-changed';
  const CLOUD_STATUS_EVENT = 'kanxi:store-sync';
  const IS_FILE = location.protocol === 'file:';
  const IS_LOCALHOST = ['localhost','127.0.0.1','::1'].includes(location.hostname);
  const USE_LOCAL = IS_FILE || IS_LOCALHOST;
  const CAN_SYNC_CLOUD = !IS_FILE;
  const IS_ADMIN_PAGE = /admin\.html$/i.test(location.pathname);
  const DEFER_CLOUD_BOOT = false;
  const REALTIME_ENABLED = CAN_SYNC_CLOUD;
  const USE_CLOUD_CACHE = USE_LOCAL;
  const SUPABASE_JS_SRC = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  const uid = (p='') => p + Math.random().toString(36).slice(2,8);
  const BLANK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 600'%3E%3Crect width='600' height='600' fill='%23f4f4f5'/%3E%3Cpath d='M185 374l77-96 54 64 33-40 66 72H185z' fill='%23d4d4d8'/%3E%3Ccircle cx='238' cy='223' r='36' fill='%23e4e4e7'/%3E%3C/svg%3E";
  const sanitizeImage = (value) => {
    const url = String(value || '').trim();
    if(!url) return BLANK_IMAGE;
    return url.indexOf('images.unsplash.com/') !== -1 ? BLANK_IMAGE : url;
  };
  const im = () => BLANK_IMAGE;
  let saveTimer = null;
  let lastCloudHash = '';
  let pendingCloudHash = '';
  let cloudDb = null;
  let cloudLoaded = false;
  let cloudBootTimer = null;
  let realtimeStarted = false;
  let realtimeClientPromise = null;
  let realtimeChannel = null;

  const ORDER_FLOW = ['Pending Payment','Pending Slip Verification','Paid','Order Accepted','Packing','Ready to Dispatch','Out for Delivery','Delivered','Returned'];
  const CONFIRMED_ORDER_STATUSES = ['Paid','Order Accepted','Packing','Ready to Dispatch','Out for Delivery','Delivered'];
  const PAYMENT_METHODS = [
    { key:'card', label:'Card', enabled:true },
    { key:'paypal', label:'PayPal', enabled:true },
    { key:'transfer', label:'Bank Transfer', enabled:true },
    { key:'cod', label:'Cash on Delivery', enabled:true },
  ];
  const DELIVERY_METHODS = [
    { key:'address', label:'Address', rate:0, enabled:true },
    { key:'speed_boat', label:'Speed Boat', rate:10, enabled:true },
    { key:'boat', label:'Boat', rate:10, enabled:true },
    { key:'self_pickup', label:'Self Pickup', rate:0, enabled:true },
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

    const V = (vals) => vals.map(v => typeof v==='string'
      ? { id:uid('v_'), value:v, color:null, barcode:'' }
      : { id:uid('v_'), value:v.value, color:v.color||null, barcode:v.barcode||'' });
    const P = (id,name,brand,categoryId,subId,base,oldPrice,photo,tagIds,variantType,values,description='',details=[]) => ({
      id,name,brand,categoryId,subId,price:base,oldPrice:oldPrice||null,status:'active',tags:tagIds,
      image:im(photo,600),images:[im(photo,600)],photo,variantType,variants:V(values||[]),description,details
    });

    const products = [
      // ── Clothing (size) ──
      P('cl-001','Tailored Linen Blazer','Kanxi Studio','c_cloth','s1',2910,3545,'',['t2','t3'],'size',['XS','S','M','L','XL'],'Sharp tailoring with a relaxed drape for polished everyday wear.',['Structured shoulders','Breathable linen blend','Fully lined finish']),
      P('cl-002','Silk Midi Dress','Kanxi Atelier','c_cloth','s2',3775,null,'',['t1'],'size',['XS','S','M','L'],'A fluid silk silhouette designed for soft movement and elevated evenings.',['Pure-feel satin touch','Midi length cut','Lightweight all-day comfort']),
      P('cl-003','Wide Leg Trousers','Kanxi Studio','c_cloth','s3',1990,2545,'',['t2'],'size',['XS','S','M','L','XL'],'Modern wide-leg tailoring with clean lines and an easy, flattering fall.',['High-rise waist','Soft structured fabric','Easy day-to-night styling']),
      P('cl-005','Classic Trench Coat','Kanxi Studio','c_cloth','s1',6550,7865,'',['t1'],'size',['S','M','L','XL'],'A timeless trench with crisp detailing and a refined outer layer feel.',['Double-breasted front','Belted waist','Seasonless layering piece']),
      P('cl-006','Linen Co-ord Set','Kanxi Atelier','c_cloth','s2',3010,null,'',['t3'],'size',['XS','S','M','L'],'An effortless matching set cut for comfort and understated luxury.',['Breathable linen texture','Relaxed tailored shape','Easy mix-and-match wear']),
      P('cl-010','Soft Leather Jacket','Kanxi Leather','c_cloth','s1',8940,null,'',['t5'],'size',['S','M','L','XL'],'Supple leather with a clean silhouette built for statement layering.',['Soft premium finish','Minimal hardware detailing','Structured modern fit']),
      // ── Skincare (volume) ──
      P('sk-001','Vitamin C Brightening Serum','Kanxi Glow','c_skin','s4',1048,null,'',['t3','t6'],'volume',['30ml','50ml'],'A daily brightening serum formulated to revive dull skin and support a clear glow.',['Vitamin C support','Light fast-absorbing texture','Suitable for daily layering']),
      P('sk-004','Retinol Night Renewal Cream','Kanxi Glow','c_skin','s5',1356,null,'',['t3','t6'],'volume',['50ml'],'A nourishing overnight cream that helps smooth texture and support renewal while you sleep.',['Night-use formula','Comforting cream finish','Targets texture and tone']),
      P('sk-008','Daily SPF 50 Sunscreen','Kanxi Glow','c_skin','s6',586,740,'',['t2','t6'],'volume',['50ml'],'Lightweight broad-spectrum sun care designed for daily protection without heavy residue.',['SPF 50 protection','Invisible lightweight finish','Everyday wear friendly']),
      P('sk-002','Deep Hydration Face Cream','Kanxi Glow','c_skin','s5',832,1079,'',['t2','t6'],'volume',['50ml'],'A moisture-rich cream that cushions the skin and helps seal in hydration.',['Soft cream texture','Comfort-focused hydration','Ideal for dry or tired skin']),
      P('sk-006','Hyaluronic Acid Toner','Kanxi Glow','c_skin','s4',740,null,'',['t1','t6'],'volume',['200ml'],'A fresh toner that replenishes hydration and preps skin for the rest of your routine.',['Hydrating prep step','Layerable watery texture','Balances and softens']),
      // ── Makeup (shade) ──
      P('mk-001','Velvet Matte Lipstick','Kanxi Beauty','c_make','s11',690,null,'',['t3'],'shade',[{value:'Rose',color:'#C46A6A'},{value:'Plum',color:'#7D3C5A'},{value:'Coral',color:'#E5736A'},{value:'Nude',color:'#C8967A'}],'A pigment-rich lipstick with a soft matte finish and comfortable wear.',['Velvet matte payoff','Smooth glide application','Curated wearable shades']),
      P('mk-002','Luminous Silk Foundation','Kanxi Beauty','c_make','s12',1180,null,'',['t1'],'shade',[{value:'Ivory',color:'#F0D9C0'},{value:'Beige',color:'#E0BE9A'},{value:'Sand',color:'#C99B70'},{value:'Caramel',color:'#A06B43'}],'A lightweight complexion base that leaves skin looking even, fresh, and luminous.',['Buildable coverage','Silky skin-like finish','Comfortable all-day wear']),
      P('mk-003','Silk Powder Blush','Kanxi Beauty','c_make','s12',540,690,'',['t2'],'shade',[{value:'Peach',color:'#F0A98C'},{value:'Berry',color:'#B05070'},{value:'Mauve',color:'#C98CA0'}],'A soft-focus powder blush that adds natural-looking color with a refined finish.',['Blendable pigment','Silky powder texture','Soft radiant effect']),
      // ── Bags (none) ──
      P('bg-001','Structured Leather Tote','Kanxi Leather','c_bags','s7',4934,null,'',['t1'],'none',[],'A refined tote with room for daily essentials and a polished structured shape.',['Premium leather build','Spacious interior','Everyday carry silhouette']),
      P('bg-002','Mini Crossbody Bag','Kanxi Leather','c_bags','s8',2745,3238,'',['t2'],'none',[],'A compact crossbody made for light carry and easy all-day styling.',['Hands-free design','Compact daily size','Adjustable strap']),
      P('bg-006','Leather Bucket Bag','Kanxi Leather','c_bags','s7',3701,null,'',['t3'],'none',[],'A soft bucket profile that balances relaxed style with practical storage.',['Premium leather texture','Roomy interior','Modern relaxed shape']),
      P('bg-010','Leather Weekend Bag','Kanxi Leather','c_bags','s7',6940,8020,'',['t5'],'none',[],'A travel-ready carryall sized for quick escapes and elevated packing.',['Weekend-ready capacity','Structured handles','Luxury finish']),
      // ── Watches (none) ──
      P('wt-001','Gold Minimalist Watch','Kanxi Time','c_watch','s9',7480,null,'',['t5'],'none',[],'A clean gold-tone watch with a minimal face for understated daily wear.',['Minimal dial design','Polished gold-tone finish','Versatile everyday styling']),
      P('wt-004','Rose Gold Dress Watch','Kanxi Time','c_watch','s9',9565,null,'',['t5'],'none',[],'An elegant dress watch with warm rose gold tones and a refined presence.',['Dress-ready case profile','Rose gold finish','Refined timeless styling']),
      P('wt-003','Chronograph Sport Watch','Kanxi Sport','c_watch','s10',4474,null,'',['t1'],'none',[],'A sporty chronograph built for bold everyday wear and functional detail.',['Sport chronograph face','Statement case design','Active lifestyle appeal']),
      P('wt-009','Moonphase Complication','Kanxi Time','c_watch','s9',15121,null,'',['t4'],'none',[],'A premium statement timepiece featuring a moonphase complication and classic detailing.',['Complication dial feature','Collector-style presence','Premium finishing details']),
      P('wt-002','Classic Silver Timepiece','Kanxi Time','c_watch','s9',5630,6478,'',['t2'],'none',[],'A classic silver watch designed for simple versatility and polished finishing.',['Silver-tone case','Timeless proportions','Clean everyday pairing']),
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

    const users = [];
    const orders = [];
    const payments = [];

    return {
      _v:VERSION,
      categories:cats,
      subcategories:subs,
      tags,
      products,
      batches,
      users,
      orders,
      payments,
      orderSeq:1,
      paymentSettings:defaultPaymentSettings(),
      deliverySettings:defaultDeliverySettings(),
      taxSettings:defaultTaxSettings(),
      smsSettings:defaultSmsSettings()
    };
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
  function defaultDeliverySettings(){
    return {
      methods: DELIVERY_METHODS.map(m=>({ ...m }))
    };
  }
  function defaultTaxSettings(){
    return {
      rates: [
        { id:'tax_default', type:'GST', rate:8, startDate:'2026-01-01', enabled:true }
      ]
    };
  }
  function defaultSmsSettings(){
    return {
      senderId: 'Kanxi',
      templates: {
        confirmed: 'Kanxi: Your order {{orderId}} has been confirmed. We will update you again when it is out for delivery.',
        outForDelivery: 'Kanxi: Your order {{orderId}} is now out for delivery.',
        delivered: 'Kanxi: Your order {{orderId}} has been delivered. Thank you for shopping with Kanxi Collection.'
      }
    };
  }
  function emptyCloudDb(){
    return {
      _v:VERSION,
      categories:[],
      subcategories:[],
      tags:[],
      products:[],
      batches:[],
      users:[],
      orders:[],
      payments:[],
      orderSeq:1,
      homepage:defaultHomepage(),
      paymentSettings:defaultPaymentSettings(),
      deliverySettings:defaultDeliverySettings(),
      taxSettings:defaultTaxSettings(),
      smsSettings:defaultSmsSettings()
    };
  }

  function orderNumberValue(id){
    const match = String(id || '').match(/^KNX-(\d{1,6})$/);
    return match ? +match[1] : 0;
  }
  function nextOrderSequence(db){
    const saved = +(db && db.orderSeq || 0);
    if(saved > 0) return saved;
    const highest = Math.max(0, ...(db.orders || []).map(order => orderNumberValue(order.id)));
    return highest + 1 || 1;
  }
  function nextOrderId(db){
    const seq = Math.max(1, nextOrderSequence(db));
    db.orderSeq = seq + 1;
    return 'KNX-' + String(seq).padStart(6, '0');
  }
  function activeBatchFor(db, productId, variantId=null){
    const batches = (db.batches || [])
      .filter(batch => batch.productId === productId && (batch.variantId || null) === (variantId || null))
      .sort((a,b)=>(+a.date || 0) - (+b.date || 0));
    const available = batches.find(batch => (+batch.stock || 0) > 0);
    return available || batches[0] || null;
  }
  function stockForItem(db, item){
    if(!item) return 0;
    return item.variantId
      ? api.availableStockOfVariant(item.productId, item.variantId)
      : api.availableStockOf(item.productId);
  }
  function reserveOrderStock(db, items){
    for(const item of (items || [])){
      const needed = Math.max(0, +(item.qty || 0));
      if(!needed || !item.productId) continue;
      const available = stockForItem(db, item);
      if(needed > available){
        throw new Error(available <= 0
          ? `${item.name || 'Item'} is out of stock`
          : `Only ${available} left for ${item.name || 'this item'}`);
      }
    }
    for(const item of (items || [])){
      const needed = Math.max(0, +(item.qty || 0));
      if(!needed || !item.productId) continue;
      const batch = activeBatchFor(db, item.productId, item.variantId || null);
      if(batch) batch.stock = Math.max(0, (+batch.stock || 0) - needed);
    }
  }
  function validateOrderStock(db, items){
    for(const item of (items || [])){
      const needed = Math.max(0, +(item.qty || 0));
      if(!needed || !item.productId) continue;
      const available = stockForItem(db, item);
      if(needed > available){
        throw new Error(available <= 0
          ? `${item.name || 'Item'} is out of stock`
          : `Only ${available} left for ${item.name || 'this item'}`);
      }
    }
  }
  function restoreOrderStock(db, items){
    for(const item of (items || [])){
      const qty = Math.max(0, +(item.qty || 0));
      if(!qty || !item.productId) continue;
      let batch = activeBatchFor(db, item.productId, item.variantId || null);
      if(!batch){
        batch = {
          id: uid('b_'),
          productId: item.productId,
          variantId: item.variantId || null,
          batchNo: 'B-' + String((db.batches || []).length + 1).padStart(4, '0'),
          costPrice: 0,
          sellingPrice: +(item.price || 0),
          stock: 0,
          expiry: '',
          date: Date.now()
        };
        db.batches = db.batches || [];
        db.batches.push(batch);
      }
      batch.stock = Math.max(0, (+batch.stock || 0) + qty);
    }
  }
  function ensureOrderStockState(db, order){
    if(!order) return order;
    const isConfirmed = CONFIRMED_ORDER_STATUSES.includes(order.status);
    if(isConfirmed && !order.stockAdjusted){
      reserveOrderStock(db, order.items || []);
      order.stockAdjusted = true;
      order.stockAdjustedAt = Date.now();
    }else if(order.status === 'Returned' && order.stockAdjusted && !order.stockRestored){
      restoreOrderStock(db, order.items || []);
      order.stockRestored = true;
      order.stockRestoredAt = Date.now();
    }
    return order;
  }
  function normalizeOrderAddressMeta(meta){
    if(!meta) return null;
    return {
      label: meta.label || '',
      line: meta.line || '',
      city: meta.city || '',
      atoll: meta.atoll || '',
      postcode: meta.postcode || '',
      country: meta.country || 'Maldives',
      lat: meta.lat ?? null,
      lng: meta.lng ?? null,
      name: meta.name || '',
      phone: meta.phone || '',
    };
  }
  function ensureOrderNotificationState(order){
    if(!order.notifications) order.notifications = {};
    order.notifications.confirmedAt = order.notifications.confirmedAt || null;
    order.notifications.outForDeliveryAt = order.notifications.outForDeliveryAt || null;
    order.notifications.deliveredAt = order.notifications.deliveredAt || null;
    return order;
  }
  function persistOrderNotification(orderId, key, value){
    if(!orderId || !key) return;
    const db = load();
    const target = (db.orders || []).find(entry => entry && entry.id === orderId);
    if(!target) return;
    ensureOrderNotificationState(target);
    target.notifications[key] = value;
    saveNow(db).catch(error => console.warn('Kanxi order notification save failed:', error.message));
  }
  function notifyOrderStatus(order){
    if(typeof fetch !== 'function' || !order || !order.userPhone) return;
    ensureOrderNotificationState(order);
    const smsSettings = api.getSmsSettings ? api.getSmsSettings() : defaultSmsSettings();
    const templates = smsSettings && smsSettings.templates || defaultSmsSettings().templates;
    const phone = String(order.userPhone || '').replace(/\D/g,'');
    if(phone.length < 7) return;
    let key = '';
    let body = '';
    if(CONFIRMED_ORDER_STATUSES.includes(order.status) && !order.notifications.confirmedAt){
      key = 'confirmedAt';
      body = templates.confirmed;
    }else if(order.status === 'Out for Delivery' && !order.notifications.outForDeliveryAt){
      key = 'outForDeliveryAt';
      body = templates.outForDelivery;
    }else if(order.status === 'Delivered' && !order.notifications.deliveredAt){
      key = 'deliveredAt';
      body = templates.delivered;
    }
    body = String(body || '')
      .replace(/\{\{\s*orderId\s*\}\}/g, order.id || '')
      .replace(/\{\{\s*customerName\s*\}\}/g, order.userName || 'Customer')
      .replace(/\{\{\s*deliveryType\s*\}\}/g, order.deliveryType || '')
      .trim();
    if(!key || !body) return;
    fetch('/api/msgowl-send-sms', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({
        recipients: phone,
        sender_id: smsSettings && smsSettings.senderId || defaultSmsSettings().senderId,
        body
      })
    })
    .then(async response => {
      let payload = null;
      try{
        payload = await response.json();
      }catch(_){}
      if(!response.ok){
        const message = payload && payload.error || payload && payload.message || `SMS request failed (${response.status})`;
        throw new Error(message);
      }
      const sentAt = Date.now();
      order.notifications[key] = sentAt;
      persistOrderNotification(order.id, key, sentAt);
    })
    .catch(error => {
      order.notifications[key] = null;
      persistOrderNotification(order.id, key, null);
      console.warn('Kanxi order SMS failed:', error && error.message ? error.message : error);
    });
  }

  function normalizeDelivery(address){
    const info = address && address.deliveryInfo || {};
    const rawType = address && address.deliveryType || 'address';
    const type = rawType === 'standard' ? 'address' : rawType;
    return {
      type,
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
  function writeLocal(db){
    try{
      localStorage.setItem(KEY, JSON.stringify(db));
    }catch(error){
      console.warn('Kanxi local save skipped:', error && error.message ? error.message : error);
    }
  }
  function looksLikeSeededDemo(db){
    if(!db || !Array.isArray(db.categories) || !Array.isArray(db.products)) return false;
    const demoCategoryIds = ['c_cloth','c_skin','c_make','c_bags','c_watch'];
    const demoProductIds = ['cl-001','sk-001','mk-001','bg-001','wt-001'];
    const hasDemoCategories = demoCategoryIds.every(id => db.categories.some(category => category && category.id === id));
    const hasDemoProducts = demoProductIds.some(id => db.products.some(product => product && product.id === id));
    return hasDemoCategories && hasDemoProducts;
  }
  function normalize(db){
    if(!db) db=emptyCloudDb();
    if(!db._v) db._v = VERSION;
    const catBrandMap={};
    (db.categories||[]).forEach(c=>{
      const seen={};
      const own=(c.brands||[]).filter(b=>(b.name||'').trim()).map(b=>({
        id:b.id||uid('br_'),
        name:(b.name||'').trim(),
        logo:sanitizeImage(b.logo)
      })).filter(b=>seen[b.name.toLowerCase()]?false:(seen[b.name.toLowerCase()]=true));
      catBrandMap[c.id]=own;
      c.brands=own;
    });
    (db.subcategories||[]).forEach(s=>{
      s.image = sanitizeImage(s.image);
      if(!Array.isArray(s.brands) || !s.brands.length) return;
      const list=catBrandMap[s.categoryId] || (catBrandMap[s.categoryId]=[]);
      const seen=new Set(list.map(b=>(b.name||'').toLowerCase()));
      s.brands.forEach(b=>{
        const name=(b.name||'').trim();
        if(!name || seen.has(name.toLowerCase())) return;
        list.push({ id:b.id||uid('br_'), name, logo:sanitizeImage(b.logo) });
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
        image:sanitizeImage(c.image)
      }));
    }
    db.products = (db.products||[]).map(p=>({
      ...p,
      image:sanitizeImage(p.image),
      images:(Array.isArray(p.images) ? p.images : [p.image]).map(sanitizeImage).filter(Boolean),
      description:p.description || '',
      details:Array.isArray(p.details) ? p.details.filter(Boolean) : [],
      variants:(p.variants||[]).map(v=>({
        ...v,
        barcode:v.barcode || '',
        sku:v.sku || ((p.id && v.value) ? `KNX-${String(p.id).replace(/-/g,'').toUpperCase()}-${String(v.value).toUpperCase().replace(/[^A-Z0-9]+/g,'').slice(0,8)}` : '')
      }))
    }));
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
    if(!db.deliverySettings) db.deliverySettings = defaultDeliverySettings();
    const deliveryDefaults = defaultDeliverySettings();
    const savedDeliveryMethods = Array.isArray(db.deliverySettings.methods) ? db.deliverySettings.methods : [];
    db.deliverySettings.methods = savedDeliveryMethods.length
      ? savedDeliveryMethods.map(method => ({
          key: String(method && method.key || '').trim() || uid('delivery_'),
          label: String(method && method.label || 'Delivery').trim() || 'Delivery',
          rate: Math.max(0, +(method && method.rate || 0)),
          enabled: method && method.enabled !== false
        }))
      : deliveryDefaults.methods.map(method => ({ ...method }));
    if(!db.taxSettings) db.taxSettings = defaultTaxSettings();
    const taxDefaults = defaultTaxSettings();
    const savedTaxRates = Array.isArray(db.taxSettings.rates) ? db.taxSettings.rates : [];
    db.taxSettings.rates = savedTaxRates.length
      ? savedTaxRates.map(rate => ({
          id: String(rate && rate.id || uid('tax_')),
          type: String(rate && rate.type || 'GST').trim() || 'GST',
          rate: Math.max(0, +(rate && rate.rate || 0)),
          startDate: String(rate && rate.startDate || '').trim() || '2026-01-01',
          enabled: rate && rate.enabled !== false
        })).sort((a,b)=>String(a.startDate).localeCompare(String(b.startDate)))
      : taxDefaults.rates.map(rate => ({ ...rate }));
    if(!db.smsSettings) db.smsSettings = defaultSmsSettings();
    const smsDefaults = defaultSmsSettings();
    db.smsSettings.senderId = String(db.smsSettings.senderId || smsDefaults.senderId).trim() || smsDefaults.senderId;
    db.smsSettings.templates = {
      confirmed: String(db.smsSettings.templates && db.smsSettings.templates.confirmed || smsDefaults.templates.confirmed).trim() || smsDefaults.templates.confirmed,
      outForDelivery: String(db.smsSettings.templates && db.smsSettings.templates.outForDelivery || smsDefaults.templates.outForDelivery).trim() || smsDefaults.templates.outForDelivery,
      delivered: String(db.smsSettings.templates && db.smsSettings.templates.delivered || smsDefaults.templates.delivered).trim() || smsDefaults.templates.delivered,
    };
    db.users = (db.users||[]).map(normalizeUser);
    db.orders = (db.orders||[]).map(o=>({
      transferSlip:'',
      bankName:'',
      accountNumber:'',
      deliveryType:'address',
      deliveryInfo:null,
      addressMeta:null,
      notifications:null,
      stockAdjusted:false,
      stockRestored:false,
      stockAdjustedAt:null,
      stockRestoredAt:null,
      ...o,
      deliveryType:(o && o.deliveryType)==='standard' ? 'address' : (o && o.deliveryType || 'address')
    })).map(order => {
      order.addressMeta = normalizeOrderAddressMeta(order.addressMeta);
      return ensureOrderNotificationState(order);
    });
    db.payments = (db.payments||[]).map(p=>({ slipImage:'', bankName:'', accountNumber:'', verifiedAt:null, ...p }));
    db.orderSeq = Math.max(1, +(db.orderSeq || 0) || nextOrderSequence(db));
    return db;
  }
  function cloudConfig(){ return window.KANXI_SUPABASE || {}; }
  function readCloudCache(){
    if(!USE_CLOUD_CACHE) return null;
    try{ return JSON.parse(localStorage.getItem(CLOUD_CACHE_KEY)||'null'); }catch(_){ return null; }
  }
  function writeCloudCache(db){
    if(!USE_CLOUD_CACHE) return;
    try{ localStorage.setItem(CLOUD_CACHE_KEY, JSON.stringify(db)); }catch(_){}
  }
  function emitSync(status, detail={}){ window.dispatchEvent(new CustomEvent(CLOUD_STATUS_EVENT,{detail:{status,...detail}})); }
  async function cloudFetch(method, query='', body){
    const cfg=cloudConfig(), row=cloudRow();
    if(!cfg.url || !cfg.publishableKey) throw new Error('Missing Supabase config');
    const res = await fetch(`${cfg.url}/rest/v1/${row.table}${query}`, {
      method,
      headers:{
        apikey: cfg.publishableKey,
        Authorization: `Bearer ${cfg.publishableKey}`,
        'Content-Type': 'application/json',
        ...(method==='POST' ? { Prefer:'resolution=merge-duplicates,return=minimal' } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
    const text = await res.text();
    if(!res.ok) throw new Error(text || `Supabase ${method} failed`);
    return text ? JSON.parse(text) : null;
  }
  function cloudRow(){ const cfg=cloudConfig(); return { table:cfg.table||'kanxi_site_data', id:cfg.rowId||'main' }; }
  async function saveCloudNow(db){
    const row=cloudRow();
    const clean=normalize(db), raw=JSON.stringify(clean);
    cloudDb = clean;
    writeCloudCache(clean);
    emitSync('saving');
    pendingCloudHash = raw;
    try{
      await cloudFetch('POST', '', { id:row.id, data:clean, updated_at:new Date().toISOString() });
      lastCloudHash = raw;
      pendingCloudHash = '';
      emitSync('saved');
    }catch(e){
      pendingCloudHash = '';
      console.warn('Kanxi Supabase save failed:', e.message);
      emitSync('error',{message:e.message});
    }
  }
  let cloudSyncQueued = false;
  function scheduleDeferredCloudBoot(force=false){
    if(!CAN_SYNC_CLOUD || !DEFER_CLOUD_BOOT) return;
    if(cloudBootTimer && !force) return;
    const start = () => {
      if(cloudBootTimer){ clearTimeout(cloudBootTimer); cloudBootTimer = null; }
      scheduleCloudSync(true);
    };
    const queue = () => {
      if(cloudBootTimer) clearTimeout(cloudBootTimer);
      cloudBootTimer = setTimeout(start, force ? 200 : 2800);
    };
    if(document.readyState === 'complete') queue();
    else window.addEventListener('load', queue, { once:true });
  }
  function scheduleCloudSync(force=false){
    if(!CAN_SYNC_CLOUD || (cloudSyncQueued && !force)) return;
    cloudSyncQueued = true;
    const run = () => syncFromCloud().finally(()=>{ cloudSyncQueued = false; });
    if(window.requestIdleCallback && !force) requestIdleCallback(run, { timeout: 1500 });
    else setTimeout(run, 1);
  }
  function loadSupabaseRuntime(){
    if(window.supabase && typeof window.supabase.createClient === 'function') return Promise.resolve(window.supabase);
    if(realtimeClientPromise) return realtimeClientPromise;
    realtimeClientPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-kanxi-supabase="1"]`);
      if(existing){
        existing.addEventListener('load', () => resolve(window.supabase), { once:true });
        existing.addEventListener('error', () => reject(new Error('Supabase runtime failed to load')), { once:true });
        return;
      }
      const script = document.createElement('script');
      script.src = SUPABASE_JS_SRC;
      script.async = true;
      script.defer = true;
      script.dataset.kanxiSupabase = '1';
      script.onload = () => {
        if(window.supabase && typeof window.supabase.createClient === 'function') resolve(window.supabase);
        else reject(new Error('Supabase runtime unavailable'));
      };
      script.onerror = () => reject(new Error('Supabase runtime failed to load'));
      document.head.appendChild(script);
    }).catch(error => {
      realtimeClientPromise = null;
      throw error;
    });
    return realtimeClientPromise;
  }
  function startRealtimeSync(){
    if(!REALTIME_ENABLED || realtimeStarted) return;
    realtimeStarted = true;
    loadSupabaseRuntime().then((runtime) => {
      const cfg = cloudConfig();
      if(!cfg.url || !cfg.publishableKey) return;
      const row = cloudRow();
      const client = runtime.createClient(cfg.url, cfg.publishableKey, {
        auth: { persistSession:false, autoRefreshToken:false, detectSessionInUrl:false }
      });
      realtimeChannel = client
        .channel(`kanxi-store-${row.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: row.table,
          filter: `id=eq.${row.id}`
        }, () => {
          scheduleCloudSync(true);
        })
        .subscribe((status) => {
          if(status === 'SUBSCRIBED') emitSync('realtime');
        });
    }).catch(error => {
      console.warn('Kanxi realtime subscription failed:', error.message);
    });
  }
  function loadCloud(force=false){
    if(cloudLoaded && !force) return cloudDb;
    const cached = normalize(cloudDb || readCloudCache() || emptyCloudDb());
    cloudDb = cached;
    cloudLoaded = true;
    lastCloudHash = JSON.stringify(cached);
    emitSync('loaded', { cached:true });
    startRealtimeSync();
    if(force || !DEFER_CLOUD_BOOT) scheduleCloudSync(force);
    else scheduleDeferredCloudBoot(force);
    return cloudDb;
  }
  function load(){
    if(USE_LOCAL){
      const cachedCloud = readCloudCache();
      const localDb = readLocal();
      const preferred = cachedCloud || (looksLikeSeededDemo(localDb) ? null : localDb) || emptyCloudDb();
      const db=normalize(preferred);
      writeLocal(db);
      if(CAN_SYNC_CLOUD) scheduleCloudSync();
      return db;
    }
    return loadCloud();
  }
  async function pushCloud(db){
    if(!CAN_SYNC_CLOUD) return;
    const row=cloudRow(), raw=JSON.stringify(db);
    if(raw===lastCloudHash && raw!==pendingCloudHash) return;
    emitSync('saving');
    writeCloudCache(db);
    pendingCloudHash = raw;
    try{
      await cloudFetch('POST', '', {
        id: row.id,
        data: db,
        updated_at: new Date().toISOString()
      });
    }catch(error){
      pendingCloudHash = '';
      console.warn('Kanxi Supabase save failed:', error.message);
      emitSync('error',{message:error.message});
      return;
    }
    lastCloudHash = raw;
    pendingCloudHash = '';
    emitSync('saved');
  }
  function queueCloudSave(db){
    if(!CAN_SYNC_CLOUD) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(()=>pushCloud(db), 400);
  }
  function save(db){
    const clean=normalize(db);
    if(USE_LOCAL) writeLocal(clean);
    cloudDb = clean;
    writeCloudCache(clean);
    queueCloudSave(clean);
  }
  function saveNow(db){
    const clean = normalize(db);
    if(USE_LOCAL) writeLocal(clean);
    cloudDb = clean;
    writeCloudCache(clean);
    if(!CAN_SYNC_CLOUD) return Promise.resolve(clean);
    return saveCloudNow(clean).then(()=>clean);
  }
  async function syncFromCloud(){
    if(!CAN_SYNC_CLOUD) return { ok:true, local:true };
    const row=cloudRow();
    emitSync('loading');
    let data;
    try{
      const rows = await cloudFetch('GET', `?id=eq.${encodeURIComponent(row.id)}&select=data,updated_at&limit=1`);
      data = rows && rows[0];
    }catch(error){
      console.warn('Kanxi Supabase load failed:', error.message);
      emitSync('error',{message:error.message});
      return { ok:false, error };
    }
    if(!data || !data.data){
      if(!USE_LOCAL){
        await pushCloud(load());
        return { ok:true, seeded:true };
      }
      emitSync('loaded', { empty:true });
      return { ok:true, empty:true };
    }
    const localDb = USE_LOCAL ? normalize(readCloudCache() || (looksLikeSeededDemo(readLocal()) ? null : readLocal()) || emptyCloudDb()) : load();
    if(USE_LOCAL) writeLocal(localDb);
    const db=normalize(data.data), cloudRaw=JSON.stringify(db), localRaw=JSON.stringify(localDb), liveRaw=JSON.stringify(cloudDb||localDb);
    if(pendingCloudHash && cloudRaw!==pendingCloudHash && liveRaw===pendingCloudHash){
      emitSync('loaded', { pending:true });
      return { ok:true, pending:true };
    }
    lastCloudHash = cloudRaw;
    if(cloudRaw!==localRaw){
      cloudDb = db;
      writeCloudCache(db);
      if(USE_LOCAL) writeLocal(db);
      try{
        const session = JSON.parse(sessionStorage.getItem('kanxi_session')||'null') || window._kanxiSession || null;
        if(session){
          const nextUser = (db.users||[]).find(u => (session.id && u.id===session.id) || (session.phone && String(u.phone||'').replace(/\D/g,'')===String(session.phone||'').replace(/\D/g,'')));
          if(nextUser){
            window._kanxiSession = nextUser;
            sessionStorage.setItem('kanxi_session', JSON.stringify(nextUser));
          }
        }
      }catch(_){}
      window.dispatchEvent(new CustomEvent(CLOUD_EVENT,{detail:{source:'supabase'}}));
    }
    emitSync('loaded');
    return { ok:true };
  }

  function upsertInto(db, c, item){
      if(!db[c]) db[c]=[];
      let idx = item && item.id ? db[c].findIndex(x=>x.id===item.id) : -1;
      if(c==='users' && idx===-1 && item && item.phone){
        const phone = String(item.phone).replace(/\D/g,'');
        idx = db[c].findIndex(x=>String(x.phone||'').replace(/\D/g,'')===phone);
        if(idx!==-1) item.id = db[c][idx].id;
      }
      if(idx===-1 && !item.id){
        item.id=uid(c[0]+'_');
        db[c].push(item);
      } else if(idx===-1){
        db[c].push(item);
      } else {
        db[c][idx]={...db[c][idx],...item};
        item = db[c][idx];
      }
      return item;
  }

  const api = {
    ORDER_FLOW, VARIANT_TYPES, PAYMENT_METHODS, DELIVERY_METHODS, uid, im, BLANK_IMAGE,
    useLocalStorage: USE_LOCAL,
    phoneKey(value){ return String(value || '').replace(/\D/g,''); },
    all(){ return load(); },
    reset(){ const db=normalize(emptyCloudDb()); save(db); return db; },
    syncFromCloud,
    list(c){ return load()[c]||[]; },
    get(c,id){ return (load()[c]||[]).find(x=>x.id===id); },
    upsert(c,item){
      const db=load();
      item = upsertInto(db, c, item);
      save(db);
      return item;
    },
    async upsertNow(c,item){
      const db=load();
      item = upsertInto(db, c, item);
      await saveNow(db);
      return item;
    },
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
    barcodeOfVariant(p, v){ return (v&&v.barcode) || ''; },
    findBySku(sku){
      sku=(sku||'').trim().toUpperCase(); if(!sku) return null;
      for(const p of this.list('products')){
        const vs=p.variants||[];
        if(vs.length){ const v=vs.find(x=>this.skuOfVariant(p,x).toUpperCase()===sku); if(v) return {product:p,variant:v}; }
        else if(this.skuFor(p.id,null).toUpperCase()===sku) return {product:p,variant:null};
      }
      return null;
    },
    findByVariantCode(code){
      const raw=(code||'').trim();
      if(!raw) return null;
      const bySku=this.findBySku(raw);
      if(bySku) return bySku;
      for(const p of this.list('products')){
        const vs=p.variants||[];
        if(vs.length){
          const v=vs.find(x=>(x.barcode||'').trim()===raw);
          if(v) return { product:p, variant:v };
        }
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
    availableStockOf(p){
      const id=typeof p==='string'?p:p.id;
      const active=this.activeBatchOf(id, null);
      return Math.max(0, +(active&&active.stock||0));
    },
    availableStockOfVariant(pid,vid){
      const active=this.activeBatchOf(pid, vid);
      return Math.max(0, +(active&&active.stock||0));
    },
    stockOf(p){ const id=typeof p==='string'?p:p.id; return this.batchesOf(id).reduce((s,b)=>s+(+b.stock||0),0); },
    stockOfVariant(pid,vid){ return this.batchesOf(pid).filter(b=>b.variantId===vid).reduce((s,b)=>s+(+b.stock||0),0); },
    priceOf(p){
      const variants = p.variants || [];
      if(variants.length){
        const activePrices = variants
          .map(v => this.activeBatchOf(p.id, v.id))
          .filter(Boolean)
          .map(b => +b.sellingPrice)
          .filter(n => n > 0);
        if(activePrices.length) return Math.min(...activePrices);
        const anyVariantPrices = this.batchesOf(p.id)
          .filter(b => b.variantId)
          .map(b => +b.sellingPrice)
          .filter(n => n > 0);
        if(anyVariantPrices.length) return Math.min(...anyVariantPrices);
      }
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
      if(tn.length) return {text:tn[0],gold:false};
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
    async saveHomepage(hp){ const db=load(); db.homepage=hp; await saveNow(db); return db.homepage; },
    getPaymentSettings(){ return load().paymentSettings || defaultPaymentSettings(); },
    async savePaymentSettings(settings){
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
      await saveNow(db);
      return db.paymentSettings;
    },
    getDeliverySettings(){ return load().deliverySettings || defaultDeliverySettings(); },
    getSmsSettings(){ return load().smsSettings || defaultSmsSettings(); },
    async saveSmsSettings(settings){
      const db = load();
      const defaults = defaultSmsSettings();
      db.smsSettings = {
        senderId: String(settings && settings.senderId || defaults.senderId).trim() || defaults.senderId,
        templates: {
          confirmed: String(settings && settings.templates && settings.templates.confirmed || defaults.templates.confirmed).trim() || defaults.templates.confirmed,
          outForDelivery: String(settings && settings.templates && settings.templates.outForDelivery || defaults.templates.outForDelivery).trim() || defaults.templates.outForDelivery,
          delivered: String(settings && settings.templates && settings.templates.delivered || defaults.templates.delivered).trim() || defaults.templates.delivered
        }
      };
      await saveNow(db);
      return db.smsSettings;
    },
    getTaxSettings(){ return load().taxSettings || defaultTaxSettings(); },
    async saveTaxSettings(settings){
      const db = load();
      const rates = Array.isArray(settings && settings.rates) ? settings.rates : [];
      db.taxSettings = {
        rates: rates.map(rate => ({
          id: String(rate && rate.id || uid('tax_')),
          type: String(rate && rate.type || 'GST').trim() || 'GST',
          rate: Math.max(0, +(rate && rate.rate || 0)),
          startDate: String(rate && rate.startDate || '').trim() || '2026-01-01',
          enabled: rate && rate.enabled !== false
        })).sort((a,b)=>String(a.startDate).localeCompare(String(b.startDate)))
      };
      await saveNow(db);
      return db.taxSettings;
    },
    activeTaxRate(at = Date.now()){
      const settings = this.getTaxSettings();
      const current = new Date(at).toISOString().slice(0,10);
      const enabledRates = (settings.rates || []).filter(rate => rate.enabled !== false).sort((a,b)=>String(a.startDate).localeCompare(String(b.startDate)));
      const currentRates = enabledRates.filter(rate => String(rate.startDate || '') <= current);
      return currentRates[currentRates.length - 1] || enabledRates[enabledRates.length - 1] || null;
    },
    currentTaxRate(at = Date.now()){
      const rule = this.activeTaxRate(at);
      return Math.max(0, +(rule && rule.rate || 0));
    },
    taxType(at = Date.now()){
      const rule = this.activeTaxRate(at);
      return rule && rule.type || 'Tax';
    },
    taxAmountFromInclusive(amount, at = Date.now()){
      const gross = Math.max(0, +(amount || 0));
      const rate = this.currentTaxRate(at);
      if(!gross || !rate) return 0;
      return Math.round((gross - (gross / (1 + rate / 100))) * 100) / 100;
    },
    priceExcludingTax(amount, at = Date.now()){
      const gross = Math.max(0, +(amount || 0));
      const rate = this.currentTaxRate(at);
      if(!gross || !rate) return gross;
      return Math.round((gross / (1 + rate / 100)) * 100) / 100;
    },
    getActiveDeliveryMethods(){
      return (this.getDeliverySettings().methods || []).filter(method => method.enabled !== false);
    },
    deliveryMethod(key){
      const normKey = key === 'standard' ? 'address' : key;
      const methods = this.getDeliverySettings().methods || [];
      return methods.find(method => method.key === normKey) || null;
    },
    deliveryLabel(key){
      const method = this.deliveryMethod(key);
      if(method) return method.label;
      return key === 'standard' ? 'Address' : 'Delivery';
    },
    deliveryRate(key){
      const method = this.deliveryMethod(key);
      return method ? Math.max(0, +(method.rate || 0)) : 0;
    },
    async saveDeliverySettings(settings){
      const db = load();
      const methods = Array.isArray(settings && settings.methods) ? settings.methods : [];
      db.deliverySettings = {
        methods: methods.map(method => ({
          key: String(method && method.key || '').trim() || uid('delivery_'),
          label: String(method && method.label || 'Delivery').trim() || 'Delivery',
          rate: Math.max(0, +(method && method.rate || 0)),
          enabled: method && method.enabled !== false
        }))
      };
      await saveNow(db);
      return db.deliverySettings;
    },
    imageForTag(tagId){ const p=this.storeProducts().find(p=>(p.tags||[]).includes(tagId)); return p?p.image:''; },
    brandById(id){ return this.allBrands().find(b=>b.id===id); },
    productsByTag(tagId){ return this.storeProducts().filter(p=>(p.tags||[]).includes(tagId)).map(p=>this.card(p)); },
    productsByBrand(name){ const n=(name||'').toLowerCase(); return this.storeProducts().filter(p=>(p.brand||'').toLowerCase()===n).map(p=>this.card(p)); },
    offers(limit=12){ return this.storeProducts().filter(p=>this.tagNames(p.tags).includes('Sale')).slice(0,limit).map(p=>this.card(p)); },
    parseCartItemId(rawId){
      const value = String(rawId || '');
      if(!value) return { productId:null, variantId:null };
      if(value.includes('::')){
        const [productId, variantId] = value.split('::');
        return { productId:productId || null, variantId:variantId || null };
      }
      const products = this.list('products');
      let matched = null;
      products.forEach(product => {
        if(matched || !product || !product.id) return;
        const prefix = `${product.id}_`;
        if(value === product.id) matched = { productId:product.id, variantId:null };
        else if(value.startsWith(prefix)) matched = { productId:product.id, variantId:value.slice(prefix.length) || null };
      });
      if(matched) return matched;
      return { productId:value, variantId:null };
    },
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
      const id=nextOrderId(db);
      const methodKey=String(o.payMethod||'card').toLowerCase();
      const settings=db.paymentSettings || defaultPaymentSettings();
      const method=(settings.methods||[]).find(m=>m.key===methodKey) || PAYMENT_METHODS.find(m=>m.key===methodKey) || PAYMENT_METHODS[0];
      const transfer=methodKey==='transfer';
      const cod=methodKey==='cod';
      const bankTransfer=settings.bankTransfer || defaultPaymentSettings().bankTransfer;
      const orderStatus=transfer?'Pending Slip Verification':(cod?'Order Accepted':'Paid');
      const payStatus=transfer?'Pending Slip Verification':(cod?'Pending':'Paid');
      const items=(o.items||[]).map(i=>({
        productId:i.productId||null,
        variantId:i.variantId||null,
        name:i.name,
        qty:Math.max(1, +(i.qty || 1)),
        price:+(i.price || 0),
        image:i.image||'',
        size:i.size || ''
      }));
      validateOrderStock(db, items);
      const delivery = o.deliveryInfo ? {
        boatName:o.deliveryInfo.boatName || '',
        contactNumber:o.deliveryInfo.contactNumber || '',
        departureTime:o.deliveryInfo.departureTime || '',
        note:o.deliveryInfo.note || ''
      } : null;
      const order={ id, userName:o.userName||'Guest', userPhone:o.userPhone||'', date:Date.now(),
        status:orderStatus, payStatus, payMethod:method.label,
        items,
        addressMeta: normalizeOrderAddressMeta(o.addressMeta),
        notifications: { confirmedAt:null, outForDeliveryAt:null, deliveredAt:null },
        stockAdjusted:false,
        stockRestored:false,
        stockAdjustedAt:null,
        stockRestoredAt:null,
        shipping:o.shipping||0, address:o.address||'', transferSlip:o.transferSlip||'',
        bankName:transfer?(o.bankName||bankTransfer.bankName||''):'',
        accountNumber:transfer?(o.accountNumber||bankTransfer.accountNumber||''):'',
        deliveryType:(o.deliveryType === 'standard' ? 'address' : (o.deliveryType || 'address')),
        deliveryInfo:delivery
      };
      ensureOrderStockState(db, order);
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
      saveNow(db).catch(error=>console.warn('Kanxi order save failed:', error.message));
      return order; },
    async clearOrdersAndPayments(){
      const db = load();
      db.orders = [];
      db.payments = [];
      db.orderSeq = 1;
      await saveNow(db);
      return true;
    },

    advanceOrder(id){ const db=load(),o=db.orders.find(x=>x.id===id); if(!o)return; const i=ORDER_FLOW.indexOf(o.status); if(i>=0&&i<ORDER_FLOW.length-1)o.status=ORDER_FLOW[i+1]; if(CONFIRMED_ORDER_STATUSES.includes(o.status))o.payStatus='Paid'; ensureOrderStockState(db, o); ensureOrderNotificationState(o); notifyOrderStatus(o); saveNow(db).catch(error=>console.warn('Kanxi order advance save failed:', error.message)); return o; },
    setOrderStatus(id,st){ const db=load(),o=db.orders.find(x=>x.id===id); if(o){o.status=st; if(CONFIRMED_ORDER_STATUSES.includes(st))o.payStatus='Paid'; ensureOrderStockState(db, o); ensureOrderNotificationState(o); notifyOrderStatus(o); saveNow(db).catch(error=>console.warn('Kanxi order status save failed:', error.message));} return o; },
    setPaymentStatus(id,status){
      const db=load(), p=db.payments.find(x=>x.id===id);
      if(!p) return null;
      p.status=status;
      if(status==='Paid') p.verifiedAt=Date.now();
      const o=db.orders.find(x=>x.id===p.orderId);
      if(o){
        o.payStatus=status;
        if(status==='Paid' && ['Pending Payment','Pending Slip Verification'].includes(o.status)) o.status='Paid';
        ensureOrderStockState(db, o);
        ensureOrderNotificationState(o);
        notifyOrderStatus(o);
      }
      saveNow(db).catch(error=>console.warn('Kanxi payment status save failed:', error.message));
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
    findUserByPhone(phone){
      const key = this.phoneKey(phone);
      return (load().users||[]).find(u=>this.phoneKey(u.phone)===key);
    },
  };
  return api;
})();
