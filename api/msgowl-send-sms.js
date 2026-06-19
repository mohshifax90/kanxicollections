const { getBody, handleError, json, methodGuard, phoneDigits } = require('./_msgowl');

const MSGOWL_REST_BASE = 'https://rest.msgowl.com';

async function requestMsgowlRest(path, payload) {
  const accessKey = process.env.MSGOWL_REST_ACCESS_KEY || process.env.MSGOWL_ACCESS_KEY;
  if (!accessKey) {
    const error = new Error('SMS service is not configured.');
    error.statusCode = 500;
    throw error;
  }

  const response = await fetch(`${MSGOWL_REST_BASE}${path}`, {
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
    const error = new Error(data.message || 'SMS request failed.');
    error.statusCode = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

module.exports = async function handler(req, res) {
  if (methodGuard(req, res)) return;

  try {
    const body = getBody(req);
    const recipients = Array.isArray(body.recipients)
      ? body.recipients.map(phoneDigits).filter(Boolean)
      : phoneDigits(body.recipients || body.phone_number || body.phone);
    const senderId = String(body.sender_id || body.senderId || process.env.MSGOWL_SENDER_ID || 'Kanxi').trim();
    const message = String(body.body || body.message || '').trim();

    if (!recipients || (Array.isArray(recipients) ? !recipients.length : recipients.length < 6)) {
      return json(res, 400, { error: 'Enter a valid recipient.' });
    }

    if (!message) {
      return json(res, 400, { error: 'SMS body is required.' });
    }

    const data = await requestMsgowlRest('/messages', {
      recipients,
      sender_id: senderId,
      body: message,
    });

    json(res, 200, data);
  } catch (error) {
    handleError(res, error);
  }
};
