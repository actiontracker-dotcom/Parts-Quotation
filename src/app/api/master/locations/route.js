import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const LOCATIONS = [
  { value: "Raipur", label: "Raipur" },
  { value: "Raigarh", label: "Raigarh" },
  { value: "Ambikapur", label: "Ambikapur" },
  { value: "Satna", label: "Satna" },
];

export async function GET() {
  try {
    return NextResponse.json({ success: true, data: LOCATIONS });
  } catch (error) {
    console.error("[master/locations] Error:", error.message);
    return NextResponse.json(
      { success: false, message: "Failed to fetch locations.", data: [] },
      { status: 500 }
    );
  }
}
