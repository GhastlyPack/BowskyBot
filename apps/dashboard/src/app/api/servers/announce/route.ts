import { NextRequest, NextResponse } from "next/server";
import { botApi } from "@/lib/api";

const GUILD_ID = process.env.DISCORD_GUILD_ID || "1055579007107727441";

export async function POST(req: NextRequest) {
  try {
    const { channelId, title, body } = await req.json();
    if (!channelId || !title || !body) {
      return NextResponse.json({ success: false, error: "channelId, title, and body required" }, { status: 400 });
    }
    const res = await botApi(`/api/v1/servers/${GUILD_ID}/announce`, {
      method: "POST",
      body: { channelId, title, body },
    });
    return NextResponse.json(res);
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
