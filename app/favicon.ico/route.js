import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.redirect(new URL("/icon.svg", "http://localhost"), 307);
}
