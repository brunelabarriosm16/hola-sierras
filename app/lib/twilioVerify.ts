const TWILIO_VERIFY_BASE_URL = "https://verify.twilio.com/v2"

function getTwilioEnv() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID

  if (!accountSid || !authToken || !verifyServiceSid) {
    throw new Error(
      "Faltan variables de Twilio Verify. Configura TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN y TWILIO_VERIFY_SERVICE_SID."
    )
  }

  return {
    accountSid,
    authToken,
    verifyServiceSid,
  }
}

async function twilioVerifyRequest(path: string, body: URLSearchParams) {
  const { accountSid, authToken } = getTwilioEnv()
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64")

  const response = await fetch(`${TWILIO_VERIFY_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  })

  const data = (await response.json()) as Record<string, unknown>

  if (!response.ok) {
    const message =
      typeof data.message === "string"
        ? data.message
        : "No pudimos comunicarnos con Twilio Verify."
    throw new Error(message)
  }

  return data
}

export async function startWhatsAppVerification(phoneE164: string) {
  const { verifyServiceSid } = getTwilioEnv()

  return twilioVerifyRequest(
    `/Services/${verifyServiceSid}/Verifications`,
    new URLSearchParams({
      To: phoneE164,
      Channel: "whatsapp",
    })
  )
}

export async function checkWhatsAppVerification(phoneE164: string, code: string) {
  const { verifyServiceSid } = getTwilioEnv()

  return twilioVerifyRequest(
    `/Services/${verifyServiceSid}/VerificationCheck`,
    new URLSearchParams({
      To: phoneE164,
      Code: code,
    })
  )
}
