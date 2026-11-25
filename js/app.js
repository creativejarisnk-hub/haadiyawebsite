/* Router & orchestration — hash routing so the site runs without a server (file://) */
const App = (() => {
  let currentView = null, currentQuery = {}, currentPath = "";

  function parseHash() {
    const raw = location.hash.replace(/^#/, "") || "/";
    const [path, qs] = raw.split("?");
    const query = {};
    if (qs) for (const pair of qs.split("&")) {
      const [k, v] = pair.split("=");
      if (k) query[decodeURIComponent(k)] = decodeURIComponent((v || "").replace(/\+/g, " "));
    }
    return { path: path.replace(/\/+$/, "") || "/", query };
  }

  function resolve(path, query) {
    const seg = path.split("/").filter(Boolean);
    const P = PublicViews, A = AdminViews;
    if (seg[0] === "admin") {
      if (seg[1] === "login") return { view: A.login, query, chrome: "bare" };
      if (HaadiyaAuth.isPending()) return { view: { title: () => "Admin — Haadiya Syar’i", html: () => '<div class="login-wrap"><div class="login-card" role="status">Checking your admin session…</div></div>', mount() {} }, query, chrome: "bare" };
      if (!isAdmin()) return { redirect: "#/admin/login" };
      const chrome = "admin";
      if (!seg[1]) return { view: A.dashboard, query, chrome };
      if (seg[1] === "produk" && seg[2]) return { view: A.productEdit, query: { ...query, slug: seg[2] }, chrome };
      if (seg[1] === "produk") return { view: A.products, query, chrome };
      if (seg[1] === "stok") return { view: A.stock, query, chrome };
      if (seg[1] === "pesanan" && seg[2]) return { view: A.orderDetail, query: { ...query, id: seg[2] }, chrome };
      if (seg[1] === "pesanan") return { view: A.orders, query, chrome };
      if (seg[1] === "voucher") return { view: A.vouchersAdmin, query, chrome };
      if (seg[1] === "halaman") return { view: A.pagesAdmin, query, chrome };
      if (seg[1] === "pengaturan") return { view: A.settings, query, chrome };
      return { view: A.dashboard, query, chrome };
    }
    if (!seg.length) return { view: P.home, query, chrome: "public" };
    if (seg[0] === "produk" && seg[1]) return { view: P.product, query: { ...query, slug: seg[1] }, chrome: "public" };
    if (seg[0] === "produk") return { view: P.catalog, query, chrome: "public" };
    if (seg[0] === "cari") return { view: P.search, query, chrome: "public" };
    if (seg[0] === "keranjang") return { view: P.cart, query, chrome: "public" };
    if (seg[0] === "checkout") return { view: P.checkout, query, chrome: "public" };
    if (seg[0] === "pesanan" && seg[1] && seg[2] === "pembayaran") return { view: P.payment, query: { ...query, id: seg[1] }, chrome: "public" };
    if (seg[0] === "pesanan" && seg[1]) return { view: P.order, query: { ...query, id: seg[1] }, chrome: "public" };
    if (seg[0] === "terima-kasih" && seg[1]) return { view: P.thankYou, query: { ...query, id: seg[1] }, chrome: "public" };
    if (seg[0] === "lacak-pesanan") return { view: P.track, query, chrome: "public" };
    if (seg[0] === "tentang") return { view: P.about, query, chrome: "public" };
    if (seg[0] === "faq") return { view: P.faq, query, chrome: "public" };
    if (seg[0] === "kontak") return { view: P.contact, query, chrome: "public" };
    if (seg[0] === "bantuan") return { view: P.shippingPolicy, query, chrome: "public" };
    if (seg[0] === "privasi") return { view: P.privacy, query, chrome: "public" };
    if (seg[0] === "syarat") return { view: P.terms, query, chrome: "public" };
    return { view: { title: () => "Not Found — Haadiya", html: () => `<div class="container section">${UI.emptyState({ icon: "search", title: "Page not found", body: "The link you opened is not available.", action: '<a class="btn btn-primary" href="#/">Back to Home</a>' })}</div>`, mount() {} }, query, chrome: "public" };
  }

  function isAdmin() { return HaadiyaAuth.isAdmin(); }
  function verifiedOrders() {
    try { return JSON.parse(sessionStorage.getItem("haadiya_verified_orders") || "[]"); } catch (e) { return []; }
  }
  function verifyOrder(id) {
    const list = verifiedOrders();
    if (!list.includes(id)) list.push(id);
    try { sessionStorage.setItem("haadiya_verified_orders", JSON.stringify(list)); } catch (e) {}
  }
  const isOrderVerified = id => verifiedOrders().includes(id);

  function updateChrome(mode) {
    const header = document.getElementById("site-header");
    const footer = document.getElementById("site-footer");
    const banner = document.getElementById("site-banner");
    header.style.display = mode === "public" ? "" : "none";
    footer.style.display = mode === "public" ? "" : "none";
    const bannerText = (Store.settings().bannerText || "").trim();
    banner.style.display = mode === "bare" || !bannerText ? "none" : "";
    if (bannerText && mode !== "bare") applyBanner(bannerText);
    document.body.classList.toggle("admin-body", mode === "admin");
    if (mode === "public") {
      const s = Store.settings();
      applyLogo(s);
      const fe = document.getElementById("footer-email");
      if (fe) fe.textContent = s.email;
      const links = document.querySelectorAll("#footer-contact a");
      if (links[0]) links[0].href = s.instagram;
      if (links[1]) links[1].href = s.shopee;
      if (links[2]) links[2].href = s.linktree;
    }
  }
  /* Marquee banner: two identical segments, translateX(-50%) → 0 = scrolls right, seamless loop. */
  function applyBanner(text) {
    const banner = document.getElementById("site-banner");
    const track = document.getElementById("banner-track");
    if (!banner || !track) return;
    track.innerHTML = "";
    const seg = document.createElement("div");
    seg.className = "banner-seg";
    const span = () => { const s = document.createElement("span"); s.textContent = text; return s; };
    seg.appendChild(span());
    track.appendChild(seg);
    let guard = 0;
    while (seg.offsetWidth < banner.offsetWidth + 100 && guard++ < 40) seg.appendChild(span());
    const clone = seg.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    track.appendChild(clone);
    track.style.animationDuration = Math.max(8, seg.offsetWidth / 80) + "s";
  }
  const logoDefaults = { header: null, footer: null };
  function applyLogo(s) {
    const wm = document.querySelector("#site-header .wordmark");
    const fb = document.querySelector(".footer-brand");
    if (wm && logoDefaults.header === null) logoDefaults.header = wm.innerHTML;
    if (fb && logoDefaults.footer === null) logoDefaults.footer = fb.innerHTML;
    if (wm) wm.innerHTML = s.logoHeader
      ? `<img class="logo-img" src="${s.logoHeader.replace(/"/g, "&quot;")}" alt="Haadiya Syar’i">`
      : logoDefaults.header;
    if (fb) {
      if (s.logoFooter) {
        const tagline = fb.querySelector(".footer-tagline");
        fb.innerHTML = `<img class="logo-img" src="${s.logoFooter.replace(/"/g, "&quot;")}" alt="Haadiya Syar’i">`;
        if (tagline) fb.appendChild(tagline);
      } else if (logoDefaults.footer !== null) fb.innerHTML = logoDefaults.footer;
    }
  }
  function updateCartBadge() {
    const badge = document.getElementById("cart-badge");
    const n = Store.cartCount();
    badge.hidden = n === 0;
    badge.textContent = n > 99 ? "99+" : n;
    const link = document.querySelector(".cart-link");
    if (link) link.setAttribute("aria-label", `Shopping cart, ${n} item${n === 1 ? "" : "s"}`);
  }
  function updateNav(path) {
    document.querySelectorAll(".main-nav a").forEach(a => {
      const key = a.dataset.nav;
      a.classList.toggle("active", path.startsWith("/" + key));
    });
  }

  /* ---- Scroll reveal: fade-in-up per section & stagger per grup ---- */
  const reduceMotion = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  let revealObserver = null;
  function setupReveals(animate) {
    if (revealObserver) { revealObserver.disconnect(); revealObserver = null; }
    const app = document.getElementById("app");
    if (!animate || reduceMotion || !("IntersectionObserver" in window)) return;
    const targets = [];
    const add = (el, delay) => { if (el) targets.push([el, delay]); };
    app.querySelectorAll(".product-grid").forEach(g => [...g.children].forEach((c, i) => add(c, Math.min(i * 60, 240))));
    app.querySelectorAll(".values-inner,.help-strip,.stat-grid").forEach(g => [...g.children].forEach((c, i) => add(c, i * 80)));
    app.querySelectorAll(".section-head,.steps-bar,.order-head,.order-card,.checkout-section,.panel,.thankyou,.prose,.about-hero .container,.login-card,.track-form,.search-bar,.catalog-toolbar,.pd-gallery,.cart-items,.summary-card").forEach(el => add(el, 0));
    app.querySelectorAll(".pd-info").forEach(el => add(el, 90));
    revealObserver = new IntersectionObserver(entries => {
      for (const en of entries) {
        if (en.isIntersecting || en.boundingClientRect.top < 0) {
          const el = en.target;
          el.classList.remove("rv-pending");
          revealObserver.unobserve(el);
          setTimeout(() => { el.style.transitionDelay = ""; }, 900);
        }
      }
    }, { threshold: 0, rootMargin: "0px 0px -6% 0px" });
    for (const [el, delay] of targets) {
      el.classList.add("rv");
      el.style.transitionDelay = delay ? delay + "ms" : "";
      el.classList.add("rv-pending");
      revealObserver.observe(el);
    }
  }
  /* Kontrol yang difokuskan keyboard harus langsung terlihat, tanpa menunggu stagger. */
  document.addEventListener("focusin", e => {
    const p = e.target.closest && e.target.closest(".rv-pending");
    if (p) { p.classList.remove("rv-pending"); p.style.transitionDelay = ""; }
  });

  function render(scrollTop = true) {
    const { path, query } = parseHash();
    const r = resolve(path, query);
    if (r.redirect) { location.hash = r.redirect; return; }
    const prevPath = currentPath;
    if (currentView && currentView.unmount) currentView.unmount();
    closeMobileMenu();
    currentView = r.view; currentQuery = r.query; currentPath = path;
    updateChrome(r.chrome);
    const app = document.getElementById("app");
    app.innerHTML = r.view.html(r.query);
    document.title = r.view.title(r.query);
    try { r.view.mount(r.query); } catch (e) { console.error(e); }
    updateCartBadge();
    updateNav(path);
    if (scrollTop) window.scrollTo(0, 0);
    /* Animasi hanya saat navigasi ke halaman baru — bukan saat filter/refresh
       (interaksi rutin tidak boleh mengulang animasi entrance). */
    setupReveals(scrollTop && path !== prevPath);
  }
  const refresh = () => render(false);
  const go = hash => { if (location.hash === hash) render(); else location.hash = hash; };

  function closeMobileMenu() {
    const nav = document.getElementById("main-nav");
    const btn = document.getElementById("menu-toggle");
    nav.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");
  }

  /* Global action delegation */
  const actions = {
    "qty-inc": el => {
      const sku = el.dataset.sku;
      if (sku === "pd") PublicViews.PDActions.inc();
      else {
        const item = Store.cartItems().find(i => i.sku === sku);
        if (!item) return;
        const res = Store.setCartQty(sku, item.qty + 1);
        if (!res.ok) UI.toast(res.message, "error"); else refresh();
      }
    },
    "qty-dec": el => {
      const sku = el.dataset.sku;
      if (sku === "pd") PublicViews.PDActions.dec();
      else {
        const item = Store.cartItems().find(i => i.sku === sku);
        if (!item) return;
        Store.setCartQty(sku, item.qty - 1);
        refresh();
      }
    },
    "add-to-cart": () => PublicViews.PDActions.add(),
    "pd-color": el => PublicViews.PDActions.setColor(el.dataset.color),
    "pd-size": el => PublicViews.PDActions.setSize(el.dataset.size),
    "pd-thumb": el => PublicViews.PDActions.thumb(Number(el.dataset.index)),
    "pd-zoom": () => PublicViews.PDActions.zoom(),
    "cart-remove": el => { Store.removeFromCart(el.dataset.sku); UI.toast("Item removed from cart."); refresh(); },
    "cart-fix": el => { Store.setCartQty(el.dataset.sku, Number(el.dataset.max)); UI.toast("Quantity adjusted to available stock."); refresh(); },
    "blocked-checkout": el => { el.preventDefault?.(); UI.toast("Adjust quantities that exceed stock before checkout.", "error"); },
    "set-filter": el => {
      const { path, query } = parseHash();
      const base = path.startsWith("/cari") ? "#/cari" : "#/produk";
      const next = { ...query, [el.dataset.key]: el.dataset.val };
      const keys = ["q", "kategori", "ukuran", "warna", "harga", "tersedia", "urut"];
      const parts = keys.filter(k => next[k]).map(k => `${k}=${encodeURIComponent(next[k])}`);
      go(base + (parts.length ? "?" + parts.join("&") : ""));
    },
    "open-filters": () => {
      const panel = document.getElementById("filter-panel");
      if (!panel) return;
      panel.classList.add("open");
      const bd = document.createElement("div");
      bd.className = "filter-backdrop";
      bd.addEventListener("click", () => actions["close-filters"]());
      document.body.appendChild(bd);
      const first = panel.querySelector("button, input");
      if (first) first.focus();
    },
    "close-filters": () => {
      const panel = document.getElementById("filter-panel");
      if (panel) panel.classList.remove("open");
      document.querySelectorAll(".filter-backdrop").forEach(b => b.remove());
    },
    "apply-voucher": () => PublicViews.applyVoucher(),
    "remove-voucher": () => PublicViews.removeVoucher(),
    "calc-shipping": () => PublicViews.calcShipping(),
    "check-payment": el => PublicViews.checkPayment(el.dataset.id),
    "cancel-order": el => {
      if (!confirm("Cancel this order? The stock reservation will be released.")) return;
      const res = Store.cancelOrder(el.dataset.id, "customer");
      if (!res.ok) UI.toast(res.message, "error"); else UI.toast("Order cancelled — stock released.");
      refresh();
    },
    "retry-payment": el => {
      const res = Store.retryPayment(el.dataset.id);
      if (!res.ok) { UI.toast(res.message, "error"); return; }
      UI.toast("Order reopened — stock reserved again.");
      go("#/pesanan/" + el.dataset.id + "/pembayaran");
    },
    "hero-upload": () => document.getElementById("hero-file")?.click(),
    "hero-remove": async () => {
      const saved = await Store.updateSettings({ heroImage: null });
      if (!saved.ok) { UI.toast(saved.message, "error"); return; }
      UI.toast("Custom hero removed — back to the default image.");
      refresh();
    },
    "hero-add-path": async () => {
      const input = document.getElementById("hero-path");
      const v = input ? input.value.trim() : "";
      if (!v) { UI.toast("Enter an image path or URL first.", "error"); return; }
      const saved = await Store.updateSettings({ heroImage: v });
      if (!saved.ok) { UI.toast(saved.message, "error"); return; }
      UI.toast("Hero image updated.");
      refresh();
    },
    "hero-video-upload": () => document.getElementById("hero-video-file")?.click(),
    "hero-video-remove": async () => {
      const saved = await Store.updateSettings({ heroVideo: null });
      if (!saved.ok) { UI.toast(saved.message, "error"); return; }
      await resolveHeroVideo();
      UI.toast("Hero video removed — back to the photo.");
      refresh();
    },
    "hero-video-add-path": async () => {
      const input = document.getElementById("hero-video-path");
      const v = input ? input.value.trim() : "";
      if (!v) { UI.toast("Enter a video path or URL first.", "error"); return; }
      const saved = await Store.updateSettings({ heroVideo: v });
      if (!saved.ok) { UI.toast(saved.message, "error"); return; }
      UI.toast("Hero video updated.");
      refresh();
    },
    "hero-video-toggle": el => {
      const v = document.getElementById("hero-video");
      if (!v) return;
      if (v.paused) { v.play(); el.innerHTML = UI.icon("pause"); el.setAttribute("aria-label", "Pause background video"); }
      else { v.pause(); el.innerHTML = UI.icon("play"); el.setAttribute("aria-label", "Play background video"); }
    },
    "landing-save": () => AdminViews.saveLanding(),
    "values-save": async () => {
      const values = [0, 1, 2].map(i => ({
        label: document.getElementById("val-label-" + i).value.trim(),
        title: document.getElementById("val-title-" + i).value.trim(),
        text: document.getElementById("val-text-" + i).value.trim()
      }));
      if (values.some(v => !v.title)) { UI.toast("Every value needs a title.", "error"); return; }
      const saved = await Store.updateSettings({ values });
      if (!saved.ok) { UI.toast(saved.message, "error"); return; }
      UI.toast("Home values saved — the storefront uses the new copy.");
      refresh();
    },
    "banner-save": () => AdminViews.saveBanner(),
    "banner-clear": async () => {
      const saved = await Store.updateSettings({ bannerText: "" });
      if (!saved.ok) { UI.toast(saved.message, "error"); return; }
      UI.toast("Banner cleared — the scrolling text is hidden.");
      refresh();
    },
    "page-save": el => AdminViews.savePage(el.dataset.page),
    "page-reset": el => {
      if (!confirm("Restore this page to the default text? Saved changes will be lost.")) return;
      AdminViews.resetPage(el.dataset.page);
    },
    "photo-upload": () => document.getElementById("photo-file")?.click(),
    "photo-tab": el => AdminViews.PhotoActions.tab(el.dataset.key),
    "photo-remove": el => AdminViews.PhotoActions.remove(Number(el.dataset.index)),
    "photo-primary": el => AdminViews.PhotoActions.primary(Number(el.dataset.index)),
    "photo-add-path": () => AdminViews.PhotoActions.addPath(),
    "logo-upload": el => document.getElementById("logo-file-" + (el.dataset.slot || "header"))?.click(),
    "logo-remove": async el => {
      const slot = el.dataset.slot === "footer" ? "footer" : "header";
      const saved = await Store.updateSettings({ [slot === "footer" ? "logoFooter" : "logoHeader"]: null });
      if (!saved.ok) { UI.toast(saved.message, "error"); return; }
      UI.toast(`${slot === "footer" ? "Footer" : "Header"} logo removed — back to the text wordmark.`);
      refresh();
    },
    "delete-product": async el => {
      const slug = el.dataset.slug;
      const p = Store.product(slug);
      if (!p) return;
      if (!confirm(`Delete "${p.name}" and its ${p.variants.length} variant(s) from the catalog?\nOld order history keeps its snapshot. This cannot be undone.`)) return;
      const res = await Store.deleteProduct(slug);
      if (!res.ok) { UI.toast(res.message, "error"); return; }
      UI.toast(`"${p.name}" deleted from the catalog.`);
      if (parseHash().path !== "/admin/produk") go("#/admin/produk"); else refresh();
    },
    "voucher-toggle": async el => {
      const v = Store.voucher(el.dataset.code);
      if (!v) return;
      const res = await Store.saveVoucher({ ...v, active: el.checked }, v.code);
      if (!res.ok) { el.checked = v.active; UI.toast(res.message,"error"); return; }
      UI.toast(`Voucher ${v.code} ${el.checked ? "activated" : "deactivated"}.`);
      refresh();
    },
    "voucher-delete": async el => {
      if (!confirm(`Delete voucher ${el.dataset.code}? Buyers will no longer be able to apply it.`)) return;
      const res = await Store.deleteVoucher(el.dataset.code);
      if (!res.ok) { UI.toast(res.message,"error"); return; }
      UI.toast("Voucher deleted.");
      refresh();
    },
    "origin-submit": async () => {
      const input = document.getElementById("set-origin");
      if (!input) return;
      const v = input.value.trim();
      if (!v) { UI.toast("Enter a valid shipping origin address first.", "error"); input.focus(); return; }
      const saved = await Store.updateSettings({ originAddress: v });
      if (!saved.ok) { UI.toast(saved.message, "error"); return; }
      UI.toast("Origin saved — checkout & catalog use the latest address for rates.");
      refresh();
    },
    "origin-remove": async () => {
      const input = document.getElementById("set-origin");
      if (input && input.value.trim() && !confirm("Remove the shipping origin? Rates cannot be calculated until it is set again.")) return;
      const saved = await Store.updateSettings({ originAddress: "" });
      if (!saved.ok) { UI.toast(saved.message, "error"); return; }
      UI.toast("Origin removed — shipping calculation waits for a new address.");
      refresh();
    },
    "admin-logout": async el => {
      if (el.disabled) return;
      el.disabled = true;
      const result = await HaadiyaAuth.signOut();
      if (result.ok) UI.toast("You have signed out.");
      else UI.toast(result.message, "error");
      go("#/admin/login");
    },
    "add-variant-row": () => AdminViews.addVariantRow(),
    "save-all-stock": () => AdminViews.saveAllStock(),
    "media-import": () => document.getElementById("media-backup-file")?.click(),
    "cloud-import": () => document.getElementById("cloud-backup-file")?.click(),
    "cloud-reload": async () => {
      const r = await Store.pull();
      if (!r.ok) UI.toast(r.message,"error");
      else { UI.toast("Cloud content checked."); refresh(); }
    }
  };
  document.addEventListener("click", e => {
    const el = e.target.closest("[data-action]");
    if (!el) return;
    const fn = actions[el.dataset.action];
    if (fn) {
      if (el.dataset.action === "voucher-toggle") { fn(el, e); return; } // keep checkbox default
      e.preventDefault(); fn(el, e);
    }
  });

  /* Hero video tersimpan di IndexedDB ("idb:hero") — dibuatkan object URL
     per sesi tab; video via path/URL dipakai langsung. */
  let heroVideoObjectUrl = null;
  async function resolveHeroVideo() {
    const hv = Store.settings().heroVideo;
    if (hv !== "idb:hero") {
      if (heroVideoObjectUrl) { URL.revokeObjectURL(heroVideoObjectUrl); heroVideoObjectUrl = null; }
      PublicViews.setHeroVideoUrl(null);
      return;
    }
    try {
      const blob = await UI.VideoStore.get("hero");
      if (blob) {
        if (heroVideoObjectUrl) URL.revokeObjectURL(heroVideoObjectUrl);
        heroVideoObjectUrl = URL.createObjectURL(blob);
        PublicViews.setHeroVideoUrl(heroVideoObjectUrl);
        if (parseHash().path === "/") refresh();
      }
    } catch (e) { console.error("Hero video load failed", e); }
  }

  document.addEventListener("haadiya:change", () => {
    updateCartBadge();
    const el = document.getElementById("co-origin");
    if (el) el.innerHTML = PublicViews.originLine();
    if (document.getElementById("voucher-zone")) PublicViews.refreshCoTotals();
  });
  document.addEventListener("haadiya:external-change", () => { resolveHeroVideo(); refresh(); });
  window.addEventListener("hashchange", () => render(true));
  document.getElementById("menu-toggle").addEventListener("click", () => {
    const nav = document.getElementById("main-nav");
    const open = nav.classList.toggle("open");
    document.getElementById("menu-toggle").setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") { actions["close-filters"](); closeMobileMenu(); }
  });

  /* ?route=/produk support for embeds (pen.dev browser nodes normalise
     URLs and may encode '#'); the query becomes a hash on load. */
  try {
    const routeParam = new URLSearchParams(location.search).get("route");
    if (routeParam && (!location.hash || location.hash === "#/")) {
      const r = routeParam.startsWith("/") ? routeParam : "/" + routeParam;
      history.replaceState(null, "", location.pathname + "#" + r);
    }
  } catch (e) {}

  document.addEventListener("haadiya:auth-change", () => {
    const path = parseHash().path;
    if (path === "/admin" || (path.startsWith("/admin/") && path !== "/admin/login")) {
      // Keep active form edits intact when a token refresh merely confirms access.
      if (!isAdmin() || currentView === null || !document.body.classList.contains("admin-body")) refresh();
    }
  });
  document.addEventListener("haadiya:sync-status", () => {
    const status = Store.status();
    const el = document.getElementById("cloud-status");
    if (el) el.textContent = status.busy ? "Cloud operation in progress..." : status.message;
    const btn = document.querySelector('[data-action="cloud-import"]');
    if (btn) btn.disabled = status.busy || status.state !== "empty";
    const mediaBtn=document.querySelector('[data-action="media-import"]');if(mediaBtn)mediaBtn.disabled=status.busy || status.state!=="ready";
  });
  document.addEventListener("haadiya:cloud-change", () => { resolveHeroVideo(); refresh(); });
  // Refresh on focus and periodically only on pages without forms or selection state.
  function safePublicRefresh() { const p = parseHash().path; if (p === "/" || p === "/produk" || p === "/tentang" || p === "/faq" || p === "/kontak" || p === "/privasi" || p === "/syarat" || p.startsWith("/bantuan")) Store.pull(); }
  window.addEventListener("focus", safePublicRefresh);
  setInterval(() => { if (!document.hidden) safePublicRefresh(); }, 30000);
  render();
  HaadiyaAuth.initialize();
  Store.pull();
  resolveHeroVideo();
  return { go, refresh, render, verifyOrder, isOrderVerified, isAdmin, parseHash, resolveHeroVideo, heroVideoUrl: () => heroVideoObjectUrl };
})();