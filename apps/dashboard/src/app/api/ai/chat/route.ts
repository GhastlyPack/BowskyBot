import { NextRequest, NextResponse } from "next/server";
import { botApi } from "@/lib/api";

const GUILD_ID = process.env.DISCORD_GUILD_ID || "1055579007107727441";

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    if (!message) {
      return NextResponse.json({ success: false, error: "message is required" }, { status: 400 });
    }

    // For now, proxy to the bot API's ai/chat endpoint
    // This will be implemented in Phase 7 — for now return a placeholder
    const result = await botApi(`/api/v1/servers/${GUILD_ID}/ai/chat`, {
      method: "POST",
      body: { message },
    });

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message || "AI chat request failed" },
      { status: 500 }
    );
  }
}
