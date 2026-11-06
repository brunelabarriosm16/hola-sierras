// Integration check with an isolated mock database. No production data is used.


import { createServer, request as httpRequest } from "node:http"

import { spawn } from "node:child_process"

import { once } from "node:events"



const records = new Map([

  ["b6b51090-81c2-4d93-b186-9d97b5f3ff24", {

    id: "b6b51090-81c2-4d93-b186-9d97b5f3ff24", name: "Descarga de la app · afiche",

    destination: "https://play.google.com/store/apps/details?id=ejemplo",

    android_destination: "https://play.google.com/store/apps/details?id=ejemplo",

    iphone_destination: "https://apps.apple.com/uy/app/ejemplo/id123",

    opens: 128, android_opens: 83, iphone_opens: 41, other_opens: 4,

    created_at: "2026-11-06T12:00:00Z",

  }],

])

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






// Local-only preview with isolated sample data.

const proxy = createServer((req, res) => {

  const headers = { ...req.headers, host: "localhost:3117", origin }

  const upstream = httpRequest(`${origin}${req.url}`, { method: req.method, headers }, response => {

    res.writeHead(response.statusCode, response.headers)

    response.pipe(res)

  })

  upstream.on("error", () => { res.writeHead(503); res.end("La vista previa se esta iniciando. Recarga en unos segundos.") })

  req.pipe(upstream)

})

proxy.listen(3119, "127.0.0.1", () => console.log("Vista previa local con datos ficticios: http://localhost:3119/qrsir01"))

process.on("SIGINT", () => { child.kill(); proxy.close(); database.closeAllConnections(); database.close(); process.exit() })
