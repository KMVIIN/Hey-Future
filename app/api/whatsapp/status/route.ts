import { NextResponse } from "next/server";
export async function GET(){return NextResponse.json({configured:Boolean(process.env.WHATSAPP_ACCESS_TOKEN&&process.env.WHATSAPP_PHONE_NUMBER_ID)})}
