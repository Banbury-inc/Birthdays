const crypto = require("node:crypto")
const https = require("node:https")
const querystring = require("node:querystring")
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager")
const { Pool } = require("pg")

const secretsClient = new SecretsManagerClient({})

let contactHashSecret
let databaseSecret
let pool
let sessionTokenSecret
let twilioConfig

function json(statusCode, body) {
  return {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
    },
    statusCode,
  }
}

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
}

function base64UrlDecode(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/")
  const padding = "=".repeat((4 - (base64.length % 4)) % 4)

  return Buffer.from(`${base64}${padding}`, "base64").toString("utf8")
}

async function readSecret(secretId) {
  const response = await secretsClient.send(
    new GetSecretValueCommand({
      SecretId: secretId,
    })
  )

  if (!response.SecretString) throw new Error(`Secret ${secretId} is empty.`)

  return response.SecretString
}

async function getContactHashSecret() {
  if (!contactHashSecret) {
    contactHashSecret = await readSecret(process.env.CONTACT_HASH_SECRET_ARN)
  }

  return contactHashSecret
}

async function getDatabaseSecret() {
  if (!databaseSecret) {
    databaseSecret = JSON.parse(await readSecret(process.env.DATABASE_SECRET_ARN))
  }

  return databaseSecret
}

async function getSessionTokenSecret() {
  if (!sessionTokenSecret) {
    sessionTokenSecret = await readSecret(process.env.SESSION_TOKEN_SECRET_ARN)
  }

  return sessionTokenSecret
}

async function getTwilioConfig() {
  if (!twilioConfig) {
    twilioConfig = JSON.parse(await readSecret(process.env.TWILIO_CONFIG_SECRET_ARN))
  }

  return twilioConfig
}

async function getPool() {
  if (pool) return pool

  const secret = await getDatabaseSecret()

  pool = new Pool({
    database: process.env.DATABASE_NAME,
    host: process.env.DATABASE_HOST,
    password: secret.password,
    port: Number(process.env.DATABASE_PORT || 5432),
    ssl: {
      rejectUnauthorized: true,
    },
    user: secret.username,
  })

  return pool
}

async function hashPhoneNumber(phoneNumber) {
  const secret = await getContactHashSecret()

  return crypto
    .createHmac("sha256", secret)
    .update(phoneNumber.trim())
    .digest("hex")
}

async function getAuthSubject(phoneNumber) {
  const phoneHash = await hashPhoneNumber(phoneNumber)

  return `phone:${phoneHash}`
}

function getRoute(event) {
  return `${event.requestContext.http.method} ${event.rawPath}`
}

async function callTwilioVerify(path, body) {
  const config = await getTwilioConfig()
  const postBody = querystring.stringify(body)
  const authorization = Buffer.from(
    `${config.accountSid}:${config.authToken}`
  ).toString("base64")

  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        headers: {
          Authorization: `Basic ${authorization}`,
          "Content-Length": Buffer.byteLength(postBody),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        hostname: "verify.twilio.com",
        method: "POST",
        path: `/v2/Services/${config.verifyServiceSid}${path}`,
      },
      (response) => {
        const chunks = []

        response.on("data", (chunk) => chunks.push(chunk))
        response.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8")
          let data = {}

          try {
            data = text ? JSON.parse(text) : {}
          } catch {
            data = {
              message: text.slice(0, 200) || "Twilio Verify request failed.",
            }
          }

          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve(data)
            return
          }

          reject(new Error(data.message || "Twilio Verify request failed."))
        })
      }
    )

    request.on("error", reject)
    request.write(postBody)
    request.end()
  })
}

async function startPhoneVerification(body) {
  if (!body.phoneNumber) throw new Error("phoneNumber is required.")

  await callTwilioVerify("/Verifications", {
    Channel: "sms",
    To: body.phoneNumber,
  })

  return {
    status: "pending",
  }
}

async function createSessionToken(phoneNumber) {
  const now = Math.floor(Date.now() / 1000)
  const ttlSeconds = Number(process.env.SESSION_TOKEN_TTL_SECONDS || 2592000)
  const payload = {
    exp: now + ttlSeconds,
    iat: now,
    phoneNumber,
    sub: await getAuthSubject(phoneNumber),
  }
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const secret = await getSessionTokenSecret()
  const signature = crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url")

  return `${encodedPayload}.${signature}`
}

async function verifyPhoneCode(body) {
  if (!body.phoneNumber) throw new Error("phoneNumber is required.")
  if (!body.code) throw new Error("code is required.")

  const verification = await callTwilioVerify("/VerificationCheck", {
    Code: body.code,
    To: body.phoneNumber,
  })

  if (verification.status !== "approved") {
    throw new Error("That code is not correct. Check the text and try again.")
  }

  return {
    token: await createSessionToken(body.phoneNumber),
  }
}

async function verifySessionToken(event) {
  const authHeader = event.headers?.authorization || event.headers?.Authorization || ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""

  if (!token) return null

  const [encodedPayload, signature] = token.split(".")

  if (!encodedPayload || !signature) return null

  const secret = await getSessionTokenSecret()
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url")

  try {
    if (
      !crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      )
    ) {
      return null
    }
  } catch {
    return null
  }

  const claims = JSON.parse(base64UrlDecode(encodedPayload))

  if (!claims.sub || !claims.phoneNumber || claims.exp * 1000 <= Date.now()) {
    return null
  }

  return claims
}

