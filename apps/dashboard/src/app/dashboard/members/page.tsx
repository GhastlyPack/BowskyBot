"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faUserPlus,
  faUserMinus,
  faCrown,
  faGem,
  faFilter,
} from "@fortawesome/free-solid-svg-icons";

const TIER_ROLES: Record<string, { id: string; color: string }> = {
  "OG Member": { id: "1055591252688638032", color: "text-yellow-500" },
  "Blueprint": { id: "1494089896954957837", color: "text-blue-400" },
  "Boardroom": { id: "1494089898976608418", color: "text-purple-400" },
  "Management": { id: "1055588570435424316", color: "text-green-400" },
};

type TierFilter = "all" | "og" | "blueprint" | "boardroom" | "unpaid";

export default function MembersPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const pageSize = 50;

  const fetchMembers = useCallback(async (p = page, s = search) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/servers/members?page=${p}&pageSize=${pageSize}&search=${encodeURIComponent(s)}`);
      const json = await res.json();
      if (json.success) { setMembers(json.data); setTotal(json.total); setError(""); }
      else setError(json.error);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchMembers(); }, []);

  function getMemberTier(member: any): string {
    const roleNames = member.roles.map((r: any) => r.name);
    if (roleNames.includes("Management")) return "Management";
    if (roleNames.includes("Boardroom")) return "Boardroom";
    if (roleNames.includes("Blueprint")) return "Blueprint";
    if (roleNames.includes("OG Member")) return "OG Member";
    return "None";
  }

  const filteredMembers = members.filter((m) => {
    if (tierFilter === "all") return true;
    const tier = getMemberTier(m);
    if (tierFilter === "og") return tier === "OG Member";
    if (tierFilter === "blueprint") return tier === "Blueprint";
    if (tierFilter === "boardroom") return tier === "Boardroom";
    if (tierFilter === "unpaid") return tier === "None";
    return true;
  });

  async function toggleRole(memberId: string, roleId: string, action: "add" | "remove") {
    setActionLoading(`${memberId}-${roleId}`);
    try {
      await fetch("/api/servers/roles/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, roleId, action }),
      });
      await fetchMembers(page, search);
    } catch { /* silently fail */ }
    finally { setActionLoading(null); }
  }

  function handleSearch() { setPage(1); fetchMembers(1, search); }
  const totalPages = Math.ceil(total / pageSize);

  const tierCounts = {
    all: members.length,
    og: members.filter(m => getMemberTier(m) === "OG Member").length,
    blueprint: members.filter(m => getMemberTier(m) === "Blueprint").length,
    boardroom: members.filter(m => getMemberTier(m) === "Boardroom").length,
    unpaid: members.filter(m => getMemberTier(m) === "None").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Members</h1>
        <p className="text-sm text-muted-foreground">{total.toLocaleString()} total members</p>
      </div>

      {/* Search + Tier Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 flex-1">
          <Input
            placeholder="Search by username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
            className="max-w-sm"
          />
          <Button variant="outline" size="sm" onClick={handleSearch}>
            <FontAwesomeIcon icon={faSearch} className="w-3 h-3" />
          </Button>
        </div>
        <div className="flex gap-1.5">
          {([
            ["all", "All", null],
            ["og", "OG", "text-yellow-500"],
            ["blueprint", "Blueprint", "text-blue-400"],
            ["boardroom", "Boardroom", "text-purple-400"],
            ["unpaid", "No Tier", null],
          ] as const).map(([key, label, color]) => (
            <Button
              key={key}
              variant={tierFilter === key ? "default" : "outline"}
              size="sm"
              onClick={() => setTierFilter(key as TierFilter)}
              className="text-xs"
            >
              {label}
              <span className="ml-1 opacity-60">{tierCounts[key as keyof typeof tierCounts]}</span>
            </Button>
          ))}
        </div>
      </div>

      {error && (
        <Card><CardContent className="p-6"><p className="text-destructive">{error}</p></CardContent></Card>
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
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Member</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Tier</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Joined</th>
                    <th className="text-right p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member) => {
                    const tier = getMemberTier(member);
                    const tierInfo = TIER_ROLES[tier];
                    const hasBlueprint = member.roles.some((r: any) => r.name === "Blueprint");
                    const hasBoardroom = member.roles.some((r: any) => r.name === "Boardroom");

                    return (
                      <tr key={member.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <img src={member.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
                            <div>
                              <p className="text-sm font-medium">{member.displayName}</p>
                              <p className="text-xs text-muted-foreground">@{member.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`text-sm font-medium ${tierInfo?.color || "text-muted-foreground"}`}>
                            {tier}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : "—"}
                        </td>
                        <td className="p-4">
                          <div className="flex justify-end gap-1.5">
                            {!hasBlueprint && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-7"
                                disabled={actionLoading === `${member.id}-${TIER_ROLES.Blueprint.id}`}
                                onClick={() => toggleRole(member.id, TIER_ROLES.Blueprint.id, "add")}
                              >
                                <FontAwesomeIcon icon={faUserPlus} className="w-2.5 h-2.5 mr-1 text-blue-400" />
                                Blueprint
                              </Button>
                            )}
                            {hasBlueprint && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-7 text-blue-400"
                                disabled={actionLoading === `${member.id}-${TIER_ROLES.Blueprint.id}`}
                                onClick={() => toggleRole(member.id, TIER_ROLES.Blueprint.id, "remove")}
                              >
                                <FontAwesomeIcon icon={faUserMinus} className="w-2.5 h-2.5 mr-1" />
                                Blueprint
                              </Button>
                            )}
                            {!hasBoardroom && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-7"
                                disabled={actionLoading === `${member.id}-${TIER_ROLES.Boardroom.id}`}
                                onClick={() => toggleRole(member.id, TIER_ROLES.Boardroom.id, "add")}
                              >
                                <FontAwesomeIcon icon={faUserPlus} className="w-2.5 h-2.5 mr-1 text-purple-400" />
                                Boardroom
                              </Button>
                            )}
                            {hasBoardroom && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-7 text-purple-400"
                                disabled={actionLoading === `${member.id}-${TIER_ROLES.Boardroom.id}`}
                                onClick={() => toggleRole(member.id, TIER_ROLES.Boardroom.id, "remove")}
                              >
                                <FontAwesomeIcon icon={faUserMinus} className="w-2.5 h-2.5 mr-1" />
                                Boardroom
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1}
                onClick={() => { setPage(page - 1); fetchMembers(page - 1, search); }}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages}
                onClick={() => { setPage(page + 1); fetchMembers(page + 1, search); }}>Next</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
