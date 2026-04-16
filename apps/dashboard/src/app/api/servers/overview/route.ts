import { NextRequest, NextResponse } from "next/server";
import { botApi } from "@/lib/api";

const GUILD_ID = process.env.DISCORD_GUILD_ID || "1055579007107727441";

export async function GET(req: NextRequest) {
  try {
    const refresh = req.nextUrl.searchParams.get("refresh") === "true";
    const url = `/api/v1/servers/${GUILD_ID}/analysis${refresh ? "?refresh=true" : ""}`;
    const [serversRes, analysisRes] = await Promise.all([
      botApi(`/api/v1/servers/${GUILD_ID}`),
      botApi(url),
    ]);
    return NextResponse.json({
      success: true,
      data: { server: serversRes.data, analysis: analysisRes.data },
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message },
      { status: 500 }
    );
  }
}
