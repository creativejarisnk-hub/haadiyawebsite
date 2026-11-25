/* Admin dashboard — reads & writes the same Store as the public catalog.
   Admin identity is verified by Supabase Auth and admin_users RLS. */
const AdminViews = (() => {
  const { esc, rupiah, icon, img } = UI;

  const NAV = [
    ["#/admin", "Overview", "home"],
    ["#/admin/produk", "Products & Variants", "tag"],
    ["#/admin/stok", "Inventory", "box"],
    ["#/admin/pesanan", "Orders", "clipboard"],
    ["#/admin/voucher", "Vouchers", "ticket"],
    ["#/admin/halaman", "Pages & Banner", "edit"],
    ["#/admin/pengaturan", "Settings", "settings"]
  ];
  function shell(active, content) {
    return `<div class="admin-shell">
      <aside class="admin-sidebar" aria-label="Admin navigation">
        <div class="adm-brand"><span class="wordmark-main">Haadiya</span><small>Admin</small></div>
        ${NAV.map(([href, label, ic]) => `<a class="adm-nav-link ${active === href ? "active" : ""}" href="${href}">${icon(ic)} ${label}</a>`).join("")}
        <div class="adm-bottom">
          <a class="adm-nav-link" href="#/" target="_self">${icon("eye")} View Store</a>
          <button class="adm-nav-link" data-action="admin-logout">${icon("logout")} Sign Out</button>
        </div>
      </aside>
      <div class="admin-main"><div id="cloud-status" role="status" style="font-size:13px;margin-bottom:12px;color:var(--text-2)">${esc(Store.status().message)}</div>${content}</div>
    </div>`;
  }
  const head = (title, sub, right) => `<div class="admin-head"><div><h1 class="serif">${esc(title)}</h1>${sub ? `<p>${sub}</p>` : ""}</div>${right || ""}</div>`;

  /* ---------- Login ---------- */
  const login = {
    title: () => "Admin Sign In — Haadiya Syar’i",
    html() {
      return `<div class="login-wrap"><form class="login-card" id="login-form" novalidate>
        <div><span class="wordmark-main">Haadiya</span>
        <p style="font-size:13px;color:var(--text-2)">Sign in to the admin dashboard</p></div>
        ${UI.field({ id: "login-user", label: "Email", type: "email", required: true, autocomplete: "username" })}
        ${UI.field({ id: "login-pass", label: "Password", type: "password", required: true, autocomplete: "current-password" })}
        <button class="btn btn-primary btn-block" type="submit">${icon("lock")} Sign In</button>
        <p class="error-msg" id="login-error" hidden role="alert"></p>
        ${UI.alertBox("neutral", "Restricted access", "This area is for store managers only.")}
        <a class="link-underline" style="font-size:13px" href="#/">← Back to store</a>
      </form></div>`;
    },
    mount() {
      const form = document.getElementById("login-form");
      form.addEventListener("submit", async e => {
        e.preventDefault();
        const email = form.querySelector("#login-user").value.trim();
        const passwordInput = form.querySelector("#login-pass");
        const err = document.getElementById("login-error");
        const button = form.querySelector('button[type="submit"]');
        if (button.disabled) return;
        err.hidden = true;
        if (!email || !form.querySelector("#login-user").validity.valid || !passwordInput.value) {
          err.textContent = "Enter a valid email and password.";
          err.hidden = false;
          return;
        }
        const original = button.innerHTML;
        button.disabled = true;
        button.textContent = "Signing in...";
        try {
          const result = await HaadiyaAuth.signIn(email, passwordInput.value);
          passwordInput.value = "";
          if (!form.isConnected) return;
          if (result.ok) {
            UI.toast("Signed in as admin.");
            App.go("#/admin");
          } else {
            err.textContent = result.message;
            err.hidden = false;
          }
        } finally {
          button.disabled = false;
          button.innerHTML = original;
        }
      });
    }
  };

  /* ---------- Overview ---------- */
  const dashboard = {
    title: () => "Admin — Haadiya Syar’i",
    html() {
      const ps = Store.products(true);
      const variants = ps.flatMap(p => p.variants);
      const totalStock = variants.reduce((s, v) => s + v.stock, 0);
      const reserved = variants.reduce((s, v) => s + (v.reserved || 0), 0);
      const os = Store.orders();
      const waiting = os.filter(o => o.paymentStatus === "menunggu_pembayaran").length;
      const toShip = os.filter(o => o.paymentStatus === "berhasil" && o.fulfillmentStatus === "diproses").length;
      const vs = Store.vouchers();
      return shell("#/admin", `
        ${head("Overview", "Catalog, settings and media use Supabase. Orders remain local preview data.")}
        <div class="stat-grid">
          <div class="stat-card"><p class="s-label">Products</p><p class="s-value">${ps.length}</p><p class="s-sub">${ps.filter(p => p.status === "published").length} published</p></div>
          <div class="stat-card"><p class="s-label">Active SKUs</p><p class="s-value">${variants.filter(v => v.active).length}</p><p class="s-sub">${variants.filter(v => v.active && Store.available(v) <= 0).length} sold out</p></div>
          <div class="stat-card"><p class="s-label">Stock on hand</p><p class="s-value">${totalStock}</p><p class="s-sub">${reserved} reserved</p></div>
          <div class="stat-card"><p class="s-label">Orders</p><p class="s-value">${os.length}</p><p class="s-sub">${waiting} awaiting payment · ${toShip} to ship</p></div>
        </div>
        <div class="panel">
          <div class="panel-head"><h2 class="serif">Integration status</h2><span class="chip chip-warn">${icon("lock")} Real checkout not live yet</span></div>
          ${integrationStatus().map(i => `<div class="integration-item">
            <div><p class="i-name">${esc(i.name)}</p><p class="i-desc">${esc(i.todo)}</p></div>
            <span class="chip ${i.connected ? "chip-ok" : "chip-error"}">${i.connected ? icon("check") + " Connected" : icon("x") + " Not connected"}</span>
          </div>`).join("")}
        </div>
        <div class="panel">
          <div class="panel-head"><h2 class="serif">Recent orders</h2><a class="btn btn-ghost btn-sm" href="#/admin/pesanan">All orders ${icon("arrow")}</a></div>
          ${ordersTable(os.slice(0, 5))}
        </div>
        <div class="panel">
          <div class="panel-head"><h2 class="serif">Vouchers</h2><a class="btn btn-ghost btn-sm" href="#/admin/voucher">Manage vouchers ${icon("arrow")}</a></div>
          <p style="font-size:13.5px;color:var(--text-2)">${vs.length} voucher(s) · ${vs.filter(v => v.active).length} active · ${vs.reduce((s, v) => s + (v.used || 0), 0)} total redemptions.</p>
        </div>
        <div class="panel">
          <div class="panel-head"><h2 class="serif">Cloud content</h2></div>
          <p style="font-size:13.5px;color:var(--text-2);margin-bottom:14px">Import your original JSON backup once, only if the cloud is empty. Products (including drafts), voucher codes and public settings will be readable by anyone through the database. Orders, customer records and media are not imported.</p>
          <button class="btn btn-primary btn-sm" data-action="cloud-import" ${Store.status().state !== "empty" ? "disabled" : ""}>Import backup to Supabase</button>
          <input type="file" id="cloud-backup-file" accept=".json,application/json" hidden>
          <button class="btn btn-outline btn-sm" data-action="cloud-reload">Reload cloud content</button>
          <hr style="margin:16px 0">
          <p class="hint">Import existing photos and logos from your original backup. Only missing cloud media fields are filled; existing cloud media and text are not overwritten. Local file paths and IndexedDB videos must be uploaded manually.</p>
          <button class="btn btn-outline btn-sm" data-action="media-import" ${Store.status().state !== "ready" || Store.status().busy ? "disabled" : ""}>Import media from backup</button>
          <input type="file" id="media-backup-file" accept=".json,application/json" hidden>
        </div>`);
    },
    mount() {
      document.getElementById("media-backup-file")?.addEventListener("change",async e=>{
        const file=e.target.files[0];e.target.value="";if(!file)return;
        try {const source=JSON.parse(await file.text());if(!confirm("Upload missing public product photos, logos and banner media from this backup? Do not include private images."))return;
          const r=await Store.importMedia(source);if(!r.ok){UI.toast(r.message,"error");return;}
          alert(r.imported+" media reference(s) saved."+(r.skipped.length?"\n"+r.skipped.join("\n"):""));App.refresh();
        }catch(err){UI.toast(err.message,"error");}
      });
      document.getElementById("cloud-backup-file")?.addEventListener("change", async e => {
        const file = e.target.files[0]; e.target.value = "";
        if (!file) return;
        try {
          const source = JSON.parse(await file.text());
          if (source.version !== 2) throw Error("This is not a version 2 Haadiya backup.");
          const content = Store.projectBackup(source);
          if (!confirm(`Import ${content.products.length} product(s) and ${content.vouchers.length} voucher(s), plus website text and settings? Draft products and all voucher codes will be publicly readable. Check that the content does not contain private information. Orders and media will NOT be imported. Existing cloud content will not be overwritten.`)) return;
          const result = await Store.importBackup(source);
          if (!result.ok) { UI.toast(result.message,"error"); return; }
          UI.toast("Backup imported to Supabase."); App.refresh();
        } catch(err) { UI.toast(err.message,"error"); }
      });
    }
  };

  /* ---------- Products ---------- */
  const products = {
    title: () => "Products — Haadiya Admin",
    html() {
      const ps = Store.products(true);
      return shell("#/admin/produk", `
        ${head("Products & Variants", "Changes appear immediately in the public catalog — same data source.", `<a class="btn btn-primary btn-sm" href="#/admin/produk/baru">${icon("plus")} Add Product</a>`)}
        <div class="panel">${ps.length ? `<div class="table-wrap"><table class="data-table">
          <thead><tr><th></th><th>Product</th><th>Category</th><th class="num">Price</th><th class="num">Stock</th><th>Status</th><th></th></tr></thead>
          <tbody>${ps.map(p => {
            const r = Store.priceRange(p);
            const statusChip = p.status === "published" ? '<span class="chip chip-ok">Public</span>' : p.status === "draft" ? '<span class="chip chip-neutral">Draft</span>' : '<span class="chip chip-error">Archived</span>';
            return `<tr>
              <td>${img(p.images[0], "", "table-img")}</td>
              <td><strong>${esc(p.name)}</strong><br><span style="font-size:12px;color:var(--text-2)">/${esc(p.slug)} · ${p.variants.length} variant(s)</span></td>
              <td>${esc(p.category)}</td>
              <td class="num">${r.min === r.max ? rupiah(r.min) : rupiah(r.min) + "–" + rupiah(r.max)}</td>
              <td class="num">${Store.productStock(p)}</td>
              <td>${statusChip}</td>
              <td style="white-space:nowrap"><a class="btn btn-outline btn-sm" href="#/admin/produk/${esc(p.slug)}">${icon("edit")} Edit</a>
                <button class="btn btn-ghost btn-sm" data-action="delete-product" data-slug="${esc(p.slug)}" style="color:var(--error)">${icon("trash")} Delete</button></td>
            </tr>`;
          }).join("")}</tbody>
        </table></div>` : UI.emptyState({ icon: "box", title: "No products yet", body: "Add your first product — it will appear in the public catalog once published.", action: '<a class="btn btn-primary" href="#/admin/produk/baru">Add Product</a>' })}</div>`);
    },
    mount() {}
  };

  /* Photo manager with per-colour tabs */
  let PE = { key: "", photos: {} };
  function variantColors() {
    const rows = [...document.querySelectorAll("#variant-table tbody tr")];
    return [...new Set(rows.map(r => r.querySelector('[data-vfield="color"]')?.value.trim()).filter(Boolean))];
  }
  function renderPhotoTabs() {
    const tabs = document.getElementById("photo-tabs");
    if (!tabs) return;
    const colors = variantColors();
    if (PE.key && PE.key !== "" && !colors.includes(PE.key)) PE.key = "";
    tabs.innerHTML = ["", ...colors].map(c =>
      `<button type="button" class="size-pill" data-action="photo-tab" data-key="${esc(c)}" aria-pressed="${PE.key === c}">${c === "" ? "Default" : esc(c)}${(PE.photos[c] || []).length ? ` · ${(PE.photos[c] || []).length}` : ""}</button>`).join("");
  }
  function renderPhotos() {
    renderPhotoTabs();
    const zone = document.getElementById("photo-manager");
    if (!zone) return;
    const list = PE.photos[PE.key] || [];
    zone.innerHTML = list.length ? list.map((src, i) => `
      <div class="photo-item">
        <div class="ph-img">${img(src, `Photo ${i + 1}`)}</div>
        ${i === 0 ? '<span class="chip chip-ok ph-primary">Main</span>' : ""}
        <div class="ph-actions">
          ${i > 0 ? `<button type="button" data-action="photo-primary" data-index="${i}" title="Make main photo">${icon("check")} Main</button>` : ""}
          <button type="button" class="danger" data-action="photo-remove" data-index="${i}" aria-label="Delete photo ${i + 1}">${icon("trash")} Delete</button>
        </div>
      </div>`).join("")
      : `<p class="photo-empty">${PE.key === "" ? "No default photos yet. Upload JPG/PNG — the first photo becomes the catalog thumbnail." : `No photos for ${esc(PE.key)} yet — the default photos are used until you upload colour-specific ones.`}</p>`;
  }
  const PhotoActions = {
    tab(key) { PE.key = key; renderPhotos(); },
    remove(i) { (PE.photos[PE.key] || []).splice(i, 1); renderPhotos(); },
    primary(i) { const list = PE.photos[PE.key]; const [src] = list.splice(i, 1); list.unshift(src); renderPhotos(); },
    addPath() {
      const input = document.getElementById("pf-image-path");
      const v = input.value.trim();
      if (!HaadiyaMedia.isUrl(v)) { UI.toast("Enter a public HTTPS image URL or upload a file.", "error"); return; }
      (PE.photos[PE.key] = PE.photos[PE.key] || []).push(v);
      input.value = ""; renderPhotos();
    },
    async upload(files) {
      const editor=PE, key=PE.key; if(editor.uploading){UI.toast("Wait for the current photo selection.","error");return;} editor.uploading=true;
      try { for (const file of files) {
        try {
          const url = await UI.readImageFile(file, { maxDim: 1200 });
          if (PE===editor) (editor.photos[key] = editor.photos[key] || []).push(url);
        } catch (err) { UI.toast(`${file.name}: ${err.message}`, "error"); }
      }
      } finally {editor.uploading=false;}
      if(PE!==editor)return;
      renderPhotos();
      UI.toast("Click Save Product to upload and apply selected photos.");
    }
  };

  const productEdit = {
    title: q => (q.slug === "baru" ? "New Product" : "Edit Product") + " — Haadiya Admin",
    html(q) {
      const isNew = q.slug === "baru";
      const p = isNew ? {
        slug: "", name: "", summary: "", details: "", category: "Abaya",
        weightGrams: 500, status: "draft", images: [], colorImages: {},
        variants: [{ sku: "", color: "", hex: "#1B1B1B", size: "Regular", price: 0, stock: 0, reserved: 0, active: true }]
      } : Store.product(q.slug);
      if (!p) return shell("#/admin/produk", UI.emptyState({ icon: "box", title: "Product not found", body: "Back to the product list.", action: '<a class="btn btn-primary" href="#/admin/produk">Product List</a>' }));
      PE = { key: "", photos: { "": [...(p.images || [])], ...JSON.parse(JSON.stringify(p.colorImages || {})) } };
      const variantRow = v => `<tr>
        <td><input type="text" value="${esc(v.sku)}" data-vfield="sku" aria-label="SKU" ${v.reserved ? "readonly" : ""}></td>
        <td><input type="text" value="${esc(v.color)}" data-vfield="color" aria-label="Colour"></td>
        <td><input type="text" value="${esc(v.hex || "")}" data-vfield="hex" aria-label="Colour hex" style="width:90px"></td>
        <td><input type="text" value="${esc(v.size)}" data-vfield="size" aria-label="Size" style="width:80px"></td>
        <td><input type="number" value="${v.price}" min="0" step="1000" data-vfield="price" aria-label="Price IDR"></td>
        <td><input type="number" value="${v.stock}" min="${v.reserved || 0}" data-vfield="stock" aria-label="Stock"></td>
        <td class="num">${v.reserved || 0}</td>
        <td><label class="switch"><input type="checkbox" data-vfield="active" ${v.active ? "checked" : ""}><span class="track"></span></label></td>
      </tr>`;
      return shell("#/admin/produk", `
        ${head(isNew ? "Add Product" : `Edit: ${p.name}`, isNew ? "New products are saved as drafts until published." : `Slug /${esc(p.slug)} — old order history keeps its snapshot when the catalog is edited.`, `<a class="btn btn-ghost btn-sm" href="#/admin/produk">← Back</a>`)}
        <form id="product-form" novalidate>
          <div class="panel">
            <h2 class="serif">Product information</h2>
            <div class="form-grid">
              ${UI.field({ id: "pf-name", label: "Product name", required: true, value: p.name })}
              ${UI.field({ id: "pf-slug", label: "URL slug", required: true, value: p.slug, hint: "lowercase letters, numbers, dashes" })}
              ${UI.field({ id: "pf-summary", label: "Summary (one line)", required: true, span: true, value: p.summary })}
              <div class="field span-2"><label for="pf-details">Details (paragraphs)</label>
                <textarea id="pf-details" rows="7" placeholder="Fabric, cut, measurements, care… Write freely. A blank line starts a new paragraph.">${esc(p.details || "")}</textarea>
                <p class="hint">Shown as flowing paragraphs under “Details” on the product page.</p></div>
              <div class="field"><label for="pf-category">Category</label>
                <select id="pf-category">${["Abaya", "Gamis", "Khimar", "Set"].map(c => `<option ${p.category === c ? "selected" : ""}>${c}</option>`).join("")}</select></div>
              ${UI.field({ id: "pf-weight", label: "Weight (grams)", type: "number", value: p.weightGrams })}
              <div class="field"><label for="pf-status">Publication status</label>
                <select id="pf-status">
                  <option value="published" ${p.status === "published" ? "selected" : ""}>Public</option>
                  <option value="draft" ${p.status === "draft" ? "selected" : ""}>Draft</option>
                  <option value="archived" ${p.status === "archived" ? "selected" : ""}>Archived</option>
                </select></div>
            </div>
          </div>
          <div class="panel">
            <div class="panel-head"><h2 class="serif">Photos (JPG / PNG)</h2></div>
            <p style="font-size:12.5px;color:var(--text-2);margin-bottom:12px">Upload per colour so the product preview follows the selected colour on the product page. “Default” is used when a colour has no photos of its own.</p>
            <div class="filter-sizes" id="photo-tabs" style="margin-bottom:14px"></div>
            <div class="photo-manager" id="photo-manager"></div>
            <input type="file" id="photo-file" accept="image/jpeg,image/png" multiple hidden>
            <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
              <button type="button" class="btn btn-outline btn-sm" data-action="photo-upload">${icon("plus")} Upload Photos</button>
              <span class="hint">Photos are downscaled automatically (max 1200px) before uploading to Supabase Storage.</span>
            </div>
            <details style="margin-top:8px"><summary style="font-size:13px;cursor:pointer;color:var(--text-2)">Or add via manual path / URL</summary>
              <div style="display:flex;gap:8px;margin-top:8px">
                <input type="text" id="pf-image-path" placeholder="https://…" style="flex:1;background:var(--ivory);border:1px solid var(--line);border-radius:var(--radius);padding:10px 12px;font-size:13.5px">
                <button type="button" class="btn btn-outline btn-sm" data-action="photo-add-path">Add</button>
              </div></details>
          </div>
          <div class="panel">
            <div class="panel-head"><h2 class="serif">Variants &amp; stock</h2>
              <button type="button" class="btn btn-outline btn-sm" data-action="add-variant-row">${icon("plus")} Add Variant</button></div>
            <p style="font-size:12.5px;color:var(--text-2);margin-bottom:12px">Unique SKU per colour × size. Stock cannot go below the reserved amount. Prices are whole Rupiah. Colour names create photo tabs above.</p>
            <div class="table-wrap"><table class="data-table variant-edit-table" id="variant-table">
              <thead><tr><th>SKU</th><th>Colour</th><th>Hex</th><th>Size</th><th>Price (IDR)</th><th>Stock</th><th class="num">Reserved</th><th>Active</th></tr></thead>
              <tbody>${p.variants.map(variantRow).join("")}</tbody>
            </table></div>
          </div>
          <div style="display:flex;gap:12px">
            <button class="btn btn-primary" type="submit">${icon("check")} Save Product</button>
            <a class="btn btn-outline" href="#/admin/produk">Cancel</a>
          </div>
        </form>`);
    },
    mount(q) {
      const form = document.getElementById("product-form");
      if (!form) return;
      renderPhotos();
      const fileInput = document.getElementById("photo-file");
      fileInput.addEventListener("change", () => { PhotoActions.upload([...fileInput.files]); fileInput.value = ""; });
      document.getElementById("variant-table").addEventListener("input", e => {
        if (e.target.dataset.vfield === "color") renderPhotoTabs();
      });
      form.addEventListener("submit", async e => {
        e.preventDefault();
        if(PE.uploading){UI.toast("Wait for photo processing to finish.","error");return;}
        const ok = UI.validateForm(form, {
          "pf-name": { required: true },
          "pf-slug": { required: true },
          "pf-summary": { required: true }
        });
        if (!ok) return;
        const slugInput = form.querySelector("#pf-slug");
        const slug = slugInput.value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-");
        const isNew = q.slug === "baru";
        const existing = Store.product(q.slug);
        if (isNew && Store.product(slug)) { UI.setFieldError(slugInput, "That slug is already used by another product."); slugInput.focus(); return; }
        const rows = [...form.querySelectorAll("#variant-table tbody tr")];
        const variants = [];
        for (const row of rows) {
          const get = f => row.querySelector(`[data-vfield="${f}"]`);
          const v = {
            sku: get("sku").value.trim(), color: get("color").value.trim(), hex: get("hex").value.trim(),
            size: get("size").value.trim(), price: Number(get("price").value), stock: Number(get("stock").value),
            active: get("active").checked
          };
          const old = existing?.variants.find(x => x.sku === v.sku);
          v.reserved = old?.reserved || 0;
          if (!v.sku || !v.color || !v.size) { UI.toast("Every variant needs a SKU, colour, and size.", "error"); return; }
          if (!Number.isInteger(v.price) || v.price < 0) { UI.toast("Price must be a whole Rupiah number ≥ 0.", "error"); return; }
          if (!Number.isInteger(v.stock) || v.stock < v.reserved) { UI.toast(`Stock for ${v.sku} must be a whole number ≥ ${v.reserved} (reserved).`, "error"); return; }
          if (variants.some(x => x.sku === v.sku)) { UI.toast(`Duplicate SKU ${v.sku} — SKUs must be unique.`, "error"); return; }
          variants.push(v);
        }
        if (!variants.length) { UI.toast("At least one variant is required.", "error"); return; }
        const colors = [...new Set(variants.map(v => v.color))];
        const colorImages = {};
        for (const [key, list] of Object.entries(PE.photos)) {
          if (key && colors.includes(key) && list && list.length) colorImages[key] = list;
        }
        const val = id => form.querySelector("#" + id).value.trim();
        const patch = {
          name: val("pf-name"), slug, summary: val("pf-summary"), details: val("pf-details"),
          category: val("pf-category"), weightGrams: Number(val("pf-weight")) || 0,
          status: val("pf-status"),
          images: [...(PE.photos[""] || [])], colorImages,
          variants
        };
        if (!isNew && existing) {
          if (JSON.stringify(patch.images) === JSON.stringify(existing.images || [])) delete patch.images;
          if (JSON.stringify(patch.colorImages) === JSON.stringify(existing.colorImages || {})) delete patch.colorImages;
        }
        const submit=form.querySelector("button[type=submit]");submit.disabled=true;
        let res;try{res=await (isNew ? Store.addProduct(patch) : Store.updateProduct(q.slug, patch));}finally{submit.disabled=false;}
        if (!res.ok) { UI.toast(res.message, "error"); return; }
        UI.toast("Product saved — the public catalog now uses the latest data.");
        App.go("#/admin/produk");
      });
    }
  };
  function addVariantRow() {
    const tbody = document.querySelector("#variant-table tbody");
    if (!tbody) return;
    const tr = document.createElement("tr");
    tr.innerHTML = `<td><input type="text" data-vfield="sku" aria-label="SKU" placeholder="HDY-XXX-000"></td>
      <td><input type="text" data-vfield="color" aria-label="Colour"></td>
      <td><input type="text" data-vfield="hex" aria-label="Colour hex" value="#1B1B1B" style="width:90px"></td>
      <td><input type="text" data-vfield="size" aria-label="Size" style="width:80px"></td>
      <td><input type="number" data-vfield="price" aria-label="Price IDR" value="0" min="0" step="1000"></td>
      <td><input type="number" data-vfield="stock" aria-label="Stock" value="0" min="0"></td>
      <td class="num">0</td>
      <td><label class="switch"><input type="checkbox" data-vfield="active" checked><span class="track"></span></label></td>`;
    tbody.appendChild(tr);
    tr.querySelector("input").focus();
  }

  /* ---------- Inventory ---------- */
  const stock = {
    title: () => "Inventory — Haadiya Admin",
    html() {
      const rows = Store.products(true).flatMap(p => p.variants.map(v => ({ p, v })));
      const events = Store.inventoryEvents().slice(0, 12);
      return shell("#/admin/stok", `
        ${head("Inventory", "Stock per SKU. Changes are logged below and used by the public catalog immediately.", `<button class="btn btn-primary btn-sm" data-action="save-all-stock">${icon("check")} Save All Changes</button>`)}
        <div class="panel">${rows.length ? `<div class="table-wrap"><table class="data-table" id="stock-table">
          <thead><tr><th>SKU</th><th>Product</th><th>Variant</th><th class="num">Reserved</th><th class="num">Available</th><th class="num">Stock on hand</th></tr></thead>
          <tbody>${rows.map(({ p, v }) => `<tr>
            <td class="tabular">${esc(v.sku)}</td><td>${esc(p.name)}</td><td>${esc(v.color)} / ${esc(v.size)}</td>
            <td class="num">${v.reserved || 0}</td><td class="num">${Store.available(v)}</td>
            <td class="num"><input class="stock-input" type="number" min="${v.reserved || 0}" value="${v.stock}" data-stock-sku="${esc(v.sku)}" aria-label="Stock ${esc(v.sku)}"></td>
          </tr>`).join("")}</tbody>
        </table></div>` : UI.emptyState({ icon: "box", title: "No SKUs yet", body: "Add products with variants first.", action: '<a class="btn btn-primary" href="#/admin/produk/baru">Add Product</a>' })}</div>
        <div class="panel">
          <h2 class="serif">Stock change log</h2>
          ${events.length ? `<div class="table-wrap"><table class="data-table">
            <thead><tr><th>Time</th><th>SKU</th><th>Type</th><th class="num">Qty</th><th>By / reason</th></tr></thead>
            <tbody>${events.map(ev => `<tr><td>${UI.dateFmt(ev.at)}</td><td class="tabular">${esc(ev.sku)}</td><td>${esc(ev.type)}</td><td class="num">${ev.qty > 0 ? "+" : ""}${ev.qty}</td><td>${esc(ev.actor || "")}${ev.reason ? " · " + esc(ev.reason) : ""}${ev.orderId ? " · order" : ""}</td></tr>`).join("")}</tbody>
          </table></div>` : '<p style="font-size:13.5px;color:var(--text-2)">No stock changes in this session yet.</p>'}
        </div>`);
    },
    mount() {}
  };
  async function saveAllStock() {
    const changes = [...document.querySelectorAll("[data-stock-sku]")].map(input => [input.dataset.stockSku,Number(input.value)]).filter(([sku,n]) => Store.variant(sku) && Store.variant(sku).variant.stock !== n);
    if (!changes.length) { UI.toast("No stock changes."); return; }
    const res = await Store.setStocks(changes);
    if (!res.ok) { UI.toast(res.message,"error"); return; }
    UI.toast(`${changes.length} SKU(s) saved to Supabase.`); App.refresh();
  }

  /* ---------- Orders ---------- */
  function ordersTable(os) {
    if (!os.length) return UI.emptyState({ icon: "clipboard", title: "No orders yet", body: "Orders from checkout will appear here.", action: "" });
    return `<div class="table-wrap"><table class="data-table">
      <thead><tr><th>Number</th><th>Date</th><th>Customer</th><th class="num">Total</th><th>Payment</th><th>Fulfilment</th><th></th></tr></thead>
      <tbody>${os.map(o => `<tr>
        <td class="tabular"><strong>${esc(o.orderNumber)}</strong></td>
        <td>${UI.dateFmt(o.createdAt)}</td><td>${esc(o.customer.name)}</td>
        <td class="num">${rupiah(o.total)}${o.voucher ? `<br><small style="color:var(--ok)">${esc(o.voucher.code)}</small>` : ""}</td>
        <td>${UI.paymentChip(o.paymentStatus)}</td><td>${UI.fulfillmentChip(o.fulfillmentStatus)}</td>
        <td><a class="btn btn-outline btn-sm" href="#/admin/pesanan/${esc(o.id)}">Detail</a></td>
      </tr>`).join("")}</tbody></table></div>`;
  }
  const orders = {
    title: () => "Orders — Haadiya Admin",
    html(q) {
      let os = Store.orders();
      if (q.q) {
        const t = q.q.toLowerCase();
        os = os.filter(o => `${o.orderNumber} ${o.customer.name} ${o.customer.email}`.toLowerCase().includes(t));
      }
      if (q.status) os = os.filter(o => o.fulfillmentStatus === q.status || o.paymentStatus === q.status);
      if (q.tanggal) os = os.filter(o => o.createdAt.slice(0, 10) === q.tanggal);
      return shell("#/admin/pesanan", `
        ${head("Orders", "Payment status changes only through gateway verification — it cannot be set manually.")}
        <div class="panel">
          <form id="order-filter" class="toolbar-right" style="margin-bottom:16px;flex-wrap:wrap">
            <div class="field" style="flex:1;min-width:200px"><label for="of-q" style="position:absolute;left:-9999px">Search orders</label>
              <input id="of-q" type="search" value="${esc(q.q || "")}" placeholder="Search number / name / email…"></div>
            <div class="select-wrap"><label for="of-status" style="position:absolute;left:-9999px">Status</label>
              <select id="of-status">
                <option value="">All statuses</option>
                <option value="menunggu_pembayaran" ${q.status === "menunggu_pembayaran" ? "selected" : ""}>Awaiting Payment</option>
                <option value="berhasil" ${q.status === "berhasil" ? "selected" : ""}>Paid</option>
                <option value="diproses" ${q.status === "diproses" ? "selected" : ""}>Processing</option>
                <option value="dikirim" ${q.status === "dikirim" ? "selected" : ""}>Shipped</option>
                <option value="selesai" ${q.status === "selesai" ? "selected" : ""}>Completed</option>
                <option value="dibatalkan" ${q.status === "dibatalkan" ? "selected" : ""}>Cancelled</option>
              </select></div>
            <div class="field"><label for="of-date" style="position:absolute;left:-9999px">Date</label>
              <input id="of-date" type="date" value="${esc(q.tanggal || "")}"></div>
            <button class="btn btn-outline btn-sm" type="submit">${icon("search")} Apply</button>
          </form>
          ${ordersTable(os)}
        </div>`);
    },
    mount() {
      const form = document.getElementById("order-filter");
      form.addEventListener("submit", async e => {
        e.preventDefault();
        const parts = [];
        const qv = form.querySelector("#of-q").value.trim();
        const st = form.querySelector("#of-status").value;
        const dt = form.querySelector("#of-date").value;
        if (qv) parts.push("q=" + encodeURIComponent(qv));
        if (st) parts.push("status=" + st);
        if (dt) parts.push("tanggal=" + dt);
        App.go("#/admin/pesanan" + (parts.length ? "?" + parts.join("&") : ""));
      });
    }
  };
  const orderDetail = {
    title: q => { const o = Store.order(q.id); return (o ? o.orderNumber : "Order") + " — Haadiya Admin"; },
    html(q) {
      const o = Store.order(q.id);
      if (!o) return shell("#/admin/pesanan", UI.emptyState({ icon: "clipboard", title: "Order not found", body: "Back to the order list.", action: '<a class="btn btn-primary" href="#/admin/pesanan">Order List</a>' }));
      const allowed = Store.FULFILLMENT_FLOW[o.fulfillmentStatus] || [];
      const labels = { diproses: "Processing", dikirim: "Shipped", selesai: "Completed", dibatalkan: "Cancel" };
      return shell("#/admin/pesanan", `
        ${head(`Order ${o.orderNumber}`, `Placed ${UI.dateFmt(o.createdAt)}`, `<a class="btn btn-ghost btn-sm" href="#/admin/pesanan">← Back</a>`)}
        <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">${UI.paymentChip(o.paymentStatus)} ${UI.fulfillmentChip(o.fulfillmentStatus)}</div>
        <div class="panel">
          <h2 class="serif">Payment</h2>
          ${UI.alertBox("neutral", "Payment status is read-only",
            "Payment truth comes from a verified gateway. Admins cannot mark payments as paid. The gateway integration is not connected yet.")}
          <div class="order-grid" style="margin-top:14px">
            <div class="kv"><span class="k">Method</span><span>${o.paymentMethod ? esc(o.paymentMethod) : "Not selected (gateway not connected)"}</span></div>
            <div class="kv"><span class="k">Status</span><span>${UI.PAYMENT_LABELS[o.paymentStatus]?.[0] || esc(o.paymentStatus)}</span></div>
          </div>
        </div>
        <div class="panel">
          <h2 class="serif">Fulfilment &amp; delivery</h2>
          <div class="order-grid">
            <div>
              <div class="kv"><span class="k">Recipient</span><span>${esc(o.customer.name)} · ${esc(o.customer.phone)} · ${esc(o.customer.email)}</span></div>
              <div class="kv"><span class="k">Address</span><span>${esc(o.address.line)}, ${esc(o.address.district)}, ${esc(o.address.city)}, ${esc(o.address.province)} ${esc(o.address.postal)}</span></div>
              ${o.address.note ? `<div class="kv"><span class="k">Note</span><span>${esc(o.address.note)}</span></div>` : ""}
              <div class="kv"><span class="k">Courier</span><span>${o.courier ? esc(o.courier) : "Not selected — pending shipping integration"}</span></div>
            </div>
            <div>
              <form id="fulfillment-form">
                <div class="field"><label for="ff-tracking">Tracking number</label>
                  <input id="ff-tracking" value="${esc(o.trackingNumber)}" placeholder="Enter before marking as shipped"></div>
                <div class="field" style="margin-top:12px"><label for="ff-status">Change fulfilment status</label>
                  <select id="ff-status" ${allowed.length ? "" : "disabled"}>
                    <option value="">${allowed.length ? "Choose a new status…" : "No transitions allowed"}</option>
                    ${allowed.map(s => `<option value="${s}" ${s === "diproses" && o.paymentStatus !== "berhasil" ? "disabled" : ""}>${labels[s] || s}${s === "diproses" && o.paymentStatus !== "berhasil" ? " (needs verified payment)" : ""}</option>`).join("")}
                  </select></div>
                <button class="btn btn-primary btn-sm" type="submit" style="margin-top:14px" ${allowed.length ? "" : "disabled"}>${icon("check")} Save Status</button>
              </form>
            </div>
          </div>
        </div>
        <div class="panel">
          <h2 class="serif">Items (snapshot at purchase)</h2>
          <div class="table-wrap"><table class="data-table">
            <thead><tr><th>Product</th><th>Variant</th><th>SKU</th><th class="num">Price</th><th class="num">Qty</th><th class="num">Subtotal</th></tr></thead>
            <tbody>${o.items.map(i => `<tr><td>${esc(i.name)}</td><td>${esc(i.variant)}</td><td class="tabular">${esc(i.sku)}</td><td class="num">${rupiah(i.price)}</td><td class="num">${i.qty}</td><td class="num">${rupiah(i.price * i.qty)}</td></tr>`).join("")}</tbody>
          </table></div>
          ${o.voucher ? `<div class="summary-row" style="margin-top:14px;color:var(--ok)"><span>Voucher ${esc(o.voucher.code)} (${o.voucher.type === "percent" ? o.voucher.value + "%" : rupiah(o.voucher.value)})</span><span class="val">− ${rupiah(o.discount)}</span></div>` : ""}
          <div class="summary-row" style="margin-top:${o.voucher ? "4px" : "14px"}"><span>Shipping</span><span class="val">${o.shippingCost != null ? rupiah(o.shippingCost) : "Not calculated (courier integration pending)"}</span></div>
          <div class="summary-total"><span>Total</span><span>${rupiah(o.total)}</span></div>
        </div>
        <div class="panel">
          <h2 class="serif">History</h2>
          ${o.history.map(h => `<div class="kv"><span class="k">${UI.dateFmt(h.at)}</span><span>${esc(h.event)}</span></div>`).join("")}
        </div>`);
    },
    mount(q) {
      const form = document.getElementById("fulfillment-form");
      if (!form) return;
      form.addEventListener("submit", async e => {
        e.preventDefault();
        const status = form.querySelector("#ff-status").value;
        if (!status) { UI.toast("Choose a new status first.", "error"); return; }
        const tracking = form.querySelector("#ff-tracking").value;
        if (status === "dibatalkan" && !confirm("Cancel this order? The stock reservation will be released.")) return;
        const res = Store.setFulfillment(q.id, status, tracking, "admin");
        if (!res.ok) { UI.toast(res.message, "error"); return; }
        UI.toast(status === "dikirim" ? "Order marked Shipped — the tracking number is visible to the buyer." : "Fulfilment status updated.");
        App.refresh();
      });
    }
  };

  /* ---------- Vouchers ---------- */
  const vouchersAdmin = {
    title: () => "Vouchers — Haadiya Admin",
    html(q) {
      const editing = q.kode ? Store.voucher(q.kode) : null;
      const v = editing || { code: "", type: "percent", value: 10, minSubtotal: 0, maxDiscount: "", quota: "", active: true, expiresAt: "" };
      const vs = Store.vouchers();
      return shell("#/admin/voucher", `
        ${head("Vouchers", "Buyers apply codes at checkout. Discounts are recomputed when the order is created.")}
        <div class="panel">
          <h2 class="serif">${editing ? `Edit voucher ${esc(editing.code)}` : "Create voucher"}</h2>
          <form id="voucher-form" data-original="${editing ? esc(editing.code) : ""}">
            <div class="form-grid">
              ${UI.field({ id: "vf-code", label: "Code", required: true, value: v.code, placeholder: "WELCOME10", hint: "3–20 chars: letters, numbers, dashes. Shown uppercase." })}
              <div class="field"><label for="vf-type">Discount type</label>
                <select id="vf-type">
                  <option value="percent" ${v.type === "percent" ? "selected" : ""}>Percent (%)</option>
                  <option value="fixed" ${v.type === "fixed" ? "selected" : ""}>Fixed amount (IDR)</option>
                </select></div>
              ${UI.field({ id: "vf-value", label: "Value", type: "number", required: true, value: v.value, hint: "% for percent, Rupiah for fixed" })}
              ${UI.field({ id: "vf-min", label: "Minimum subtotal (IDR)", type: "number", value: v.minSubtotal || 0 })}
              ${UI.field({ id: "vf-max", label: "Max discount (IDR, percent only)", type: "number", value: v.maxDiscount ?? "", hint: "Empty = no cap" })}
              ${UI.field({ id: "vf-quota", label: "Usage limit", type: "number", value: v.quota ?? "", hint: "Empty = unlimited" })}
              ${UI.field({ id: "vf-expiry", label: "Expires on", type: "date", value: v.expiresAt ? String(v.expiresAt).slice(0, 10) : "" })}
              <div class="field"><label>Active</label>
                <label class="switch" style="margin-top:8px"><input type="checkbox" id="vf-active" ${v.active ? "checked" : ""}><span class="track"></span> Accept this code at checkout</label></div>
            </div>
            <div style="display:flex;gap:12px;margin-top:16px">
              <button class="btn btn-primary btn-sm" type="submit">${icon("check")} ${editing ? "Save Voucher" : "Create Voucher"}</button>
              ${editing ? '<a class="btn btn-outline btn-sm" href="#/admin/voucher">Cancel</a>' : ""}
            </div>
          </form>
        </div>
        <div class="panel">
          <h2 class="serif">All vouchers</h2>
          ${vs.length ? `<div class="table-wrap"><table class="data-table">
            <thead><tr><th>Code</th><th>Discount</th><th class="num">Min. spend</th><th class="num">Used / limit</th><th>Expires</th><th>Active</th><th></th></tr></thead>
            <tbody>${vs.map(x => `<tr>
              <td class="tabular"><strong>${esc(x.code)}</strong></td>
              <td>${x.type === "percent" ? x.value + "%" + (x.maxDiscount ? ` (max ${rupiah(x.maxDiscount)})` : "") : rupiah(x.value)}</td>
              <td class="num">${x.minSubtotal ? rupiah(x.minSubtotal) : "—"}</td>
              <td class="num">${x.used || 0} / ${x.quota ?? "∞"}</td>
              <td>${x.expiresAt ? String(x.expiresAt).slice(0, 10) : "—"}</td>
              <td><label class="switch"><input type="checkbox" data-action="voucher-toggle" data-code="${esc(x.code)}" ${x.active ? "checked" : ""}><span class="track"></span></label></td>
              <td style="white-space:nowrap"><a class="btn btn-outline btn-sm" href="#/admin/voucher?kode=${encodeURIComponent(x.code)}">${icon("edit")} Edit</a>
                <button class="btn btn-ghost btn-sm" data-action="voucher-delete" data-code="${esc(x.code)}" style="color:var(--error)">${icon("trash")} Delete</button></td>
            </tr>`).join("")}</tbody>
          </table></div>` : UI.emptyState({ icon: "ticket", title: "No vouchers yet", body: "Create a code above — buyers apply it at checkout.", action: "" })}
        </div>`);
    },
    mount() {
      const form = document.getElementById("voucher-form");
      form.addEventListener("submit", async e => {
        e.preventDefault();
        if (!UI.validateForm(form, { "vf-code": { required: true }, "vf-value": { required: true } })) return;
        const val = id => form.querySelector("#" + id).value.trim();
        const res = await Store.saveVoucher({
          code: val("vf-code"), type: val("vf-type"), value: Number(val("vf-value")),
          minSubtotal: Number(val("vf-min")) || 0,
          maxDiscount: val("vf-max") ? Number(val("vf-max")) : null,
          quota: val("vf-quota") !== "" ? Number(val("vf-quota")) : null,
          active: form.querySelector("#vf-active").checked,
          expiresAt: val("vf-expiry") ? new Date(val("vf-expiry") + "T23:59:59").toISOString() : null
        }, form.dataset.original || null);
        if (!res.ok) { UI.toast(res.message, "error"); return; }
        UI.toast("Voucher saved.");
        App.go("#/admin/voucher");
      });
    }
  };

  /* ---------- Pages & Banner (incl. landing page copy) ---------- */
  const PAGE_DEFS = [
    ["faq", "FAQ"],
    ["shipping", "Shipping & Returns"],
    ["privacy", "Privacy Policy"],
    ["terms", "Terms of Purchase"]
  ];
  const pagesAdmin = {
    title: () => "Pages & Banner — Haadiya Admin",
    html() {
      const s = Store.settings();
      const pages = s.pages || {};
      const about = pages.about || {};
      return shell("#/admin/halaman", `
        ${head("Pages & Banner", "Edit the storefront copy. Format: \"## Heading\", \"- \" bullet, **bold**, [text](link), blank line = new paragraph.")}
        <div class="panel">
          <h2 class="serif">Landing page</h2>
          <div class="form-grid">
            ${UI.field({ id: "lp-title", label: "Hero headline", value: s.heroTitle || "", span: true, hint: "One line break = one line on the hero." })}
            <div class="field span-2"><label for="lp-text">Hero paragraph (the copy under the headline)</label>
              <textarea id="lp-text" rows="3">${esc(s.heroText || "")}</textarea></div>
          </div>
          <div style="margin-top:14px">
            <div class="logo-preview">${s.heroImage ? `<img src="${esc(s.heroImage)}" alt="Current hero image" style="height:80px;max-width:280px;object-fit:cover">` : `<span style="font-size:13px;color:var(--text-2)">Using the default hero image.</span>`}</div>
            <input type="file" id="hero-file" accept="image/jpeg,image/png" hidden>
            <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
              <button class="btn btn-outline btn-sm" data-action="hero-upload">${icon("plus")} Upload Hero Image (JPG/PNG)</button>
              ${s.heroImage ? `<button class="btn btn-ghost btn-sm" data-action="hero-remove" style="color:var(--error)">${icon("trash")} Remove</button>` : ""}
            </div>
            <details style="margin-top:8px"><summary style="font-size:13px;cursor:pointer;color:var(--text-2)">Or set via path / URL</summary>
              <div style="display:flex;gap:8px;margin-top:8px">
                <input type="text" id="hero-path" placeholder="https://…" style="flex:1;background:var(--ivory);border:1px solid var(--line);border-radius:var(--radius);padding:10px 12px;font-size:13.5px">
                <button type="button" class="btn btn-outline btn-sm" data-action="hero-add-path">Set</button>
              </div></details>
          </div>
          <div style="margin-top:20px;border-top:1px solid var(--line);padding-top:18px">
            <p class="pd-option-label" style="margin-bottom:10px">Hero video (MP4) <span>— replaces the photo when set; the photo becomes the poster/fallback</span></p>
            ${s.heroVideo ? `<div class="logo-preview" style="align-items:start">
              ${s.heroVideo === "idb:hero" ? `<span class="chip chip-ok">${icon("check")} Uploaded video active</span>` : `<video src="${esc(s.heroVideo)}" controls muted preload="metadata" style="max-height:120px;max-width:260px;border-radius:var(--radius)"></video>`}
              <span style="font-size:12.5px;color:var(--text-2)">${s.heroVideo === "idb:hero" ? "Stored in this browser (IndexedDB)." : esc(s.heroVideo)}</span>
            </div>` : `<p class="hint" style="margin-bottom:12px">No video — the hero shows the photo above.</p>`}
            <input type="file" id="hero-video-file" accept="video/mp4,.mp4" hidden>
            <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
              <button class="btn btn-outline btn-sm" data-action="hero-video-upload">${icon("plus")} Upload Video (MP4)</button>
              ${s.heroVideo ? `<button class="btn btn-ghost btn-sm" data-action="hero-video-remove" style="color:var(--error)">${icon("trash")} Remove Video</button>` : ""}
            </div>
            <details style="margin-top:8px"><summary style="font-size:13px;cursor:pointer;color:var(--text-2)">Or set via path / URL</summary>
              <div style="display:flex;gap:8px;margin-top:8px">
                <input type="text" id="hero-video-path" placeholder="https://…" style="flex:1;background:var(--ivory);border:1px solid var(--line);border-radius:var(--radius);padding:10px 12px;font-size:13.5px">
                <button type="button" class="btn btn-outline btn-sm" data-action="hero-video-add-path">Set</button>
              </div></details>
            <p class="hint" style="margin-top:10px">Plays muted, looping, without controls on the landing page (with a pause button). Visitors with reduced-motion see the photo instead. Max upload 50 MB. Compress videos for faster loading. Uploaded videos are saved to Supabase Storage.</p>
          </div>
          <button class="btn btn-primary btn-sm" style="margin-top:16px" data-action="landing-save">${icon("check")} Save Landing Page</button>
        </div>
        <div class="panel">
          <h2 class="serif">Home values — Fabric / Cut / Craft</h2>
          <p style="font-size:12.5px;color:var(--text-2);margin-bottom:14px">The three columns on the burgundy strip of the home page.</p>
          ${(Array.isArray(s.values) && s.values.length ? s.values : window.HAADIYA_SEED.settings.values).map((v, i) => `
            <div class="form-grid" style="margin-bottom:16px">
              ${UI.field({ id: `val-label-${i}`, label: `Label ${i + 1}`, value: v.label })}
              ${UI.field({ id: `val-title-${i}`, label: `Title ${i + 1}`, value: v.title })}
              <div class="field span-2"><label for="val-text-${i}">Text ${i + 1}</label><textarea id="val-text-${i}" rows="2">${esc(v.text)}</textarea></div>
            </div>`).join("")}
          <button class="btn btn-primary btn-sm" data-action="values-save">${icon("check")} Save Values</button>
        </div>
        <div class="panel">
          <h2 class="serif">Announcement banner</h2>
          <div class="field"><label for="banner-text">Scrolling text (empty = hidden)</label>
            <input id="banner-text" value="${esc(s.bannerText || "")}" placeholder="e.g. Free shipping on orders over Rp 500.000"></div>
          <div style="display:flex;gap:10px;margin-top:12px">
            <button class="btn btn-primary btn-sm" data-action="banner-save">${icon("check")} Save Banner</button>
            <button class="btn btn-ghost btn-sm" data-action="banner-clear" style="color:var(--error)">Clear Banner</button>
          </div>
        </div>
        <div class="panel">
          <h2 class="serif">About page</h2>
          <div class="form-grid">
            ${UI.field({ id: "pg-about-heroTitle", label: "Hero headline", value: about.heroTitle || "", span: true })}
            <div class="field span-2"><label for="pg-about-heroText">Hero paragraph</label><textarea id="pg-about-heroText" rows="3">${esc(about.heroText || "")}</textarea></div>
            <div class="field span-2"><label for="pg-about-body">Body</label><textarea id="pg-about-body" rows="8" class="page-editor">${esc(about.body || "")}</textarea></div>
          </div>
          <button class="btn btn-primary btn-sm" style="margin-top:14px" data-action="page-save" data-page="about">${icon("check")} Save About</button>
        </div>
        ${PAGE_DEFS.map(([id, label]) => `<div class="panel">
          <div class="panel-head"><h2 class="serif">${label}</h2>
            <button class="btn btn-ghost btn-sm" data-action="page-reset" data-page="${id}">Reset to default</button></div>
          <div class="field"><label for="pg-${id}">Content</label>
            <textarea id="pg-${id}" rows="9" class="page-editor">${esc(pages[id] || "")}</textarea></div>
          <button class="btn btn-primary btn-sm" style="margin-top:14px" data-action="page-save" data-page="${id}">${icon("check")} Save ${label}</button>
        </div>`).join("")}`);
    },
    mount() {
      const heroInput = document.getElementById("hero-file");
      if (heroInput) heroInput.addEventListener("change", async () => {
        const file = heroInput.files[0];
        heroInput.value = "";
        if (!file) return;
        try {
          const url = await UI.readImageFile(file, { maxDim: 1600 });
          const saved = await Store.updateSettings({ heroImage: url });
          if (!saved.ok) { UI.toast(saved.message, "error"); return; }
          UI.toast("Hero image updated.");
          App.refresh();
        } catch (err) { UI.toast(err.message, "error"); }
      });
      const videoInput = document.getElementById("hero-video-file");
      if (videoInput) videoInput.addEventListener("change", async () => {
        const file = videoInput.files[0];
        videoInput.value = "";
        if (!file) return;
        try {
          UI.validateVideoFile(file);
          const saved = await Store.updateSettings({ heroVideo: file });
          if (!saved.ok) { UI.toast(saved.message, "error"); return; }
          await App.resolveHeroVideo();
          UI.toast("Hero video updated — the landing page now plays it.");
          App.refresh();
        } catch (err) { UI.toast(err.message || "The video could not be saved.", "error"); }
      });
    }
  };
  async function saveLanding() {
    const title = document.getElementById("lp-title").value.trim();
    const text = document.getElementById("lp-text").value.trim();
    if (!title) { UI.toast("The hero headline cannot be empty.", "error"); return; }
    const saved = await Store.updateSettings({ heroTitle: title, heroText: text });
    if (!saved.ok) { UI.toast(saved.message, "error"); return; }
    UI.toast("Landing page saved — the storefront uses the new copy.");
    App.refresh();
  }
  async function saveBanner() {
    const saved = await Store.updateSettings({ bannerText: document.getElementById("banner-text").value.trim() });
    if (!saved.ok) { UI.toast(saved.message, "error"); return; }
    UI.toast("Banner saved.");
    App.refresh();
  }
  async function savePage(id) {
    const pages = JSON.parse(JSON.stringify(Store.settings().pages || {}));
    if (id === "about") {
      pages.about = {
        heroTitle: document.getElementById("pg-about-heroTitle").value.trim(),
        heroText: document.getElementById("pg-about-heroText").value.trim(),
        body: document.getElementById("pg-about-body").value
      };
    } else {
      pages[id] = document.getElementById("pg-" + id).value;
    }
    const saved = await Store.updateSettings({ pages });
    if (!saved.ok) { UI.toast(saved.message, "error"); return; }
    UI.toast("Page saved — the storefront uses the new copy.");
    App.refresh();
  }
  async function resetPage(id) {
    const pages = JSON.parse(JSON.stringify(Store.settings().pages || {}));
    pages[id] = JSON.parse(JSON.stringify(window.HAADIYA_SEED.settings.pages[id]));
    const saved = await Store.updateSettings({ pages });
    if (!saved.ok) { UI.toast(saved.message, "error"); return; }
    UI.toast("Page restored to the default text.");
    App.refresh();
  }

  /* ---------- Settings ---------- */
  const settings = {
    title: () => "Settings — Haadiya Admin",
    html() {
      const s = Store.settings();
      const logoPanel = (slot, label, dark) => `
        <div class="panel">
          <h2 class="serif">${label}</h2>
          <div class="logo-preview ${dark ? "logo-preview-dark" : ""}">
            ${s[slot] ? `<img src="${esc(s[slot])}" alt="${label} preview">` : `<span class="wordmark-main" ${dark ? 'style="color:var(--ivory)"' : ""}>Haadiya</span>`}
            <span style="font-size:12.5px;color:${dark ? "#C9C5BB" : "var(--text-2)"}">${s[slot] ? "Logo active." : "No logo — using the temporary text wordmark."}</span>
          </div>
          <input type="file" id="logo-file-${slot === "logoFooter" ? "footer" : "header"}" accept="image/jpeg,image/png" hidden>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn btn-primary btn-sm" data-action="logo-upload" data-slot="${slot === "logoFooter" ? "footer" : "header"}">${icon("plus")} Upload Logo (JPG/PNG)</button>
            ${s[slot] ? `<button class="btn btn-outline btn-sm" data-action="logo-remove" data-slot="${slot === "logoFooter" ? "footer" : "header"}">${icon("trash")} Remove</button>` : ""}
          </div>
          <p class="hint" style="margin-top:10px">Transparent PNG recommended. Displayed at ±46px high; files are downscaled to max 400px.</p>
        </div>`;
      return shell("#/admin/pengaturan", `
        ${head("Store Settings", "Contact details and the shipping origin are used by the public pages and (later) the rate service.")}
        ${logoPanel("logoHeader", "Header logo", false)}
        ${logoPanel("logoFooter", "Footer logo", true)}
        <form id="settings-form">
          <div class="panel">
            <h2 class="serif">Contact &amp; social</h2>
            <div class="form-grid">
              ${UI.field({ id: "set-email", label: "Store email", value: s.email })}
              ${UI.field({ id: "set-phone", label: "Phone / WhatsApp", value: s.phone })}
              ${UI.field({ id: "set-instagram", label: "Instagram", value: s.instagram })}
              ${UI.field({ id: "set-shopee", label: "Shopee", value: s.shopee })}
              ${UI.field({ id: "set-linktree", label: "Linktree", value: s.linktree, span: true })}
            </div>
            <button class="btn btn-primary btn-sm" type="submit" style="margin-top:16px">${icon("check")} Save Contact</button>
          </div>
        </form>
        <div class="panel">
          <h2 class="serif">Shipping origin</h2>
          <div class="field"><label for="set-origin">Origin address</label>
            <input id="set-origin" value="${esc(s.originAddress || "")}" placeholder="e.g. Kec. Coblong, Kota Bandung, Jawa Barat">
            <p class="hint">Required before the shipping integration can calculate rates. Checkout and the catalog use the latest address automatically.</p></div>
          <div style="display:flex;gap:10px;margin-top:12px">
            <button class="btn btn-primary btn-sm" data-action="origin-submit">${icon("check")} Save Origin</button>
            ${s.originAddress ? `<button class="btn btn-ghost btn-sm" data-action="origin-remove" style="color:var(--error)">${icon("trash")} Remove</button>` : ""}
          </div>
          <div style="margin-top:16px">
            ${UI.alertBox("warn", "Couriers & services cannot be enabled yet", "The active courier list follows the shipping provider you choose. The integration is not connected — no couriers can be switched on in this preview.")}
          </div>
        </div>
        <div class="panel">
          <h2 class="serif">Payment methods</h2>
          ${paymentAdapter.methods.map(m => `<div class="integration-item">
            <div><p class="i-name">${esc(m.label)}</p><p class="i-desc">${esc(m.desc)}</p></div>
            <label class="switch" title="Locked until the gateway is connected"><input type="checkbox" disabled><span class="track"></span> <span class="chip chip-warn">Not connected</span></label>
          </div>`).join("")}
          <p style="font-size:12.5px;color:var(--text-2);margin-top:12px">Switches follow the methods actually enabled on the gateway merchant account. Configuration happens on the backend, not in this preview.</p>
        </div>`);
    },
    mount() {
      for (const slot of ["header", "footer"]) {
        const input = document.getElementById("logo-file-" + slot);
        if (!input) continue;
        input.addEventListener("change", async () => {
          const file = input.files[0];
          input.value = "";
          if (!file) return;
          try {
            const url = await UI.readImageFile(file, { maxDim: 400, keepPng: true });
            const saved = await Store.updateSettings({ [slot === "footer" ? "logoFooter" : "logoHeader"]: url });
            if (!saved.ok) { UI.toast(saved.message, "error"); return; }
            UI.toast(`${slot === "footer" ? "Footer" : "Header"} logo updated.`);
            App.refresh();
          } catch (err) { UI.toast(err.message, "error"); }
        });
      }
      const form = document.getElementById("settings-form");
      form.addEventListener("submit", async e => {
        e.preventDefault();
        const val = id => form.querySelector("#" + id).value.trim();
        const saved = await Store.updateSettings({
          email: val("set-email"), phone: val("set-phone"),
          instagram: val("set-instagram"), shopee: val("set-shopee"), linktree: val("set-linktree")
        });
        if (!saved.ok) { UI.toast(saved.message, "error"); return; }
        UI.toast("Settings saved — public contact details updated.");
        App.refresh();
      });
    }
  };

  return { login, dashboard, products, productEdit, stock, orders, orderDetail, vouchersAdmin, pagesAdmin, settings, addVariantRow, saveAllStock, PhotoActions, saveLanding, saveBanner, savePage, resetPage };
})();