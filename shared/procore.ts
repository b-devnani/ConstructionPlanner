import { z } from "zod";

// ---------------------------------------------------------------------------
// Shared schemas and types for the Procore-style project management tools.
// These entities are served from in-memory storage (see server/procore-storage.ts)
// and validated with Zod on every write.
// ---------------------------------------------------------------------------

// ----- Submittals -----------------------------------------------------------

export const SUBMITTAL_STATUSES = [
  "Draft",
  "Open",
  "Pending Approval",
  "Approved",
  "Approved as Noted",
  "Revise and Resubmit",
  "Rejected",
  "Closed",
] as const;

export const SUBMITTAL_TYPES = [
  "Shop Drawing",
  "Product Data",
  "Sample",
  "Mock-up",
  "Quality Control Plan",
  "Test Report",
  "Certificate",
  "Other",
] as const;

export const submittalSchema = z.object({
  id: z.number(),
  number: z.string(),
  revision: z.number().int().min(0).default(0),
  title: z.string().min(1),
  specSection: z.string().default(""),
  submittalType: z.enum(SUBMITTAL_TYPES).default("Product Data"),
  status: z.enum(SUBMITTAL_STATUSES).default("Draft"),
  responsibleContractor: z.string().default(""),
  receivedFrom: z.string().default(""),
  submitBy: z.string().default(""),
  ballInCourt: z.string().default(""),
  dateSubmitted: z.string().nullable().default(null),
  dateReturned: z.string().nullable().default(null),
  dueDate: z.string().nullable().default(null),
  leadTimeDays: z.number().int().min(0).default(0),
  requiredOnSiteDate: z.string().nullable().default(null),
  description: z.string().default(""),
  createdAt: z.string(),
});

export const insertSubmittalSchema = submittalSchema
  .omit({ id: true, createdAt: true, number: true })
  .extend({ number: z.string().optional() });

export type Submittal = z.infer<typeof submittalSchema>;
export type InsertSubmittal = z.infer<typeof insertSubmittalSchema>;

// ----- RFIs ------------------------------------------------------------------

export const RFI_STATUSES = ["Draft", "Open", "Closed"] as const;
export const RFI_PRIORITIES = ["Low", "Medium", "High", "Urgent"] as const;
export const IMPACT_OPTIONS = ["TBD", "Yes", "No"] as const;

export const rfiSchema = z.object({
  id: z.number(),
  number: z.string(),
  subject: z.string().min(1),
  question: z.string().default(""),
  answer: z.string().default(""),
  status: z.enum(RFI_STATUSES).default("Draft"),
  priority: z.enum(RFI_PRIORITIES).default("Medium"),
  assignedTo: z.string().default(""),
  rfiManager: z.string().default(""),
  receivedFrom: z.string().default(""),
  responsibleContractor: z.string().default(""),
  specSection: z.string().default(""),
  drawingNumber: z.string().default(""),
  location: z.string().default(""),
  costImpact: z.enum(IMPACT_OPTIONS).default("TBD"),
  costImpactAmount: z.number().default(0),
  scheduleImpact: z.enum(IMPACT_OPTIONS).default("TBD"),
  scheduleImpactDays: z.number().int().default(0),
  ballInCourt: z.string().default(""),
  dateInitiated: z.string().nullable().default(null),
  dueDate: z.string().nullable().default(null),
  dateClosed: z.string().nullable().default(null),
  createdAt: z.string(),
});

export const insertRfiSchema = rfiSchema
  .omit({ id: true, createdAt: true, number: true })
  .extend({ number: z.string().optional() });

export type Rfi = z.infer<typeof rfiSchema>;
export type InsertRfi = z.infer<typeof insertRfiSchema>;

// ----- Drawings --------------------------------------------------------------

export const DRAWING_DISCIPLINES = [
  "Architectural",
  "Structural",
  "Civil",
  "Mechanical",
  "Electrical",
  "Plumbing",
  "Fire Protection",
  "Landscape",
  "General",
] as const;

export const DRAWING_STATUSES = ["Current", "Superseded"] as const;

export const drawingSchema = z.object({
  id: z.number(),
  number: z.string().min(1),
  title: z.string().min(1),
  discipline: z.enum(DRAWING_DISCIPLINES).default("Architectural"),
  revision: z.string().default("0"),
  drawingDate: z.string().nullable().default(null),
  receivedDate: z.string().nullable().default(null),
  drawingSet: z.string().default(""),
  status: z.enum(DRAWING_STATUSES).default("Current"),
  createdAt: z.string(),
});

