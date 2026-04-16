"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowsRotate,
  faUsers,
  faCrown,
  faGem,
  faShieldHalved,
  faUserPlus,
  faBullhorn,
  faCircle,
} from "@fortawesome/free-solid-svg-icons";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Announce form
  const [announceChannel, setAnnounceChannel] = useState("");
  const [announceTitle, setAnnounceTitle] = useState("");
  const [announceBody, setAnnounceBody] = useState("");
  const [announcing, setAnnouncing] = useState(false);
  const [announceResult, setAnnounceResult] = useState("");

  async function fetchData(refresh = false) {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      const res = await fetch(`/api/servers/overview${refresh ? "?refresh=true" : ""}`);
      const json = await res.json();
      if (json.success) { setData(json.data); setError(""); }
      else setError(json.error);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }

  async function sendAnnouncement() {
    if (!announceChannel || !announceTitle || !announceBody) return;
    setAnnouncing(true);
    setAnnounceResult("");
    try {
      const res = await fetch("/api/servers/announce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: announceChannel, title: announceTitle, body: announceBody }),
      });
      const json = await res.json();
      if (json.success) {
        setAnnounceResult("Sent!");
        setAnnounceTitle("");
        setAnnounceBody("");
      } else {
        setAnnounceResult(`Error: ${json.error}`);
      }
    } catch (e: any) { setAnnounceResult(`Error: ${e.message}`); }
    finally { setAnnouncing(false); }
  }

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <Card><CardContent className="p-6"><p className="text-destructive">Failed to connect: {error}</p></CardContent></Card>
      </div>
    );
  }

  const server = data?.server;
  const members = data?.analysis?.members;
  const tiers = data?.tierBreakdown;
  const schedules = data?.schedules || [];
  const channels = data?.analysis?.categories?.flatMap((c: any) => c.channels) || [];
  const textChannels = channels.filter((c: any) => c.type === "text" || c.type === "announcement");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {server?.iconUrl && <img src={server.iconUrl} alt="" className="w-12 h-12 rounded-full" />}
          <div>
            <h1 className="text-2xl font-bold">{server?.name}</h1>
            <p className="text-sm text-muted-foreground">Command Center</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchData(true)} disabled={refreshing}>
          <FontAwesomeIcon icon={faArrowsRotate} className={`w-3 h-3 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {/* Tier Breakdown — the most important metric */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Membership Breakdown</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <FontAwesomeIcon icon={faUsers} className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Total Humans</span>
              </div>
              <p className="text-2xl font-bold">{tiers?.totalHumans?.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <FontAwesomeIcon icon={faCrown} className="w-3.5 h-3.5 text-yellow-500" />
                <span className="text-xs text-muted-foreground">OG Members</span>
              </div>
              <p className="text-2xl font-bold text-yellow-500">{tiers?.og?.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <FontAwesomeIcon icon={faGem} className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs text-muted-foreground">Blueprint</span>
              </div>
              <p className="text-2xl font-bold text-blue-400">{tiers?.blueprint?.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <FontAwesomeIcon icon={faGem} className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-xs text-muted-foreground">Boardroom</span>
              </div>
              <p className="text-2xl font-bold text-purple-400">{tiers?.boardroom?.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <FontAwesomeIcon icon={faShieldHalved} className="w-3.5 h-3.5 text-green-400" />
                <span className="text-xs text-muted-foreground">Management</span>
              </div>
              <p className="text-2xl font-bold text-green-400">{tiers?.management}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Live Status + Quick Announce */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FontAwesomeIcon icon={faCircle} className="w-2 h-2 text-green-500 animate-pulse" />
              Live Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Online</span>
                <span className="text-green-400 font-medium">{members?.online}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Idle</span>
                <span className="text-yellow-400 font-medium">{members?.idle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">DND</span>
                <span className="text-red-400 font-medium">{members?.dnd}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Offline</span>
                <span>{members?.offline?.toLocaleString()}</span>
              </div>
              <div className="border-t border-border pt-3 flex justify-between">
                <span className="text-muted-foreground">Boost Level</span>
                <span>{data?.analysis?.server?.boostLevel} ({data?.analysis?.server?.boostCount} boosts)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active Schedules</span>
                <span>{schedules.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Announce */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FontAwesomeIcon icon={faBullhorn} className="w-3.5 h-3.5" />
              Quick Announce
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <select
                value={announceChannel}
                onChange={(e) => setAnnounceChannel(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm"
              >
                <option value="">Select channel...</option>
                {textChannels.map((ch: any) => (
                  <option key={ch.id} value={ch.id}>#{ch.name}</option>
                ))}
              </select>
              <Input
                placeholder="Announcement title"
                value={announceTitle}
                onChange={(e) => setAnnounceTitle(e.target.value)}
              />
              <Textarea
                placeholder="Announcement body..."
                value={announceBody}
                onChange={(e) => setAnnounceBody(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <div className="flex items-center justify-between">
                <Button
                  size="sm"
                  onClick={sendAnnouncement}
                  disabled={announcing || !announceChannel || !announceTitle || !announceBody}
                >
                  {announcing ? "Sending..." : "Send Announcement"}
                </Button>
                {announceResult && (
                  <span className={`text-xs ${announceResult.startsWith("Error") ? "text-destructive" : "text-green-400"}`}>
                    {announceResult}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Schedules */}
      {schedules.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Active Schedules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {schedules.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-sm">{s.title}</span>
                    <Badge variant={s.tier === "boardroom" ? "default" : "secondary"} className="text-xs">{s.tier}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground capitalize">
                    {s.recurrence} &middot; {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][s.dayOfWeek]} {String(s.hour).padStart(2,"0")}:{String(s.minute).padStart(2,"0")} UTC
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
