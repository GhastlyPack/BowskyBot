"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function RolesPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/servers/roles")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setRoles(json.data);
        else setError(json.error);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const managedRoles = roles.filter((r) => r.isManaged);
  const customRoles = roles.filter((r) => !r.isManaged);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-muted-foreground">Loading roles...</p>
      </div>
    );
  }

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
              {customRoles.map((role) => (
                <div key={role.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full border border-border"
                      style={{ backgroundColor: role.color === "#000000" ? "#333" : role.color }}
                    />
                    <span className="font-medium text-sm">{role.name}</span>
                  </div>
                  <Badge variant="secondary">{role.memberCount.toLocaleString()}</Badge>
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
              {managedRoles.map((role) => (
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