export const insertDrawingSchema = drawingSchema.omit({ id: true, createdAt: true });

export type Drawing = z.infer<typeof drawingSchema>;
export type InsertDrawing = z.infer<typeof insertDrawingSchema>;

// ----- Specifications ----------------------------------------------------------

export const specSectionSchema = z.object({
  id: z.number(),
  number: z.string().min(1),
  title: z.string().min(1),
  division: z.string().min(1),
  revision: z.string().default("0"),
  specSet: z.string().default(""),
  issuedDate: z.string().nullable().default(null),
  receivedDate: z.string().nullable().default(null),
  createdAt: z.string(),
});

export const insertSpecSectionSchema = specSectionSchema.omit({ id: true, createdAt: true });

export type SpecSection = z.infer<typeof specSectionSchema>;
export type InsertSpecSection = z.infer<typeof insertSpecSectionSchema>;

// ----- Daily Log ----------------------------------------------------------------

export const WEATHER_CONDITIONS = [
  "Clear",
  "Partly Cloudy",
  "Overcast",
  "Rain",
  "Snow",
  "Fog",
  "Windy",
] as const;

export const dailyLogSchema = z.object({
  id: z.number(),
  logDate: z.string().min(1),
  weatherConditions: z.enum(WEATHER_CONDITIONS).default("Clear"),
  tempHigh: z.number().nullable().default(null),
  tempLow: z.number().nullable().default(null),
  precipitation: z.string().default(""),
  windSpeed: z.string().default(""),
  weatherDelay: z.boolean().default(false),
  notes: z.string().default(""),
  delays: z.string().default(""),
  safetyNotes: z.string().default(""),
  visitors: z.string().default(""),
  equipmentOnSite: z.string().default(""),
  createdAt: z.string(),
});

export const insertDailyLogSchema = dailyLogSchema.omit({ id: true, createdAt: true });

export type DailyLog = z.infer<typeof dailyLogSchema>;
export type InsertDailyLog = z.infer<typeof insertDailyLogSchema>;

export const manpowerEntrySchema = z.object({
  id: z.number(),
  dailyLogId: z.number(),
  contractor: z.string().min(1),
  workers: z.number().int().min(0).default(0),
  hours: z.number().min(0).default(0),
  location: z.string().default(""),
  comments: z.string().default(""),
});

export const insertManpowerEntrySchema = manpowerEntrySchema.omit({ id: true });

export type ManpowerEntry = z.infer<typeof manpowerEntrySchema>;
export type InsertManpowerEntry = z.infer<typeof insertManpowerEntrySchema>;

// ----- Punch List ----------------------------------------------------------------

export const PUNCH_STATUSES = ["Draft", "Open", "Ready for Review", "Closed"] as const;
export const PUNCH_PRIORITIES = ["Low", "Medium", "High"] as const;

export const punchItemSchema = z.object({
  id: z.number(),
  number: z.string(),
  title: z.string().min(1),
  description: z.string().default(""),
  status: z.enum(PUNCH_STATUSES).default("Open"),
  priority: z.enum(PUNCH_PRIORITIES).default("Medium"),
  location: z.string().default(""),
  trade: z.string().default(""),
  assignee: z.string().default(""),
  ballInCourt: z.string().default(""),
  dueDate: z.string().nullable().default(null),
  dateClosed: z.string().nullable().default(null),
  createdAt: z.string(),
});

export const insertPunchItemSchema = punchItemSchema
  .omit({ id: true, createdAt: true, number: true })
  .extend({ number: z.string().optional() });

export type PunchItem = z.infer<typeof punchItemSchema>;
export type InsertPunchItem = z.infer<typeof insertPunchItemSchema>;

// ----- Prime Contract ----------------------------------------------------------------

export const CONTRACT_STATUSES = [
  "Draft",
  "Out for Bid",
  "Out for Signature",
  "Approved",
  "Complete",
  "Terminated",
] as const;

export const primeContractSchema = z.object({
  id: z.number(),
  number: z.string().default(""),
  title: z.string().min(1),
  owner: z.string().default(""),
  contractor: z.string().default(""),
  architect: z.string().default(""),
  status: z.enum(CONTRACT_STATUSES).default("Draft"),
  executed: z.boolean().default(false),
  contractDate: z.string().nullable().default(null),
  startDate: z.string().nullable().default(null),
  substantialCompletionDate: z.string().nullable().default(null),
  actualCompletionDate: z.string().nullable().default(null),
  signedContractReceivedDate: z.string().nullable().default(null),
  retainagePercent: z.number().min(0).max(100).default(10),
  description: z.string().default(""),
  inclusions: z.string().default(""),
  exclusions: z.string().default(""),
  createdAt: z.string(),
});

