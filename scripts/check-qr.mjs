// Integration check with an isolated mock database. No production data is used.
import assert from "node:assert/strict"
import { createServer } from "node:http"
import { spawn } from "node:child_process"
import { once } from "node:events"

const records = new Map()
const database = createServer(async (req, res) => {
  let raw = ""
  for await (const part of req) raw += part
  const body = raw ? JSON.parse(raw) : null
  const url = new URL(req.url, "http://localhost")
  res.setHeader("Content-Type", "application/json")
  if (url.pathname.endsWith("/rpc/register_qr_open")) {
    const record = records.get(body.link_id)
    if (record) { record.opens++; record[`${body.device_type}_opens`]++ }
    res.end(JSON.stringify(record || null))
  } else if (req.method === "POST") {
    const record = { ...body, opens: 0, android_opens: 0, iphone_opens: 0, other_opens: 0, created_at: new Date().toISOString() }
    records.set(record.id, record)
    res.end(JSON.stringify(record))
  } else {
    const id = url.searchParams.get("id")?.replace("eq.", "")
    res.end(JSON.stringify(id ? records.get(id) || null : [...records.values()]))
  }
})
database.listen(0, "127.0.0.1")
await once(database, "listening")
const dbPort = database.address().port
const origin = "http://localhost:3117"
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-p", "3117"], {
  env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${dbPort}`, SUPABASE_SERVICE_ROLE_KEY: "isolated-test-key" },
  stdio: ["ignore", "pipe", "pipe"],
})
let logs = ""
child.stdout.on("data", data => { logs += data })
child.stderr.on("data", data => { logs += data })
async function request(path, options = {}) {
  return fetch(`${origin}${path}`, { redirect: "manual", ...options, headers: { Origin: origin, "Content-Type": "application/json", ...options.headers } })
}
try {
  let ready = false
  for (let attempt = 0; attempt < 60; attempt++) {
    try { if ((await request("/api/qrsir01")).status === 200) { ready = true; break } } catch {}
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  assert.ok(ready, `Server did not start: ${logs}`)
  const page = await request("/qrsir01")
  assert.equal(page.status, 200)
  assert.match(await page.text(), /Crear un QR/)
  assert.equal((await request("/api/qrsir01", { method: "POST", headers: { Origin: "https://other.example" }, body: "{}" })).status, 403)
  const create = await request("/api/qrsir01", { method: "POST", body: JSON.stringify({ name: "App", mode: "stores", destination: "https://play.google.com/store/apps/details?id=test", android_destination: "https://play.google.com/store/apps/details?id=test", iphone_destination: "https://apps.apple.com/uy/app/test/id123" }) })
  assert.equal(create.status, 201, await create.clone().text())
  const { link } = await create.json()
  const path = `/q/${link.id}`
  const android = await request(path, { headers: { "User-Agent": "Mozilla/5.0 (Linux; Android 14)" } })
  assert.equal(android.status, 302)
  assert.equal(android.headers.get("location"), link.android_destination)
  assert.match(android.headers.get("cache-control"), /no-store/)
  const iphone = await request(path, { headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18)" } })
  assert.equal(iphone.headers.get("location"), link.iphone_destination)
  const desktop = await request(path, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0)" } })
  assert.equal(desktop.headers.get("location"), `${origin}${path}/tiendas`)
  const chooser = await request(`${path}/tiendas`)
  assert.equal(chooser.status, 200)
  assert.match(await chooser.text(), /Android · Google Play/)
  await request(path, { method: "HEAD" })
  await request(path, { headers: { "User-Agent": "WhatsApp/2.0" } })
  await request(path, { headers: { Purpose: "prefetch" } })
  const listing = await (await request("/api/qrsir01")).json()
  assert.equal(listing.links.find(item => item.id === link.id).opens, 3)
  assert.equal(listing.links.find(item => item.id === link.id).android_opens, 1)
  assert.equal(listing.links.find(item => item.id === link.id).iphone_opens, 1)
  assert.equal(listing.links.find(item => item.id === link.id).other_opens, 1)
  const invalid = await request("/api/qrsir01", { method: "POST", body: JSON.stringify({ name: "Invalid", destination: "javascript:alert(1)" }) })
  assert.equal(invalid.status, 400)
  console.log("QR integration checks passed: access without login, creation, store routing, fallback, counters and preview exclusions.")
} finally {
  child.kill()
  database.closeAllConnections()
  database.close()
}
