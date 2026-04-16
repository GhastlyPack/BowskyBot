import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { botApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const GUILD_ID = process.env.DISCORD_GUILD_ID || "1055579007107727441";
const MANAGEMENT_ROLE_ID = "1055588570435424316";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/");

  const discordId = (session as any).discordId;

  // Check if user has Management role
  let authorized = false;
  try {
    if (discordId) {
      const res = await botApi(`/api/v1/servers/${GUILD_ID}/members/${discordId}`);
      authorized = res.data.roles.some((r: any) => r.id === MANAGEMENT_ROLE_ID);
    }
  } catch {
    // Member not found or API error — deny access
  }

  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-[450px]">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              You need the <strong>Management</strong> role in the BOWSKY server to access this dashboard.
            </p>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <Button type="submit" variant="outline">Sign Out</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}
