/* ============================================================
   INTEGRATION ADAPTERS — *NEEDS INTEGRATION*
   ------------------------------------------------------------
   Backend structure for payments and shipping. This preview is
   NOT connected to any provider and must never present a
   simulated payment as a real transaction.

   Configure before real checkout can go live:

   paymentAdapter (pick ONE gateway, e.g. Midtrans / Xendit):
   - Active merchant account + server & client keys (SERVER only,
     never in this frontend file).
   - Methods actually enabled for the account: GoPay, DANA, QRIS,
     etc. UI method names follow provider capabilities.
   - Server endpoints: POST /api/payments (create the transaction
     from a server-recomputed total), webhook
     POST /api/webhooks/payment with signature verification,
     idempotency, amount & order matching.
   - Status reconciliation (poll provider) for late webhooks.
   - Real QRIS: backend POST /v2/charge { payment_type: "qris" }
     returns qr_string / QR image URL + expiry; render it on the
     payment page; confirm ONLY via verified webhook.

   shippingAdapter (e.g. Biteship / RajaOngkir / aggregator):
   - API key + origin city/district (Admin → Settings).
   - Server endpoint: POST /api/shipping/rates — structured
     destination, total weight (weightGrams), packaging rules.
     The selected rate is revalidated at checkout.
   - Active couriers & services.

   orderService & inventoryService:
   - Recompute all prices/stock/discounts/totals on the server.
   - Atomic stock reservation at order creation, confirmation on
     verified payment webhook, release on failure/cancel/expiry.
   ============================================================ */

class IntegrationError extends Error {
  constructor(integration, message) {
    super(message);
    this.integration = integration;
    this.code = "NOT_CONNECTED";
  }
}

const paymentAdapter = {
  provider: null,            // e.g. "midtrans" | "xendit" — set at integration time
  connected: false,          // true ONLY once backend + credentials are ready & tested
  methods: [
    { id: "gopay", label: "GoPay", desc: "GoPay e-wallet" },
    { id: "dana", label: "DANA", desc: "DANA e-wallet" },
    { id: "qris", label: "QRIS", desc: "Scan QR — all e-wallets & m-banking" }
  ],
  /* Production: call POST /api/payments on your server; return
     { paymentUrl | qrString | instructions, expiry, providerTransactionId }.
     Never accept a "paid" status from the client. */
  async createPayment(order) {
    throw new IntegrationError("payment",
      "The payment gateway is not connected yet. The order is saved as Awaiting Payment; no transaction was created.");
  },
  /* Production: GET /api/payments/:orderId/status — the server verifies with the provider. */
  async refreshStatus(order) {
    throw new IntegrationError("payment",
      "Payment status can only be updated through a verified gateway. The integration is not connected yet.");
  }
};

const shippingAdapter = {
  provider: null,            // e.g. "biteship" | "rajaongkir"
  connected: false,
  /* Production: POST /api/shipping/rates { origin, destination, weightGrams, items }
     returns [{ courier, service, description, costIdr, etd }]. */
  async getRates(address, items) {
    await new Promise(r => setTimeout(r, 700)); // realistic loading state
    throw new IntegrationError("shipping",
      "The courier rate service is not connected yet. Rates cannot be calculated until a provider and the shipping origin are configured.");
  },
  async validateRate(rateId, address, items) {
    throw new IntegrationError("shipping", "Rate validation requires the shipping provider integration.");
  }
};

/* Summary for the admin dashboard & developer docs */
const integrationStatus = () => ([
  {
    id: "payment", name: "Payment gateway (GoPay, DANA, QRIS)",
    connected: paymentAdapter.connected,
    todo: "Pick a provider (e.g. Midtrans/Xendit), activate the merchant account, keep server keys on the backend, build the payment endpoint + verified webhook, test sandbox & production."
  },
  {
    id: "shipping", name: "Courier rates & tracking (automatic shipping)",
    connected: shippingAdapter.connected,
    todo: "Pick a provider (e.g. Biteship/RajaOngkir), set the API key & origin address on the backend, enable couriers/services, test rates to several regions."
  },
  {
    id: "backend", name: "orderService & inventoryService (server)",
    connected: false,
    todo: "Move price/stock/discount/total computation and stock reservation to a server with a database. This preview uses localStorage for demonstration."
  },
  {
    id: "notification", name: "Email / WhatsApp notifications",
    connected: false,
    todo: "Configure a transactional email service. Never claim notifications were sent before the service exists."
  },
  {
    id: "auth", name: "Supabase admin authentication",
    connected: window.HaadiyaAuth.isAdmin(),
    todo: "Email/password sign-in and admin_users membership verified. Catalog is synchronized; orders are still local preview data. Database and Storage policies must be tested before launch."
  }
]);