export const updatePrimeContractSchema = primeContractSchema
  .omit({ id: true, createdAt: true })
  .partial();

export type PrimeContract = z.infer<typeof primeContractSchema>;
export type UpdatePrimeContract = z.infer<typeof updatePrimeContractSchema>;

export const sovLineItemSchema = z.object({
  id: z.number(),
  itemNumber: z.string().default(""),
  costCode: z.string().default(""),
  description: z.string().min(1),
  scheduledValue: z.number().default(0),
});

export const insertSovLineItemSchema = sovLineItemSchema.omit({ id: true });

export type SovLineItem = z.infer<typeof sovLineItemSchema>;
export type InsertSovLineItem = z.infer<typeof insertSovLineItemSchema>;

// ----- Change Events ----------------------------------------------------------------

export const CHANGE_EVENT_STATUSES = ["Open", "Pending", "Closed", "Void"] as const;
export const CHANGE_EVENT_SCOPES = ["In Scope", "Out of Scope", "TBD"] as const;
export const CHANGE_EVENT_TYPES = [
  "Owner Change",
  "Design Development",
  "Allowance",
  "Contingency",
  "Existing Condition",
  "Backcharge",
  "Other",
] as const;

export const changeEventSchema = z.object({
  id: z.number(),
  number: z.string(),
  title: z.string().min(1),
  status: z.enum(CHANGE_EVENT_STATUSES).default("Open"),
  scope: z.enum(CHANGE_EVENT_SCOPES).default("TBD"),
  eventType: z.enum(CHANGE_EVENT_TYPES).default("Owner Change"),
  origin: z.string().default(""),
  description: z.string().default(""),
  createdAt: z.string(),
});

export const insertChangeEventSchema = changeEventSchema
  .omit({ id: true, createdAt: true, number: true })
  .extend({ number: z.string().optional() });

export type ChangeEvent = z.infer<typeof changeEventSchema>;
export type InsertChangeEvent = z.infer<typeof insertChangeEventSchema>;

export const changeEventLineItemSchema = z.object({
  id: z.number(),
  changeEventId: z.number(),
  costCode: z.string().default(""),
  description: z.string().min(1),
  vendor: z.string().default(""),
  romAmount: z.number().default(0),
});

export const insertChangeEventLineItemSchema = changeEventLineItemSchema.omit({ id: true });

export type ChangeEventLineItem = z.infer<typeof changeEventLineItemSchema>;
export type InsertChangeEventLineItem = z.infer<typeof insertChangeEventLineItemSchema>;

// ----- Change Orders (Prime Contract Change Orders) -----------------------------------

export const CHANGE_ORDER_STATUSES = [
  "Draft",
  "Pending - In Review",
  "Approved",
  "Rejected",
  "Void",
] as const;

export const changeOrderSchema = z.object({
  id: z.number(),
  number: z.string(),
  title: z.string().min(1),
  status: z.enum(CHANGE_ORDER_STATUSES).default("Draft"),
  changeEventId: z.number().nullable().default(null),
  description: z.string().default(""),
  scheduleImpactDays: z.number().int().default(0),
  executed: z.boolean().default(false),
  signedDate: z.string().nullable().default(null),
  dateCreated: z.string().nullable().default(null),
  createdAt: z.string(),
});

export const insertChangeOrderSchema = changeOrderSchema
  .omit({ id: true, createdAt: true, number: true })
  .extend({ number: z.string().optional() });

export type ChangeOrder = z.infer<typeof changeOrderSchema>;
export type InsertChangeOrder = z.infer<typeof insertChangeOrderSchema>;

export const changeOrderLineItemSchema = z.object({
  id: z.number(),
  changeOrderId: z.number(),
  costCode: z.string().default(""),
  description: z.string().min(1),
  amount: z.number().default(0),
});

export const insertChangeOrderLineItemSchema = changeOrderLineItemSchema.omit({ id: true });

export type ChangeOrderLineItem = z.infer<typeof changeOrderLineItemSchema>;
export type InsertChangeOrderLineItem = z.infer<typeof insertChangeOrderLineItemSchema>;

// ----- Budget ----------------------------------------------------------------

export const budgetLineItemSchema = z.object({
  id: z.number(),
  costCode: z.string().min(1),
  description: z.string().min(1),
  originalBudget: z.number().default(0),
  budgetModifications: z.number().default(0),
  committedCosts: z.number().default(0),
  directCosts: z.number().default(0),
  pendingBudgetChanges: z.number().default(0),
});

