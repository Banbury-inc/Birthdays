const crypto = require("node:crypto")
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager")
const { Pool } = require("pg")

const secretsClient = new SecretsManagerClient({})

let contactHashSecret
let databaseSecret
let pool

function json(statusCode, body) {
  return {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
    },
    statusCode,
  }
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

function getClaims(event) {
  return event.requestContext?.authorizer?.jwt?.claims ?? {}
}

function getRoute(event) {
  return `${event.requestContext.http.method} ${event.rawPath}`
}

async function getCurrentUser(client, claims) {
  const result = await client.query(
    `
      select id, phone_number, display_name, birthday, birthday_confirmed_at
      from users
      where cognito_sub = $1
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
  const phoneNumber = claims.phone_number

  if (!phoneNumber) throw new Error("Cognito token is missing phone_number.")
  if (!body.displayName?.trim()) throw new Error("displayName is required.")
  if (!body.birthday) throw new Error("birthday is required.")

  const phoneHash = await hashPhoneNumber(phoneNumber)
  const result = await client.query(
    `
      insert into users (
        cognito_sub,
        phone_number,
        phone_hash,
        display_name,
        birthday,
        birthday_confirmed_at
      )
      values ($1, $2, $3, $4, $5, now())
      on conflict (cognito_sub) do update set
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
  const client = await (await getPool()).connect()

  try {
    const claims = getClaims(event)
    const route = getRoute(event)
    const body = event.body ? JSON.parse(event.body) : {}

    if (!claims.sub) return json(401, { message: "Unauthorized." })

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
    client.release()
  }
}
