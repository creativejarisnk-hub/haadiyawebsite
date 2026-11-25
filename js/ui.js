/* UI helpers — English storefront copy */
const UI = (() => {
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const rupiah = n => n == null ? "—" : new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
  const dateFmt = iso => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const ICONS = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    cart: '<path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    check: '<path d="m5 13 4 4L19 7"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    truck: '<path d="M3 7h11v8H3zM14 10h4l3 3v2h-7z"/><circle cx="7" cy="17" r="1.6"/><circle cx="17" cy="17" r="1.6"/>',
    shield: '<path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M12 11v5"/>',
    alert: '<path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4m0 3h.01"/>',
    box: '<path d="M3 8 12 3l9 5v8l-9 5-9-5V8Z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
    tag: '<path d="M3 3h8l10 10-8 8L3 11V3Z"/><circle cx="8" cy="8" r="1.4"/>',
    grid: '<rect x="4" y="4" width="7" height="7"/><rect x="13" y="4" width="7" height="7"/><rect x="4" y="4" width="7" height="7" opacity="0"/><rect x="4" y="13" width="7" height="7"/><rect x="13" y="13" width="7" height="7"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',
    clipboard: '<rect x="5" y="4" width="14" height="17" rx="1.5"/><path d="M9 4a3 3 0 0 1 6 0M9 10h6M9 14h6"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9l2.1 2.1m10 10 2.1 2.1M19.1 4.9 17 7m-10 10-2.1 2.1"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    home: '<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/>',
    edit: '<path d="M4 20h4L20 8l-4-4L4 16v4Z"/><path d="m13 7 4 4"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 6.3"/><path d="M20 4v7h-7"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="1.5"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="m3 7 9 6 9-6"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    ticket: '<path d="M4 8a2 2 0 0 0 2-2h12a2 2 0 0 0 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 0-2 2H6a2 2 0 0 0-2-2v-3a2 2 0 0 0 0-4V8Z"/><path d="M13 6v2m0 3v2m0 3v2" stroke-dasharray="2 3"/>',
    pause: '<path d="M9 5v14M15 5v14"/>',
    play: '<path d="M7 5l12 7-12 7V5Z"/>'
  };
  const icon = (name, cls) => `<svg class="ic${cls ? " " + cls : ""}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ""}</svg>`;

  function img(src, alt, cls) {
    if (!src) return `<div class="img-fallback ${cls || ""}">No photo yet<br>add one in Admin → Products</div>`;
    return `<img src="${esc(src)}" alt="${esc(alt)}" class="${cls || ""}" loading="lazy" onerror="UI.imgError(this)">`;
  }
  function imgError(el) {
    const d = document.createElement("div");
    d.className = "img-fallback";
    d.innerHTML = "Photo unavailable<br><small>check the path in the product data</small>";
    el.replaceWith(d);
  }

  function toast(message, type) {
    const region = document.getElementById("toast-region");
    const t = document.createElement("div");
    t.className = "toast" + (type === "error" ? " error" : "");
    t.innerHTML = icon(type === "error" ? "alert" : "check") + `<span>${esc(message)}</span>`;
    region.appendChild(t);
    setTimeout(() => { t.remove(); }, type === "error" ? 6000 : 3500);
    while (region.children.length > 3) region.firstChild.remove();
  }

  const PAYMENT_LABELS = {
    menunggu_pembayaran: ["Awaiting Payment", "chip-warn"],
    berhasil: ["Paid", "chip-ok"],
    gagal: ["Payment Failed", "chip-error"],
    kedaluwarsa: ["Expired", "chip-error"],
    dikembalikan: ["Refunded", "chip-neutral"]
  };
  const FULFILLMENT_LABELS = {
    menunggu: ["Pending", "chip-neutral"],
    diproses: ["Processing", "chip-warn"],
    dikirim: ["Shipped", "chip-ok"],
    selesai: ["Completed", "chip-ok"],
    dibatalkan: ["Cancelled", "chip-error"]
  };
  const paymentChip = s => {
    const [label, cls] = PAYMENT_LABELS[s] || [s, "chip-neutral"];
    return `<span class="chip ${cls}">${esc(label)}</span>`;
  };
  const fulfillmentChip = s => {
    const [label, cls] = FULFILLMENT_LABELS[s] || [s, "chip-neutral"];
    return `<span class="chip ${cls}">${esc(label)}</span>`;
  };

  function field({ id, label, type = "text", required, hint, placeholder, value = "", autocomplete, inputmode, span }) {
    return `<div class="field ${span ? "span-2" : ""}">
      <label for="${id}">${esc(label)}${required ? ' <span class="req" aria-hidden="true">*</span>' : ""}</label>
      <input id="${id}" name="${id}" type="${type}" value="${esc(value)}" ${required ? "required" : ""}
        ${placeholder ? `placeholder="${esc(placeholder)}"` : ""} ${autocomplete ? `autocomplete="${autocomplete}"` : ""}
        ${inputmode ? `inputmode="${inputmode}"` : ""} aria-describedby="${id}-err${hint ? ` ${id}-hint` : ""}">
      ${hint ? `<p class="hint" id="${id}-hint">${esc(hint)}</p>` : ""}
      <p class="error-msg" id="${id}-err" hidden></p>
    </div>`;
  }
  function setFieldError(input, message) {
    const err = document.getElementById(input.id + "-err");
    if (message) {
      input.setAttribute("aria-invalid", "true");
      if (err) { err.innerHTML = UI.icon("alert") + esc(message); err.hidden = false; }
    } else {
      input.removeAttribute("aria-invalid");
      if (err) { err.hidden = true; err.textContent = ""; }
    }
  }
  function validateField(input, rules) {
    const v = input.value.trim();
    let msg = "";
    if (rules.required && !v) msg = rules.requiredMsg || "This field is required.";
    else if (v && rules.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) msg = "Use a valid email format, e.g. name@example.com.";
    else if (v && rules.phone && !/^(\+62|62|0)8[0-9]{7,12}$/.test(v.replace(/[\s-]/g, ""))) msg = "Use a valid Indonesian mobile number, e.g. 081234567890.";
    else if (v && rules.postal && !/^[0-9]{5}$/.test(v)) msg = "Postal code must be 5 digits.";
    else if (v && rules.min && v.length < rules.min) msg = `Enter at least ${rules.min} characters.`;
    setFieldError(input, msg);
    return !msg;
  }
  function validateForm(form, ruleMap) {
    let firstBad = null;
    for (const [id, rules] of Object.entries(ruleMap)) {
      const input = form.querySelector("#" + id);
      if (input && !validateField(input, rules) && !firstBad) firstBad = input;
    }
    if (firstBad) firstBad.focus();
    return !firstBad;
  }

  function emptyState({ icon: ic = "search", title, body, action }) {
    return `<div class="empty-state">${icon(ic)}<h3>${esc(title)}</h3><p>${esc(body)}</p>${action || ""}</div>`;
  }
  function alertBox(type, title, body, actions) {
    const ic = type === "error" ? "alert" : type === "ok" ? "check" : type === "warn" ? "alert" : "info";
    return `<div class="alert alert-${type}" ${type === "error" ? 'role="alert"' : ""}>${icon(ic)}<div><strong>${esc(title)}</strong>${body ? `<span>${body}</span>` : ""}${actions ? `<div class="alert-actions">${actions}</div>` : ""}</div></div>`;
  }
  const stockLine = avail => {
    if (avail <= 0) return `<p class="stock-line stock-out">${icon("x")} Sold out — this variant cannot be ordered</p>`;
    if (avail <= 2) return `<p class="stock-line stock-low">${icon("alert")} Only ${avail} left in stock</p>`;
    return `<p class="stock-line stock-ok">${icon("check")} Ready stock — ${avail} available</p>`;
  };
  const qtyStepper = (qty, max, idPrefix) => `
    <div class="qty-stepper" data-prefix="${idPrefix}">
      <button type="button" data-action="qty-dec" data-sku="${idPrefix}" aria-label="Decrease quantity" ${qty <= 1 ? "disabled" : ""}>${icon("minus")}</button>
      <span class="qty-val tabular" id="qty-${idPrefix}" aria-live="polite">${qty}</span>
      <button type="button" data-action="qty-inc" data-sku="${idPrefix}" aria-label="Increase quantity" ${qty >= max ? "disabled" : ""}>${icon("plus")}</button>
    </div>`;

  /* Read a JPG/PNG file, downscale via canvas, return a dataURL for
     localStorage. keepPng=true preserves transparency (for logos). */
  function readImageFile(file, { maxDim = 1200, keepPng = false } = {}) {
    return new Promise((resolve, reject) => {
      if (!/image\/(jpeg|png)/.test(file.type)) { reject(new Error("Use a JPG or PNG file.")); return; }
      if (file.size > 8 * 1024 * 1024) { reject(new Error("Maximum file size is 8 MB.")); return; }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("The file could not be read."));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error("Invalid image."));
        image.onload = () => {
          const scale = Math.min(1, maxDim / Math.max(image.width, image.height));
          const w = Math.round(image.width * scale), h = Math.round(image.height * scale);
          const canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          canvas.getContext("2d").drawImage(image, 0, 0, w, h);
          const isPng = keepPng && file.type === "image/png";
          resolve(canvas.toDataURL(isPng ? "image/png" : "image/jpeg", 0.85));
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /* Mini rich-text renderer for admin-editable pages:
     "## Heading", "- " bullets, **bold**, [text](link), blank line = paragraph. */
  function richText(text) {
    const inline = s => esc(s)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, href) => {
        const safe = /^(#\/|https?:\/\/|mailto:)/.test(href) ? href : "#";
        const ext = /^https?:/.test(safe);
        return `<a class="link-underline" href="${safe}"${ext ? ' target="_blank" rel="noopener"' : ""}>${t}</a>`;
      });
    const blocks = String(text || "").split(/\n\s*\n/);
    return blocks.map(b => {
      const lines = b.split("\n").map(l => l.trim()).filter(Boolean);
      if (!lines.length) return "";
      let html = "", list = false;
      for (const l of lines) {
        if (l.startsWith("## ")) { if (list) { html += "</ul>"; list = false; } html += `<h2 class="serif">${inline(l.slice(3))}</h2>`; }
        else if (l.startsWith("- ")) { if (!list) { html += "<ul>"; list = true; } html += `<li>${inline(l.slice(2))}</li>`; }
        else { if (list) { html += "</ul>"; list = false; } html += `<p>${inline(l)}</p>`; }
      }
      if (list) html += "</ul>";
      return html;
    }).join("");
  }
  /* Plain paragraphs for product details: blank line = new paragraph. */
  const paragraphs = text => String(text || "").split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).map(p => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("");

  /* IndexedDB media store — file besar (video MP4) disimpan di sini,
     bukan localStorage, agar kuota 5MB tidak penuh. */
  const VideoStore = {
    open() {
      return new Promise((res, rej) => {
        const r = indexedDB.open("haadiya_media", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("media");
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
    },
    async put(key, blob) {
      const db = await this.open();
      return new Promise((res, rej) => {
        const tx = db.transaction("media", "readwrite");
        tx.objectStore("media").put(blob, key);
        tx.oncomplete = () => res();
        tx.onerror = () => rej(tx.error);
      });
    },
    async get(key) {
      const db = await this.open();
      return new Promise((res, rej) => {
        const rq = db.transaction("media").objectStore("media").get(key);
        rq.onsuccess = () => res(rq.result || null);
        rq.onerror = () => rej(rq.error);
      });
    },
    async del(key) {
      const db = await this.open();
      return new Promise((res, rej) => {
        const tx = db.transaction("media", "readwrite");
        tx.objectStore("media").delete(key);
        tx.oncomplete = () => res();
        tx.onerror = () => rej(tx.error);
      });
    }
  };
  function validateVideoFile(file) {
    if (file.type !== "video/mp4" && !/\.mp4$/i.test(file.name)) throw new Error("Use an MP4 video file.");
    if (file.size > 50 * 1000 * 1000) throw new Error("Maximum video size is 50 MB. Compress the video or use a path/URL instead.");
    return file;
  }

  return { esc, rupiah, dateFmt, icon, img, imgError, toast, paymentChip, fulfillmentChip, field, setFieldError, validateField, validateForm, emptyState, alertBox, stockLine, qtyStepper, readImageFile, richText, paragraphs, VideoStore, validateVideoFile, PAYMENT_LABELS, FULFILLMENT_LABELS };
})();