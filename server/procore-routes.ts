import type { Express, Request, Response, RequestHandler } from "express";
import { z } from "zod";
import fs from "fs";
import path from "path";
import multer from "multer";
import { procoreStorage as store } from "./procore-storage";
import { registerUserRoutes, requireFinancialRole, currentUser } from "./auth";
import { notifyByName, startOverdueScanner } from "./notify";
import {
  ATTACHMENT_ENTITY_TYPES,
  insertSubmittalStepSchema,
  respondSubmittalStepSchema,
  insertDrawingPinSchema,
  insertCommitmentSchema,
  insertCommitmentLineItemSchema,
  insertOwnerInvoiceSchema,
  insertInvoiceLineItemSchema,
} from "@shared/procore";
import {
  insertSubmittalSchema,
  insertRfiSchema,
  insertDrawingSchema,
  insertSpecSectionSchema,
  insertDailyLogSchema,
  insertManpowerEntrySchema,
  insertPunchItemSchema,
  updatePrimeContractSchema,
  insertSovLineItemSchema,
  insertChangeEventSchema,
  insertChangeEventLineItemSchema,
  insertChangeOrderSchema,
  insertChangeOrderLineItemSchema,
  insertBudgetLineItemSchema,
} from "@shared/procore";

interface ResourceHandlers<T, I> {
  list: () => T[];
  get?: (id: number) => T | undefined;
  create: (data: I) => T;
  update: (id: number, data: Partial<T>) => T | undefined;
  remove: (id: number) => boolean;
}

function parseId(req: Request, res: Response): number | undefined {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ message: "Invalid ID" });
    return undefined;
  }
  return id;
}

function handleError(res: Response, error: unknown, action: string) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ message: `Invalid data for ${action}`, errors: error.errors });
  }
  return res.status(500).json({ message: `Failed to ${action}` });
}

const passthrough: RequestHandler = (_req, _res, next) => next();

/**
 * Registers standard list/get/create/update/delete routes for a resource.
 * An optional guard middleware protects the mutating routes (POST/PUT/DELETE).
 */
function registerResource<T, I>(
  app: Express,
  path: string,
  insertSchema: z.ZodType<I, z.ZodTypeDef, any>,
  handlers: ResourceHandlers<T, I>,
  guard: RequestHandler = passthrough,
) {
  app.get(`/api/${path}`, (_req, res) => res.json(handlers.list()));

  if (handlers.get) {
    app.get(`/api/${path}/:id`, (req, res) => {
      const id = parseId(req, res);
      if (id === undefined) return;
      const item = handlers.get!(id);
      if (!item) return res.status(404).json({ message: "Not found" });
      return res.json(item);
    });
  }

  app.post(`/api/${path}`, guard, (req, res) => {
    try {
      const data = insertSchema.parse(req.body);
      return res.status(201).json(handlers.create(data));
    } catch (error) {
      return handleError(res, error, `create ${path}`);
    }
  });

  app.put(`/api/${path}/:id`, guard, (req, res) => {
    const id = parseId(req, res);
    if (id === undefined) return;
    try {
      const data = (insertSchema as unknown as z.AnyZodObject).partial().parse(req.body) as Partial<T>;
      const updated = handlers.update(id, data);
      if (!updated) return res.status(404).json({ message: "Not found" });
      return res.json(updated);
    } catch (error) {
      return handleError(res, error, `update ${path}`);
    }
  });

  app.delete(`/api/${path}/:id`, guard, (req, res) => {
    const id = parseId(req, res);
    if (id === undefined) return;
    if (!handlers.remove(id)) return res.status(404).json({ message: "Not found" });
    return res.json({ success: true });
  });
}

