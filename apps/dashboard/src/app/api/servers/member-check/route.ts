import { NextRequest, NextResponse } from "next/server";
import { botApi } from "@/lib/api";

const GUILD_ID = process.env.DISCORD_GUILD_ID || "1055579007107727441";
const MANAGEMENT_ROLE_ID = "1055588570435424316";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ success: false, error: "userId required" }, { status: 400 });
  }

  try {
    const res = await botApi(`/api/v1/servers/${GUILD_ID}/members/${userId}`);
    const member = res.data;
    const hasManagement = member.roles.some((r: any) => r.id === MANAGEMENT_ROLE_ID);

    return NextResponse.json({
      success: true,
      data: {
        authorized: hasManagement,
        displayName: member.displayName,
        avatarUrl: member.avatarUrl,
      },
    });
  } catch {
    return NextResponse.json({
      success: true,
      data: { authorized: false },
    });
  }
}
