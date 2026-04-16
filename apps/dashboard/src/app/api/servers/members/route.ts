import { NextRequest, NextResponse } from "next/server";
import { botApi } from "@/lib/api";

const GUILD_ID = process.env.DISCORD_GUILD_ID || "1055579007107727441";

export async function GET(req: NextRequest) {
  try {
    const page = req.nextUrl.searchParams.get("page") || "1";
    const pageSize = req.nextUrl.searchParams.get("pageSize") || "50";
    const search = req.nextUrl.searchParams.get("search") || "";
    const res = await botApi(
      `/api/v1/servers/${GUILD_ID}/members?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(search)}`
    );
    return NextResponse.json(res);
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
