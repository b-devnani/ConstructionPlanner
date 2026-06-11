import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Drawing, DrawingPin, InsertDrawingPin, Attachment, Rfi, PunchItem, PIN_LINK_TYPES,
} from "@shared/procore";
import { StatusBadge, FormField, TextAreaField } from "@/components/procore/shared";
import { AttachmentsSection } from "@/components/procore/AttachmentsSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, MapPin, Trash2, Plus, Minus, RotateCcw,
} from "lucide-react";
import { formatDate } from "@/lib/format";

const PIN_COLORS: Record<string, string> = {
  rfi: "bg-blue-600",
  punchItem: "bg-red-600",
  note: "bg-amber-500",
};

const PIN_LABELS: Record<string, string> = {
  rfi: "RFI",
  punchItem: "Punch Item",
  note: "Note",
};

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 6;

export default function DrawingViewerPage() {
  const [, params] = useRoute("/drawings/:id");
  const drawingId = parseInt(params?.id ?? "0");

  const drawingQuery = useQuery<Drawing>({ queryKey: [`/api/drawings/${drawingId}`] });
  const pinsKey = `/api/drawings/${drawingId}/pins`;
  const pinsQuery = useQuery<DrawingPin[]>({ queryKey: [pinsKey] });
  const attachmentsQuery = useQuery<Attachment[]>({
    queryKey: [`/api/attachments?entityType=drawing&entityId=${drawingId}`],
  });
  const rfisQuery = useQuery<Rfi[]>({ queryKey: ["/api/rfis"] });
  const punchQuery = useQuery<PunchItem[]>({ queryKey: ["/api/punch-items"] });

  // Pin editor state
  const [pinMode, setPinMode] = useState(false);
  const [draftPin, setDraftPin] = useState<{ x: number; y: number } | null>(null);
  const [draftNote, setDraftNote] = useState("");
  const [draftLinkType, setDraftLinkType] = useState<(typeof PIN_LINK_TYPES)[number]>("note");
  const [draftLinkedId, setDraftLinkedId] = useState<number | null>(null);
  const [selectedPin, setSelectedPin] = useState<DrawingPin | null>(null);

  // Zoom/pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const drawing = drawingQuery.data;
  const pins = pinsQuery.data ?? [];
  const attachments = attachmentsQuery.data ?? [];
  const rfis = rfisQuery.data ?? [];
  const punchItems = punchQuery.data ?? [];

  const sheetFile = useMemo(
    () => attachments.find(a => a.mimeType.startsWith("image/")) ??
      attachments.find(a => a.mimeType === "application/pdf"),
    [attachments],
  );

  const createPin = useMutation({
    mutationFn: async (data: InsertDrawingPin) => {
      const res = await apiRequest("POST", "/api/drawing-pins", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [pinsKey] });
      setDraftPin(null); setDraftNote(""); setDraftLinkedId(null);
      setPinMode(false);
    },
  });
  const deletePin = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/drawing-pins/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [pinsKey] });
      setSelectedPin(null);
    },
  });

  // ----- Zoom helpers -----

  const clampZoom = (z: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));

  /** Zooms about a viewport-local point so the world coordinates under the
   *  cursor stay put — feels natural for plan navigation. */
  const zoomAbout = (factor: number, vx: number, vy: number) => {
    setZoom(prev => {
      const next = clampZoom(prev * factor);
      if (next === prev) return prev;
      setPan(p => ({
        x: vx - (vx - p.x) * (next / prev),
        y: vy - (vy - p.y) * (next / prev),
      }));
      return next;
    });
  };

  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  // Wheel zoom (preventDefault inside a passive: false listener)
  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = node.getBoundingClientRect();
      const vx = e.clientX - rect.left;
      const vy = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      zoomAbout(factor, vx, vy);
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, []);

  // Pan with click-drag (disabled while placing pins)
  const onMouseDown = (e: React.MouseEvent) => {
    if (pinMode || e.button !== 0) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
    e.preventDefault();
  };
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      setPan({
        x: dragRef.current.panX + (e.clientX - dragRef.current.startX),
        y: dragRef.current.panY + (e.clientY - dragRef.current.startY),
      });
    };
    const onUp = () => { dragRef.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // ----- Pin placement -----
  // Coordinates are stored as percentages of the rendered sheet, so they stay
  // anchored to the right plan location at any zoom level.
  const onSheetClick = (e: React.MouseEvent) => {
    if (!pinMode || !sheetRef.current) return;
    const rect = sheetRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setDraftPin({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  };

  const linkedLabel = (pin: DrawingPin): string => {
    if (pin.linkType === "rfi") {
      const rfi = rfis.find(r => r.id === pin.linkedId);
      return rfi ? `${rfi.number}: ${rfi.subject}` : "RFI (deleted)";
    }
    if (pin.linkType === "punchItem") {
      const item = punchItems.find(p => p.id === pin.linkedId);
      return item ? `Punch #${item.number}: ${item.title}` : "Punch item (deleted)";
    }
    return pin.note || "Note";
  };

  if (!drawing) return null;

  const linkOptions = draftLinkType === "rfi"
    ? rfis.map(r => ({ id: r.id, label: `${r.number} — ${r.subject}` }))
    : draftLinkType === "punchItem"
      ? punchItems.map(p => ({ id: p.id, label: `#${p.number} — ${p.title}` }))
      : [];

  return (
    <div className="-mx-6 -my-4">
      <div className="bg-card border-b px-6 pt-3 pb-3">
        <Link href="/drawings" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> All Drawings
        </Link>
        <div className="mt-1.5 flex flex-wrap items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-2">
              <h1 className="text-xl font-semibold tracking-tight">
                <span className="text-muted-foreground font-normal mr-2">{drawing.number}</span>
                {drawing.title}
              </h1>
              <StatusBadge status={drawing.status} />
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {drawing.discipline} · Rev {drawing.revision} · {drawing.drawingSet || "No set"} ·
              Received {formatDate(drawing.receivedDate)}
            </div>
          </div>
          <Button variant={pinMode ? "default" : "outline"} size="sm" onClick={() => setPinMode(m => !m)}>
            <MapPin className="h-4 w-4 mr-1" />
            {pinMode ? "Click sheet to drop pin..." : "Add Pin"}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_18rem] gap-4 px-6 py-4">
        {/* Viewport with zoom/pan */}
        <div>
          <div
            ref={viewportRef}
            onMouseDown={onMouseDown}
            className={`relative w-full border rounded overflow-hidden bg-white dark:bg-gray-900 ${
              pinMode ? "cursor-crosshair" : dragRef.current ? "cursor-grabbing" : "cursor-grab"
            } select-none`}
            style={{ height: "72vh" }}
          >
            <div
              ref={sheetRef}
              onClick={onSheetClick}
              className="absolute top-0 left-0 origin-top-left"
              style={{
                width: "100%", height: "100%",
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: "0 0",
                transition: dragRef.current ? "none" : "transform 60ms linear",
              }}
            >
              {sheetFile ? (
                sheetFile.mimeType === "application/pdf" ? (
                  <object
                    data={`/api/attachments/${sheetFile.id}/file#toolbar=0&navpanes=0`}
                    type="application/pdf"
                    className="w-full h-full pointer-events-none"
                  >
                    <p className="p-6 text-sm">
                      PDF preview unavailable —{" "}
                      <a className="text-primary underline" href={`/api/attachments/${sheetFile.id}/file`} target="_blank" rel="noreferrer">
                        open {sheetFile.filename}
                      </a>
                    </p>
                  </object>
                ) : (
                  <img
                    src={`/api/attachments/${sheetFile.id}/file`}
                    alt={`${drawing.number} sheet`}
                    className="w-full h-full object-contain pointer-events-none"
                    draggable={false}
                  />
                )
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-muted-foreground"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(127,127,127,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(127,127,127,0.15) 1px, transparent 1px)",
                    backgroundSize: "24px 24px",
                  }}
                >
                  <div className="text-center max-w-xs">
                    <p className="font-medium">No sheet file uploaded</p>
                    <p className="text-xs mt-1">
                      Upload a PDF or image below. Pins can be placed on this blank sheet in the meantime.
                    </p>
                  </div>
                </div>
              )}

              {/* Pin overlay — positioned in the sheet's local space so it
                  scales with the transform */}
              {pins.map(pin => (
                <button
                  key={pin.id}
                  title={linkedLabel(pin)}
                  className={`absolute -translate-x-1/2 -translate-y-full z-10 ${PIN_COLORS[pin.linkType]} text-white rounded-full h-6 w-6 flex items-center justify-center shadow-md hover:scale-110 transition-transform`}
                  style={{ left: `${pin.x}%`, top: `${pin.y}%`, transform: `translate(-50%, -100%) scale(${1 / zoom})`, transformOrigin: "center bottom" }}
                  onClick={e => { e.stopPropagation(); setSelectedPin(pin); }}
                >
                  <MapPin className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>

            {/* Zoom controls overlay */}
            <div className="absolute bottom-3 right-3 flex flex-col gap-1 bg-card/95 border rounded shadow p-1">
              <Button variant="ghost" size="icon" className="h-7 w-7"
                onClick={() => {
                  const rect = viewportRef.current?.getBoundingClientRect();
                  zoomAbout(1.25, (rect?.width ?? 0) / 2, (rect?.height ?? 0) / 2);
                }}>
                <Plus className="h-4 w-4" />
              </Button>
              <div className="text-2xs text-center font-mono px-1">{Math.round(zoom * 100)}%</div>
              <Button variant="ghost" size="icon" className="h-7 w-7"
                onClick={() => {
                  const rect = viewportRef.current?.getBoundingClientRect();
                  zoomAbout(1 / 1.25, (rect?.width ?? 0) / 2, (rect?.height ?? 0) / 2);
                }}>
                <Minus className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={resetView} title="Reset view">
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="absolute bottom-3 left-3 text-2xs text-muted-foreground bg-card/95 border rounded px-2 py-1">
              Scroll to zoom · Drag to pan
            </div>
          </div>

          <div className="mt-4">
            <AttachmentsSection entityType="drawing" entityId={drawingId} title="Sheet Files" />
          </div>
        </div>

        {/* Pin list */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pins ({pins.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pins.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No pins yet. Use “Add Pin” and click a plan location to link an RFI, punch item, or note.
              </p>
            ) : (
              pins.map(pin => (
                <button
                  key={pin.id}
                  className="w-full text-left border rounded p-2 hover:bg-muted text-sm flex items-start gap-2"
                  onClick={() => setSelectedPin(pin)}
                >
                  <span className={`mt-0.5 h-2.5 w-2.5 rounded-full shrink-0 ${PIN_COLORS[pin.linkType]}`} />
                  <span>
                    <span className="font-medium">{PIN_LABELS[pin.linkType]}</span>
                    <span className="block text-xs text-muted-foreground">{linkedLabel(pin)}</span>
                  </span>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* New pin dialog */}
      <Dialog open={draftPin !== null} onOpenChange={open => !open && setDraftPin(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Pin</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <FormField label="Link To">
              <Select value={draftLinkType}
                onValueChange={v => { setDraftLinkType(v as typeof draftLinkType); setDraftLinkedId(null); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="note">Plain note</SelectItem>
                  <SelectItem value="rfi">Existing RFI</SelectItem>
                  <SelectItem value="punchItem">Existing punch item</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            {draftLinkType !== "note" && (
              <FormField label={draftLinkType === "rfi" ? "RFI" : "Punch Item"}>
                <Select value={draftLinkedId ? String(draftLinkedId) : ""}
                  onValueChange={v => setDraftLinkedId(parseInt(v))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {linkOptions.map(opt => (
                      <SelectItem key={opt.id} value={String(opt.id)}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            )}
            <TextAreaField label="Note" value={draftNote} onChange={setDraftNote} rows={2} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraftPin(null)}>Cancel</Button>
            <Button
              disabled={createPin.isPending || (draftLinkType !== "note" && !draftLinkedId)}
              onClick={() => draftPin && createPin.mutate({
                drawingId, x: draftPin.x, y: draftPin.y,
                linkType: draftLinkType, linkedId: draftLinkedId,
                note: draftNote, createdBy: "",
              })}
            >
              Drop Pin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pin detail dialog */}
      <Dialog open={selectedPin !== null} onOpenChange={open => !open && setSelectedPin(null)}>
        <DialogContent className="max-w-md">
          {selectedPin && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className={`h-3 w-3 rounded-full ${PIN_COLORS[selectedPin.linkType]}`} />
                  {PIN_LABELS[selectedPin.linkType]} Pin
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <p className="font-medium">{linkedLabel(selectedPin)}</p>
                {selectedPin.note && selectedPin.linkType !== "note" && (
                  <p className="text-muted-foreground">{selectedPin.note}</p>
                )}
                {selectedPin.linkType === "rfi" && selectedPin.linkedId && (
                  <Link href={`/rfis/${selectedPin.linkedId}`} className="text-primary hover:underline block">Open RFI →</Link>
                )}
                {selectedPin.linkType === "punchItem" && selectedPin.linkedId && (
                  <Link href={`/punch-list/${selectedPin.linkedId}`} className="text-primary hover:underline block">Open Punch Item →</Link>
                )}
              </div>
              <DialogFooter>
                <Button variant="destructive" onClick={() => deletePin.mutate(selectedPin.id)}
                  disabled={deletePin.isPending}>
                  <Trash2 className="h-4 w-4 mr-1" /> Remove Pin
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
