import { NextRequest, NextResponse } from "next/server";
import { botApi } from "@/lib/api";

const GUILD_ID = process.env.DISCORD_GUILD_ID || "1055579007107727441";

export async function POST(req: NextRequest) {
  try {
    const { memberId, roleId, action } = await req.json();
    if (!memberId || !roleId || !action) {
      return NextResponse.json({ success: false, error: "memberId, roleId, action required" }, { status: 400 });
    }
    const res = await botApi(`/api/v1/servers/${GUILD_ID}/members/${memberId}/roles`, {
      method: "PATCH",
      body: { roleId, action },
    });
    return NextResponse.json(res);
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
