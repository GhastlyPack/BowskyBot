import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const TYPE_NAMES: Record<number, string> = {
  0: "text",
  2: "voice",
  4: "category",
  5: "announcement",
  13: "stage",
  15: "forum",
};

const TYPE_ICONS: Record<number, string> = {
  0: "#",
  2: "🔊",
  5: "📣",
  13: "📡",
  15: "📋",
};

export default async function ChannelsPage() {
  let channels: any[] = [];
  let error = "";

  try {
    const serversRes = await api.servers.list();
    const serverId = serversRes.data[0]?.id;
    if (serverId) {
      const res = await api.channels.list(serverId);
      channels = res.data;
    }
  } catch (e: any) {
    error = e.message;
  }

  const categories = channels
    .filter((c: any) => c.type === 4)
    .sort((a: any, b: any) => a.position - b.position);

  const uncategorized = channels.filter(
    (c: any) => c.type !== 4 && !c.parentId
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Channels</h1>
          <p className="text-sm text-muted-foreground">
            {channels.filter((c: any) => c.type !== 4).length} channels in {categories.length} categories
          </p>
        </div>
      </div>

      {error && (
        <Card className="mb-4">
          <CardContent className="p-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {uncategorized.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
                Uncategorized
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {uncategorized.map((ch: any) => (
                  <div key={ch.id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50">
                    <span className="text-muted-foreground w-5">{TYPE_ICONS[ch.type] || "#"}</span>
                    <span className="text-sm">{ch.name}</span>
                    <Badge variant="outline" className="text-xs ml-auto">{TYPE_NAMES[ch.type] || "?"}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {categories.map((cat: any) => {
          const children = channels
            .filter((c: any) => c.parentId === cat.id)
            .sort((a: any, b: any) => a.position - b.position);

          return (
            <Card key={cat.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>{cat.name}</span>
                  <Badge variant="secondary" className="text-xs">{children.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {children.map((ch: any) => (
                    <div key={ch.id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50">
                      <span className="text-muted-foreground w-5">{TYPE_ICONS[ch.type] || "#"}</span>
                      <span className="text-sm">{ch.name}</span>
                      <Badge variant="outline" className="text-xs ml-auto">{TYPE_NAMES[ch.type] || "?"}</Badge>
                    </div>
                  ))}
                  {children.length === 0 && (
                    <p className="text-sm text-muted-foreground py-2">Empty category</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
