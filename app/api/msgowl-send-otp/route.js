import { otpErrorResponse, phoneDigits, requestMsgowl } from "@/lib/msgowl-server";

export async function POST(request) {
  try {
    const body = await request.json();
    const phoneNumber = phoneDigits(body.phone_number || body.phoneNumber || body.phone);

    if (phoneNumber.length < 6) {
      return Response.json({ error: "Enter a valid mobile number." }, { status: 400 });
    }

    const data = await requestMsgowl("/send", {
      phone_number: phoneNumber,
      code_length: 6,
    });

    return Response.json(data);
  } catch (error) {
    return otpErrorResponse(error);
  }
}
