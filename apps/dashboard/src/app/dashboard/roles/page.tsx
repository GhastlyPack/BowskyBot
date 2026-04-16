import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function RolesPage() {
  let roles: any[] = [];
  let error = "";

  try {
    const serversRes = await api.servers.list();
    const serverId = serversRes.data[0]?.id;
    if (serverId) {
      const res = await api.roles.list(serverId);
      roles = res.data;
    }
  } catch (e: any) {
    error = e.message;
  }

  const managedRoles = roles.filter((r: any) => r.isManaged);
  const customRoles = roles.filter((r: any) => !r.isManaged);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Roles</h1>
          <p className="text-sm text-muted-foreground">{roles.length} roles total</p>
        </div>
      </div>

      {error && (
        <Card className="mb-4">
          <CardContent className="p-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Custom Roles ({customRoles.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {customRoles.map((role: any) => (
                <div key={role.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full border border-border"
                      style={{ backgroundColor: role.color === "#000000" ? "#333" : role.color }}
                    />
                    <span className="font-medium text-sm">{role.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{role.memberCount.toLocaleString()}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bot / Managed Roles ({managedRoles.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {managedRoles.map((role: any) => (
                <div key={role.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full border border-border"
                      style={{ backgroundColor: role.color === "#000000" ? "#333" : role.color }}
                    />
                    <span className="font-medium text-sm">{role.name}</span>
                    <Badge variant="outline" className="text-xs">bot</Badge>
                  </div>
                  <Badge variant="secondary">{role.memberCount}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
