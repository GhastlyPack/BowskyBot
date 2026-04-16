import { NextRequest, NextResponse } from "next/server";
import { botApi } from "@/lib/api";

const GUILD_ID = process.env.DISCORD_GUILD_ID || "1055579007107727441";

export async function GET(req: NextRequest) {
  try {
    const refresh = req.nextUrl.searchParams.get("refresh") === "true";
    const url = `/api/v1/servers/${GUILD_ID}/analysis${refresh ? "?refresh=true" : ""}`;
    const [serversRes, analysisRes, rolesRes, schedulesRes] = await Promise.all([
      botApi(`/api/v1/servers/${GUILD_ID}`),
      botApi(url),
      botApi(`/api/v1/servers/${GUILD_ID}/roles`),
      botApi(`/api/v1/servers/${GUILD_ID}/schedules`),
    ]);

    // Compute tier breakdown from roles
    const roles = rolesRes.data || [];
    const tierBreakdown = {
      og: roles.find((r: any) => r.name === "OG Member")?.memberCount || 0,
      blueprint: roles.find((r: any) => r.name === "Blueprint")?.memberCount || 0,
      boardroom: roles.find((r: any) => r.name === "Boardroom")?.memberCount || 0,
      management: roles.find((r: any) => r.name === "Management")?.memberCount || 0,
    };

    const totalHumans = analysisRes.data?.members?.humans || 0;
    const totalPaid = tierBreakdown.blueprint + tierBreakdown.boardroom;
    const totalUnpaid = totalHumans - tierBreakdown.og - totalPaid;

    return NextResponse.json({
      success: true,
      data: {
        server: serversRes.data,
        analysis: analysisRes.data,
        tierBreakdown: { ...tierBreakdown, unpaid: Math.max(0, totalUnpaid), totalHumans },
        schedules: schedulesRes.data || [],
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message },
      { status: 500 }
    );
  }
}
