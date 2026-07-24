import { NextResponse } from "next/server";
import {
  DIVISIONS,
  PAYMENT_TERMS,
  ENQUIRY_SOURCES,
  ENQUIRY_GENERATED_BY,
} from "@/constants/masterData";
import { TERMS_OF_DELIVERY_OPTIONS } from "@/lib/constants/quotationOptions";

export const dynamic = "force-dynamic";

const LOCATIONS = [
  { value: "Raipur", label: "Raipur" },
  { value: "Raigarh", label: "Raigarh" },
  { value: "Ambikapur", label: "Ambikapur" },
  { value: "Satna", label: "Satna" },
];

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: {
        divisions: DIVISIONS,
        paymentTerms: PAYMENT_TERMS,
        deliveryTerms: TERMS_OF_DELIVERY_OPTIONS,
        enquirySources: ENQUIRY_SOURCES,
        locations: LOCATIONS,
        engineers: ENQUIRY_GENERATED_BY,
      },
    });
  } catch (error) {
    console.error("[master] Error:", error.message);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch master data.",
        data: {
          divisions: [],
          paymentTerms: [],
          deliveryTerms: [],
          enquirySources: [],
          locations: [],
          engineers: [],
        },
      },
      { status: 500 }
    );
  }
}
