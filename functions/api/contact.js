// functions/api/contact.js
// Endpoint: POST /api/contact
// Menyimpan pesan dari form kontak ke database Cloudflare D1 (bukan cuma alert() lagi).

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.DB) {
    return json({ error: "Database belum dikonfigurasi (D1 binding 'DB' belum diset)." }, 500);
  }

  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return json({ error: "Body request tidak valid." }, 400);
  }

  const nama = (payload.nama || "").toString().trim().slice(0, 200);
  const email = (payload.email || "").toString().trim().slice(0, 200);
  const subjek = (payload.subjek || "").toString().trim().slice(0, 300);
  const pesan = (payload.pesan || "").toString().trim().slice(0, 5000);

  if (!nama || !email || !pesan) {
    return json({ error: "Nama, email, dan pesan wajib diisi." }, 400);
  }
  if (!email.includes("@")) {
    return json({ error: "Format email tidak valid." }, 400);
  }

  try {
    await env.DB.prepare(
      `INSERT INTO contact_messages (nama, email, subjek, pesan, created_at) VALUES (?, ?, ?, ?, datetime('now'))`
    )
      .bind(nama, email, subjek, pesan)
      .run();
  } catch (e) {
    return json({ error: "Gagal menyimpan pesan ke database." }, 500);
  }

  return json({ ok: true, message: "Pesan berhasil dikirim." });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
