/* ============================================================
   HAADIYA — INITIAL DATA SOURCE
   ------------------------------------------------------------
   The catalog starts empty on purpose: add products, variants,
   prices, stock, and photos via Admin → Products (or edit this
   file). Product photos: `images` (default) and `colorImages`
   (per color) — e.g. "../images/photo.jpg" relative to index.html.
   Prices are whole Rupiah integers. Stock is per color × size
   variant. SKUs must be unique.

   Product copy: `summary` (one line) + `details` (free paragraphs,
   blank line = new paragraph). All storefront copy is English.
   ============================================================ */
window.HAADIYA_SEED = {
  meta: {
    version: 2,
    note: "Fill the catalog, contact details, and policies with official Haadiya data via the admin."
  },

  settings: {
    storeName: "Haadiya Syar’i",
    tagline: "Inspired by Faith. Rooted in Values.",
    logoHeader: null,
    logoFooter: null,
    heroImage: null,
    /* Hero video (MP4): null | path/URL | "idb:hero" (uploaded, stored in IndexedDB).
       When set, the landing hero plays the video instead of the photo. */
    heroVideo: null,

    /* Landing page copy — editable via Admin → Pages & Banner. */
    heroTitle: "Inspired by Faith.\nRooted in Values.",
    heroText: "Modest wear with purposeful cuts, carefully chosen fabrics, and meticulous craftsmanship — made to be worn for years, not just bought.",

    email: "halo@haadiya.example",
    phone: "Not configured",
    originAddress: "",
    instagram: "https://www.instagram.com/haadiyasyari/",
    shopee: "https://shopee.co.id/akalia18",
    linktree: "https://linktr.ee/haadiyasyari",
    couriers: [],
    paymentMethodsActive: [],

    /* Top announcement banner — scrolling marquee. Empty = hidden.
       Managed via Admin → Pages & Banner. */
    bannerText: "",

    /* Home values strip — editable via Admin → Pages & Banner. */
    values: [
      { label: "01 — Fabric", title: "Considered fabric", text: "Composition, weight, and hand-feel are described honestly on every product, so you know exactly what you will wear." },
      { label: "02 — Cut", title: "Purposeful cut", text: "Loose silhouettes that drape cleanly, with measurements in centimetres — not just S, M, L labels." },
      { label: "03 — Craft", title: "Made with intention", text: "Every seam is built for long wear. No exaggerated claims, no false scarcity." }
    ],

    /* Static page copy — edited via Admin → Pages & Banner.
       Format: "## Heading", "- " bullet, **bold**, [text](link),
       blank line = new paragraph. */
    pagesVersion: 3,
    pages: {
      faq: "## Are products ready stock?\nYes. Every product shown has per-variant stock and there is no pre-order. A **Sold out** label means every variant has zero stock.\n\n## Which payment methods are available?\nPlanned: GoPay, DANA, and QRIS through a single payment gateway. Methods go live according to what is actually enabled on the merchant account once integration is complete.\n\n## How is shipping calculated?\nShipping is calculated automatically from your destination address, package weight, and the active courier services, once the store's shipping origin is configured.\n\n## How do I track an order without an account?\nUse the [Track Order](#/lacak-pesanan) page with your order number + the email used at checkout.\n\n## Can I return or exchange a size?\nThe return/exchange policy is pending brand approval and will be published on the [Shipping & Returns](#/bantuan/pengiriman-pengembalian) page before launch.",
      shipping: "## Shipping\n- Shipping is calculated automatically from your destination address, package weight, and active courier services.\n- The tracking number is entered once your order ships and appears on your order page.\n- Shipping origin and couriers are configured in Admin → Settings.\n\n## Returns / exchanges\nThe return policy, time window, and size-exchange conditions will be announced once approved by the brand.",
      about: {
        heroTitle: "Quiet, purposeful, mature.",
        heroText: "Haadiya positions itself as The Quiet Guide: modest wear that speaks through cut, function, fabric, and careful construction — never through excessive promotion.",
        body: "“Inspired by Faith. Rooted in Values.” — Haadiya's official tagline.\n\nEvery product is described honestly: fabric composition, measurements in centimetres, cut, and care. We believe confidence before buying comes from honest information, not countdowns or false scarcity.\n\n## Get in touch\nInstagram: [@haadiyasyari](https://www.instagram.com/haadiyasyari/) · Shopee: [akalia18](https://shopee.co.id/akalia18) · [Linktree](https://linktr.ee/haadiyasyari)"
      },
      privacy: "Planned scope: contact & address data for order fulfilment, payment data only as permitted by the provider (never PINs or wallet credentials), and your rights over your data.\n\nContact and address data is used solely to fulfil your order and is not shared with third parties beyond that purpose.",
      terms: "Planned scope: price & stock terms, payment and transaction expiry, shipping, cancellation, and dispute resolution.\n\nBy shopping on this site you agree to the applicable terms."
    }
  },

  /* The catalog starts empty — add official products via Admin → Products. */
  products: [],

  /* Vouchers — manage via Admin → Vouchers.
     type: "percent" (value = %) or "fixed" (value = Rupiah).
     minSubtotal: minimum spend; maxDiscount: cap for percent;
     quota: usage limit (null = unlimited); expiresAt: ISO date or null. */
  vouchers: [
    { code: "WELCOME10", type: "percent", value: 10, minSubtotal: 0, maxDiscount: null, quota: null, used: 0, active: true, expiresAt: null }
  ],

  initialOrders: []
};
