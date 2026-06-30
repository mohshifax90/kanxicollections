const MSGOWL_OTP_BASE = "https://otp.msgowl.com";

export function phoneDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

export async function requestMsgowl(path, payload) {
  const accessKey = process.env.MSGOWL_OTP_ACCESS_KEY || process.env.MSGOWL_ACCESS_KEY;
  if (!accessKey) {
    const error = new Error("OTP service is not configured.");
    error.statusCode = 500;
    throw error;
  }

  const response = await fetch(`${MSGOWL_OTP_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `AccessKey ${accessKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    const error = new Error(data.message || "OTP request failed.");
    error.statusCode = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export function otpErrorResponse(error) {
  return Response.json(
    {
      error: error.message || "OTP request failed.",
      details: error.data,
    },
    { status: error.statusCode || 500 },
  );
}
