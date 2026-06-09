const { getBody, handleError, json, methodGuard, phoneDigits, requestMsgowl } = require('./_msgowl');

module.exports = async function handler(req, res) {
  if (methodGuard(req, res)) return;

  try {
    const body = getBody(req);
    const phoneNumber = phoneDigits(body.phone_number || body.phoneNumber || body.phone);

    if (phoneNumber.length < 6) {
      return json(res, 400, { error: 'Enter a valid mobile number.' });
    }

    const data = await requestMsgowl('/send', {
      phone_number: phoneNumber,
      code_length: 6,
    });

    json(res, 200, data);
  } catch (error) {
    handleError(res, error);
  }
};