async function ensureAuthSchema(client) {
  await client.query(`
    do $$
    begin
      if exists (
        select 1
        from information_schema.columns
        where table_name = 'users'
          and column_name = 'cognito_sub'
      ) and not exists (
        select 1
        from information_schema.columns
        where table_name = 'users'
          and column_name = 'auth_subject'
      ) then
        alter table users rename column cognito_sub to auth_subject;
      end if;
    end $$;
  `)

  await client.query(`
    create unique index if not exists users_auth_subject_idx
      on users (auth_subject)
  `)
}

async function getCurrentUser(client, claims) {
  const result = await client.query(
    `
      select id, phone_number, display_name, birthday, birthday_confirmed_at
      from users
      where auth_subject = $1
    `,
    [claims.sub]
  )

  if (!result.rowCount) return null

  const row = result.rows[0]

  return {
    birthday: row.birthday,
    birthdayConfirmedAt: row.birthday_confirmed_at,
    displayName: row.display_name,
    id: row.id,
    phoneNumber: row.phone_number,
  }
}

async function saveCurrentUser(client, claims, body) {
  const phoneNumber = claims.phoneNumber

  if (!phoneNumber) throw new Error("Session token is missing phoneNumber.")
  if (!body.displayName?.trim()) throw new Error("displayName is required.")
  if (!body.birthday) throw new Error("birthday is required.")

  const phoneHash = await hashPhoneNumber(phoneNumber)
  const result = await client.query(
    `
      insert into users (
        auth_subject,
        phone_number,
        phone_hash,
        display_name,
        birthday,
        birthday_confirmed_at
      )
      values ($1, $2, $3, $4, $5, now())
      on conflict (phone_number) do update set
        auth_subject = excluded.auth_subject,
        phone_number = excluded.phone_number,
        phone_hash = excluded.phone_hash,
        display_name = excluded.display_name,
        birthday = excluded.birthday,
        birthday_confirmed_at = now(),
        updated_at = now()
      returning id, phone_number, display_name, birthday, birthday_confirmed_at
    `,
    [claims.sub, phoneNumber, phoneHash, body.displayName.trim(), body.birthday]
  )

  const row = result.rows[0]

  return {
    birthday: row.birthday,
    birthdayConfirmedAt: row.birthday_confirmed_at,
    displayName: row.display_name,
    id: row.id,
    phoneNumber: row.phone_number,
  }
}

async function syncContactsForUser(client, claims, body) {
  const user = await getCurrentUser(client, claims)

  if (!user) throw new Error("Complete your birthday profile before syncing contacts.")

  const contacts = Array.isArray(body.contacts) ? body.contacts : []
  const rows = []

  for (const contact of contacts) {
    if (!contact.phoneNumber) continue

    rows.push({
      displayName: contact.displayName?.trim() || "Contact",
      phoneHash: await hashPhoneNumber(contact.phoneNumber),
    })
  }

  await client.query("begin")

  try {
    await client.query("delete from contact_syncs where owner_user_id = $1", [user.id])

    for (const row of rows) {
      await client.query(
        `
          insert into contact_syncs (owner_user_id, contact_phone_hash, local_display_name)
          values ($1, $2, $3)
          on conflict (owner_user_id, contact_phone_hash) do update set
            local_display_name = excluded.local_display_name,
            synced_at = now()
        `,
        [user.id, row.phoneHash, row.displayName]
      )
    }

    await client.query("commit")
  } catch (error) {
    await client.query("rollback")
    throw error
  }

  return {
    syncedCount: rows.length,
  }
}

async function getContactMatches(client, claims) {
  const user = await getCurrentUser(client, claims)

  if (!user) return []

  const result = await client.query(
    `
      select matched.id, matched.phone_number, matched.display_name, matched.birthday
      from contact_syncs synced
      join users matched on matched.phone_hash = synced.contact_phone_hash
      where synced.owner_user_id = $1
        and matched.id <> $1
      order by matched.display_name
    `,
    [user.id]
  )

  return result.rows.map((row) => ({
    birthday: row.birthday,
    displayName: row.display_name,
    id: row.id,
    phoneNumber: row.phone_number,
  }))
}

exports.handler = async function handler(event) {
  const route = getRoute(event)
  const body = event.body ? JSON.parse(event.body) : {}

  try {
    if (route === "POST /auth/start") return json(200, await startPhoneVerification(body))
    if (route === "POST /auth/verify") return json(200, await verifyPhoneCode(body))
  } catch (error) {
    console.error(error)
    return json(400, {
      message: error instanceof Error ? error.message : "Phone authorization failed.",
    })
  }

  const claims = await verifySessionToken(event)

  if (!claims) return json(401, { message: "Unauthorized." })

  let client

  try {
    client = await (await getPool()).connect()
    await ensureAuthSchema(client)

    if (route === "GET /me") return json(200, await getCurrentUser(client, claims))
    if (route === "PUT /me") return json(200, await saveCurrentUser(client, claims, body))
    if (route === "POST /contacts/sync") {
      return json(200, await syncContactsForUser(client, claims, body))
    }
    if (route === "GET /contacts/matches") {
      return json(200, await getContactMatches(client, claims))
    }

    return json(404, { message: "Not found." })
  } catch (error) {
    console.error(error)
    return json(400, {
      message: error instanceof Error ? error.message : "Request failed.",
    })
  } finally {
    client?.release()
  }
}
