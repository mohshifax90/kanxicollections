const { getBody, handleError, json, methodGuard, phoneDigits, requestMsgowl } = require('./_msgowl');

module.exports = async function handler(req, res) {
  if (methodGuard(req, res)) return;

  try {
    const body = getBody(req);
    const phoneNumber = phoneDigits(body.phone_number || body.phoneNumber || body.phone);
    const id = Number(body.id);

    if (phoneNumber.length < 6) {
      return json(res, 400, { error: 'Enter a valid mobile number.' });
    }

    if (!Number.isFinite(id) || id <= 0) {
      return json(res, 400, { error: 'OTP request ID is missing.' });
    }

    const data = await requestMsgowl('/resend', {
      phone_number: phoneNumber,
      id,
    });

    json(res, 200, data);
  } catch (error) {
    handleError(res, error);
  }
};
