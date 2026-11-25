# Haadiya Syar'i — Website E-Commerce

Website satu brand sesuai `Haadiya_design.md`. Bahasa Indonesia, harga IDR, responsif
(390 / 768 / 1440 px), tanpa build step — buka `index.html` langsung di browser.

> **Status: Supabase Client & Admin Auth dipasang (Step 3). Konten masih lokal.** Katalog awal kosong — isi lewat admin.
> Payment gateway dan layanan ongkir **belum terhubung**: pesanan tersimpan
> berstatus *Menunggu Pembayaran*, stok ditahan (reserved), dan pembayaran
> diselesaikan melalui konfirmasi admin sampai gateway terpasang.

## Cara membuka

Buka `site/index.html` di browser (klik dua kali), atau layani foldernya dengan
server statis apa pun. Routing memakai hash (`#/produk`, `#/checkout`, `#/admin`)
sehingga berjalan tanpa server. Data tersimpan di `localStorage` browser.

## Struktur file

| File | Isi |
| --- | --- |
| `js/data.js` | **Sumber data awal**: pengaturan, koleksi, halaman statis. Katalog awal kosong — isi lewat admin atau edit file ini. |
| `js/supabase-client.js` | Supabase browser client dan pemeriksaan koneksi. |
| `js/supabase-auth.js` | Autentikasi admin dan pemeriksaan keanggotaan admin_users. |
| `js/store.js` | Store bersama katalog publik + keranjang + admin (localStorage). Produksi: ganti dengan `orderService`/`inventoryService` server. |
| `js/adapters.js` | `paymentAdapter` & `shippingAdapter` — struktur integrasi, status *needs integration*, daftar konfigurasi. |
| `js/public.js` | Semua halaman publik. |
| `js/admin.js` | Dashboard admin. |
| `js/app.js` | Router hash, guard admin, verifikasi pesanan, delegasi aksi. |
| `js/ui.js` | Helper UI (format Rupiah, validasi form, toast, ikon). |
| `css/styles.css` | Design system: token warna interpretasi kerja dari design.md. |
| `../images/generated*.png` | Foto demo AI (tanpa merek lain). Ganti dengan foto resmi. |

## Cara mengganti produk, foto, harga, stok

**Opsi A — edit file (permanen, ikut ter-reset):** edit `js/data.js`.
- Foto: ubah `images: ["../images/foto-anda.jpg"]` per produk (baris pertama = foto
  utama; tambah beberapa path untuk mengaktifkan galeri + thumbnail otomatis).
- Harga: `price` per varian, bilangan bulat Rupiah. Stok: `stock` per varian.
- Setelah edit, buka Admin → Ringkasan → **Reset Data Awal** agar seed baru dimuat.

**Opsi B — lewat admin (cepat, tersimpan di browser):**
- `#/admin/produk` → edit nama, harga, stok, foto, status publikasi, varian;
  hapus produk lewat tombol **Hapus** (ditolak jika masih ada unit tertahan
  pada pesanan; histori pesanan lama tetap aman karena memakai snapshot).
- `#/admin/stok` → ubah stok per SKU dengan log perubahan.
- `#/admin/pengaturan` → upload **logo header** dan **logo footer** secara
  terpisah (masing-masing bisa diganti / dihapus sendiri); alamat asal
  pengiriman punya tombol **Submit Alamat** / **Remove Alamat** — checkout
  otomatis membaca alamat terbaru saat menghitung ongkir.
- `#/admin/halaman` → **sampul landing page (hero)**: upload JPG/PNG atau path
  manual; edit teks **FAQ, Pengiriman & Pengembalian, Panduan Ukuran, Tentang
  Haadiya, Kebijakan Privasi, Syarat Belanja** (format sederhana: `## Judul`,
  `- poin`, `**tebal**`, `[teks](tautan)`, baris kosong = paragraf); **banner
  atas** — teks berjalan looping ke kanan, kosongkan untuk menyembunyikan;
  **tabel ukuran** — otomatis dari katalog atau manual (tambah/hapus baris).
- Form produk: **Ringkasan & Deskripsi jadi satu kolom** berparagraf —
  paragraf pertama otomatis menjadi ringkasan katalog, paragraf berikutnya
  tampil sebagai deskripsi berparagraf di halaman produk.
- Perubahan langsung tampil di katalog publik (satu sumber data).

