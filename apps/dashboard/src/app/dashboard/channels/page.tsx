"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const TYPE_NAMES: Record<number, string> = {
  0: "text", 2: "voice", 4: "category", 5: "announcement", 13: "stage", 15: "forum",
};
const TYPE_ICONS: Record<number, string> = {
  0: "#", 2: "🔊", 5: "📣", 13: "📡", 15: "📋",
};

export default function ChannelsPage() {
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/servers/channels")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setChannels(json.data);
        else setError(json.error);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const categories = channels
    .filter((c) => c.type === 4)
    .sort((a, b) => a.position - b.position);

  const uncategorized = channels.filter((c) => c.type !== 4 && !c.parentId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-muted-foreground">Loading channels...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Channels</h1>
          <p className="text-sm text-muted-foreground">
            {channels.filter((c) => c.type !== 4).length} channels in {categories.length} categories
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
                {uncategorized.map((ch) => (
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

        {categories.map((cat) => {
          const children = channels
            .filter((c) => c.parentId === cat.id)
            .sort((a, b) => a.position - b.position);

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
                  {children.map((ch) => (
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
