import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function MembersPage() {
  let members: any[] = [];
  let total = 0;
  let error = "";

  try {
    const serversRes = await api.servers.list();
    const serverId = serversRes.data[0]?.id;
    if (serverId) {
      const res = await api.members.list(serverId, 1, 100);
      members = res.data;
      total = res.total;
    }
  } catch (e: any) {
    error = e.message;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Members</h1>
          <p className="text-sm text-muted-foreground">{total.toLocaleString()} total members</p>
        </div>
      </div>

      {error && (
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Member</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Roles</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Joined</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member: any) => (
                <tr key={member.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={member.avatarUrl}
                        alt=""
                        className="w-8 h-8 rounded-full"
                      />
                      <div>
                        <p className="text-sm font-medium">{member.displayName}</p>
                        <p className="text-xs text-muted-foreground">{member.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {member.roles.slice(0, 5).map((role: any) => (
                        <Badge
                          key={role.id}
                          variant="secondary"
                          className="text-xs"
                          style={{
                            borderColor: role.color === "#000000" ? undefined : role.color,
                            borderWidth: role.color !== "#000000" ? 1 : undefined,
                          }}
                        >
                          {role.name}
                        </Badge>
                      ))}
                      {member.roles.length > 5 && (
                        <Badge variant="secondary" className="text-xs">
                          +{member.roles.length - 5}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {member.joinedAt
                      ? new Date(member.joinedAt).toLocaleDateString()
                      : "Unknown"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
