const MSGOWL_OTP_BASE = 'https://otp.msgowl.com';

function json(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function getBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'object') return req.body;
  try {
    return JSON.parse(req.body);
  } catch {
    return {};
  }
}

function phoneDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

async function requestMsgowl(path, payload) {
  const accessKey = process.env.MSGOWL_ACCESS_KEY;
  if (!accessKey) {
    const error = new Error('OTP service is not configured.');
    error.statusCode = 500;
    throw error;
  }

  const response = await fetch(`${MSGOWL_OTP_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `AccessKey ${accessKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    const error = new Error(data.message || 'OTP request failed.');
    error.statusCode = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

function methodGuard(req, res) {
  if (req.method === 'POST') return false;
  json(res, 405, { error: 'Method not allowed' });
  return true;
}

function handleError(res, error) {
  json(res, error.statusCode || 500, {
    error: error.message || 'OTP request failed.',
    details: error.data,
  });
}

module.exports = {
  getBody,
  handleError,
  json,
  methodGuard,
  phoneDigits,
  requestMsgowl,
};
