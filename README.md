# Create T3 App

This is a [T3 Stack](https://create.t3.gg/) project bootstrapped with `create-t3-app`.

## What's next? How do I make an app with this?

We try to keep this project as simple as possible, so you can start with just the scaffolding we set up for you, and add additional things later when they become necessary.

If you are not familiar with the different technologies used in this project, please refer to the respective docs. If you still are in the wind, please join our [Discord](https://t3.gg/discord) and ask for help.

- [Next.js](https://nextjs.org)
- [NextAuth.js](https://next-auth.js.org)
- [Prisma](https://prisma.io)
- [Drizzle](https://orm.drizzle.team)
- [Tailwind CSS](https://tailwindcss.com)
- [tRPC](https://trpc.io)

## Learn More

To learn more about the [T3 Stack](https://create.t3.gg/), take a look at the following resources:

- [Documentation](https://create.t3.gg/)
- [Learn the T3 Stack](https://create.t3.gg/en/faq#what-learning-resources-are-currently-available) — Check out these awesome tutorials

You can check out the [create-t3-app GitHub repository](https://github.com/t3-oss/create-t3-app) — your feedback and contributions are welcome!

## How do I deploy this?

Follow our deployment guides for [Vercel](https://create.t3.gg/en/deployment/vercel), [Netlify](https://create.t3.gg/en/deployment/netlify) and [Docker](https://create.t3.gg/en/deployment/docker) for more information.

## Net debt

Dashboard menampilkan selisih utang per pasangan dari semua transaksi belum
selesai. Contoh: A berutang B Rp100.000 dan B berutang A Rp40.000 berarti A cukup
membayar B Rp60.000. Bagian pembayar sendiri tidak dihitung sebagai utang.

Pelunasan dikonfirmasi langsung pada baris ringkasan. Konfirmasi menyelesaikan
item kedua arah, termasuk saldo impas tanpa transfer. Riwayat tetap menampilkan
nominal transaksi asli; filter riwayat tidak mengubah ringkasan net debt.
Detail, tambah, edit, dan hapus transaksi tersedia melalui panel samping.

Pelunasan memakai MongoDB transaction: gunakan replica set atau MongoDB Atlas.
Tidak diperlukan migrasi. Data lama tidak otomatis ditandai lunas. Pembayaran
sebagian belum tersedia. Preview yang sudah berubah ditolak dan perlu diperiksa
ulang sebelum dikonfirmasi.

Jalankan `npm test` (memerlukan Bun dan Node) untuk pengujian perhitungan dan
repository dengan adapter dalam memori. Pengujian ini tidak menghubungi database
nyata. Jalankan `npm run typecheck` untuk pemeriksaan TypeScript.

Alur pelunasan: pilih orang (termasuk XY), lalu seluruh pasangan utangnya langsung
muncul. Merah berarti perlu membayar, hijau berarti akan menerima, dan abu-abu
berarti impas, dari sudut pandang orang yang dipilih. Tombol Catat pelunasan membuka konfirmasi; perubahan status
item baru disimpan setelah konfirmasi. Semua item belum selesai kedua arah pada
snapshot tersebut ditandai lunas bersama, sementara item pihak lain tetap utuh.
Edit transaksi menggunakan pemeriksaan versi agar form yang dibuka sebelum
pelunasan tidak dapat menimpa status lunas. Jika ditolak karena transaksi berubah,
kembali ke rincian dan buka ulang edit untuk memuat data terbaru.
