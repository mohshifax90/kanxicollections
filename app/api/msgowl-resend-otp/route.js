import { otpErrorResponse, phoneDigits, requestMsgowl } from "@/lib/msgowl-server";

export async function POST(request) {
  try {
    const body = await request.json();
    const phoneNumber = phoneDigits(body.phone_number || body.phoneNumber || body.phone);
    const requestId = Number(body.id || body.request_id || body.requestId);

    if (phoneNumber.length < 6) {
      return Response.json({ error: "Enter a valid mobile number." }, { status: 400 });
    }

    if (!Number.isFinite(requestId) || requestId <= 0) {
      return Response.json({ error: "OTP request ID is missing." }, { status: 400 });
    }

    const data = await requestMsgowl("/resend", {
      phone_number: phoneNumber,
      id: requestId,
    });

    return Response.json(data);
  } catch (error) {
    return otpErrorResponse(error);
  }
}
