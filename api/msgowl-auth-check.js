const { json, methodGuard, handleError } = require('./_msgowl');

async function probe(url, options = {}) {
  const accessKey = process.env.MSGOWL_ACCESS_KEY;
  if (!accessKey) {
    return { ok: false, status: 500, error: 'MSGOWL_ACCESS_KEY is not configured.' };
  }

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      Authorization: `AccessKey ${accessKey}`,
      'Content-Type': 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

module.exports = async function handler(req, res) {
  if (methodGuard(req, res)) return;

  try {
    const rest = await probe('https://rest.msgowl.com/balance');
    const otp = await probe('https://otp.msgowl.com/verify', {
      method: 'POST',
      body: { phone_number: '9600000000', code: '123456' },
    });

    json(res, 200, {
      hasKey: Boolean(process.env.MSGOWL_ACCESS_KEY),
      rest,
      otp,
      note: 'Temporary MsgOwl auth check route. Remove after debugging.',
    });
  } catch (error) {
    handleError(res, error);
  }
};