export const insertBudgetLineItemSchema = budgetLineItemSchema.omit({ id: true });

export type BudgetLineItem = z.infer<typeof budgetLineItemSchema>;
export type InsertBudgetLineItem = z.infer<typeof insertBudgetLineItemSchema>;

// Computed budget row returned by GET /api/budget
export interface BudgetRow extends BudgetLineItem {
  approvedCOs: number;
  revisedBudget: number;
  projectedCosts: number;
  projectedOverUnder: number;
  forecastToComplete: number;
}

export interface BudgetSummary {
  rows: BudgetRow[];
  totals: Omit<BudgetRow, "id" | "costCode" | "description">;
}

// Financial rollup for the prime contract returned by GET /api/prime-contract/financials
export interface ContractFinancials {
  originalContractValue: number;
  approvedChangeOrders: number;
  pendingChangeOrders: number;
  revisedContractValue: number;
  pendingRevisedContractValue: number;
}

// ===========================================================================
// Users & permissions
// ===========================================================================

export const USER_ROLES = [
  "Admin",
  "Project Manager",
  "Superintendent",
  "Architect",
  "Owner Rep",
  "Subcontractor",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

/** Roles allowed to mutate financial tools (contract, budget, COs, commitments, invoices). */
export const FINANCIAL_ROLES: readonly UserRole[] = ["Admin", "Project Manager"];

export const userSchema = z.object({
  id: z.number(),
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(USER_ROLES).default("Subcontractor"),
  company: z.string().default(""),
  title: z.string().default(""),
  phone: z.string().default(""),
  // scrypt hash, never sent to the client
  passwordHash: z.string().default(""),
  createdAt: z.string(),
});

export const insertUserSchema = userSchema
  .omit({ id: true, createdAt: true, passwordHash: true })
  .extend({ password: z.string().min(6) });

export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type SafeUser = Omit<User, "passwordHash">;

// ===========================================================================
// Attachments (file uploads stored on disk, metadata persisted)
// ===========================================================================

export const ATTACHMENT_ENTITY_TYPES = [
  "submittal",
  "rfi",
  "drawing",
  "specSection",
  "punchItem",
  "dailyLog",
  "changeOrder",
  "commitment",
] as const;

export const attachmentSchema = z.object({
  id: z.number(),
  entityType: z.enum(ATTACHMENT_ENTITY_TYPES),
  entityId: z.number(),
  filename: z.string(),
  mimeType: z.string(),
  size: z.number(),
  storagePath: z.string(),
  uploadedBy: z.string().default(""),
  createdAt: z.string(),
});

export type Attachment = z.infer<typeof attachmentSchema>;

// ===========================================================================
// Submittal approval workflow
// ===========================================================================

export const STEP_STATUSES = [
  "Pending",
  "Approved",
  "Approved as Noted",
  "Revise and Resubmit",
  "Rejected",
] as const;

export const submittalStepSchema = z.object({
  id: z.number(),
  submittalId: z.number(),
  stepNumber: z.number().int().min(1),
  approverName: z.string().min(1),
  approverUserId: z.number().nullable().default(null),
  dueDate: z.string().nullable().default(null),
  status: z.enum(STEP_STATUSES).default("Pending"),
  comments: z.string().default(""),
  respondedAt: z.string().nullable().default(null),
});

export const insertSubmittalStepSchema = submittalStepSchema.omit({ id: true });
export const respondSubmittalStepSchema = z.object({
  status: z.enum(STEP_STATUSES).refine(s => s !== "Pending", "Pick a response"),
  comments: z.string().default(""),
});

export type SubmittalStep = z.infer<typeof submittalStepSchema>;
export type InsertSubmittalStep = z.infer<typeof insertSubmittalStepSchema>;

// ===========================================================================
// Notifications (in-app; email is mirrored to an outbox file)
// ===========================================================================

export const notificationSchema = z.object({
  id: z.number(),
  userId: z.number(),
  title: z.string(),
  body: z.string().default(""),
  entityType: z.string().default(""),
  entityId: z.number().nullable().default(null),
  read: z.boolean().default(false),
  createdAt: z.string(),
});

export type Notification = z.infer<typeof notificationSchema>;

// ===========================================================================
// Drawing markups (pins linking plan locations to RFIs / punch items)
// ===========================================================================

export const PIN_LINK_TYPES = ["rfi", "punchItem", "note"] as const;

export const drawingPinSchema = z.object({
  id: z.number(),
  drawingId: z.number(),
  // position as percentage of the rendered sheet (0-100)
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  linkType: z.enum(PIN_LINK_TYPES).default("note"),
  linkedId: z.number().nullable().default(null),
  note: z.string().default(""),
  createdBy: z.string().default(""),
  createdAt: z.string(),
});

export const insertDrawingPinSchema = drawingPinSchema.omit({ id: true, createdAt: true });

export type DrawingPin = z.infer<typeof drawingPinSchema>;
export type InsertDrawingPin = z.infer<typeof insertDrawingPinSchema>;

// ===========================================================================
// Commitments (subcontracts & purchase orders)
// ===========================================================================

export const COMMITMENT_TYPES = ["Subcontract", "Purchase Order"] as const;
export const COMMITMENT_STATUSES = [
  "Draft",
  "Out for Signature",
  "Executed",
  "Complete",
  "Terminated",
] as const;

export const commitmentSchema = z.object({
  id: z.number(),
  number: z.string(),
  title: z.string().min(1),
  commitmentType: z.enum(COMMITMENT_TYPES).default("Subcontract"),
  status: z.enum(COMMITMENT_STATUSES).default("Draft"),
  vendor: z.string().default(""),
  executedDate: z.string().nullable().default(null),
  retainagePercent: z.number().min(0).max(100).default(10),
  description: z.string().default(""),
  createdAt: z.string(),
});

export const insertCommitmentSchema = commitmentSchema
  .omit({ id: true, createdAt: true, number: true })
  .extend({ number: z.string().optional() });

export type Commitment = z.infer<typeof commitmentSchema>;
export type InsertCommitment = z.infer<typeof insertCommitmentSchema>;

export const commitmentLineItemSchema = z.object({
  id: z.number(),
  commitmentId: z.number(),
  costCode: z.string().default(""),
  description: z.string().min(1),
  amount: z.number().default(0),
});

export const insertCommitmentLineItemSchema = commitmentLineItemSchema.omit({ id: true });

export type CommitmentLineItem = z.infer<typeof commitmentLineItemSchema>;
export type InsertCommitmentLineItem = z.infer<typeof insertCommitmentLineItemSchema>;

// ===========================================================================
// Owner invoices (payment applications, G702/G703 style)
// ===========================================================================

export const INVOICE_STATUSES = ["Draft", "Under Review", "Approved", "Paid"] as const;

export const ownerInvoiceSchema = z.object({
  id: z.number(),
  number: z.string(),
  periodStart: z.string().nullable().default(null),
  periodEnd: z.string().min(1),
  billingDate: z.string().min(1),
  status: z.enum(INVOICE_STATUSES).default("Draft"),
  createdAt: z.string(),
});

export const insertOwnerInvoiceSchema = ownerInvoiceSchema
  .omit({ id: true, createdAt: true, number: true })
  .extend({ number: z.string().optional() });

export type OwnerInvoice = z.infer<typeof ownerInvoiceSchema>;
export type InsertOwnerInvoice = z.infer<typeof insertOwnerInvoiceSchema>;

export const invoiceLineItemSchema = z.object({
  id: z.number(),
  invoiceId: z.number(),
  sovLineItemId: z.number(),
  workThisPeriod: z.number().default(0),
  storedMaterials: z.number().default(0),
});

export const insertInvoiceLineItemSchema = invoiceLineItemSchema.omit({ id: true });

export type InvoiceLineItem = z.infer<typeof invoiceLineItemSchema>;
export type InsertInvoiceLineItem = z.infer<typeof insertInvoiceLineItemSchema>;

// Computed G703 continuation-sheet row for one SOV line on one invoice
export interface G703Row {
  lineItemId: number;
  sovLineItemId: number;
  itemNumber: string;
  costCode: string;
  description: string;
  scheduledValue: number;
  previousCompleted: number;
  workThisPeriod: number;
  storedMaterials: number;
  totalCompletedAndStored: number;
  percentComplete: number;
  balanceToFinish: number;
  retainage: number;
}

// Computed G702 application summary for one invoice
export interface G702Summary {
  invoice: OwnerInvoice;
  rows: G703Row[];
  originalContractSum: number;
  netChangeOrders: number;
  contractSumToDate: number;
  totalCompletedAndStored: number;
  retainagePercent: number;
  totalRetainage: number;
  totalEarnedLessRetainage: number;
  previousCertificates: number;
  currentPaymentDue: number;
  balanceToFinishIncludingRetainage: number;
}
