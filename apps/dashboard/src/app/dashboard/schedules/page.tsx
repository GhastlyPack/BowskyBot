import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function SchedulesPage() {
  let schedules: any[] = [];
  let error = "";

  try {
    const serversRes = await api.servers.list();
    const serverId = serversRes.data[0]?.id;
    if (serverId) {
      const res = await api.schedules.list(serverId);
      schedules = res.data;
    }
  } catch (e: any) {
    error = e.message;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Call Schedules</h1>
          <p className="text-sm text-muted-foreground">{schedules.length} active schedules</p>
        </div>
      </div>

      {error && (
        <Card className="mb-4">
          <CardContent className="p-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {schedules.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">No schedules configured yet.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Use <code className="bg-muted px-1.5 py-0.5 rounded">/schedule create</code> in Discord
              or the API to create call schedules.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {schedules.map((schedule: any) => (
            <Card key={schedule.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{schedule.title}</CardTitle>
                  <Badge variant={schedule.tier === "boardroom" ? "default" : "secondary"}>
                    {schedule.tier}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Recurrence</span>
                    <span className="capitalize">{schedule.recurrence}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Day</span>
                    <span>{DAY_NAMES[schedule.dayOfWeek]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time (UTC)</span>
                    <span>
                      {String(schedule.hour).padStart(2, "0")}:
                      {String(schedule.minute).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration</span>
                    <span>{schedule.durationMin} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ID</span>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{schedule.id}</code>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
