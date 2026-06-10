import type { Express, Request, Response } from "express";
import { z } from "zod";
import { procoreStorage as store } from "./procore-storage";
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

/** Registers standard list/get/create/update/delete routes for a resource. */
function registerResource<T, I>(
  app: Express,
  path: string,
  insertSchema: z.ZodType<I, z.ZodTypeDef, any>,
  handlers: ResourceHandlers<T, I>,
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

  app.post(`/api/${path}`, (req, res) => {
    try {
      const data = insertSchema.parse(req.body);
      return res.status(201).json(handlers.create(data));
    } catch (error) {
      return handleError(res, error, `create ${path}`);
    }
  });

  app.put(`/api/${path}/:id`, (req, res) => {
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

  app.delete(`/api/${path}/:id`, (req, res) => {
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

  app.put("/api/prime-contract", (req, res) => {
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
  });

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
  });

  app.get("/api/change-order-line-items", (req, res) => {
    const orderId = req.query.changeOrderId ? parseInt(String(req.query.changeOrderId)) : undefined;
    return res.json(store.getChangeOrderLineItems(orderId));
  });

  registerResource(app, "change-order-lines", insertChangeOrderLineItemSchema, {
    list: () => store.getChangeOrderLineItems(),
    create: data => store.createChangeOrderLineItem(data),
    update: (id, data) => store.updateChangeOrderLineItem(id, data),
    remove: id => store.deleteChangeOrderLineItem(id),
  });

  // Budget
  app.get("/api/budget", (_req, res) => res.json(store.getBudgetSummary()));

  registerResource(app, "budget-line-items", insertBudgetLineItemSchema, {
    list: () => store.getBudgetLineItems(),
    create: data => store.createBudgetLineItem(data),
    update: (id, data) => store.updateBudgetLineItem(id, data),
    remove: id => store.deleteBudgetLineItem(id),
  });
}