**Login admin:** gunakan email dan password akun Supabase Auth yang terdaftar di tabel `admin_users`. Sesi login dikelola Supabase SDK; akses dashboard ditolak jika verifikasi gagal. Pengujian akun asli dan kebijakan RLS masih diperlukan. Lihat `STEP-3-TEST.txt`.

## Integrasi yang belum terhubung (wajib sebelum launch)

1. **Payment gateway** (pilih satu: Midtrans / Xendit / lainnya)
   - Akun merchant aktif; metode GoPay, DANA, QRIS mengikuti kemampuan akun.
   - Server key **hanya di backend**. Endpoint buat transaksi + webhook dengan
     verifikasi signature, idempotensi, pencocokan nominal & order, rekonsiliasi.
   - Isi `paymentAdapter` di `js/adapters.js` → arahkan ke endpoint server Anda.
2. **Layanan ongkir** (Biteship / RajaOngkir / lainnya)
   - API key + alamat asal (Admin → Pengaturan), kurir & layanan aktif.
   - Endpoint tarif dari alamat terstruktur + berat (`weightGrams`); validasi
     ulang tarif saat checkout. Isi `shippingAdapter`.
3. **Backend sungguhan** — `orderService` & `inventoryService`: semua harga,
   stok, total, dan reservasi dihitung di server dengan database. Preview ini
   memakai localStorage dan **bukan** pengganti server.
4. **Notifikasi** email/WhatsApp transaksional (belum terpasang — jangan klaim
   notifikasi terkirim).
5. **Verifikasi autentikasi admin produksi** (uji akun asli, RLS akses tulis, dan prosedur reset kredensial).
6. **Aset & kebijakan resmi**: logo, font, palet final, foto produk asli, data
   ukuran/bahan/berat asli, kontak, kebijakan retur/privasi/syarat.

Status integrasi juga tampil di **Admin → Ringkasan → Status integrasi**.

## Perilaku yang sudah diuji

- Kartu produk → detail yang sesuai; pencarian "abaya" + filter ukuran M +
  urut harga → URL & hasil benar; filter bisa dihapus.
- Pilih warna/ukuran → SKU, harga, stok benar; tambah 2 unit → badge & keranjang
  sinkron; jumlah melebihi stok ditolak dengan pesan spesifik (stok tersedia =
  on-hand − reserved).
- Varian sold out (Khimar Zahra) → CTA "Habis" nonaktif.
- Checkout: validasi 8 kolom + fokus ke error pertama; ongkir menampilkan state
  loading → error jujur + tombol coba lagi; pesanan demo dibuat → stok
  di-reserve, keranjang kosong, status Menunggu Pembayaran.
- Akses ID pesanan tanpa verifikasi → ditolak; lacak dengan email salah →
  ditolak; nomor + email benar → detail terbuka.
- Admin: login guard; stok negatif ditolak; stok di bawah reserved ditolak;
  pesanan belum dibayar tidak bisa "Diproses"; kirim tanpa resi ditolak; resi
  tampil di halaman pembeli; edit harga/stok/foto langsung terlihat publik;
  histori pesanan lama memakai snapshot.
- Mobile 390px: grid 2 kolom, filter sheet, sticky bar beli, header ringkas.

## Catatan produksi

- Semua total di preview dihitung klien untuk demo; **produksi wajib hitung
  ulang di server** dan verifikasi webhook (jangan percaya status dari klien).
- `localStorage` dapat dihapus pengguna; bukan penyimpanan pesanan sungguhan.
- Penanda "Demo katalog" tampil global; hapus hanya setelah semua konten asli
  menggantikannya (ubah `meta.demo` dan banner di `index.html`).
## Step 4B — Supabase content synchronization (test release)

See `STEP-4-TEST.txt` before using this build. Cloud initialization is explicit:
only an authorized admin may import a version-2 backup into an empty `main`
record. Public content uses an allowlist and updates are conditional on the last
observed revision. Existing content is not automatically overwritten. No schema
changes or new tables are required for this test. Local order/payment preview
remains non-production. The public JSON record is readable by anyone, including
its draft product data and voucher codes; private content requires separate
protected storage. Legacy backup and Step 3 should remain intact.

## Step 5D - Supabase Storage (test release)

See STEP-5-TEST.txt. Public media uses the haadiya-media bucket and only HTTPS
references are stored in the public JSON. Images are downscaled in the existing
editor; videos are uploaded directly. Media migration is separate from text import
and fills missing fields only. Files are not automatically deleted from Storage.
Cloud schema 2 is not compatible with Step 4; keep old files only as offline backup.
