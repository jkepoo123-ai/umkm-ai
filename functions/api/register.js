// functions/api/register.js
// Endpoint: POST /api/register
// Daftar akun sungguhan: password di-hash (PBKDF2 + salt acak), disimpan di D1.
// Tidak ada API/library eksternal dipakai — semua pakai Web Crypto bawaan Cloudflare.

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

  const email = (payload.email || "").toString().trim().toLowerCase().slice(0, 200);
  const password = (payload.password || "").toString();

  if (!email || !email.includes("@")) {
    return json({ error: "Email tidak valid." }, 400);
  }
  if (password.length < 8) {
    return json({ error: "Password minimal 8 karakter." }, 400);
  }

  const existing = await env.DB.prepare(`SELECT id FROM users WHERE email = ?`).bind(email).first();
  if (existing) {
    return json({ error: "Email sudah terdaftar. Coba masuk saja." }, 409);
  }

  const { hash, salt } = await hashPassword(password);

  await env.DB.prepare(
    `INSERT INTO users (email, password_hash, password_salt, created_at) VALUES (?, ?, ?, datetime('now'))`
  )
    .bind(email, hash, salt)
    .run();

  return json({ ok: true, message: "Akun berhasil dibuat. Silakan masuk." });
}

export async function hashPassword(password, existingSaltHex = null) {
  const enc = new TextEncoder();
  const saltBytes = existingSaltHex
    ? hexToBytes(existingSaltHex)
    : crypto.getRandomValues(new Uint8Array(16));

  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);

  const derivedBits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBytes, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    256
  );

  return { hash: bytesToHex(new Uint8Array(derivedBits)), salt: bytesToHex(saltBytes) };
}

function bytesToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
