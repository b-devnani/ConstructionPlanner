import React, { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  DailyLog, ManpowerEntry, InsertManpowerEntry, WEATHER_CONDITIONS,
} from "@shared/procore";
import {
  PageHeader, TextField, SelectField, TextAreaField, FormField, EmptyState,
} from "@/components/procore/shared";
import { AttachmentsSection } from "@/components/procore/AttachmentsSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { formatDate, todayString } from "@/lib/format";

function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const next = new Date(y, m - 1, d + days);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
}

const emptyManpowerRow = { contractor: "", workers: 0, hours: 0, location: "", comments: "" };

export default function DailyLogPage() {
  const { toast } = useToast();
  const [logDate, setLogDate] = useState(todayString());
  const [draft, setDraft] = useState<DailyLog | null>(null);
  const [newRow, setNewRow] = useState({ ...emptyManpowerRow });

  const logKey = `/api/daily-logs/by-date/${logDate}`;
  const logQuery = useQuery<DailyLog | null>({
    queryKey: [logKey],
    queryFn: async () => {
      const res = await fetch(logKey, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
  });
  const log = logQuery.data ?? null;

  // Keep an editable draft in sync with the fetched log
  useEffect(() => { setDraft(log); }, [log]);

  const manpowerKey = log ? `/api/daily-logs/${log.id}/manpower` : null;
  const manpowerQuery = useQuery<ManpowerEntry[]>({
    queryKey: [manpowerKey ?? "manpower-none"],
    enabled: !!manpowerKey,
  });
  const manpower = manpowerQuery.data ?? [];

  const onError = (error: Error) =>
    toast({ title: "Request failed", description: error.message, variant: "destructive" });

  const createLog = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/daily-logs", {
        logDate, weatherConditions: "Clear", tempHigh: null, tempLow: null,
        precipitation: "", windSpeed: "", weatherDelay: false,
        notes: "", delays: "", safetyNotes: "", visitors: "", equipmentOnSite: "",
      });
      return (await res.json()) as DailyLog;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [logKey] }),
    onError,
  });

  const saveLog = useMutation({
    mutationFn: async () => {
      if (!draft) return;
      const { id, createdAt, ...data } = draft;
      await apiRequest("PUT", `/api/daily-logs/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [logKey] });
      toast({ title: "Daily log saved" });
    },
    onError,
  });

  const addManpower = useMutation({
    mutationFn: async (data: InsertManpowerEntry) => {
      await apiRequest("POST", "/api/manpower", data);
    },
    onSuccess: () => {
      if (manpowerKey) queryClient.invalidateQueries({ queryKey: [manpowerKey] });
      setNewRow({ ...emptyManpowerRow });
    },
    onError,
  });

  const removeManpower = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/manpower/${id}`);
    },
    onSuccess: () => {
      if (manpowerKey) queryClient.invalidateQueries({ queryKey: [manpowerKey] });
    },
    onError,
  });

  const set = <K extends keyof DailyLog>(key: K) => (value: DailyLog[K]) =>
    setDraft(d => (d ? { ...d, [key]: value } : d));

  const totalWorkers = manpower.reduce((acc, e) => acc + e.workers, 0);
  const totalHours = manpower.reduce((acc, e) => acc + e.hours, 0);

  return (
    <div>
      <PageHeader title="Daily Log" subtitle={formatDate(logDate)}>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => setLogDate(d => shiftDate(d, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Input type="date" className="w-40" value={logDate} onChange={e => e.target.value && setLogDate(e.target.value)} />
          <Button variant="outline" size="icon" onClick={() => setLogDate(d => shiftDate(d, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setLogDate(todayString())}>Today</Button>
        </div>
        {draft && (
          <Button onClick={() => saveLog.mutate()} disabled={saveLog.isPending}>
            Save Log
          </Button>
        )}
      </PageHeader>

      {logQuery.isLoading ? null : !log ? (
        <div className="text-center py-16 border rounded-md">
          <p className="text-muted-foreground mb-4">No daily log exists for {formatDate(logDate)}.</p>
          <Button onClick={() => createLog.mutate()} disabled={createLog.isPending}>
            <Plus className="h-4 w-4 mr-1" /> Create Daily Log
          </Button>
        </div>
      ) : draft && (
        <div className="space-y-6">
          {/* Weather */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Weather</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <SelectField label="Conditions" value={draft.weatherConditions} onChange={set("weatherConditions")} options={WEATHER_CONDITIONS} />
              <FormField label="High (°F)">
                <Input type="number" value={draft.tempHigh ?? ""}
                  onChange={e => set("tempHigh")(e.target.value === "" ? null : parseFloat(e.target.value))} />
              </FormField>
              <FormField label="Low (°F)">
                <Input type="number" value={draft.tempLow ?? ""}
                  onChange={e => set("tempLow")(e.target.value === "" ? null : parseFloat(e.target.value))} />
              </FormField>
              <TextField label="Precipitation" value={draft.precipitation} onChange={set("precipitation")} placeholder="e.g. 0.2 in" />
              <TextField label="Wind" value={draft.windSpeed} onChange={set("windSpeed")} placeholder="e.g. 10 mph" />
              <FormField label="Weather Delay">
                <label className="flex items-center gap-2 h-10 text-sm">
                  <Checkbox checked={draft.weatherDelay} onCheckedChange={v => set("weatherDelay")(v === true)} />
                  Caused delay
                </label>
              </FormField>
            </CardContent>
          </Card>

          {/* Manpower */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Manpower — {totalWorkers} workers / {totalHours} hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contractor</TableHead>
                    <TableHead className="w-24">Workers</TableHead>
                    <TableHead className="w-24">Hours</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Comments</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {manpower.map(entry => (
                    <TableRow key={entry.id}>
                      <TableCell>{entry.contractor}</TableCell>
                      <TableCell>{entry.workers}</TableCell>
                      <TableCell>{entry.hours}</TableCell>
                      <TableCell>{entry.location || "—"}</TableCell>
                      <TableCell>{entry.comments || "—"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                          onClick={() => removeManpower.mutate(entry.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {manpower.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No manpower recorded for this day.
                      </TableCell>
                    </TableRow>
                  )}
                  {/* inline add row */}
                  <TableRow>
                    <TableCell>
                      <Input placeholder="Contractor" value={newRow.contractor}
                        onChange={e => setNewRow(r => ({ ...r, contractor: e.target.value }))} />
                    </TableCell>
                    <TableCell>
                      <Input type="number" value={newRow.workers || ""}
                        onChange={e => setNewRow(r => ({ ...r, workers: parseInt(e.target.value) || 0 }))} />
                    </TableCell>
                    <TableCell>
                      <Input type="number" value={newRow.hours || ""}
                        onChange={e => setNewRow(r => ({ ...r, hours: parseFloat(e.target.value) || 0 }))} />
                    </TableCell>
                    <TableCell>
                      <Input placeholder="Location" value={newRow.location}
                        onChange={e => setNewRow(r => ({ ...r, location: e.target.value }))} />
                    </TableCell>
                    <TableCell>
                      <Input placeholder="Comments" value={newRow.comments}
                        onChange={e => setNewRow(r => ({ ...r, comments: e.target.value }))} />
                    </TableCell>
                    <TableCell>
                      <Button size="icon" className="h-8 w-8"
                        disabled={!newRow.contractor.trim() || addManpower.isPending}
                        onClick={() => addManpower.mutate({ ...newRow, dailyLogId: draft.id })}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Narrative sections */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Work Performed / Notes</CardTitle></CardHeader>
              <CardContent>
                <TextAreaField label="" value={draft.notes} onChange={set("notes")} rows={5} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Delays</CardTitle></CardHeader>
              <CardContent>
                <TextAreaField label="" value={draft.delays} onChange={set("delays")} rows={5} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Safety</CardTitle></CardHeader>
              <CardContent>
                <TextAreaField label="" value={draft.safetyNotes} onChange={set("safetyNotes")} rows={5} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Visitors / Inspections</CardTitle></CardHeader>
              <CardContent>
                <TextAreaField label="" value={draft.visitors} onChange={set("visitors")} rows={5} />
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader className="pb-3"><CardTitle className="text-base">Equipment On Site</CardTitle></CardHeader>
              <CardContent>
                <TextAreaField label="" value={draft.equipmentOnSite} onChange={set("equipmentOnSite")} rows={3} />
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader className="pb-3"><CardTitle className="text-base">Photos &amp; Documents</CardTitle></CardHeader>
              <CardContent>
                <AttachmentsSection entityType="dailyLog" entityId={draft.id} title="Site Photos" />
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
