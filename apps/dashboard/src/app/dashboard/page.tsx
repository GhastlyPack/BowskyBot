import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  let servers: any[] = [];
  let analysis: any = null;
  let error = "";

  try {
    const res = await api.servers.list();
    servers = res.data;
    if (servers.length > 0) {
      const analysisRes = await api.servers.analysis(servers[0].id);
      analysis = analysisRes.data;
    }
  } catch (e: any) {
    error = e.message;
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">Failed to connect to bot API: {error}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Make sure the bot is running and the API is accessible.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const server = servers[0];
  const members = analysis?.members;
  const channelStats = analysis?.channelStats;

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        {server.iconUrl && (
          <img src={server.iconUrl} alt="" className="w-12 h-12 rounded-full" />
        )}
        <div>
          <h1 className="text-2xl font-bold">{server.name}</h1>
          <p className="text-sm text-muted-foreground">Server Overview</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Members</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{members?.total?.toLocaleString() || "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {members?.humans?.toLocaleString()} humans, {members?.bots} bots
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Online Now</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-500">{members?.online || "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {members?.idle} idle, {members?.dnd} DND
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Channels</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{channelStats?.totalChannels || "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {channelStats?.textChannels} text, {channelStats?.voiceChannels} voice
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{analysis?.roles?.length || "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Boost Level {analysis?.server?.boostLevel || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysis?.roles
                ?.filter((r: any) => !r.isEveryone && !r.isManaged && r.memberCount > 0)
                .slice(0, 10)
                .map((role: any) => (
                  <div key={role.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: role.color === "#000000" ? "#666" : role.color }}
                      />
                      <span className="text-sm font-medium">{role.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {role.memberCount.toLocaleString()}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Server Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Server ID</span>
                <span className="font-mono">{server.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{new Date(analysis?.server?.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Boost Level</span>
                <span>{analysis?.server?.boostLevel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Boosts</span>
                <span>{analysis?.server?.boostCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Categories</span>
                <span>{channelStats?.categories}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
