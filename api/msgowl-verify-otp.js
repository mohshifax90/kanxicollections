const { getBody, handleError, json, methodGuard, phoneDigits, requestMsgowl } = require('./_msgowl');

module.exports = async function handler(req, res) {
  if (methodGuard(req, res)) return;

  try {
    const body = getBody(req);
    const phoneNumber = phoneDigits(body.phone_number || body.phoneNumber || body.phone);
    const code = String(body.code || '').replace(/\D/g, '');

    if (phoneNumber.length < 6) {
      return json(res, 400, { error: 'Enter a valid mobile number.' });
    }

    if (code.length < 4) {
      return json(res, 400, { error: 'Enter the OTP code.' });
    }

    const data = await requestMsgowl('/verify', {
      phone_number: phoneNumber,
      code,
    });

    json(res, 200, data);
  } catch (error) {
    handleError(res, error);
  }
};
