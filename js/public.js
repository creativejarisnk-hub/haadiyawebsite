/* Public views — everything reads from the same Store as the admin.
   Storefront copy is English. */
const PublicViews = (() => {
  const { esc, rupiah, icon, img } = UI;
  const PROVINCES = ["Aceh","Sumatera Utara","Sumatera Barat","Riau","Kepulauan Riau","Jambi","Sumatera Selatan","Bangka Belitung","Bengkulu","Lampung","Banten","DKI Jakarta","Jawa Barat","Jawa Tengah","DI Yogyakarta","Jawa Timur","Bali","Nusa Tenggara Barat","Nusa Tenggara Timur","Kalimantan Barat","Kalimantan Tengah","Kalimantan Selatan","Kalimantan Timur","Kalimantan Utara","Sulawesi Utara","Gorontalo","Sulawesi Tengah","Sulawesi Barat","Sulawesi Selatan","Sulawesi Tenggara","Maluku","Maluku Utara","Papua","Papua Barat","Papua Barat Daya","Papua Tengah","Papua Pegunungan","Papua Selatan"];
  const SIZE_ORDER = ["S", "M", "L", "XL", "XXL", "Regular"];

  const cardPrice = p => {
    const r = Store.priceRange(p);
    return r.min === r.max ? rupiah(r.min) : `${rupiah(r.min)} – ${rupiah(r.max)}`;
  };

  function productCard(p) {
    const soldOut = Store.productStock(p) <= 0;
    const colors = [...new Map(p.variants.filter(v => v.active).map(v => [v.color, v.hex])).entries()];
    return `<article class="product-card">
      <div class="card-img-wrap">
        ${soldOut ? '<span class="chip chip-neutral card-badge">Sold out</span>' : ""}
        ${img(p.images[0], `${p.name} — ${p.summary}`)}
      </div>
      <div>
        <h3 class="card-name"><a class="card-link" href="#/produk/${esc(p.slug)}">${esc(p.name)}</a></h3>
        <p class="card-meta">${esc(p.category)}</p>
      </div>
      <div class="card-swatches" aria-label="Available colours">
        ${colors.map(([name, hex]) => `<span class="swatch-dot" style="background:${esc(hex)}" title="${esc(name)}"></span>`).join("")}
        <span class="card-meta">${colors.length} colour${colors.length === 1 ? "" : "s"}</span>
      </div>
      <p class="card-price">${cardPrice(p)}</p>
    </article>`;
  }

  /* ---------- Home ---------- */
  let heroVideoObjectUrl = null;
  const prefersReducedMotion = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const home = {
    title: () => "Haadiya Syar’i — Inspired by Faith. Rooted in Values.",
    html() {
      const s = Store.settings();
      const ready = Store.products().slice(0, 4);
      const heroTitle = (s.heroTitle || "Inspired by Faith.\nRooted in Values.").split("\n").map(esc).join("<br>");
      const heroText = esc(s.heroText || "");
      const heroSrc = s.heroImage || "../images/generated.png";
      const videoSrc = s.heroVideo === "idb:hero" ? heroVideoObjectUrl : s.heroVideo;
      const showVideo = videoSrc && !prefersReducedMotion();
      return `
      <section class="hero">
        <div class="hero-fallback" aria-hidden="true"></div>
        <img class="hero-img" src="${esc(heroSrc)}" alt="" onerror="this.remove()">
        ${showVideo ? `<video class="hero-img hero-video" id="hero-video" autoplay muted loop playsinline preload="auto" poster="${esc(heroSrc)}" aria-hidden="true" tabindex="-1" onerror="this.remove()">
          <source src="${esc(videoSrc)}" type="video/mp4" onerror="this.closest('video').remove();document.querySelector('.hero-video-toggle')?.remove()">
        </video>
        <button class="icon-btn hero-video-toggle" data-action="hero-video-toggle" aria-label="Pause background video">${icon("pause")}</button>` : ""}
        <div class="container hero-content">
          <span class="eyebrow">Haadiya Syar’i</span>
          <h1>${heroTitle}</h1>
          <p>${heroText}</p>
          <div class="hero-cta">
            <a class="btn btn-primary" href="#/produk">Shop Products ${icon("arrow")}</a>
            <a class="btn btn-outline" href="#/tentang">About Haadiya</a>
          </div>
        </div>
      </section>
      <section class="section container" aria-labelledby="home-ready">
        <div class="section-head">
          <div><span class="eyebrow">Ready stock</span><h2 id="home-ready">Available today</h2>
          <p>A selection from the catalog — every piece ships from real per-variant stock.</p></div>
          <a class="btn btn-ghost" href="#/produk">All products ${icon("arrow")}</a>
        </div>
        ${ready.length ? `<div class="product-grid">${ready.map(productCard).join("")}</div>`
          : UI.emptyState({ icon: "box", title: "The catalog is being prepared", body: "Products will appear here as soon as they are published from the admin.", action: '<a class="btn btn-outline" href="#/tentang">Read Our Story</a>' })}
      </section>
      <section class="values-strip" aria-labelledby="home-values">
        <div class="container values-inner">
          ${(Array.isArray(s.values) && s.values.length ? s.values : window.HAADIYA_SEED.settings.values).map((v, i) => `<div class="value-item"><span class="v-num">${esc(v.label)}</span><h3 ${i === 0 ? 'id="home-values"' : ""}>${esc(v.title)}</h3><p>${esc(v.text)}</p></div>`).join("")}
        </div>
      </section>
      <section class="section container">
        <div class="help-strip">
          <div class="help-card">
            ${icon("truck")}<h3>Shipping &amp; returns</h3>
            <p>How delivery, tracking numbers, and exchanges work — read the details before you order.</p>
            <a class="btn btn-outline btn-sm" href="#/bantuan/pengiriman-pengembalian">Read Shipping &amp; Returns</a>
          </div>
          <div class="help-card">
            ${icon("clipboard")}<h3>Shopping help</h3>
            <p>Questions about payment, order status, or anything else? Start with the FAQ or track your order.</p>
            <a class="btn btn-outline btn-sm" href="#/faq">Read the FAQ</a>
          </div>
        </div>
      </section>`;
    },
    mount() {}
  };

  /* ---------- Catalog / search ---------- */
  function facets() {
    const ps = Store.products();
    const categories = [...new Set(ps.map(p => p.category))];
    const colors = [...new Set(ps.flatMap(p => p.variants.filter(v => v.active).map(v => v.color)))];
    const sizes = [...new Set(ps.flatMap(p => p.variants.filter(v => v.active).map(v => v.size)))].sort((a, b) => (SIZE_ORDER.indexOf(a) + 1 || 99) - (SIZE_ORDER.indexOf(b) + 1 || 99));
    const prices = ps.flatMap(p => p.variants.map(v => v.price));
    if (!prices.length) return { categories, colors, sizes, priceBuckets: [] };
    const lo = Math.floor(Math.min(...prices) / 100000) * 100000;
    const hi = Math.ceil(Math.max(...prices) / 100000) * 100000;
    const mid = Math.round((lo + hi) / 2 / 50000) * 50000;
    return { categories, colors, sizes, priceBuckets: [
      { id: `0-${mid}`, label: `Under ${rupiah(mid)}` },
      { id: `${mid}-${hi}`, label: `${rupiah(mid)} – ${rupiah(hi)}` },
      { id: `${hi}-999999999`, label: `Over ${rupiah(hi)}` }
    ] };
  }
  function filterProducts(q) {
    let list = Store.products();
    if (q.q) {
      const t = q.q.toLowerCase();
      list = list.filter(p => `${p.name} ${p.category}`.toLowerCase().includes(t));
    }
    if (q.kategori) list = list.filter(p => p.category === q.kategori);
    if (q.ukuran) list = list.filter(p => p.variants.some(v => v.active && v.size === q.ukuran));
    if (q.warna) list = list.filter(p => p.variants.some(v => v.active && v.color === q.warna));
    if (q.harga) {
      const [min, max] = q.harga.split("-").map(Number);
      list = list.filter(p => { const r = Store.priceRange(p); return r.min <= max && r.max >= min; });
    }
    if (q.tersedia === "1") list = list.filter(p => Store.productStock(p) > 0);
    const sort = q.urut || "terbaru";
    if (sort === "harga-asc") list.sort((a, b) => Store.priceRange(a).min - Store.priceRange(b).min);
    else if (sort === "harga-desc") list.sort((a, b) => Store.priceRange(b).min - Store.priceRange(a).min);
    else if (sort === "nama") list.sort((a, b) => a.name.localeCompare(b.name, "en"));
    else list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return list;
  }
  const FILTER_KEYS = ["q", "kategori", "ukuran", "warna", "harga", "tersedia", "urut"];
  function catalogUrl(base, q, patch) {
    const next = { ...q, ...patch };
    const parts = FILTER_KEYS.filter(k => next[k]).map(k => `${k}=${encodeURIComponent(next[k])}`);
    return `${base}${parts.length ? "?" + parts.join("&") : ""}`;
  }
  function filterPanel(q, f, base) {
    const radio = (key, val, label, checked) =>
      `<label class="filter-option"><input type="radio" name="f-${key}" data-filter="${key}" value="${esc(val)}" ${checked ? "checked" : ""}> ${esc(label)}</label>`;
    return `
    <div class="filter-sheet-head"><h2 style="font-size:22px">Filters</h2>
      <button class="icon-btn" data-action="close-filters" aria-label="Close filters">${icon("x")}</button></div>
    <div class="filter-group"><h3>Category</h3>
      ${radio("kategori", "", "All categories", !q.kategori)}
      ${f.categories.map(c => radio("kategori", c, c, q.kategori === c)).join("")}
    </div>
    <div class="filter-group"><h3>Size</h3>
      <div class="filter-sizes">
        <button class="size-pill" data-action="set-filter" data-key="ukuran" data-val="" aria-pressed="${!q.ukuran}">All</button>
        ${f.sizes.map(s => `<button class="size-pill" data-action="set-filter" data-key="ukuran" data-val="${esc(s)}" aria-pressed="${q.ukuran === s}">${esc(s)}</button>`).join("")}
      </div>
    </div>
    <div class="filter-group"><h3>Colour</h3>
      ${radio("warna", "", "All colours", !q.warna)}
      ${f.colors.map(c => radio("warna", c, c, q.warna === c)).join("")}
    </div>
    ${f.priceBuckets.length ? `<div class="filter-group"><h3>Price range</h3>
      ${radio("harga", "", "Any price", !q.harga)}
      ${f.priceBuckets.map(b => radio("harga", b.id, b.label, q.harga === b.id)).join("")}
    </div>` : ""}
    <div class="filter-group">
      <label class="filter-option"><input type="checkbox" data-filter="tersedia" value="1" ${q.tersedia === "1" ? "checked" : ""}> In stock only</label>
    </div>
    <a class="btn btn-outline btn-sm" href="${base}">Clear Filters</a>`;
  }
  function activeTags(q, base) {
    const tags = [];
    const label = { q: "Search", kategori: "Category", ukuran: "Size", warna: "Colour", harga: "Price", tersedia: "Availability" };
    for (const k of ["q", "kategori", "ukuran", "warna", "harga", "tersedia"]) {
      if (!q[k]) continue;
      let v = q[k];
      if (k === "tersedia") v = "In stock";
      if (k === "harga") { const b = facets().priceBuckets.find(b => b.id === v); v = b ? b.label : v; }
      tags.push(`<span class="filter-tag">${label[k]}: ${esc(v)}
        <button data-action="set-filter" data-key="${k}" data-val="" aria-label="Remove ${label[k]} filter">${icon("x")}</button></span>`);
    }
    return tags.length ? `<div class="active-filters">${tags.join("")}
      <a class="btn btn-ghost btn-sm" href="${base}">Clear all</a></div>` : "";
  }
  function catalogBody(q, base, heading) {
    const f = facets();
    const list = filterProducts(q);
    return `
    <div class="container section">
      <div class="section-head" style="margin-bottom:24px">
        <div><span class="eyebrow">Catalog</span><h1>${esc(heading)}</h1></div>
      </div>
      ${base === "#/cari" ? `<form class="search-bar" id="search-form" role="search">
        <div class="field" style="flex:1"><label for="search-input" class="hint" style="position:absolute;left:-9999px">Search products</label>
        <input id="search-input" type="search" value="${esc(q.q || "")}" placeholder="Search abaya, gamis, khimar…" autocomplete="off"></div>
        <button class="btn btn-primary" type="submit">${icon("search")} Search</button>
      </form>` : ""}
      <div class="catalog-layout">
        <aside class="filter-panel" id="filter-panel" aria-label="Product filters">${filterPanel(q, f, base)}</aside>
        <div>
          <div class="catalog-toolbar">
            <p class="result-count" role="status">${list.length} product${list.length === 1 ? "" : "s"}${q.q ? ` for “${esc(q.q)}”` : ""}</p>
            <div class="toolbar-right">
              <button class="btn btn-outline btn-sm filter-toggle" data-action="open-filters">${icon("grid")} Filters</button>
              <div class="select-wrap">
                <label for="sort-select" style="position:absolute;left:-9999px">Sort by</label>
                <select id="sort-select" data-filter="urut">
                  <option value="terbaru" ${!q.urut || q.urut === "terbaru" ? "selected" : ""}>Newest</option>
                  <option value="harga-asc" ${q.urut === "harga-asc" ? "selected" : ""}>Price: low to high</option>
                  <option value="harga-desc" ${q.urut === "harga-desc" ? "selected" : ""}>Price: high to low</option>
                  <option value="nama" ${q.urut === "nama" ? "selected" : ""}>Name A–Z</option>
                </select>
              </div>
            </div>
          </div>
          ${activeTags(q, base)}
          ${list.length ? `<div class="product-grid cols-3">${list.map(productCard).join("")}</div>`
            : UI.emptyState({
                title: q.q ? `No results for “${q.q}”` : "No products match",
                body: "Try a different keyword or clear the filters to see the full catalog.",
                action: `<a class="btn btn-primary" href="${base}">Clear Filters</a>`
              })}
        </div>
      </div>
    </div>`;
  }
  function mountCatalog(q, base) {
    const app = document.getElementById("app");
    app.querySelectorAll("[data-filter]").forEach(input => {
      input.addEventListener("change", () => {
        const key = input.dataset.filter;
        const val = input.type === "checkbox" ? (input.checked ? "1" : "") : input.value;
        App.go(catalogUrl(base, q, { [key]: val }));
      });
    });
    const sf = document.getElementById("search-form");
    if (sf) sf.addEventListener("submit", e => {
      e.preventDefault();
      App.go(catalogUrl(base, q, { q: document.getElementById("search-input").value.trim() }));
    });
  }
  const catalog = {
    title: () => "All Products — Haadiya Syar’i",
    html: q => catalogBody(q, "#/produk", "All Products"),
    mount: q => mountCatalog(q, "#/produk")
  };
  const search = {
    title: q => (q.q ? `Search: ${q.q}` : "Search Products") + " — Haadiya Syar’i",
    html: q => catalogBody(q, "#/cari", "Search Products"),
    mount: q => { mountCatalog(q, "#/cari"); const si = document.getElementById("search-input"); if (si && !q.q) si.focus(); }
  };

  /* ---------- Product detail ---------- */
  let PD = { slug: null, color: null, size: null, qty: 1, imgIndex: 0 };
  const pdImages = () => {
    const p = Store.product(PD.slug);
    return p ? Store.imagesFor(p, PD.color) : [];
  };
  function pdVariant() {
    const p = Store.product(PD.slug);
    if (!p || !PD.color || !PD.size) return null;
    return p.variants.find(v => v.active && v.color === PD.color && v.size === PD.size) || null;
  }
  function pdAvail() { const v = pdVariant(); return v ? Store.available(v) : 0; }
  function pdCtaState() {
    const v = pdVariant();
    if (!PD.color || !PD.size) return { label: "Select Colour & Size", disabled: false, needsChoice: true };
    if (!v || Store.available(v) <= 0) return { label: "Sold Out", disabled: true };
    return { label: "Add to Cart", disabled: false };
  }
  function pdRenderGallery() {
    const p = Store.product(PD.slug);
    const images = pdImages();
    const main = document.getElementById("pd-main-img");
    if (main) main.innerHTML = img(images[PD.imgIndex] || images[0], `${p.name} — ${PD.color || "product"} photo`);
    const thumbs = document.getElementById("pd-thumbs");
    if (thumbs) thumbs.innerHTML = images.length > 1
      ? images.map((src, i) => `<button class="pd-thumb" data-action="pd-thumb" data-index="${i}" aria-pressed="${i === PD.imgIndex}" aria-label="Photo ${i + 1}">${img(src, "")}</button>`).join("")
      : "";
  }
  function pdUpdate() {
    const p = Store.product(PD.slug);
    const v = pdVariant();
    const avail = pdAvail();
    const cta = pdCtaState();
    document.querySelectorAll("[data-pd-cta]").forEach(btn => {
      btn.innerHTML = cta.needsChoice || cta.disabled ? esc(cta.label) : icon("cart") + esc(cta.label);
      btn.disabled = !!cta.disabled;
    });
    const stockEl = document.getElementById("pd-stock");
    if (stockEl) stockEl.innerHTML = (!PD.color || !PD.size)
      ? `<p class="stock-line" style="color:var(--text-2)">${icon("info")} Select colour and size to see availability</p>`
      : UI.stockLine(avail);
    const priceEl = document.getElementById("pd-price");
    if (priceEl && v) priceEl.textContent = rupiah(v.price);
    const skuEl = document.getElementById("pd-sku");
    if (skuEl) skuEl.textContent = v ? `SKU: ${v.sku}` : "";
    const colorLabel = document.getElementById("pd-color-label");
    if (colorLabel) colorLabel.innerHTML = `Colour ${PD.color ? `<span>— ${esc(PD.color)}</span>` : "<span>— choose one</span>"}`;
    const sizeLabel = document.getElementById("pd-size-label");
    if (sizeLabel) sizeLabel.innerHTML = `Size ${PD.size ? `<span>— ${esc(PD.size)}</span>` : "<span>— choose one</span>"}`;
    document.querySelectorAll("[data-action='pd-color']").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.color === PD.color)));
    document.querySelectorAll("[data-action='pd-size']").forEach(b => {
      b.setAttribute("aria-pressed", String(b.dataset.size === PD.size));
      const sv = p.variants.find(vv => vv.active && vv.color === (PD.color || vv.color) && vv.size === b.dataset.size);
      b.classList.toggle("sold-out", !!PD.color && (!sv || Store.available(sv) <= 0));
    });
    if (PD.qty > Math.max(1, avail)) PD.qty = Math.max(1, avail || 1);
    const qv = document.getElementById("qty-pd");
    if (qv) qv.textContent = PD.qty;
    const dec = document.querySelector("[data-action='qty-dec'][data-sku='pd']");
    const inc = document.querySelector("[data-action='qty-inc'][data-sku='pd']");
    if (dec) dec.disabled = PD.qty <= 1;
    if (inc) inc.disabled = PD.qty >= Math.max(1, avail);
    const stickyPrice = document.getElementById("pd-sticky-price");
    if (stickyPrice && v) stickyPrice.textContent = rupiah(v.price);
  }
  const product = {
    title: q => { const p = Store.product(q.slug); return (p ? p.name : "Product") + " — Haadiya Syar’i"; },
    html(q) {
      const p = Store.product(q.slug);
      if (!p || p.status !== "published") return `<div class="container section">${UI.emptyState({ icon: "box", title: "Product not found", body: "This product is unavailable or has been archived.", action: '<a class="btn btn-primary" href="#/produk">Browse All Products</a>' })}</div>`;
      PD = { slug: p.slug, color: null, size: null, qty: 1, imgIndex: 0 };
      const colors = [...new Map(p.variants.filter(v => v.active).map(v => [v.color, v.hex])).entries()];
      if (colors.length === 1) PD.color = colors[0][0];
      const sizes = [...new Set(p.variants.filter(v => v.active && (!PD.color || v.color === PD.color)).map(v => v.size))];
      const r = Store.priceRange(p);
      const related = Store.products().filter(x => x.slug !== p.slug && x.category === p.category).slice(0, 4);
      const soldOut = Store.productStock(p) <= 0;
      const images = pdImages();
      const hasColorPhotos = p.colorImages && Object.values(p.colorImages).some(a => a && a.length);
      return `<div class="container section">
        <nav class="breadcrumb" aria-label="Breadcrumb"><a href="#/">Home</a> / <a href="#/produk">Products</a> / <span>${esc(p.name)}</span></nav>
        ${soldOut ? UI.alertBox("warn", "This product is currently sold out", "Every colour and size has zero stock. There is no pre-order — please browse other products.") : ""}
        <div class="pd-layout" style="margin-top:20px">
          <div class="pd-gallery">
            <button class="pd-main-img" data-action="pd-zoom" aria-label="Enlarge photo of ${esc(p.name)}" id="pd-main-img">
              ${img(images[0], `${p.name} — full view`)}
            </button>
            <div class="pd-thumbs" id="pd-thumbs" role="group" aria-label="Photo gallery">
              ${images.length > 1 ? images.map((src, i) => `<button class="pd-thumb" data-action="pd-thumb" data-index="${i}" aria-pressed="${i === 0}" aria-label="Photo ${i + 1}">${img(src, "")}</button>`).join("") : ""}
            </div>
            ${hasColorPhotos ? `<p class="hint" style="font-size:12.5px;color:var(--text-2)">${icon("eye")} Photos follow the selected colour.</p>` : ""}
          </div>
          <div class="pd-info">
            <div>
              <span class="eyebrow">${esc(p.category)}</span>
              <h1 class="pd-title">${esc(p.name)}</h1>
            </div>
            <p class="pd-price tabular" id="pd-price">${r.min === r.max ? rupiah(r.min) : `${rupiah(r.min)} – ${rupiah(r.max)}`}</p>
            <p class="pd-summary">${esc(p.summary)}</p>
            <div class="pd-option-group">
              <p class="pd-option-label" id="pd-color-label">Colour ${PD.color ? `<span>— ${esc(PD.color)}</span>` : "<span>— choose one</span>"}</p>
              <div class="color-options" role="group" aria-label="Choose colour">
                ${colors.map(([name, hex]) => `<button class="color-opt" data-action="pd-color" data-color="${esc(name)}" aria-pressed="${PD.color === name}">
                  <span class="swatch-dot" style="background:${esc(hex)}"></span>${esc(name)}</button>`).join("")}
              </div>
            </div>
            <div class="pd-option-group">
              <p class="pd-option-label" id="pd-size-label">Size <span>— choose one</span></p>
              <div class="size-options" role="group" aria-label="Choose size">
                ${sizes.map(s => `<button class="size-opt" data-action="pd-size" data-size="${esc(s)}" aria-pressed="false">${esc(s)}</button>`).join("")}
              </div>
            </div>
            <div id="pd-stock"><p class="stock-line" style="color:var(--text-2)">${icon("info")} Select colour and size to see availability</p></div>
            <div class="qty-row">
              ${UI.qtyStepper(1, 1, "pd")}
              <button class="btn btn-primary" data-pd-cta data-action="add-to-cart" style="flex:1">Select Colour &amp; Size</button>
            </div>
            <p class="pd-sku hint" id="pd-sku" style="font-size:12px;color:var(--text-2)"></p>
            <p class="pd-help">${icon("truck")} Shipping is estimated at checkout once your address is complete.</p>
            ${p.details ? `<section class="pd-details" aria-labelledby="pd-details-h">
              <h2 class="serif" id="pd-details-h" style="font-size:24px">Details</h2>
              ${UI.paragraphs(p.details)}
            </section>` : ""}
          </div>
        </div>
        ${related.length ? `<section class="section" style="padding-bottom:0" aria-labelledby="related-h">
          <div class="section-head"><div><span class="eyebrow">Related</span><h2 id="related-h">More from ${esc(p.category)}</h2></div></div>
          <div class="product-grid">${related.map(productCard).join("")}</div>
        </section>` : ""}
      </div>
      <div class="pd-sticky-bar">
        <div><p style="font-size:11px;color:var(--text-2)">${esc(p.name)}</p><p class="tabular" id="pd-sticky-price" style="font-weight:600">${rupiah(r.min)}</p></div>
        <button class="btn btn-primary" data-pd-cta data-action="add-to-cart">Select Colour &amp; Size</button>
      </div>`;
    },
    mount() {
      document.body.classList.add("has-sticky-bar");
      pdUpdate();
    },
    unmount() { document.body.classList.remove("has-sticky-bar"); }
  };
  const PDActions = {
    setColor(color) {
      PD.color = color;
      PD.imgIndex = 0;
      const p = Store.product(PD.slug);
      const sizes = p.variants.filter(v => v.active && v.color === color).map(v => v.size);
      if (PD.size && !sizes.includes(PD.size)) PD.size = null;
      const group = document.querySelector(".size-options");
      if (group) group.innerHTML = [...new Set(sizes)].map(s =>
        `<button class="size-opt" data-action="pd-size" data-size="${esc(s)}" aria-pressed="false">${esc(s)}</button>`).join("");
      pdRenderGallery();
      pdUpdate();
    },
    setSize(size) { PD.size = size; PD.qty = 1; pdUpdate(); },
    inc() { const max = pdAvail(); if (PD.qty < max) { PD.qty++; pdUpdate(); } },
    dec() { if (PD.qty > 1) { PD.qty--; pdUpdate(); } },
    thumb(i) {
      PD.imgIndex = i;
      pdRenderGallery();
    },
    zoom() {
      const p = Store.product(PD.slug);
      const images = pdImages();
      const src = images[PD.imgIndex] || images[0];
      if (!src) return;
      const ov = document.createElement("div");
      ov.className = "zoom-overlay";
      ov.setAttribute("role", "dialog");
      ov.setAttribute("aria-label", `Enlarged photo: ${p.name}`);
      ov.innerHTML = `<img src="${esc(src)}" alt="Enlarged photo of ${esc(p.name)}">
        <button class="icon-btn zoom-close" aria-label="Close photo">${icon("x")}</button>`;
      const close = () => { ov.remove(); document.removeEventListener("keydown", onKey); };
      const onKey = e => { if (e.key === "Escape") close(); };
      ov.addEventListener("click", close);
      document.addEventListener("keydown", onKey);
      document.body.appendChild(ov);
      ov.querySelector(".zoom-close").focus();
    },
    add() {
      const cta = pdCtaState();
      if (cta.needsChoice) {
        UI.toast("Please select a colour and size first.", "error");
        const g = document.querySelector(!PD.color ? ".color-options" : ".size-options");
        if (g) { g.scrollIntoView({ block: "center", behavior: "smooth" }); const b = g.querySelector("button"); if (b) b.focus(); }
        return;
      }
      const v = pdVariant();
      if (!v) return;
      const res = Store.addToCart(v.sku, PD.qty);
      if (res.ok) UI.toast(`${PD.qty} × ${Store.product(PD.slug).name} (${v.color} / ${v.size}) added to cart.`);
      else UI.toast(res.message, "error");
      pdUpdate();
    }
  };

  /* ---------- Cart ---------- */
  const cart = {
    title: () => "Cart — Haadiya Syar’i",
    html() {
      const items = Store.cartItems();
      if (!items.length) return `<div class="container section">${UI.emptyState({
        icon: "cart", title: "Your cart is empty",
        body: "Products you add will stay here for your next visit.",
        action: '<a class="btn btn-primary" href="#/produk">Browse Products</a>' })}</div>`;
      const issues = Store.cartIssues();
      const subtotal = Store.cartSubtotal();
      return `<div class="container section">
        <div class="section-head"><div><span class="eyebrow">Cart</span><h1>Shopping Cart</h1></div></div>
        ${issues.length ? UI.alertBox("error", "Stock changed since you added these",
          issues.map(i => `${esc(i.product.name)} (${esc(i.variant.color)} / ${esc(i.variant.size)}): ${i.available} left, ${i.qty} in cart.`).join("<br>") + "<br>Adjust the quantities before checkout.",
          issues.map(i => `<button class="btn btn-outline btn-sm" data-action="cart-fix" data-sku="${esc(i.sku)}" data-max="${i.available}">Adjust ${esc(i.product.name)}</button>`).join("")) : ""}
        <div class="cart-layout" style="margin-top:20px">
          <div class="cart-items">
            ${items.map(i => `<div class="cart-item">
              <a class="cart-item-img" href="#/produk/${esc(i.product.slug)}" tabindex="-1" aria-hidden="true">${img(Store.imagesFor(i.product, i.variant.color)[0], "")}</a>
              <div class="ci-info">
                <a class="ci-name" href="#/produk/${esc(i.product.slug)}">${esc(i.product.name)}</a>
                <p class="ci-variant">${esc(i.variant.color)} / ${esc(i.variant.size)} · <span class="tabular">${esc(i.sku)}</span></p>
                <p class="ci-price">${rupiah(i.variant.price)} each</p>
                ${i.qty > i.available ? `<p class="error-msg" style="color:var(--error);font-size:12.5px">${icon("alert")} Only ${i.available} left in stock</p>` : ""}
                <div class="ci-actions">
                  ${UI.qtyStepper(i.qty, i.available, esc(i.sku))}
                  <button class="ci-remove" data-action="cart-remove" data-sku="${esc(i.sku)}">Remove</button>
                </div>
              </div>
              <p class="ci-subtotal">${rupiah(i.variant.price * i.qty)}</p>
            </div>`).join("")}
          </div>
          <aside class="summary-card" aria-label="Order summary">
            <h2 class="serif">Summary</h2>
            <div class="summary-row"><span>Subtotal (${Store.cartCount()} item${Store.cartCount() === 1 ? "" : "s"})</span><span class="val">${rupiah(subtotal)}</span></div>
            <div class="summary-row muted"><span>Shipping</span><span class="val">Calculated at checkout</span></div>
            <div class="summary-total"><span>Current total</span><span>${rupiah(subtotal)}</span></div>
            <a class="btn btn-primary btn-block" ${issues.length ? 'aria-disabled="true" data-action="blocked-checkout"' : 'href="#/checkout"'}>Proceed to Checkout ${icon("arrow")}</a>
            ${issues.length ? '<p class="summary-note" style="color:var(--error)">Adjust quantities that exceed stock before continuing.</p>' : ""}
            <p class="summary-note">${icon("ticket")} Have a voucher? Apply it at checkout. Prices and stock are revalidated when the order is created.</p>
            <a class="link-underline" style="font-size:13.5px" href="#/produk">Continue shopping</a>
          </aside>
        </div>
      </div>`;
    },
    mount() {}
  };

  /* ---------- Checkout ---------- */
  let CO = { voucherCode: "", discount: 0 };
  const originLine = () => {
    const o = (Store.settings().originAddress || "").trim();
    return o
      ? `Ships from <strong>${esc(o)}</strong> · package weight <strong class="tabular">${Store.cartItems().reduce((s, i) => s + (i.product.weightGrams || 0) * i.qty, 0)} g</strong>`
      : `${icon("alert")} The shipping origin has not been configured yet — rates cannot be calculated until it is set in Admin → Settings.`;
  };
  function coTotalsHtml() {
    const subtotal = Store.cartSubtotal();
    const total = subtotal - CO.discount;
    return `
      <div class="summary-row"><span>Subtotal</span><span class="val">${rupiah(subtotal)}</span></div>
      ${CO.discount ? `<div class="summary-row" style="color:var(--ok)"><span>Voucher ${esc(CO.voucherCode)}</span><span class="val">− ${rupiah(CO.discount)}</span></div>` : ""}
      <div class="summary-row muted"><span>Shipping</span><span class="val">Pending courier integration</span></div>
      <div class="summary-total"><span>Total${CO.discount ? "" : " (excl. shipping)"}</span><span>${rupiah(total)}</span></div>`;
  }
  function refreshCoTotals() {
    const subtotal = Store.cartSubtotal();
    if (CO.voucherCode) {
      const check = Store.validateVoucher(CO.voucherCode, subtotal);
      if (check.ok) CO.discount = check.discount;
      else { CO.voucherCode = ""; CO.discount = 0; UI.toast("Voucher removed: " + check.message, "error"); renderVoucherZone(); }
    }
    document.querySelectorAll("[data-co-totals]").forEach(el => el.innerHTML = coTotalsHtml());
  }
  function renderVoucherZone() {
    const zone = document.getElementById("voucher-zone");
    if (!zone) return;
    zone.innerHTML = CO.voucherCode
      ? `<div class="voucher-applied">${icon("ticket")} <strong>${esc(CO.voucherCode)}</strong> applied — you save ${rupiah(CO.discount)}
          <button type="button" class="btn btn-ghost btn-sm" data-action="remove-voucher">Remove</button></div>`
      : `<div class="voucher-row">
          <div class="field" style="flex:1"><label for="voucher-input">Voucher code (optional)</label>
            <input id="voucher-input" placeholder="e.g. WELCOME10" autocomplete="off"></div>
          <button type="button" class="btn btn-outline" data-action="apply-voucher" style="align-self:end">Apply</button>
        </div>
        <p class="error-msg" id="voucher-error" hidden></p>`;
  }
  const checkout = {
    title: () => "Checkout — Haadiya Syar’i",
    html() {
      const items = Store.cartItems();
      if (!items.length) return `<div class="container section">${UI.emptyState({
        icon: "cart", title: "Nothing to check out",
        body: "Your cart is empty. Add a product first.",
        action: '<a class="btn btn-primary" href="#/produk">Browse Products</a>' })}</div>`;
      CO = { voucherCode: "", discount: 0 };
      const issues = Store.cartIssues();
      return `<div class="container section">
        <div class="section-head"><div><span class="eyebrow">Checkout · guest, no account needed</span><h1>Checkout</h1></div></div>
        <div class="steps-bar" aria-label="Checkout steps">
          <span class="step-item current"><span class="step-num">1</span> Contact &amp; Address</span><span class="step-sep"></span>
          <span class="step-item"><span class="step-num">2</span> Shipping</span><span class="step-sep"></span>
          <span class="step-item"><span class="step-num">3</span> Payment</span><span class="step-sep"></span>
          <span class="step-item"><span class="step-num">4</span> Review Order</span>
        </div>
        ${issues.length ? UI.alertBox("error", "Stock changed", "Return to your cart and adjust the quantities before placing the order.", '<a class="btn btn-outline btn-sm" href="#/keranjang">Open Cart</a>') : ""}
        <div class="checkout-layout" style="margin-top:24px">
          <form id="checkout-form" novalidate>
            <section class="checkout-section" aria-labelledby="co-1">
              <h2 id="co-1"><span class="sec-num">1</span> Contact &amp; Address</h2>
              <div class="form-grid">
                ${UI.field({ id: "nama", label: "Full name", required: true, autocomplete: "name", placeholder: "Recipient name" })}
                ${UI.field({ id: "email", label: "Email", type: "email", required: true, autocomplete: "email", placeholder: "name@example.com", hint: "For confirmation & order access" })}
                ${UI.field({ id: "phone", label: "Mobile number", type: "tel", required: true, autocomplete: "tel", inputmode: "tel", placeholder: "081234567890" })}
                ${UI.field({ id: "postal", label: "Postal code", required: true, autocomplete: "postal-code", inputmode: "numeric", placeholder: "12120" })}
                <div class="field span-2">
                  <label for="provinsi">Province <span class="req" aria-hidden="true">*</span></label>
                  <select id="provinsi" name="provinsi" required aria-describedby="provinsi-err">
                    <option value="">Select province…</option>
                    ${PROVINCES.map(p => `<option>${esc(p)}</option>`).join("")}
                  </select>
                  <p class="error-msg" id="provinsi-err" hidden></p>
                </div>
                ${UI.field({ id: "kota", label: "City / Regency", required: true, autocomplete: "address-level2", placeholder: "Jakarta Selatan" })}
                ${UI.field({ id: "kecamatan", label: "District", required: true, placeholder: "Kebayoran Baru" })}
                ${UI.field({ id: "alamat", label: "Full address", required: true, span: true, autocomplete: "street-address", placeholder: "Street, house number, RT/RW, landmark" })}
                <div class="field span-2">
                  <label for="catatan">Delivery note (optional)</label>
                  <textarea id="catatan" name="catatan" placeholder="e.g. leave with security if no one is home"></textarea>
                </div>
              </div>
            </section>
            <section class="checkout-section" aria-labelledby="co-2">
              <h2 id="co-2"><span class="sec-num">2</span> Shipping</h2>
              <p id="co-origin" style="font-size:13.5px;color:var(--text-2)">${originLine()}</p>
              <div id="shipping-zone">
                <button type="button" class="btn btn-outline" data-action="calc-shipping">${icon("truck")} Calculate Shipping</button>
              </div>
            </section>
            <section class="checkout-section" aria-labelledby="co-3">
              <h2 id="co-3"><span class="sec-num">3</span> Payment</h2>
              <div class="pay-methods">
                ${paymentAdapter.methods.map(m => `<div class="pay-method">
                  <span class="pm-name">${esc(m.label)}</span>
                  <span style="font-size:12.5px;color:var(--text-2)">${esc(m.desc)}</span>
                  <span class="chip chip-warn">${icon("lock")} Not connected</span>
                </div>`).join("")}
              </div>
              <p style="font-size:12.5px;color:var(--text-2)">Online payment is being set up. After placing the order you will receive payment instructions on the order page. PINs or wallet credentials are never requested on this site.</p>
            </section>
            <section class="checkout-section" aria-labelledby="co-4">
              <h2 id="co-4"><span class="sec-num">4</span> Review Order</h2>
              <div class="review-items">
                ${items.map(i => `<div class="review-item">
                  <div><p class="ri-name">${esc(i.product.name)} × ${i.qty}</p><p class="ri-var">${esc(i.variant.color)} / ${esc(i.variant.size)} · ${esc(i.sku)}</p></div>
                  <span class="tabular">${rupiah(i.variant.price * i.qty)}</span>
                </div>`).join("")}
              </div>
              <div id="voucher-zone"></div>
              <div data-co-totals>${coTotalsHtml()}</div>
              <button type="submit" class="btn btn-primary btn-block" ${issues.length ? "disabled" : ""}>Place Order</button>
              <p class="summary-note">Placing the order reserves your variants' stock and records the order as Awaiting Payment. Payment is completed via the instructions on your order page.</p>
            </section>
          </form>
          <aside class="summary-card" aria-label="Order summary">
            <h2 class="serif">Summary</h2>
            <div data-co-totals>${coTotalsHtml()}</div>
            <p class="summary-note">${icon("shield")} In production, all totals are recomputed on the server.</p>
            <a class="link-underline" style="font-size:13.5px" href="#/keranjang">Edit cart</a>
          </aside>
        </div>
      </div>`;
    },
    mount() {
      const form = document.getElementById("checkout-form");
      if (!form) return;
      renderVoucherZone();
      const rules = {
        nama: { required: true, min: 3, requiredMsg: "Enter the recipient's name." },
        email: { required: true, email: true },
        phone: { required: true, phone: true },
        postal: { required: true, postal: true },
        provinsi: { required: true, requiredMsg: "Select the destination province." },
        kota: { required: true }, kecamatan: { required: true },
        alamat: { required: true, min: 10, requiredMsg: "Enter the full address so the courier can deliver." }
      };
      form.addEventListener("submit", e => {
        e.preventDefault();
        if (!UI.validateForm(form, rules)) { UI.toast("Please check the fields marked in red.", "error"); return; }
        const val = id => form.querySelector("#" + id).value.trim();
        const res = Store.createOrder({
          customer: { name: val("nama"), email: val("email"), phone: val("phone") },
          address: { line: val("alamat"), province: val("provinsi"), city: val("kota"), district: val("kecamatan"), postal: val("postal") },
          note: val("catatan"),
          voucherCode: CO.voucherCode || null
        });
        if (!res.ok) { UI.toast(res.message, "error"); return; }
        App.verifyOrder(res.order.id);
        UI.toast(`Order ${res.order.orderNumber} created — awaiting payment.`);
        App.go("#/terima-kasih/" + res.order.id);
      });
    }
  };
  function applyVoucher() {
    const input = document.getElementById("voucher-input");
    const err = document.getElementById("voucher-error");
    if (!input) return;
    const code = input.value.trim();
    if (!code) { UI.toast("Enter a voucher code first.", "error"); input.focus(); return; }
    const check = Store.validateVoucher(code, Store.cartSubtotal());
    if (!check.ok) {
      if (err) { err.innerHTML = icon("alert") + esc(check.message); err.hidden = false; }
      input.setAttribute("aria-invalid", "true");
      return;
    }
    CO.voucherCode = check.voucher.code;
    CO.discount = check.discount;
    renderVoucherZone();
    refreshCoTotals();
    UI.toast(`Voucher ${check.voucher.code} applied — you save ${rupiah(check.discount)}.`);
  }
  function removeVoucher() {
    CO = { voucherCode: "", discount: 0 };
    renderVoucherZone();
    refreshCoTotals();
    UI.toast("Voucher removed.");
  }
  async function calcShipping() {
    const form = document.getElementById("checkout-form");
    const zone = document.getElementById("shipping-zone");
    if (!form || !zone) return;
    const addrRules = {
      provinsi: { required: true, requiredMsg: "Select the destination province." },
      kota: { required: true }, kecamatan: { required: true },
      postal: { required: true, postal: true },
      alamat: { required: true, min: 10 }
    };
    if (!UI.validateForm(form, addrRules)) { UI.toast("Complete your address first to calculate shipping.", "error"); return; }
    zone.innerHTML = `<div class="loading-row"><span class="spinner" aria-hidden="true"></span> Calculating rates for your address…</div>`;
    try {
      await shippingAdapter.getRates({}, Store.cartItems());
    } catch (err) {
      zone.innerHTML = UI.alertBox("error", "Shipping cannot be calculated yet",
        esc(err.message) + "<br><span style='font-size:12.5px'>To configure: a courier rate provider (e.g. Biteship/RajaOngkir), its API key on the server, and the shipping origin in Admin → Settings.</span>",
        `<button type="button" class="btn btn-outline btn-sm" data-action="calc-shipping">${icon("refresh")} Try Again</button>`);
    }
  }

  /* ---------- Order ---------- */
  function timeline(o) {
    if (o.fulfillmentStatus === "dibatalkan") return UI.alertBox("error", "Order cancelled", "The stock reservation has been released. If this is a mistake, contact support with your order number.");
    const steps = ["Awaiting Payment", "Processing", "Shipped", "Completed"];
    let idx = 0;
    if (o.paymentStatus === "berhasil") idx = { diproses: 1, dikirim: 2, selesai: 3 }[o.fulfillmentStatus] ?? 1;
    return `<div class="status-timeline" role="list" aria-label="Order status">
      ${steps.map((s, i) => `<div class="tl-step ${i < idx ? "done" : i === idx ? "current" : ""}" role="listitem">
        <span class="tl-dot">${i < idx ? icon("check") : ""}</span><span class="tl-label">${esc(s)}</span>
      </div>`).join("")}
    </div>`;
  }
  const order = {
    title: q => { const o = Store.order(q.id); return (o ? "Order " + o.orderNumber : "Order") + " — Haadiya Syar’i"; },
    html(q) {
      const o = Store.order(q.id);
      if (!o) return `<div class="container section">${UI.emptyState({ icon: "box", title: "Order not found", body: "Please double-check your order link.", action: '<a class="btn btn-primary" href="#/lacak-pesanan">Track Order</a>' })}</div>`;
      if (!App.isOrderVerified(o.id)) return `<div class="container section order-layout">
        ${UI.emptyState({ icon: "lock", title: "Verification required",
          body: "For security, order details open only after verifying the order number + email. An order ID alone is not enough.",
          action: '<a class="btn btn-primary" href="#/lacak-pesanan">Verify Order</a>' })}</div>`;
      const canCancel = o.paymentStatus === "menunggu_pembayaran" && o.fulfillmentStatus === "menunggu";
      return `<div class="container section order-layout">
        <div class="order-head">
          <div>
            <span class="eyebrow">Order details</span>
            <h1 style="font-size:36px">Order ${esc(o.orderNumber)}</h1>
            <p class="order-num">Placed ${UI.dateFmt(o.createdAt)} · keep this number for tracking</p>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">${UI.paymentChip(o.paymentStatus)} ${UI.fulfillmentChip(o.fulfillmentStatus)}</div>
        </div>
        ${timeline(o)}
        ${o.paymentStatus === "menunggu_pembayaran" ? `<div class="order-card">
          <h2 class="serif">Payment instructions</h2>
          ${UI.alertBox("neutral", "Online payment is being set up",
            "Keep your order number. To complete payment, contact us through the official channels with your order number so we can verify it. Your stock is reserved while the order awaits payment.",
            `<a class="btn btn-primary btn-sm" href="#/pesanan/${esc(o.id)}/pembayaran">${icon("arrow")} Payment Details</a>
             <button class="btn btn-outline btn-sm" data-action="check-payment" data-id="${esc(o.id)}">${icon("refresh")} Check Status</button>`)}
          <div id="payment-check-result" style="margin-top:12px"></div>
        </div>` : ""}
        ${o.paymentStatus === "kedaluwarsa" && o.fulfillmentStatus === "dibatalkan" ? `<div class="order-card">
          ${UI.alertBox("error", "This order expired", "The stock reservation was released. If stock is still available, you can reopen the order.",
            `<button class="btn btn-primary btn-sm" data-action="retry-payment" data-id="${esc(o.id)}">${icon("refresh")} Reopen &amp; Pay</button>`)}
        </div>` : ""}
        <div class="order-card">
          <h2 class="serif">Items</h2>
          <div class="review-items">
            ${o.items.map(i => `<div class="review-item">
              <div><p class="ri-name">${esc(i.name)} × ${i.qty}</p><p class="ri-var">${esc(i.variant)} · ${esc(i.sku)}</p></div>
              <span class="tabular">${rupiah(i.price * i.qty)}</span></div>`).join("")}
          </div>
          <div class="summary-row" style="margin-top:16px"><span>Subtotal</span><span class="val">${rupiah(o.subtotal)}</span></div>
          ${o.voucher ? `<div class="summary-row" style="color:var(--ok)"><span>Voucher ${esc(o.voucher.code)}</span><span class="val">− ${rupiah(o.discount)}</span></div>` : ""}
          <div class="summary-row muted"><span>Shipping (${o.courier ? esc(o.courier) : "pending courier integration"})</span><span class="val">${o.shippingCost != null ? rupiah(o.shippingCost) : "Not calculated"}</span></div>
          <div class="summary-total"><span>Total${o.shippingCost == null ? " (excl. shipping)" : ""}</span><span>${rupiah(o.total)}</span></div>
        </div>
        <div class="order-card">
          <h2 class="serif">Delivery</h2>
          <div class="order-grid">
            <div>
              <div class="kv"><span class="k">Recipient</span><span>${esc(o.customer.name)} · ${esc(o.customer.phone)}</span></div>
              <div class="kv"><span class="k">Address</span><span>${esc(o.address.line)}, ${esc(o.address.district)}, ${esc(o.address.city)}, ${esc(o.address.province)} ${esc(o.address.postal)}</span></div>
              ${o.address.note ? `<div class="kv"><span class="k">Note</span><span>${esc(o.address.note)}</span></div>` : ""}
            </div>
            <div>
              <div class="kv"><span class="k">Courier / service</span><span>${o.courier ? esc(o.courier) : "Not selected — pending shipping integration"}</span></div>
              <div class="kv" id="resi"><span class="k">Tracking number</span><span class="tabular">${o.trackingNumber ? esc(o.trackingNumber) : "Not yet — appears once your order ships"}</span></div>
            </div>
          </div>
        </div>
        <div class="order-card">
          <h2 class="serif">History</h2>
          ${o.history.map(h => `<div class="kv"><span class="k">${UI.dateFmt(h.at)}</span><span>${esc(h.event)}</span></div>`).join("")}
        </div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">
          ${canCancel ? `<button class="btn btn-outline" data-action="cancel-order" data-id="${esc(o.id)}">Cancel Order</button>` : ""}
          <a class="btn btn-ghost" href="#/kontak">Need help? Contact us</a>
        </div>
      </div>`;
    },
    mount(q) {
      if (q.focus === "resi") {
        const el = document.getElementById("resi");
        if (el) setTimeout(() => el.scrollIntoView({ block: "center", behavior: "smooth" }), 100);
      }
    }
  };
  async function checkPayment(id) {
    const zone = document.getElementById("payment-check-result");
    if (!zone) return;
    zone.innerHTML = `<div class="loading-row"><span class="spinner"></span> Checking status with the payment provider…</div>`;
    try {
      await paymentAdapter.refreshStatus(Store.order(id));
    } catch (err) {
      zone.innerHTML = UI.alertBox("neutral", "Status unchanged: Awaiting Payment", esc(err.message));
    }
  }

  /* ---------- Thank you ---------- */
  const thankYou = {
    title: () => "Thank You — Haadiya Syar’i",
    html(q) {
      const o = Store.order(q.id);
      if (!o || !App.isOrderVerified(o.id)) return `<div class="container section">${UI.emptyState({ icon: "lock", title: "Verification required", body: "Open your order via the Track Order page with number + email.", action: '<a class="btn btn-primary" href="#/lacak-pesanan">Track Order</a>' })}</div>`;
      const paid = o.paymentStatus === "berhasil";
      return `<div class="container section">
        <div class="thankyou">
          <div class="ty-icon ${paid ? "" : "pending"}">${icon(paid ? "check" : "clipboard")}</div>
          <span class="eyebrow">Order ${esc(o.orderNumber)}</span>
          <h1>${paid ? "Thank you for your purchase!" : "Thank you! Your order has been received."}</h1>
          <p class="ty-sub">${paid
            ? "Your payment has been verified. The order is being processed — the tracking number will appear on your order page once it ships."
            : "One more step: complete the payment so your order can be processed. Your stock is reserved while the order awaits payment."}</p>
          <div class="ty-order">
            <div class="kv"><span class="k">Order number</span><span class="tabular"><strong>${esc(o.orderNumber)}</strong></span></div>
            <div class="kv"><span class="k">Total</span><span class="tabular"><strong>${rupiah(o.total)}</strong>${o.shippingCost == null ? " <small style='color:var(--text-2)'>+ shipping</small>" : ""}</span></div>
            <div class="kv"><span class="k">Status</span><span>${UI.paymentChip(o.paymentStatus)}</span></div>
          </div>
          <div class="ty-actions">
            ${!paid && o.fulfillmentStatus !== "dibatalkan" ? `<a class="btn btn-primary" href="#/pesanan/${esc(o.id)}/pembayaran">${icon("arrow")} Pay Now</a>` : ""}
            <a class="btn ${paid ? "btn-primary" : "btn-outline"}" href="#/pesanan/${esc(o.id)}">${icon("clipboard")} Check Order Status</a>
            <a class="btn btn-outline" href="#/pesanan/${esc(o.id)}?focus=resi">${icon("truck")} Check Tracking</a>
          </div>
          <p style="font-size:13px;color:var(--text-2)">Save your order number and the email <strong>${esc(o.customer.email)}</strong> to track anytime without an account.</p>
          <a class="link-underline" style="font-size:13.5px" href="#/produk">Continue shopping</a>
        </div>
      </div>`;
    },
    mount() {}
  };

  /* ---------- Payment page ---------- */
  const payment = {
    title: q => { const o = Store.order(q.id); return "Payment " + (o ? o.orderNumber : "") + " — Haadiya Syar’i"; },
    html(q) {
      const o = Store.order(q.id);
      if (!o || !App.isOrderVerified(o.id)) return `<div class="container section">${UI.emptyState({ icon: "lock", title: "Verification required", body: "Open your order via the Track Order page with number + email.", action: '<a class="btn btn-primary" href="#/lacak-pesanan">Track Order</a>' })}</div>`;
      if (o.paymentStatus === "berhasil") return `<div class="container section">${UI.emptyState({ icon: "check", title: "Order already paid", body: "Your payment has been verified. See your order status.", action: `<a class="btn btn-primary" href="#/terima-kasih/${esc(o.id)}">Open Thank-You Page</a>` })}</div>`;
      if (o.fulfillmentStatus === "dibatalkan") return `<div class="container section">${UI.emptyState({ icon: "alert", title: "Order cancelled / expired", body: "Reopen the order to pay (stock will be reserved again if available).", action: `<button class="btn btn-primary" data-action="retry-payment" data-id="${esc(o.id)}">Reopen &amp; Pay</button>` })}</div>`;
      const canCancel = o.paymentStatus === "menunggu_pembayaran" && o.fulfillmentStatus === "menunggu";
      return `<div class="container section order-layout">
        <div class="order-head">
          <div><span class="eyebrow">Payment</span>
          <h1 style="font-size:36px">Pay Order ${esc(o.orderNumber)}</h1>
          <p class="order-num">${o.items.reduce((n, i) => n + i.qty, 0)} item(s) · total ${rupiah(o.total)}${o.shippingCost == null ? " (excl. shipping)" : ""}</p></div>
          ${UI.paymentChip(o.paymentStatus)}
        </div>
        ${UI.alertBox("neutral", "Online payment is being set up",
          "Keep your order number. To complete payment, contact us through the official channels — include your order number so we can verify it.")}
        <div class="order-card">
          <h2 class="serif">Bill summary</h2>
          <div class="review-items">
            ${o.items.map(i => `<div class="review-item">
              <div><p class="ri-name">${esc(i.name)} × ${i.qty}</p><p class="ri-var">${esc(i.variant)} · ${esc(i.sku)}</p></div>
              <span class="tabular">${rupiah(i.price * i.qty)}</span></div>`).join("")}
          </div>
          <div class="summary-row" style="margin-top:16px"><span>Subtotal</span><span class="val">${rupiah(o.subtotal)}</span></div>
          ${o.voucher ? `<div class="summary-row" style="color:var(--ok)"><span>Voucher ${esc(o.voucher.code)}</span><span class="val">− ${rupiah(o.discount)}</span></div>` : ""}
          <div class="summary-row muted"><span>Shipping</span><span class="val">${o.shippingCost != null ? rupiah(o.shippingCost) : "Calculated once the address is verified"}</span></div>
          <div class="summary-total"><span>Total</span><span>${rupiah(o.total)}</span></div>
        </div>
        <div class="order-card">
          <h2 class="serif">Payment confirmation</h2>
          <p style="font-size:14px;color:var(--text-2)">Contact us with your order number <strong class="tabular">${esc(o.orderNumber)}</strong>. The order status is updated after the payment is verified.</p>
          <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:14px">
            <a class="btn btn-primary" href="#/kontak">${icon("mail")} Contact Us</a>
            <a class="btn btn-outline" href="#/pesanan/${esc(o.id)}">${icon("clipboard")} Order Details</a>
            ${canCancel ? `<button class="btn btn-ghost" data-action="cancel-order" data-id="${esc(o.id)}">Cancel Order</button>` : ""}
          </div>
        </div>
        <a class="btn btn-ghost" href="#/pesanan/${esc(o.id)}">← Back to order details</a>
      </div>`;
    },
    mount() {}
  };

  /* ---------- Track order ---------- */
  const track = {
    title: () => "Track Order — Haadiya Syar’i",
    html() {
      return `<div class="container section">
        <div class="section-head" style="justify-content:center;text-align:center"><div>
          <span class="eyebrow">No account needed</span><h1>Track Your Order</h1>
          <p style="margin-inline:auto">Enter the order number and the email used at checkout. Details never open from an order ID alone.</p>
        </div></div>
        <form class="track-form" id="track-form" novalidate>
          ${UI.field({ id: "track-number", label: "Order number", required: true, placeholder: "HDY-XXXXXX" })}
          ${UI.field({ id: "track-email", label: "Email used at checkout", type: "email", required: true, placeholder: "name@example.com" })}
          <button class="btn btn-primary btn-block" type="submit">${icon("search")} Track Order</button>
          <p class="error-msg" id="track-error" hidden role="alert"></p>
        </form>
      </div>`;
    },
    mount() {
      const form = document.getElementById("track-form");
      form.addEventListener("submit", e => {
        e.preventDefault();
        const ok = UI.validateForm(form, {
          "track-number": { required: true, requiredMsg: "Enter your order number, e.g. HDY-XXXXXX." },
          "track-email": { required: true, email: true }
        });
        const errEl = document.getElementById("track-error");
        errEl.hidden = true;
        if (!ok) return;
        const o = Store.findOrder(form.querySelector("#track-number").value, form.querySelector("#track-email").value);
        if (!o) {
          errEl.innerHTML = icon("alert") + " The order number or email does not match. Please double-check both.";
          errEl.hidden = false;
          return;
        }
        App.verifyOrder(o.id);
        App.go("#/pesanan/" + o.id);
      });
    }
  };

  /* ---------- Static pages (copy edited via Admin → Pages & Banner) ---------- */
  const pageText = id => ((Store.settings().pages || {})[id]) || "";
  const staticPage = (title, eyebrow, pageId) => ({
    title: () => title + " — Haadiya Syar’i",
    html: () => `<div class="container section"><div class="prose"><span class="eyebrow">${eyebrow}</span><h1>${title}</h1>${UI.richText(pageText(pageId))}</div></div>`,
    mount() {}
  });
  const about = {
    title: () => "About Haadiya — Haadiya Syar’i",
    html() {
      const a = (Store.settings().pages || {}).about || {};
      return `<section class="about-hero"><div class="container">
        <span class="eyebrow">The Quiet Guide</span>
        <h1>${esc(a.heroTitle || "Quiet, purposeful, mature.")}</h1>
        <p>${esc(a.heroText || "")}</p>
      </div></section>
      <div class="container section"><div class="prose about-prose">${UI.richText(a.body || "")}</div></div>`;
    },
    mount() {}
  };
  const faq = staticPage("FAQ", "Common questions", "faq");
  const shippingPolicy = staticPage("Shipping & Returns", "Help", "shipping");
  const privacy = staticPage("Privacy Policy", "Legal", "privacy");
  const terms = staticPage("Terms of Purchase", "Legal", "terms");
  const contact = {
    title: () => "Contact — Haadiya Syar’i",
    html() {
      const s = Store.settings();
      return `<div class="container section"><div class="prose">
        <span class="eyebrow">Contact</span><h1>Get in Touch</h1>
        <div class="kv"><span class="k">Email</span><span>${esc(s.email)}</span></div>
        <div class="kv"><span class="k">Phone / WhatsApp</span><span>${esc(s.phone)}</span></div>
        <h2 class="serif">Official channels</h2>
        <p><a class="link-underline" href="${esc(s.instagram)}" target="_blank" rel="noopener">Instagram @haadiyasyari</a><br>
        <a class="link-underline" href="${esc(s.shopee)}" target="_blank" rel="noopener">Shopee akalia18</a><br>
        <a class="link-underline" href="${esc(s.linktree)}" target="_blank" rel="noopener">Linktree haadiyasyari</a></p>
      </div></div>`;
    },
    mount() {}
  };

  return { home, catalog, search, product, cart, checkout, order, thankYou, payment, track, about, faq, contact, shippingPolicy, privacy, terms, PDActions, PDState: () => PD, calcShipping, checkPayment, productCard, originLine, applyVoucher, removeVoucher, refreshCoTotals, setHeroVideoUrl: u => { heroVideoObjectUrl = u; } };
})();