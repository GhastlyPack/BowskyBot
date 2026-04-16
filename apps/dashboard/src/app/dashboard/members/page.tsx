"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function MembersPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const pageSize = 50;

  async function fetchMembers(p = page, s = search) {
    setLoading(true);
    try {
      const res = await fetch(`/api/servers/members?page=${p}&pageSize=${pageSize}&search=${encodeURIComponent(s)}`);
      const json = await res.json();
      if (json.success) {
        setMembers(json.data);
        setTotal(json.total);
        setError("");
      } else {
        setError(json.error);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMembers();
  }, []);

  function handleSearch() {
    setPage(1);
    fetchMembers(1, search);
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Members</h1>
          <p className="text-sm text-muted-foreground">{total.toLocaleString()} total members</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <Input
          placeholder="Search by username..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
          className="max-w-sm"
        />
        <Button variant="outline" onClick={handleSearch}>Search</Button>
      </div>

      {error && (
        <Card className="mb-4">
          <CardContent className="p-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <p className="text-muted-foreground">Loading members...</p>
        </div>
      ) : (
        <>
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
                          <img src={member.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
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
                            <Badge variant="secondary" className="text-xs">+{member.roles.length - 5}</Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : "Unknown"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => { setPage(page - 1); fetchMembers(page - 1, search); }}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => { setPage(page + 1); fetchMembers(page + 1, search); }}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
