import { otpErrorResponse, phoneDigits, requestMsgowl } from "@/lib/msgowl-server";

export async function POST(request) {
  try {
    const body = await request.json();
    const phoneNumber = phoneDigits(body.phone_number || body.phoneNumber || body.phone);
    const code = String(body.code || "").replace(/\D/g, "");

    if (phoneNumber.length < 6) {
      return Response.json({ error: "Enter a valid mobile number." }, { status: 400 });
    }

    if (code.length < 4) {
      return Response.json({ error: "Enter the OTP code." }, { status: 400 });
    }

    const data = await requestMsgowl("/verify", {
      phone_number: phoneNumber,
      code,
    });

    return Response.json(data);
  } catch (error) {
    return otpErrorResponse(error);
  }
}
