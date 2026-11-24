/* Store — one shared data source for the public catalog, cart, vouchers,
   and admin. This preview persists to localStorage. In production, replace
   these functions with calls to orderService / inventoryService on your
   server; prices, stock, discounts, and totals MUST be recomputed server-side. */
const Store = (() => {
  const DB_KEY = "haadiya_db_v1";
  const CART_KEY = "haadiya_cart_v1";
  let db, cart;
  const memory = {};
  const rp = n => "Rp " + Number(n || 0).toLocaleString("id-ID");

  function read(key) {
    try { return localStorage.getItem(key); } catch (e) { return memory[key] || null; }
  }
  function write(key, val) {
    try { localStorage.setItem(key, val); } catch (e) {
      memory[key] = val;
      if (typeof UI !== "undefined") UI.toast("Browser storage is full — the photo is too large. Remove some photos or use smaller files.", "error");
    }
  }
  function seed() {
    db = JSON.parse(JSON.stringify(window.HAADIYA_SEED));
    db.version = window.HAADIYA_SEED.meta.version;
    db.orders = db.initialOrders || [];
    db.inventoryEvents = [];
    save();
  }
  /* v1 → v2: drop collections & spec fields (merged into `details`),
     keep user-entered products, orders, settings, logos, banner. */
  function migrate(old) {
    const seedS = window.HAADIYA_SEED.settings;
    db = old;
    db.version = 2;
    db.products = (db.products || []).map(p => {
      const parts = [];
      if (p.description) parts.push(p.description);
      if (p.details) parts.push(p.details);
      if (p.material) parts.push("Material: " + p.material);
      if (p.fit) parts.push("Fit: " + p.fit);
      if (p.packageContents) parts.push("Package contents: " + p.packageContents);
      if (p.care) parts.push("Care: " + p.care);
      const { collectionId, material, care, fit, packageContents, measurementsNote, description, ...rest } = p;
      return {
        ...rest,
        details: parts.join("\n\n"),
        images: p.images || [],
        colorImages: p.colorImages || {},
        variants: (p.variants || []).map(v => {
          const { measurements, ...vr } = v;
          return { reserved: 0, active: true, ...vr };
        })
      };
    });
    delete db.collections;
    delete db.demoOrders;
    db.vouchers = db.vouchers || JSON.parse(JSON.stringify(window.HAADIYA_SEED.vouchers));
    db.orders = db.orders || [];
    db.inventoryEvents = db.inventoryEvents || [];
    const s = db.settings = db.settings || {};
    for (const k of ["logoHeader", "logoFooter", "heroImage", "heroVideo", "bannerText"]) if (s[k] === undefined) s[k] = seedS[k];
    if (!s.heroTitle) s.heroTitle = seedS.heroTitle;
    if (!s.heroText) s.heroText = seedS.heroText;
    if (!Array.isArray(s.values) || !s.values.length) s.values = JSON.parse(JSON.stringify(seedS.values));
    if ((s.pagesVersion || 1) < seedS.pagesVersion) {
      s.pages = JSON.parse(JSON.stringify(seedS.pages));
      s.pagesVersion = seedS.pagesVersion;
    }
    delete s.sizeTable;
    delete s.returnPolicy;
    delete s.logo;
    save();
  }
  function load() {
    const raw = read(DB_KEY);
    let old = null;
    if (raw) { try { old = JSON.parse(raw); } catch (e) { old = null; } }
    if (!old) seed();
    else if (old.version !== 2) migrate(old);
    else db = old;
    /* kunci baru pada database v2 yang sudah ada */
    const seedS = window.HAADIYA_SEED.settings;
    let touched = false;
    if (!Array.isArray(db.settings.values) || !db.settings.values.length) { db.settings.values = JSON.parse(JSON.stringify(seedS.values)); touched = true; }
    if (db.settings.heroVideo === undefined) { db.settings.heroVideo = null; touched = true; }
    if (touched) save();
    const rawCart = read(CART_KEY);
    try { cart = rawCart ? JSON.parse(rawCart) : []; } catch (e) { cart = []; }
    if (!Array.isArray(cart)) cart = [];
  }
  function save() { write(DB_KEY, JSON.stringify(db)); }
  function saveCart() { write(CART_KEY, JSON.stringify(cart)); }
  function emit() { document.dispatchEvent(new CustomEvent("haadiya:change")); }

  /* ---- Catalog ---- */
  function products(includeAll) {
    return db.products.filter(p => includeAll || p.status === "published");
  }
  function product(slug) { return db.products.find(p => p.slug === slug); }
  function variant(sku) {
    for (const p of db.products) {
      const v = p.variants.find(v => v.sku === sku);
      if (v) return { product: p, variant: v };
    }
    return null;
  }
  function available(v) { return Math.max(0, (v.stock || 0) - (v.reserved || 0)); }
  function productStock(p) {
    return p.variants.filter(v => v.active).reduce((s, v) => s + available(v), 0);
  }
  function priceRange(p) {
    const prices = p.variants.filter(v => v.active).map(v => v.price);
    if (!prices.length) return { min: 0, max: 0 };
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }
  function imagesFor(p, color) {
    const ci = color && p.colorImages && p.colorImages[color];
    return (ci && ci.length) ? ci : (p.images || []);
  }

  /* ---- Cart ---- */
  function cartItems() {
    return cart.map(item => {
      const found = variant(item.sku);
      if (!found) return null;
      return { ...item, ...found, available: available(found.variant) };
    }).filter(Boolean);
  }
  function cartCount() { return cart.reduce((s, i) => s + i.qty, 0); }
  function cartSubtotal() {
    return cartItems().reduce((s, i) => s + i.variant.price * i.qty, 0);
  }
  function addToCart(sku, qty) {
    const found = variant(sku);
    if (!found) return { ok: false, message: "Variant not found." };
    if (!found.variant.active || found.product.status !== "published")
      return { ok: false, message: "This variant is not available." };
    const avail = available(found.variant);
    if (avail <= 0) return { ok: false, message: "This variant is sold out. Please choose another." };
    const existing = cart.find(i => i.sku === sku);
    const current = existing ? existing.qty : 0;
    if (current + qty > avail) {
      return { ok: false, message: `Not enough stock. ${avail} left${current ? `, ${current} already in your cart` : ""}.` };
    }
    if (existing) existing.qty += qty; else cart.push({ sku, qty });
    saveCart(); emit();
    return { ok: true };
  }
  function setCartQty(sku, qty) {
    const found = variant(sku);
    if (!found) return { ok: false, message: "Variant not found." };
    const avail = available(found.variant);
    if (qty <= 0) { removeFromCart(sku); return { ok: true }; }
    if (qty > avail) return { ok: false, message: `Not enough stock. Maximum ${avail} for this variant.` };
    const item = cart.find(i => i.sku === sku);
    if (item) item.qty = qty;
    saveCart(); emit();
    return { ok: true };
  }
  function removeFromCart(sku) {
    cart = cart.filter(i => i.sku !== sku);
    saveCart(); emit();
  }
  function clearCart() { cart = []; saveCart(); emit(); }
  function cartIssues() {
    return cartItems().filter(i => i.qty > i.available || !i.variant.active);
  }

  /* ---- Vouchers ---- */
  function vouchers() { return db.vouchers || []; }
  function voucher(code) {
    return vouchers().find(v => v.code.toLowerCase() === String(code || "").trim().toLowerCase());
  }
  function validateVoucher(code, subtotal) {
    const v = voucher(code);
    if (!v) return { ok: false, message: "Voucher code not found." };
    if (!v.active) return { ok: false, message: "This voucher is no longer active." };
    if (v.expiresAt && new Date(v.expiresAt) < new Date()) return { ok: false, message: "This voucher has expired." };
    if (v.quota != null && (v.used || 0) >= v.quota) return { ok: false, message: "This voucher has reached its usage limit." };
    if (subtotal < (v.minSubtotal || 0)) return { ok: false, message: `Requires a minimum subtotal of ${rp(v.minSubtotal)}.` };
    let discount = v.type === "percent" ? Math.round(subtotal * v.value / 100) : Math.min(v.value, subtotal);
    if (v.type === "percent" && v.maxDiscount) discount = Math.min(discount, v.maxDiscount);
    discount = Math.max(0, Math.min(discount, subtotal));
    return { ok: true, voucher: v, discount };
  }
  function saveVoucher(data, originalCode) {
    const code = String(data.code || "").trim().toUpperCase();
    if (!/^[A-Z0-9-]{3,20}$/.test(code)) return { ok: false, message: "Code must be 3–20 characters: letters, numbers, dashes." };
    const existing = voucher(code);
    if (existing && existing.code !== (originalCode || "").toUpperCase()) return { ok: false, message: "That voucher code already exists." };
    if (!Number.isInteger(data.value) || data.value <= 0) return { ok: false, message: "Value must be a positive whole number." };
    if (data.type === "percent" && data.value > 100) return { ok: false, message: "Percent value cannot exceed 100." };
    const record = {
      code, type: data.type, value: data.value,
      minSubtotal: Math.max(0, Number(data.minSubtotal) || 0),
      maxDiscount: data.maxDiscount ? Math.max(0, Number(data.maxDiscount)) : null,
      quota: data.quota != null && data.quota !== "" ? Math.max(0, Number(data.quota)) : null,
      used: existing ? existing.used || 0 : 0,
      active: !!data.active,
      expiresAt: data.expiresAt || null
    };
    if (existing) Object.assign(existing, record);
    else vouchers().push(record);
    save(); emit();
    return { ok: true };
  }
  function deleteVoucher(code) {
    db.vouchers = vouchers().filter(v => v.code !== code);
    save(); emit();
    return { ok: true };
  }

  /* ---- Orders (preview — production must go through a server orderService) ---- */
  function orders() { return db.orders.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
  function order(id) { return db.orders.find(o => o.id === id); }
  function findOrder(orderNumber, email) {
    return db.orders.find(o =>
      o.orderNumber.toLowerCase() === String(orderNumber).trim().toLowerCase() &&
      o.customer.email.toLowerCase() === String(email).trim().toLowerCase());
  }
  function createOrder({ customer, address, note, voucherCode }) {
    const items = cartItems();
    if (!items.length) return { ok: false, message: "Your cart is empty." };
    for (const i of items) {
      if (i.qty > i.available)
        return { ok: false, message: `Stock for ${i.product.name} (${i.variant.color} / ${i.variant.size}) changed. ${i.available} left — please adjust your cart.` };
    }
    const subtotal = items.reduce((s, i) => s + i.variant.price * i.qty, 0);
    let discount = 0, voucherSnap = null;
    if (voucherCode) {
      const check = validateVoucher(voucherCode, subtotal);
      if (!check.ok) return { ok: false, message: "Voucher: " + check.message };
      discount = check.discount;
      voucherSnap = { code: check.voucher.code, type: check.voucher.type, value: check.voucher.value, discount };
      check.voucher.used = (check.voucher.used || 0) + 1;
    }
    const id = (crypto.randomUUID ? crypto.randomUUID() : "o-" + Date.now() + "-" + Math.random().toString(36).slice(2));
    const orderNumber = "HDY-" + Date.now().toString(36).toUpperCase().slice(-6) + Math.floor(Math.random() * 90 + 10);
    const now = new Date().toISOString();
    const snapshot = items.map(i => ({
      sku: i.sku, productSlug: i.product.slug, name: i.product.name,
      variant: `${i.variant.color} / ${i.variant.size}`,
      price: i.variant.price, qty: i.qty, image: imagesFor(i.product, i.variant.color)[0] || ""
    }));
    for (const i of items) {
      i.variant.reserved = (i.variant.reserved || 0) + i.qty;
      db.inventoryEvents.push({ at: now, sku: i.sku, type: "reserve", qty: i.qty, orderId: id, actor: "checkout" });
    }
    const order = {
      id, orderNumber, createdAt: now,
      customer, address: { ...address, note: note || "" },
      items: snapshot, subtotal, voucher: voucherSnap, discount,
      shippingCost: null, total: subtotal - discount,
      courier: null, paymentMethod: null,
      paymentStatus: "menunggu_pembayaran", fulfillmentStatus: "menunggu", trackingNumber: "",
      history: [
        { at: now, event: "Order created — stock reserved while awaiting payment" },
        ...(voucherSnap ? [{ at: now, event: `Voucher ${voucherSnap.code} applied — discount ${rp(discount)}` }] : []),
        { at: now, event: "Payment gateway not connected yet — no real transaction was made" }
      ]
    };
    db.orders.push(order);
    save(); clearCart(); emit();
    return { ok: true, order };
  }
  function releaseReservation(o, actor) {
    for (const item of o.items) {
      const found = variant(item.sku);
      if (found) {
        found.variant.reserved = Math.max(0, (found.variant.reserved || 0) - item.qty);
        db.inventoryEvents.push({ at: new Date().toISOString(), sku: item.sku, type: "release", qty: item.qty, orderId: o.id, actor: actor || "system" });
      }
    }
  }
  function cancelOrder(id, actor) {
    const o = order(id);
    if (!o) return { ok: false, message: "Order not found." };
    if (o.paymentStatus === "berhasil")
      return { ok: false, message: "A paid order cannot be cancelled here. Please contact support." };
    if (o.fulfillmentStatus === "dibatalkan") return { ok: false, message: "This order is already cancelled." };
    releaseReservation(o, actor);
    o.fulfillmentStatus = "dibatalkan";
    if (o.paymentStatus === "menunggu_pembayaran") o.paymentStatus = "kedaluwarsa";
    o.history.push({ at: new Date().toISOString(), event: `Order cancelled by ${actor || "system"} — stock reservation released` });
    save(); emit();
    return { ok: true };
  }
  function retryPayment(id) {
    const o = order(id);
    if (!o) return { ok: false, message: "Order not found." };
    if (o.paymentStatus === "berhasil") return { ok: false, message: "This order is already paid." };
    const now = new Date().toISOString();
    for (const item of o.items) {
      const found = variant(item.sku);
      if (!found || available(found.variant) < item.qty)
        return { ok: false, message: `Stock for ${item.name} (${item.variant}) is no longer sufficient to reopen this order. Please place a new order.` };
    }
    for (const item of o.items) {
      const found = variant(item.sku);
      found.variant.reserved = (found.variant.reserved || 0) + item.qty;
      db.inventoryEvents.push({ at: now, sku: item.sku, type: "reserve", qty: item.qty, orderId: id, actor: "retry" });
    }
    o.paymentStatus = "menunggu_pembayaran"; o.fulfillmentStatus = "menunggu";
    o.history.push({ at: now, event: "Order reopened — stock reserved again, awaiting payment" });
    save(); emit();
    return { ok: true };
  }
  const FULFILLMENT_FLOW = { menunggu: ["diproses", "dibatalkan"], diproses: ["dikirim"], dikirim: ["selesai"], selesai: [], dibatalkan: [] };
  function setFulfillment(id, status, trackingNumber, actor) {
    const o = order(id);
    if (!o) return { ok: false, message: "Order not found." };
    const allowed = FULFILLMENT_FLOW[o.fulfillmentStatus] || [];
    if (!allowed.includes(status))
      return { ok: false, message: `Changing from "${o.fulfillmentStatus}" to "${status}" is not allowed.` };
    if (status === "diproses" && o.paymentStatus !== "berhasil")
      return { ok: false, message: "This order is not paid yet. Payment status can only change through gateway verification — admins cannot mark payments as paid." };
    if (status === "dikirim" && !String(trackingNumber || "").trim())
      return { ok: false, message: "Enter the tracking number before marking the order as shipped." };
    if (status === "dibatalkan") return cancelOrder(id, actor);
    if (status === "dikirim") {
      o.trackingNumber = String(trackingNumber).trim();
      for (const item of o.items) {
        const found = variant(item.sku);
        if (found) {
          found.variant.reserved = Math.max(0, (found.variant.reserved || 0) - item.qty);
          found.variant.stock = Math.max(0, found.variant.stock - item.qty);
          db.inventoryEvents.push({ at: new Date().toISOString(), sku: item.sku, type: "confirm-sale", qty: item.qty, orderId: id, actor: actor || "admin" });
        }
      }
    }
    o.fulfillmentStatus = status;
    o.history.push({ at: new Date().toISOString(), event: `Fulfilment status: ${status}${status === "dikirim" ? ` — tracking ${o.trackingNumber}` : ""} (by ${actor || "admin"})` });
    save(); emit();
    return { ok: true };
  }

  /* ---- Admin: products, variants, stock, settings ---- */
  function updateProduct(slug, patch) {
    const p = product(slug);
    if (!p) return { ok: false, message: "Product not found." };
    Object.assign(p, patch);
    save(); emit();
    return { ok: true };
  }
  function addProduct(data) {
    if (db.products.some(p => p.slug === data.slug))
      return { ok: false, message: "That slug is already used by another product." };
    db.products.push({ ...data, id: "p-" + Date.now(), createdAt: new Date().toISOString() });
    save(); emit();
    return { ok: true };
  }
  function deleteProduct(slug) {
    const p = product(slug);
    if (!p) return { ok: false, message: "Product not found." };
    const reserved = p.variants.reduce((s, v) => s + (v.reserved || 0), 0);
    if (reserved > 0)
      return { ok: false, message: `Cannot delete: ${reserved} unit(s) are still reserved on orders awaiting payment. Resolve those orders first.` };
    db.products = db.products.filter(x => x.slug !== slug);
    save(); emit();
    return { ok: true };
  }
  function setStock(sku, newStock, actor, reason) {
    const found = variant(sku);
    if (!found) return { ok: false, message: "SKU not found." };
    const n = Number(newStock);
    if (!Number.isInteger(n) || n < 0) return { ok: false, message: "Stock must be a whole number ≥ 0." };
    if (n < (found.variant.reserved || 0))
      return { ok: false, message: `Stock cannot go below the reserved amount (${found.variant.reserved} unit(s) awaiting payment).` };
    const delta = n - found.variant.stock;
    found.variant.stock = n;
    db.inventoryEvents.push({ at: new Date().toISOString(), sku, type: "adjust", qty: delta, reason: reason || "Manual adjustment", actor: actor || "admin" });
    save(); emit();
    return { ok: true };
  }
  function settings() { return db.settings; }
  function updateSettings(patch) { Object.assign(db.settings, patch); save(); emit(); return { ok: true }; }
  function inventoryEvents() { return (db.inventoryEvents || []).slice().reverse(); }
  function resetData() {
    seed();
    cart = [];
    saveCart(); emit();
  }

  load();
  window.addEventListener("storage", e => {
    if (e.key === DB_KEY || e.key === CART_KEY) {
      load();
      document.dispatchEvent(new CustomEvent("haadiya:external-change"));
      emit();
    }
  });
  return {
    products, product, variant, available, productStock, priceRange, imagesFor,
    cartItems, cartCount, cartSubtotal, addToCart, setCartQty, removeFromCart, clearCart, cartIssues,
    vouchers, voucher, validateVoucher, saveVoucher, deleteVoucher,
    orders, order, findOrder, createOrder, cancelOrder, retryPayment, setFulfillment, FULFILLMENT_FLOW,
    updateProduct, addProduct, deleteProduct, setStock,
    settings, updateSettings, inventoryEvents, resetData
  };
})();