export function registerProcoreRoutes(app: Express): void {
  // Submittals
  registerResource(app, "submittals", insertSubmittalSchema, {
    list: () => store.getSubmittals(),
    get: id => store.getSubmittal(id),
    create: data => store.createSubmittal(data),
    update: (id, data) => store.updateSubmittal(id, data),
    remove: id => store.deleteSubmittal(id),
  });

  // RFIs
  registerResource(app, "rfis", insertRfiSchema, {
    list: () => store.getRfis(),
    get: id => store.getRfi(id),
    create: data => store.createRfi(data),
    update: (id, data) => store.updateRfi(id, data),
    remove: id => store.deleteRfi(id),
  });

  // Drawings
  registerResource(app, "drawings", insertDrawingSchema, {
    list: () => store.getDrawings(),
    get: id => store.getDrawing(id),
    create: data => store.createDrawing(data),
    update: (id, data) => store.updateDrawing(id, data),
    remove: id => store.deleteDrawing(id),
  });

  // Specifications
  registerResource(app, "spec-sections", insertSpecSectionSchema, {
    list: () => store.getSpecSections(),
    get: id => store.getSpecSection(id),
    create: data => store.createSpecSection(data),
    update: (id, data) => store.updateSpecSection(id, data),
    remove: id => store.deleteSpecSection(id),
  });

  // Daily logs (plus by-date lookup and nested manpower entries)
  app.get("/api/daily-logs/by-date/:date", (req, res) => {
    const log = store.getDailyLogByDate(req.params.date);
    if (!log) return res.status(404).json({ message: "No log for this date" });
    return res.json(log);
  });

  registerResource(app, "daily-logs", insertDailyLogSchema, {
    list: () => store.getDailyLogs(),
    get: id => store.getDailyLog(id),
    create: data => store.createDailyLog(data),
    update: (id, data) => store.updateDailyLog(id, data),
    remove: id => store.deleteDailyLog(id),
  });

  app.get("/api/daily-logs/:id/manpower", (req, res) => {
    const id = parseId(req, res);
    if (id === undefined) return;
    return res.json(store.getManpowerEntries(id));
  });

  registerResource(app, "manpower", insertManpowerEntrySchema, {
    list: () => [],
    create: data => store.createManpowerEntry(data),
    update: (id, data) => store.updateManpowerEntry(id, data),
    remove: id => store.deleteManpowerEntry(id),
  });

  // Punch list
  registerResource(app, "punch-items", insertPunchItemSchema, {
    list: () => store.getPunchItems(),
    get: id => store.getPunchItem(id),
    create: data => store.createPunchItem(data),
    update: (id, data) => store.updatePunchItem(id, data),
    remove: id => store.deletePunchItem(id),
  });

  // Prime contract (singleton) and schedule of values
  app.get("/api/prime-contract", (_req, res) => res.json(store.getPrimeContract()));

  app.put("/api/prime-contract", requireFinancialRole, (req, res) => {
    try {
      const data = updatePrimeContractSchema.parse(req.body);
      return res.json(store.updatePrimeContract(data));
    } catch (error) {
      return handleError(res, error, "update prime contract");
    }
  });

  app.get("/api/prime-contract/financials", (_req, res) =>
    res.json(store.getContractFinancials()));

  registerResource(app, "sov-line-items", insertSovLineItemSchema, {
    list: () => store.getSovLineItems(),
    create: data => store.createSovLineItem(data),
    update: (id, data) => store.updateSovLineItem(id, data),
    remove: id => store.deleteSovLineItem(id),
  }, requireFinancialRole);

  // Change events and line items
  registerResource(app, "change-events", insertChangeEventSchema, {
    list: () => store.getChangeEvents(),
    get: id => store.getChangeEvent(id),
    create: data => store.createChangeEvent(data),
    update: (id, data) => store.updateChangeEvent(id, data),
    remove: id => store.deleteChangeEvent(id),
  });

  app.get("/api/change-event-line-items", (req, res) => {
    const eventId = req.query.changeEventId ? parseInt(String(req.query.changeEventId)) : undefined;
    return res.json(store.getChangeEventLineItems(eventId));
  });

  registerResource(app, "change-event-lines", insertChangeEventLineItemSchema, {
    list: () => store.getChangeEventLineItems(),
    create: data => store.createChangeEventLineItem(data),
    update: (id, data) => store.updateChangeEventLineItem(id, data),
    remove: id => store.deleteChangeEventLineItem(id),
  });

  // Change orders and line items
  registerResource(app, "change-orders", insertChangeOrderSchema, {
    list: () => store.getChangeOrders(),
    get: id => store.getChangeOrder(id),
    create: data => store.createChangeOrder(data),
    update: (id, data) => store.updateChangeOrder(id, data),
    remove: id => store.deleteChangeOrder(id),
  }, requireFinancialRole);

  app.get("/api/change-order-line-items", (req, res) => {
    const orderId = req.query.changeOrderId ? parseInt(String(req.query.changeOrderId)) : undefined;
    return res.json(store.getChangeOrderLineItems(orderId));
  });

  registerResource(app, "change-order-lines", insertChangeOrderLineItemSchema, {
    list: () => store.getChangeOrderLineItems(),
    create: data => store.createChangeOrderLineItem(data),
    update: (id, data) => store.updateChangeOrderLineItem(id, data),
    remove: id => store.deleteChangeOrderLineItem(id),
  }, requireFinancialRole);

  // Budget
  app.get("/api/budget", (_req, res) => res.json(store.getBudgetSummary()));

  // CSV export of the budget roll-up (ERP-friendly)
  app.get("/api/budget/export.csv", (_req, res) => {
    const { rows, totals } = store.getBudgetSummary();
    const header = "Cost Code,Description,Original Budget,Budget Modifications,Approved COs,Revised Budget,Committed Costs,Direct Costs,Pending Changes,Projected Costs,Projected Over/Under";
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const lines = rows.map(r =>
      [esc(r.costCode), esc(r.description), r.originalBudget, r.budgetModifications,
        r.approvedCOs, r.revisedBudget, r.committedCosts, r.directCosts,
        r.pendingBudgetChanges, r.projectedCosts, r.projectedOverUnder].join(","));
    lines.push(["Total", "", totals.originalBudget, totals.budgetModifications,
      totals.approvedCOs, totals.revisedBudget, totals.committedCosts, totals.directCosts,
      totals.pendingBudgetChanges, totals.projectedCosts, totals.projectedOverUnder].join(","));
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=budget-export.csv");
    return res.send([header, ...lines].join("\n"));
  });

  registerResource(app, "budget-line-items", insertBudgetLineItemSchema, {
    list: () => store.getBudgetLineItems(),
    create: data => store.createBudgetLineItem(data),
    update: (id, data) => store.updateBudgetLineItem(id, data),
    remove: id => store.deleteBudgetLineItem(id),
  }, requireFinancialRole);

  // ----- Users & directory -----
  registerUserRoutes(app);

  // ----- Notifications -----
  app.get("/api/notifications", (req, res) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ message: "Not logged in" });
    return res.json(store.getNotifications(user.id));
  });

  app.put("/api/notifications/:id/read", (req, res) => {
    const id = parseId(req, res);
    if (id === undefined) return;
    const updated = store.markNotificationRead(id);
    if (!updated) return res.status(404).json({ message: "Not found" });
    return res.json(updated);
  });

  app.post("/api/notifications/read-all", (req, res) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ message: "Not logged in" });
    store.markAllNotificationsRead(user.id);
    return res.json({ success: true });
  });

  // ----- Attachments (file uploads) -----
  const uploadsDir = path.resolve(process.cwd(), "uploads");
  fs.mkdirSync(uploadsDir, { recursive: true });
  const upload = multer({
    storage: multer.diskStorage({
      destination: uploadsDir,
      filename: (_req, file, cb) => {
        const safe = file.originalname.replace(/[^\w.\-]+/g, "_");
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}-${safe}`);
      },
    }),
    limits: { fileSize: 50 * 1024 * 1024 },
  });

  app.get("/api/attachments", (req, res) => {
    const entityType = String(req.query.entityType ?? "");
    const entityId = parseInt(String(req.query.entityId ?? ""));
    if (!ATTACHMENT_ENTITY_TYPES.includes(entityType as any) || isNaN(entityId)) {
      return res.status(400).json({ message: "entityType and entityId are required" });
    }
    return res.json(store.getAttachments(entityType, entityId));
  });

  app.post("/api/attachments", upload.single("file"), (req, res) => {
    const entityType = String(req.body.entityType ?? "");
    const entityId = parseInt(String(req.body.entityId ?? ""));
    if (!req.file) return res.status(400).json({ message: "A file is required" });
    if (!ATTACHMENT_ENTITY_TYPES.includes(entityType as any) || isNaN(entityId)) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ message: "entityType and entityId are required" });
    }
    const user = currentUser(req);
    const attachment = store.createAttachment({
      entityType: entityType as any,
      entityId,
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      storagePath: req.file.filename,
      uploadedBy: user?.name ?? "",
    });
    return res.status(201).json(attachment);
  });

  app.get("/api/attachments/:id/file", (req, res) => {
    const id = parseId(req, res);
    if (id === undefined) return;
    const attachment = store.getAttachment(id);
    if (!attachment) return res.status(404).json({ message: "Not found" });
    const filePath = path.join(uploadsDir, attachment.storagePath);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: "File missing on disk" });
    res.setHeader("Content-Type", attachment.mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${attachment.filename}"`);
    return res.sendFile(filePath);
  });

  app.delete("/api/attachments/:id", (req, res) => {
    const id = parseId(req, res);
    if (id === undefined) return;
    const attachment = store.getAttachment(id);
    if (!attachment) return res.status(404).json({ message: "Not found" });
    store.deleteAttachment(id);
    fs.unlink(path.join(uploadsDir, attachment.storagePath), () => {});
    return res.json({ success: true });
  });

  // ----- Submittal approval workflow -----
  app.get("/api/submittals/:id/steps", (req, res) => {
    const id = parseId(req, res);
    if (id === undefined) return;
    return res.json(store.getSubmittalSteps(id));
  });

  app.post("/api/submittal-steps", (req, res) => {
    try {
      const data = insertSubmittalStepSchema.parse(req.body);
      const step = store.createSubmittalStep(data);
      if (step.status === "Pending") {
        const submittal = store.getSubmittal(step.submittalId);
        notifyByName(
          step.approverName,
          `Submittal ${submittal?.number ?? step.submittalId} awaits your review`,
          `You were added as approver (step ${step.stepNumber})${step.dueDate ? `, due ${step.dueDate}` : ""}.`,
          "submittal", step.submittalId,
        );
      }
      return res.status(201).json(step);
    } catch (error) {
      return handleError(res, error, "create submittal step");
    }
  });

  app.delete("/api/submittal-steps/:id", (req, res) => {
    const id = parseId(req, res);
    if (id === undefined) return;
    if (!store.deleteSubmittalStep(id)) return res.status(404).json({ message: "Not found" });
    return res.json({ success: true });
  });

  app.post("/api/submittal-steps/:id/respond", (req, res) => {
    const id = parseId(req, res);
    if (id === undefined) return;
    try {
      const { status, comments } = respondSubmittalStepSchema.parse(req.body);
      const result = store.respondToSubmittalStep(id, status, comments);
      if (!result) return res.status(404).json({ message: "Not found" });
      const { submittal } = result;
      if (submittal) {
        if (submittal.status === "Pending Approval") {
          notifyByName(
            submittal.ballInCourt,
            `Submittal ${submittal.number} awaits your review`,
            `The previous step was marked "${status}". You are next in the approval workflow.`,
            "submittal", submittal.id,
          );
        } else {
          notifyByName(
            submittal.responsibleContractor,
            `Submittal ${submittal.number} returned: ${submittal.status}`,
            comments || "Review complete.",
            "submittal", submittal.id,
          );
        }
      }
      return res.json(result);
    } catch (error) {
      return handleError(res, error, "respond to submittal step");
    }
  });

  // ----- Drawing pins (markups) -----
  app.get("/api/drawings/:id/pins", (req, res) => {
    const id = parseId(req, res);
    if (id === undefined) return;
    return res.json(store.getDrawingPins(id));
  });

  registerResource(app, "drawing-pins", insertDrawingPinSchema, {
    list: () => [],
    create: data => store.createDrawingPin(data),
    update: (id, data) => store.updateDrawingPin(id, data),
    remove: id => store.deleteDrawingPin(id),
  });

  // ----- Commitments -----
  registerResource(app, "commitments", insertCommitmentSchema, {
    list: () => store.getCommitments(),
    get: id => store.getCommitment(id),
    create: data => store.createCommitment(data),
    update: (id, data) => store.updateCommitment(id, data),
    remove: id => store.deleteCommitment(id),
  }, requireFinancialRole);

  app.get("/api/commitment-line-items", (req, res) => {
    const commitmentId = req.query.commitmentId ? parseInt(String(req.query.commitmentId)) : undefined;
    return res.json(store.getCommitmentLineItems(commitmentId));
  });

  registerResource(app, "commitment-lines", insertCommitmentLineItemSchema, {
    list: () => store.getCommitmentLineItems(),
    create: data => store.createCommitmentLineItem(data),
    update: (id, data) => store.updateCommitmentLineItem(id, data),
    remove: id => store.deleteCommitmentLineItem(id),
  }, requireFinancialRole);

  // ----- Owner invoices (pay applications) -----
  registerResource(app, "invoices", insertOwnerInvoiceSchema, {
    list: () => store.getOwnerInvoices(),
    get: id => store.getOwnerInvoice(id),
    create: data => store.createOwnerInvoice(data),
    update: (id, data) => store.updateOwnerInvoice(id, data),
    remove: id => store.deleteOwnerInvoice(id),
  }, requireFinancialRole);

  app.get("/api/invoices/:id/g702", (req, res) => {
    const id = parseId(req, res);
    if (id === undefined) return;
    const summary = store.getG702Summary(id);
    if (!summary) return res.status(404).json({ message: "Not found" });
    return res.json(summary);
  });

  registerResource(app, "invoice-lines", insertInvoiceLineItemSchema, {
    list: () => [],
    create: data => store.createInvoiceLineItem(data),
    update: (id, data) => store.updateInvoiceLineItem(id, data),
    remove: () => false,
  }, requireFinancialRole);

  // Overdue reminders: scan at boot and every 10 minutes
  startOverdueScanner();
}
