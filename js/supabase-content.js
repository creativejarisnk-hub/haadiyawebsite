/* Public content only. No order records, customer data, credentials, binary media or local counters. Public media URLs only. */
window.HaadiyaContent = (() => {
  const client = HaadiyaSupabase.client;
  const schema = 2;
  const own = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
  const mediaUrl = v => { if (v == null || v === "") return null; if (!HaadiyaMedia.isUrl(v)) throw Error("Invalid cloud media URL."); return v; };
  const mediaList = v => { if (!Array.isArray(v)) throw Error("Invalid cloud photo list."); return v.map(mediaUrl).filter(Boolean); };
  const mediaColors = v => { if (!obj(v)) throw Error("Invalid cloud colour photos."); return Object.fromEntries(Object.keys(v).sort().map(k=>[k,mediaList(v[k])])); };
  const clone = v => JSON.parse(JSON.stringify(v));
  const obj = v => v && typeof v === 'object' && !Array.isArray(v);
  const str = (v, fallback = '') => typeof v === 'string' ? v : fallback;
  const num = (v, fallback = 0) => Number.isFinite(v) && v >= 0 ? v : fallback;
  const pickStrings = (source, keys) => Object.fromEntries(keys.map(k => [k, str(source[k])]));
  const settingsKeys = ['storeName','tagline','heroTitle','heroText','email','phone','originAddress','instagram','shopee','linktree','bannerText'];
  function project(source) {
    if (!obj(source) || !Array.isArray(source.products) || !Array.isArray(source.vouchers) || !obj(source.settings)) throw Error('Invalid backup or cloud content format. Nothing was changed.');
    const s = source.settings;
    const defaults = window.HAADIYA_SEED.settings;
    const settings = Object.fromEntries(settingsKeys.map(k => [k, str(s[k], defaults[k] || '')]));
    settings.values = (Array.isArray(s.values) ? s.values : defaults.values).map(v => pickStrings(v || {}, ['label','title','text']));
    const pages = obj(s.pages) ? s.pages : defaults.pages;
    settings.pages = Object.fromEntries(['faq','shipping','privacy','terms'].map(k => [k,str(pages[k],defaults.pages[k])]));
    settings.pages.about = Object.fromEntries(['heroTitle','heroText','body'].map(k => [k,str(pages.about?.[k],defaults.pages.about[k])]));
    for (const k of ["logoHeader","logoFooter","heroImage","heroVideo"]) if (own(s,k)) settings[k]=mediaUrl(s[k]);
    settings.pagesVersion = num(s.pagesVersion, defaults.pagesVersion);
    settings.couriers = (Array.isArray(s.couriers) ? s.couriers : []).filter(v => typeof v === 'string');
    settings.paymentMethodsActive = (Array.isArray(s.paymentMethodsActive) ? s.paymentMethodsActive : []).filter(v => typeof v === 'string');
    const products = source.products.map(p => {
      if (!obj(p) || typeof p.slug !== 'string' || !p.slug || !Array.isArray(p.variants)) throw Error('Invalid product in content.');
      return {...pickStrings(p,['id','slug','name','summary','details','category','createdAt']),...(own(p,'images')?{images:mediaList(p.images)}:{}),...(own(p,'colorImages')?{colorImages:mediaColors(p.colorImages)}:{}),status:['published','draft','archived'].includes(p.status) ? p.status : 'draft',weightGrams:num(p.weightGrams),variants:p.variants.map(v => {
        if (!obj(v) || typeof v.sku !== 'string' || !v.sku) throw Error('Invalid SKU in content.');
        return {...pickStrings(v,['sku','color','hex','size']),price:num(v.price),stock:num(v.stock),active:v.active !== false};
      })};
    });
    const vouchers = source.vouchers.map(v => {
      if (!obj(v) || typeof v.code !== 'string' || !v.code) throw Error('Invalid voucher in content.');
      return {code:v.code,type:v.type === 'percent' ? 'percent' : 'fixed',value:num(v.value),minSubtotal:num(v.minSubtotal),maxDiscount:v.maxDiscount == null ? null : num(v.maxDiscount),quota:v.quota == null ? null : num(v.quota),active:!!v.active,expiresAt:typeof v.expiresAt === 'string' ? v.expiresAt : null};
    });
    if (new Set(products.map(p=>p.slug)).size !== products.length || new Set(vouchers.map(v=>v.code.toUpperCase())).size !== vouchers.length || new Set(products.flatMap(p=>p.variants.map(v=>v.sku))).size !== products.flatMap(p=>p.variants).length) throw Error('Duplicate product slug, SKU or voucher code. Please correct the backup before importing.');
    return {schema,products,vouchers,settings};
  }
  function decode(content) {
    if (content === null || (obj(content) && Object.keys(content).length === 0)) return null;
    if (!obj(content) || ![1,schema].includes(content.schema)) throw Error('Cloud already contains an unrecognized format. Import is blocked to protect existing data.');
    return project(content);
  }
  async function read() {
    if (!client) throw Error('Supabase unavailable. Check your connection.');
    const {data,error} = await client.from('site_content').select('id,content,updated_at').eq('id','main').maybeSingle();
    if (error) throw Error(error.message);
    if (!data) throw Error('Cloud record main is missing or inaccessible.');
    return {content:decode(data.content),revision:data.updated_at,raw:data.content};
  }
  async function write(source, previous, initial = false) {
    if (!client || !HaadiyaAuth.isAdmin()) throw Error('Verified admin access required.');
    if (!previous || (initial ? previous.content !== null : previous.content === null)) throw Error('Cloud is not in the expected state. Reload first.');
    const content = project(source);
    const next = new Date(Math.max(Date.now(), (Date.parse(previous.revision)||0)+1)).toISOString();
    let q = client.from('site_content').update({content,updated_at:next}).eq('id','main');
    q = previous.revision == null ? q.is('updated_at',null) : q.eq('updated_at',previous.revision);
    // Also protect initial import from changes by an external writer that did not update the timestamp.
    if (initial) q = previous.raw === null ? q.is('content',null) : q.eq('content',JSON.stringify(previous.raw));
    const {data,error} = await q.select('id,content,updated_at').maybeSingle();
    if (error) throw Error(error.message);
    if (!data) throw Error('Save rejected or cloud changed. Reload and review before saving again.');
    const confirmed = decode(data.content);
    if (JSON.stringify(confirmed) !== JSON.stringify(content)) throw Error('Cloud response differs from requested content. Reload to verify.');
    return {content:confirmed,revision:data.updated_at,raw:data.content};
  }
  return Object.freeze({project,read,write});
})();
