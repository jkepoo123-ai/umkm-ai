// functions/api/login.js
// Endpoint: POST /api/login
// Cek email + password terhadap D1, buat session token, kirim sebagai httpOnly cookie.

import { hashPassword } from "./register.js";

const SESSION_DAYS = 7;

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

  if (!email || !password) {
    return json({ error: "Email dan password wajib diisi." }, 400);
  }

  const user = await env.DB.prepare(
    `SELECT id, password_hash, password_salt FROM users WHERE email = ?`
  )
    .bind(email)
    .first();

  if (!user) {
    return json({ error: "Email atau password salah." }, 401);
  }

  const { hash } = await hashPassword(password, user.password_salt);
  if (hash !== user.password_hash) {
    return json({ error: "Email atau password salah." }, 401);
  }

  const token = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  await env.DB.prepare(
    `INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)`
  )
    .bind(token, user.id, expiresAt)
    .run();

  const headers = {
    "Content-Type": "application/json",
    "Set-Cookie": `session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${
      SESSION_DAYS * 24 * 60 * 60
    }`,
  };

  return new Response(JSON.stringify({ ok: true, message: "Login berhasil." }), { status: 200, headers });
}

function bytesToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
