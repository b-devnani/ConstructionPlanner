import {
  type Submittal, type InsertSubmittal,
  type Rfi, type InsertRfi,
  type Drawing, type InsertDrawing,
  type SpecSection, type InsertSpecSection,
  type DailyLog, type InsertDailyLog,
  type ManpowerEntry, type InsertManpowerEntry,
  type PunchItem, type InsertPunchItem,
  type PrimeContract, type UpdatePrimeContract,
  type SovLineItem, type InsertSovLineItem,
  type ChangeEvent, type InsertChangeEvent,
  type ChangeEventLineItem, type InsertChangeEventLineItem,
  type ChangeOrder, type InsertChangeOrder,
  type ChangeOrderLineItem, type InsertChangeOrderLineItem,
  type BudgetLineItem, type InsertBudgetLineItem,
  type BudgetRow, type BudgetSummary, type ContractFinancials,
  type User, type SafeUser,
  type Attachment,
  type SubmittalStep, type InsertSubmittalStep,
  type Notification,
  type DrawingPin, type InsertDrawingPin,
  type Commitment, type InsertCommitment,
  type CommitmentLineItem, type InsertCommitmentLineItem,
  type OwnerInvoice, type InsertOwnerInvoice,
  type InvoiceLineItem, type InsertInvoiceLineItem,
  type G702Summary, type G703Row,
} from "@shared/procore";
import { PersistenceManager, createSnapshotStore, type Snapshot } from "./persistence";
import { hashPassword } from "./password";

const now = () => new Date().toISOString();
const today = () => new Date().toISOString().split("T")[0];
const daysFromToday = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
};
const pad = (n: number) => String(n).padStart(3, "0");

/**
 * In-memory storage for all Procore-style project management tools.
 * Follows the same pattern as MemStorage in server/storage.ts.
 */
export class ProcoreStorage {
  private submittals = new Map<number, Submittal>();
  private rfis = new Map<number, Rfi>();
  private drawings = new Map<number, Drawing>();
  private specSections = new Map<number, SpecSection>();
  private dailyLogs = new Map<number, DailyLog>();
  private manpowerEntries = new Map<number, ManpowerEntry>();
  private punchItems = new Map<number, PunchItem>();
  private primeContract: PrimeContract;
  private sovLineItems = new Map<number, SovLineItem>();
  private changeEvents = new Map<number, ChangeEvent>();
  private changeEventLineItems = new Map<number, ChangeEventLineItem>();
  private changeOrders = new Map<number, ChangeOrder>();
  private changeOrderLineItems = new Map<number, ChangeOrderLineItem>();
  private budgetLineItems = new Map<number, BudgetLineItem>();
  private users = new Map<number, User>();
  private attachments = new Map<number, Attachment>();
  private submittalSteps = new Map<number, SubmittalStep>();
  private notifications = new Map<number, Notification>();
  private drawingPins = new Map<number, DrawingPin>();
  private commitments = new Map<number, Commitment>();
  private commitmentLineItems = new Map<number, CommitmentLineItem>();
  private ownerInvoices = new Map<number, OwnerInvoice>();
  private invoiceLineItems = new Map<number, InvoiceLineItem>();

  private persistence: PersistenceManager | null = null;

  private nextId: Record<string, number> = {
    submittal: 1, rfi: 1, drawing: 1, spec: 1, dailyLog: 1, manpower: 1,
    punch: 1, sov: 1, changeEvent: 1, ceLine: 1, changeOrder: 1, coLine: 1, budget: 1,
    user: 1, attachment: 1, submittalStep: 1, notification: 1, drawingPin: 1,
    commitment: 1, commitmentLine: 1, invoice: 1, invoiceLine: 1,
  };

  constructor() {
    this.primeContract = {
      id: 1,
      number: "PC-001",
      title: "General Construction Agreement - Riverside Medical Center",
      owner: "Riverside Health Partners LLC",
      contractor: "Summit Builders Inc.",
      architect: "Hartman + Cole Architects",
      status: "Approved",
      executed: true,
      contractDate: daysFromToday(-120),
      startDate: daysFromToday(-90),
      substantialCompletionDate: daysFromToday(275),
      actualCompletionDate: null,
      signedContractReceivedDate: daysFromToday(-110),
      retainagePercent: 10,
      description: "Lump sum agreement for the ground-up construction of a 4-story, 85,000 SF medical office building including sitework, core & shell, and interior fit-out.",
      inclusions: "All labor, materials, equipment, and supervision per the contract documents dated as issued for construction.",
      exclusions: "Owner-furnished medical equipment, FF&E, low-voltage cabling beyond conduit and boxes, utility company fees.",
      createdAt: now(),
    };
  }

  /**
   * Loads the persisted snapshot (PostgreSQL when DATABASE_URL is set, JSON
   * file otherwise) or seeds demo data on first boot, then wraps all mutating
   * methods so every write schedules a debounced persist.
   */
  async init(): Promise<void> {
    const store = createSnapshotStore();
    const snapshot = await store.load();
    if (snapshot) {
      this.loadSnapshot(snapshot);
    } else {
      this.seed();
    }
    this.persistence = new PersistenceManager(store, () => this.toSnapshot());
    this.wrapMutators();
    if (!snapshot) this.persistence.schedule();
    console.log(`[storage] persistence backend: ${store.describe()}`);
  }

  private collections(): Record<string, Map<number, any>> {
    return {
      submittals: this.submittals, rfis: this.rfis, drawings: this.drawings,
      specSections: this.specSections, dailyLogs: this.dailyLogs,
      manpowerEntries: this.manpowerEntries, punchItems: this.punchItems,
      sovLineItems: this.sovLineItems, changeEvents: this.changeEvents,
      changeEventLineItems: this.changeEventLineItems, changeOrders: this.changeOrders,
      changeOrderLineItems: this.changeOrderLineItems, budgetLineItems: this.budgetLineItems,
      users: this.users, attachments: this.attachments, submittalSteps: this.submittalSteps,
      notifications: this.notifications, drawingPins: this.drawingPins,
      commitments: this.commitments, commitmentLineItems: this.commitmentLineItems,
      ownerInvoices: this.ownerInvoices, invoiceLineItems: this.invoiceLineItems,
    };
  }

  private toSnapshot(): Snapshot {
    const snapshot: Snapshot = {
      meta: { nextId: this.nextId },
      primeContract: this.primeContract,
    };
    for (const [key, map] of Object.entries(this.collections())) {
      snapshot[key] = Array.from(map.values());
    }
    return snapshot;
  }

  private loadSnapshot(snapshot: Snapshot): void {
    const meta = snapshot.meta as { nextId?: Record<string, number> } | undefined;
    if (meta?.nextId) this.nextId = { ...this.nextId, ...meta.nextId };
    if (snapshot.primeContract) this.primeContract = snapshot.primeContract as PrimeContract;
    for (const [key, map] of Object.entries(this.collections())) {
      const rows = snapshot[key];
      if (!Array.isArray(rows)) continue;
      map.clear();
      for (const row of rows) map.set(row.id, row);
    }
  }

  /** Wraps every create/update/delete/respond/mark method to persist after writes. */
  private wrapMutators(): void {
    const proto = Object.getPrototypeOf(this);
    for (const name of Object.getOwnPropertyNames(proto)) {
      if (!/^(create|update|delete|respond|mark)/.test(name)) continue;
      const original = (this as any)[name];
      if (typeof original !== "function") continue;
      (this as any)[name] = (...args: unknown[]) => {
        const result = original.apply(this, args);
        this.persistence?.schedule();
        return result;
      };
    }
  }

  // ----- generic helpers -----

  private list<T>(map: Map<number, T>): T[] {
    return Array.from(map.values());
  }

  private nextNumber(prefix: string, count: number): string {
    return `${prefix}-${pad(count + 1)}`;
  }

  // ----- Submittals -----

  getSubmittals(): Submittal[] { return this.list(this.submittals); }
  getSubmittal(id: number): Submittal | undefined { return this.submittals.get(id); }

  createSubmittal(data: InsertSubmittal): Submittal {
    const id = this.nextId.submittal++;
    const submittal: Submittal = {
      ...data,
      number: data.number ?? this.nextNumber("SUB", this.submittals.size),
      id,
      createdAt: now(),
    };
    this.submittals.set(id, submittal);
    return submittal;
  }

  updateSubmittal(id: number, data: Partial<Submittal>): Submittal | undefined {
    const existing = this.submittals.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data, id };
    this.submittals.set(id, updated);
    return updated;
  }

  deleteSubmittal(id: number): boolean { return this.submittals.delete(id); }

  // ----- RFIs -----

  getRfis(): Rfi[] { return this.list(this.rfis); }
  getRfi(id: number): Rfi | undefined { return this.rfis.get(id); }

  createRfi(data: InsertRfi): Rfi {
    const id = this.nextId.rfi++;
    const rfi: Rfi = {
      ...data,
      number: data.number ?? this.nextNumber("RFI", this.rfis.size),
      id,
      createdAt: now(),
    };
    this.rfis.set(id, rfi);
    return rfi;
  }

  updateRfi(id: number, data: Partial<Rfi>): Rfi | undefined {
    const existing = this.rfis.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data, id };
    // Stamp the closed date when an RFI transitions to Closed
    if (data.status === "Closed" && existing.status !== "Closed" && !data.dateClosed) {
      updated.dateClosed = today();
    }
    this.rfis.set(id, updated);
    return updated;
  }

  deleteRfi(id: number): boolean { return this.rfis.delete(id); }

  // ----- Drawings -----

  getDrawings(): Drawing[] { return this.list(this.drawings); }
  getDrawing(id: number): Drawing | undefined { return this.drawings.get(id); }

  createDrawing(data: InsertDrawing): Drawing {
    // A new revision of an existing drawing number supersedes prior revisions
    Array.from(this.drawings.values()).forEach(existing => {
      if (existing.number === data.number && existing.status === "Current") {
        existing.status = "Superseded";
      }
    });
    const id = this.nextId.drawing++;
    const drawing: Drawing = { ...data, id, createdAt: now() };
    this.drawings.set(id, drawing);
    return drawing;
  }

  updateDrawing(id: number, data: Partial<Drawing>): Drawing | undefined {
    const existing = this.drawings.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data, id };
    this.drawings.set(id, updated);
    return updated;
  }

  deleteDrawing(id: number): boolean { return this.drawings.delete(id); }

  // ----- Specifications -----

  getSpecSections(): SpecSection[] { return this.list(this.specSections); }
  getSpecSection(id: number): SpecSection | undefined { return this.specSections.get(id); }

  createSpecSection(data: InsertSpecSection): SpecSection {
    const id = this.nextId.spec++;
    const spec: SpecSection = { ...data, id, createdAt: now() };
    this.specSections.set(id, spec);
    return spec;
  }

  updateSpecSection(id: number, data: Partial<SpecSection>): SpecSection | undefined {
    const existing = this.specSections.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data, id };
    this.specSections.set(id, updated);
    return updated;
  }

  deleteSpecSection(id: number): boolean { return this.specSections.delete(id); }

  // ----- Daily Logs -----

  getDailyLogs(): DailyLog[] { return this.list(this.dailyLogs); }
  getDailyLog(id: number): DailyLog | undefined { return this.dailyLogs.get(id); }

  getDailyLogByDate(logDate: string): DailyLog | undefined {
    return this.list(this.dailyLogs).find(log => log.logDate === logDate);
  }

  createDailyLog(data: InsertDailyLog): DailyLog {
    const existing = this.getDailyLogByDate(data.logDate);
    if (existing) return existing;
    const id = this.nextId.dailyLog++;
    const log: DailyLog = { ...data, id, createdAt: now() };
    this.dailyLogs.set(id, log);
    return log;
  }

  updateDailyLog(id: number, data: Partial<DailyLog>): DailyLog | undefined {
    const existing = this.dailyLogs.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data, id };
    this.dailyLogs.set(id, updated);
    return updated;
  }

  deleteDailyLog(id: number): boolean {
    for (const entry of this.list(this.manpowerEntries)) {
      if (entry.dailyLogId === id) this.manpowerEntries.delete(entry.id);
    }
    return this.dailyLogs.delete(id);
  }

  getManpowerEntries(dailyLogId: number): ManpowerEntry[] {
    return this.list(this.manpowerEntries).filter(e => e.dailyLogId === dailyLogId);
  }

  createManpowerEntry(data: InsertManpowerEntry): ManpowerEntry {
    const id = this.nextId.manpower++;
    const entry: ManpowerEntry = { ...data, id };
    this.manpowerEntries.set(id, entry);
    return entry;
  }

  updateManpowerEntry(id: number, data: Partial<ManpowerEntry>): ManpowerEntry | undefined {
    const existing = this.manpowerEntries.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data, id };
    this.manpowerEntries.set(id, updated);
    return updated;
  }

  deleteManpowerEntry(id: number): boolean { return this.manpowerEntries.delete(id); }

  // ----- Punch List -----

  getPunchItems(): PunchItem[] { return this.list(this.punchItems); }
  getPunchItem(id: number): PunchItem | undefined { return this.punchItems.get(id); }

  createPunchItem(data: InsertPunchItem): PunchItem {
    const id = this.nextId.punch++;
    const item: PunchItem = {
      ...data,
      number: data.number ?? String(this.punchItems.size + 1),
      id,
      createdAt: now(),
    };
    this.punchItems.set(id, item);
    return item;
  }

  updatePunchItem(id: number, data: Partial<PunchItem>): PunchItem | undefined {
    const existing = this.punchItems.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data, id };
    if (data.status === "Closed" && existing.status !== "Closed" && !data.dateClosed) {
      updated.dateClosed = today();
    }
    this.punchItems.set(id, updated);
    return updated;
  }

  deletePunchItem(id: number): boolean { return this.punchItems.delete(id); }

  // ----- Prime Contract -----

  getPrimeContract(): PrimeContract { return this.primeContract; }

  updatePrimeContract(data: UpdatePrimeContract): PrimeContract {
    this.primeContract = { ...this.primeContract, ...data, id: this.primeContract.id };
    return this.primeContract;
  }

  getSovLineItems(): SovLineItem[] { return this.list(this.sovLineItems); }

  createSovLineItem(data: InsertSovLineItem): SovLineItem {
    const id = this.nextId.sov++;
    const item: SovLineItem = { ...data, id };
    this.sovLineItems.set(id, item);
    return item;
  }

  updateSovLineItem(id: number, data: Partial<SovLineItem>): SovLineItem | undefined {
    const existing = this.sovLineItems.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data, id };
    this.sovLineItems.set(id, updated);
    return updated;
  }

  deleteSovLineItem(id: number): boolean { return this.sovLineItems.delete(id); }

  // ----- Change Events -----

  getChangeEvents(): ChangeEvent[] { return this.list(this.changeEvents); }
  getChangeEvent(id: number): ChangeEvent | undefined { return this.changeEvents.get(id); }

  createChangeEvent(data: InsertChangeEvent): ChangeEvent {
    const id = this.nextId.changeEvent++;
    const event: ChangeEvent = {
      ...data,
      number: data.number ?? this.nextNumber("CE", this.changeEvents.size),
      id,
      createdAt: now(),
    };
    this.changeEvents.set(id, event);
    return event;
  }

  updateChangeEvent(id: number, data: Partial<ChangeEvent>): ChangeEvent | undefined {
    const existing = this.changeEvents.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data, id };
    this.changeEvents.set(id, updated);
    return updated;
  }

  deleteChangeEvent(id: number): boolean {
    for (const line of this.list(this.changeEventLineItems)) {
      if (line.changeEventId === id) this.changeEventLineItems.delete(line.id);
    }
    return this.changeEvents.delete(id);
  }

  getChangeEventLineItems(changeEventId?: number): ChangeEventLineItem[] {
    const all = this.list(this.changeEventLineItems);
    return changeEventId === undefined ? all : all.filter(l => l.changeEventId === changeEventId);
  }

  createChangeEventLineItem(data: InsertChangeEventLineItem): ChangeEventLineItem {
    const id = this.nextId.ceLine++;
    const line: ChangeEventLineItem = { ...data, id };
    this.changeEventLineItems.set(id, line);
    return line;
  }

  updateChangeEventLineItem(id: number, data: Partial<ChangeEventLineItem>): ChangeEventLineItem | undefined {
    const existing = this.changeEventLineItems.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data, id };
    this.changeEventLineItems.set(id, updated);
    return updated;
  }

  deleteChangeEventLineItem(id: number): boolean { return this.changeEventLineItems.delete(id); }

  // ----- Change Orders -----

  getChangeOrders(): ChangeOrder[] { return this.list(this.changeOrders); }
  getChangeOrder(id: number): ChangeOrder | undefined { return this.changeOrders.get(id); }

  createChangeOrder(data: InsertChangeOrder): ChangeOrder {
    const id = this.nextId.changeOrder++;
    const order: ChangeOrder = {
      ...data,
      number: data.number ?? this.nextNumber("PCO", this.changeOrders.size),
      dateCreated: data.dateCreated ?? today(),
      id,
      createdAt: now(),
    };
    this.changeOrders.set(id, order);
    return order;
  }

  updateChangeOrder(id: number, data: Partial<ChangeOrder>): ChangeOrder | undefined {
    const existing = this.changeOrders.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data, id };
    this.changeOrders.set(id, updated);
    return updated;
  }

  deleteChangeOrder(id: number): boolean {
    for (const line of this.list(this.changeOrderLineItems)) {
      if (line.changeOrderId === id) this.changeOrderLineItems.delete(line.id);
    }
    return this.changeOrders.delete(id);
  }

  getChangeOrderLineItems(changeOrderId?: number): ChangeOrderLineItem[] {
    const all = this.list(this.changeOrderLineItems);
    return changeOrderId === undefined ? all : all.filter(l => l.changeOrderId === changeOrderId);
  }

  createChangeOrderLineItem(data: InsertChangeOrderLineItem): ChangeOrderLineItem {
    const id = this.nextId.coLine++;
    const line: ChangeOrderLineItem = { ...data, id };
    this.changeOrderLineItems.set(id, line);
    return line;
  }

  updateChangeOrderLineItem(id: number, data: Partial<ChangeOrderLineItem>): ChangeOrderLineItem | undefined {
    const existing = this.changeOrderLineItems.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data, id };
    this.changeOrderLineItems.set(id, updated);
    return updated;
  }

  deleteChangeOrderLineItem(id: number): boolean { return this.changeOrderLineItems.delete(id); }

  // ----- Budget -----

  getBudgetLineItems(): BudgetLineItem[] { return this.list(this.budgetLineItems); }

  createBudgetLineItem(data: InsertBudgetLineItem): BudgetLineItem {
    const id = this.nextId.budget++;
    const item: BudgetLineItem = { ...data, id };
    this.budgetLineItems.set(id, item);
    return item;
  }

  updateBudgetLineItem(id: number, data: Partial<BudgetLineItem>): BudgetLineItem | undefined {
    const existing = this.budgetLineItems.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data, id };
    this.budgetLineItems.set(id, updated);
    return updated;
  }

  deleteBudgetLineItem(id: number): boolean { return this.budgetLineItems.delete(id); }

  /**
   * Approved change order amounts grouped by cost code. Lines without a cost
   * code roll into the "" bucket and surface only in budget totals.
   */
  private approvedCoAmountsByCostCode(): Map<string, number> {
    const approvedIds = new Set(
      this.getChangeOrders().filter(co => co.status === "Approved").map(co => co.id),
    );
    const byCode = new Map<string, number>();
    Array.from(this.changeOrderLineItems.values()).forEach(line => {
      if (!approvedIds.has(line.changeOrderId)) return;
      byCode.set(line.costCode, (byCode.get(line.costCode) ?? 0) + line.amount);
    });
    return byCode;
  }

  /** Executed/complete commitment dollars grouped by cost code. */
  private commitmentAmountsByCostCode(): Map<string, number> {
    const activeIds = new Set(
      this.getCommitments()
        .filter(c => c.status === "Executed" || c.status === "Complete")
        .map(c => c.id),
    );
    const byCode = new Map<string, number>();
    Array.from(this.commitmentLineItems.values()).forEach(line => {
      if (!activeIds.has(line.commitmentId)) return;
      byCode.set(line.costCode, (byCode.get(line.costCode) ?? 0) + line.amount);
    });
    return byCode;
  }

  getBudgetSummary(): BudgetSummary {
    const coByCode = this.approvedCoAmountsByCostCode();
    const commitByCode = this.commitmentAmountsByCostCode();
    const matchedCodes = new Set<string>();

    const rows: BudgetRow[] = this.getBudgetLineItems().map(item => {
      const approvedCOs = coByCode.get(item.costCode) ?? 0;
      if (coByCode.has(item.costCode)) matchedCodes.add(item.costCode);
      // committed = manual entry + executed commitments (subcontracts/POs)
      const committedCosts = item.committedCosts + (commitByCode.get(item.costCode) ?? 0);
      const revisedBudget = item.originalBudget + item.budgetModifications + approvedCOs;
      const projectedCosts = committedCosts + item.directCosts + item.pendingBudgetChanges;
      return {
        ...item,
        committedCosts,
        approvedCOs,
        revisedBudget,
        projectedCosts,
        projectedOverUnder: revisedBudget - projectedCosts,
        forecastToComplete: Math.max(0, revisedBudget - committedCosts - item.directCosts),
      };
    });

    // Approved CO dollars on cost codes without a budget line still belong in totals
    let unmatchedCOs = 0;
    Array.from(coByCode.entries()).forEach(([code, amount]) => {
      if (!matchedCodes.has(code)) unmatchedCOs += amount;
    });

    const sum = (fn: (r: BudgetRow) => number) => rows.reduce((acc, r) => acc + fn(r), 0);
    const totals = {
      originalBudget: sum(r => r.originalBudget),
      budgetModifications: sum(r => r.budgetModifications),
      approvedCOs: sum(r => r.approvedCOs) + unmatchedCOs,
      revisedBudget: sum(r => r.revisedBudget) + unmatchedCOs,
      committedCosts: sum(r => r.committedCosts),
      directCosts: sum(r => r.directCosts),
      pendingBudgetChanges: sum(r => r.pendingBudgetChanges),
      projectedCosts: sum(r => r.projectedCosts),
      projectedOverUnder: sum(r => r.projectedOverUnder) + unmatchedCOs,
      forecastToComplete: sum(r => r.forecastToComplete),
    };
    return { rows, totals };
  }

  getContractFinancials(): ContractFinancials {
    const originalContractValue = this.getSovLineItems()
      .reduce((acc, item) => acc + item.scheduledValue, 0);

    let approved = 0;
    let pending = 0;
    Array.from(this.changeOrders.values()).forEach(co => {
      const amount = this.getChangeOrderLineItems(co.id)
        .reduce((acc, line) => acc + line.amount, 0);
      if (co.status === "Approved") approved += amount;
      else if (co.status === "Pending - In Review" || co.status === "Draft") pending += amount;
    });

    return {
      originalContractValue,
      approvedChangeOrders: approved,
      pendingChangeOrders: pending,
      revisedContractValue: originalContractValue + approved,
      pendingRevisedContractValue: originalContractValue + approved + pending,
    };
  }

  // ----- Users & directory -----

  private toSafeUser(user: User): SafeUser {
    const { passwordHash, ...safe } = user;
    return safe;
  }

  getUsers(): SafeUser[] {
    return this.list(this.users).map(u => this.toSafeUser(u));
  }

  getUser(id: number): SafeUser | undefined {
    const user = this.users.get(id);
    return user ? this.toSafeUser(user) : undefined;
  }

  getUserWithPassword(email: string): User | undefined {
    return this.list(this.users).find(
      u => u.email.toLowerCase() === email.toLowerCase(),
    );
  }

  findUserByName(name: string): SafeUser | undefined {
    const needle = name.trim().toLowerCase();
    if (!needle) return undefined;
    const user = this.list(this.users).find(u => u.name.toLowerCase() === needle);
    return user ? this.toSafeUser(user) : undefined;
  }

  createUser(data: Omit<User, "id" | "createdAt">): SafeUser {
    const id = this.nextId.user++;
    const user: User = { ...data, id, createdAt: now() };
    this.users.set(id, user);
    return this.toSafeUser(user);
  }

  updateUser(id: number, data: Partial<User>): SafeUser | undefined {
    const existing = this.users.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data, id };
    this.users.set(id, updated);
    return this.toSafeUser(updated);
  }

  deleteUser(id: number): boolean { return this.users.delete(id); }

  // ----- Attachments -----

  getAttachments(entityType: string, entityId: number): Attachment[] {
    return this.list(this.attachments).filter(
      a => a.entityType === entityType && a.entityId === entityId,
    );
  }

  getAttachment(id: number): Attachment | undefined { return this.attachments.get(id); }

  createAttachment(data: Omit<Attachment, "id" | "createdAt">): Attachment {
    const id = this.nextId.attachment++;
    const attachment: Attachment = { ...data, id, createdAt: now() };
    this.attachments.set(id, attachment);
    return attachment;
  }

  deleteAttachment(id: number): boolean { return this.attachments.delete(id); }

  // ----- Submittal workflow steps -----

  getSubmittalSteps(submittalId: number): SubmittalStep[] {
    return this.list(this.submittalSteps)
      .filter(s => s.submittalId === submittalId)
      .sort((a, b) => a.stepNumber - b.stepNumber);
  }

  getSubmittalStep(id: number): SubmittalStep | undefined {
    return this.submittalSteps.get(id);
  }

  createSubmittalStep(data: InsertSubmittalStep): SubmittalStep {
    const id = this.nextId.submittalStep++;
    const step: SubmittalStep = { ...data, id };
    this.submittalSteps.set(id, step);
    // Putting the first pending step in play moves the submittal into review
    const submittal = this.submittals.get(data.submittalId);
    if (submittal && (submittal.status === "Draft" || submittal.status === "Open")) {
      const firstPending = this.getSubmittalSteps(data.submittalId).find(s => s.status === "Pending");
      if (firstPending) {
        this.updateSubmittal(submittal.id, {
          status: "Pending Approval",
          ballInCourt: firstPending.approverName,
          dateSubmitted: submittal.dateSubmitted ?? today(),
        });
      }
    }
    return step;
  }

  deleteSubmittalStep(id: number): boolean { return this.submittalSteps.delete(id); }

  /**
   * Records an approver's response and advances the workflow: approvals move
   * ball-in-court to the next pending step (or close out the review), while
   * rejections/revise-and-resubmit send it back to the responsible contractor.
   */
  respondToSubmittalStep(
    stepId: number,
    status: SubmittalStep["status"],
    comments: string,
  ): { step: SubmittalStep; submittal: Submittal | undefined } | undefined {
    const step = this.submittalSteps.get(stepId);
    if (!step) return undefined;
    const updated: SubmittalStep = { ...step, status, comments, respondedAt: now() };
    this.submittalSteps.set(stepId, updated);

    let submittal = this.submittals.get(step.submittalId);
    if (submittal) {
      if (status === "Approved" || status === "Approved as Noted") {
        const next = this.getSubmittalSteps(step.submittalId).find(s => s.status === "Pending");
        if (next) {
          submittal = this.updateSubmittal(submittal.id, {
            status: "Pending Approval",
            ballInCourt: next.approverName,
          });
        } else {
          const anyNoted = this.getSubmittalSteps(step.submittalId)
            .some(s => s.status === "Approved as Noted");
          submittal = this.updateSubmittal(submittal.id, {
            status: anyNoted ? "Approved as Noted" : "Approved",
            ballInCourt: submittal.responsibleContractor,
            dateReturned: today(),
          });
        }
      } else if (status === "Revise and Resubmit" || status === "Rejected") {
        submittal = this.updateSubmittal(submittal.id, {
          status,
          ballInCourt: submittal.responsibleContractor,
          dateReturned: today(),
        });
      }
    }
    return { step: updated, submittal };
  }

  // ----- Notifications -----

  getNotifications(userId: number): Notification[] {
    return this.list(this.notifications)
      .filter(n => n.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  createNotification(data: Omit<Notification, "id" | "createdAt">): Notification {
    const id = this.nextId.notification++;
    const notification: Notification = { ...data, id, createdAt: now() };
    this.notifications.set(id, notification);
    return notification;
  }

  hasNotification(userId: number, entityType: string, entityId: number, title: string): boolean {
    return this.list(this.notifications).some(
      n => n.userId === userId && n.entityType === entityType &&
        n.entityId === entityId && n.title === title,
    );
  }

  markNotificationRead(id: number): Notification | undefined {
    const existing = this.notifications.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, read: true };
    this.notifications.set(id, updated);
    return updated;
  }

  markAllNotificationsRead(userId: number): void {
    Array.from(this.notifications.values()).forEach(n => {
      if (n.userId === userId && !n.read) {
        this.notifications.set(n.id, { ...n, read: true });
      }
    });
    this.persistence?.schedule();
  }

  // ----- Drawing pins -----

  getDrawingPins(drawingId: number): DrawingPin[] {
    return this.list(this.drawingPins).filter(p => p.drawingId === drawingId);
  }

  createDrawingPin(data: InsertDrawingPin): DrawingPin {
    const id = this.nextId.drawingPin++;
    const pin: DrawingPin = { ...data, id, createdAt: now() };
    this.drawingPins.set(id, pin);
    return pin;
  }

  updateDrawingPin(id: number, data: Partial<DrawingPin>): DrawingPin | undefined {
    const existing = this.drawingPins.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data, id };
    this.drawingPins.set(id, updated);
    return updated;
  }

  deleteDrawingPin(id: number): boolean { return this.drawingPins.delete(id); }

  // ----- Commitments (subcontracts & purchase orders) -----

  getCommitments(): Commitment[] { return this.list(this.commitments); }
  getCommitment(id: number): Commitment | undefined { return this.commitments.get(id); }

  createCommitment(data: InsertCommitment): Commitment {
    const id = this.nextId.commitment++;
    const prefix = data.commitmentType === "Purchase Order" ? "PO" : "SC";
    const sameType = this.getCommitments()
      .filter(c => c.commitmentType === (data.commitmentType ?? "Subcontract")).length;
    const commitment: Commitment = {
      ...data,
      number: data.number ?? `${prefix}-${pad(sameType + 1)}`,
      id,
      createdAt: now(),
    };
    this.commitments.set(id, commitment);
    return commitment;
  }

  updateCommitment(id: number, data: Partial<Commitment>): Commitment | undefined {
    const existing = this.commitments.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data, id };
    if ((data.status === "Executed") && existing.status !== "Executed" && !data.executedDate) {
      updated.executedDate = today();
    }
    this.commitments.set(id, updated);
    return updated;
  }

  deleteCommitment(id: number): boolean {
    for (const line of this.list(this.commitmentLineItems)) {
      if (line.commitmentId === id) this.commitmentLineItems.delete(line.id);
    }
    return this.commitments.delete(id);
  }

  getCommitmentLineItems(commitmentId?: number): CommitmentLineItem[] {
    const all = this.list(this.commitmentLineItems);
    return commitmentId === undefined ? all : all.filter(l => l.commitmentId === commitmentId);
  }

  createCommitmentLineItem(data: InsertCommitmentLineItem): CommitmentLineItem {
    const id = this.nextId.commitmentLine++;
    const line: CommitmentLineItem = { ...data, id };
    this.commitmentLineItems.set(id, line);
    return line;
  }

  updateCommitmentLineItem(id: number, data: Partial<CommitmentLineItem>): CommitmentLineItem | undefined {
    const existing = this.commitmentLineItems.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data, id };
    this.commitmentLineItems.set(id, updated);
    return updated;
  }

  deleteCommitmentLineItem(id: number): boolean { return this.commitmentLineItems.delete(id); }

  // ----- Owner invoices (G702/G703 payment applications) -----

  getOwnerInvoices(): OwnerInvoice[] {
    return this.list(this.ownerInvoices).sort((a, b) => a.id - b.id);
  }

  getOwnerInvoice(id: number): OwnerInvoice | undefined { return this.ownerInvoices.get(id); }

  /** Creates a pay app with one line per SOV item, zeroed out for entry. */
  createOwnerInvoice(data: InsertOwnerInvoice): OwnerInvoice {
    const id = this.nextId.invoice++;
    const invoice: OwnerInvoice = {
      ...data,
      number: data.number ?? this.nextNumber("INV", this.ownerInvoices.size),
      id,
      createdAt: now(),
    };
    this.ownerInvoices.set(id, invoice);
    for (const sovItem of this.getSovLineItems()) {
      this.createInvoiceLineItem({
        invoiceId: id, sovLineItemId: sovItem.id, workThisPeriod: 0, storedMaterials: 0,
      });
    }
    return invoice;
  }

  updateOwnerInvoice(id: number, data: Partial<OwnerInvoice>): OwnerInvoice | undefined {
    const existing = this.ownerInvoices.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data, id };
    this.ownerInvoices.set(id, updated);
    return updated;
  }

  deleteOwnerInvoice(id: number): boolean {
    for (const line of this.list(this.invoiceLineItems)) {
      if (line.invoiceId === id) this.invoiceLineItems.delete(line.id);
    }
    return this.ownerInvoices.delete(id);
  }

  getInvoiceLineItems(invoiceId: number): InvoiceLineItem[] {
    return this.list(this.invoiceLineItems).filter(l => l.invoiceId === invoiceId);
  }

  createInvoiceLineItem(data: InsertInvoiceLineItem): InvoiceLineItem {
    const id = this.nextId.invoiceLine++;
    const line: InvoiceLineItem = { ...data, id };
    this.invoiceLineItems.set(id, line);
    return line;
  }

  updateInvoiceLineItem(id: number, data: Partial<InvoiceLineItem>): InvoiceLineItem | undefined {
    const existing = this.invoiceLineItems.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data, id };
    this.invoiceLineItems.set(id, updated);
    return updated;
  }

  /** Computes the G702 application summary and G703 continuation sheet. */
  getG702Summary(invoiceId: number): G702Summary | undefined {
    const invoice = this.ownerInvoices.get(invoiceId);
    if (!invoice) return undefined;
    const retainagePercent = this.primeContract.retainagePercent;

    // prior = earlier applications, by creation order
    const priorInvoiceIds = new Set(
      this.getOwnerInvoices().filter(inv => inv.id < invoiceId).map(inv => inv.id),
    );
    const priorBySov = new Map<number, number>();
    Array.from(this.invoiceLineItems.values()).forEach(line => {
      if (!priorInvoiceIds.has(line.invoiceId)) return;
      priorBySov.set(
        line.sovLineItemId,
        (priorBySov.get(line.sovLineItemId) ?? 0) + line.workThisPeriod + line.storedMaterials,
      );
    });

    const lines = this.getInvoiceLineItems(invoiceId);
    const rows: G703Row[] = [];
    for (const line of lines) {
      const sovItem = this.sovLineItems.get(line.sovLineItemId);
      if (!sovItem) continue;
      const previousCompleted = priorBySov.get(line.sovLineItemId) ?? 0;
      const totalCompletedAndStored = previousCompleted + line.workThisPeriod + line.storedMaterials;
      rows.push({
        lineItemId: line.id,
        sovLineItemId: sovItem.id,
        itemNumber: sovItem.itemNumber,
        costCode: sovItem.costCode,
        description: sovItem.description,
        scheduledValue: sovItem.scheduledValue,
        previousCompleted,
        workThisPeriod: line.workThisPeriod,
        storedMaterials: line.storedMaterials,
        totalCompletedAndStored,
        percentComplete: sovItem.scheduledValue > 0
          ? (totalCompletedAndStored / sovItem.scheduledValue) * 100 : 0,
        balanceToFinish: sovItem.scheduledValue - totalCompletedAndStored,
        retainage: totalCompletedAndStored * (retainagePercent / 100),
      });
    }

    const originalContractSum = this.getSovLineItems()
      .reduce((acc, item) => acc + item.scheduledValue, 0);
    const netChangeOrders = this.getContractFinancials().approvedChangeOrders;
    const contractSumToDate = originalContractSum + netChangeOrders;
    const totalCompletedAndStored = rows.reduce((acc, r) => acc + r.totalCompletedAndStored, 0);
    const totalRetainage = totalCompletedAndStored * (retainagePercent / 100);
    const totalEarnedLessRetainage = totalCompletedAndStored - totalRetainage;
    const previousCompletedTotal = rows.reduce((acc, r) => acc + r.previousCompleted, 0);
    const previousCertificates =
      previousCompletedTotal - previousCompletedTotal * (retainagePercent / 100);

    return {
      invoice,
      rows,
      originalContractSum,
      netChangeOrders,
      contractSumToDate,
      totalCompletedAndStored,
      retainagePercent,
      totalRetainage,
      totalEarnedLessRetainage,
      previousCertificates,
      currentPaymentDue: totalEarnedLessRetainage - previousCertificates,
      balanceToFinishIncludingRetainage: contractSumToDate - totalEarnedLessRetainage,
    };
  }

  // ----- Overdue scanning (feeds the notification reminders) -----

  findOverdueItems(): Array<{
    entityType: string; entityId: number; title: string;
    assigneeName: string; dueDate: string;
  }> {
    const cutoff = today();
    const overdue: Array<{
      entityType: string; entityId: number; title: string;
      assigneeName: string; dueDate: string;
    }> = [];

    for (const rfi of this.getRfis()) {
      if (rfi.status === "Open" && rfi.dueDate && rfi.dueDate < cutoff) {
        overdue.push({
          entityType: "rfi", entityId: rfi.id,
          title: `RFI ${rfi.number} is overdue (due ${rfi.dueDate})`,
          assigneeName: rfi.assignedTo || rfi.ballInCourt, dueDate: rfi.dueDate,
        });
      }
    }
    for (const item of this.getPunchItems()) {
      if ((item.status === "Open" || item.status === "Ready for Review") &&
          item.dueDate && item.dueDate < cutoff) {
        overdue.push({
          entityType: "punchItem", entityId: item.id,
          title: `Punch item #${item.number} is overdue (due ${item.dueDate})`,
          assigneeName: item.assignee || item.ballInCourt, dueDate: item.dueDate,
        });
      }
    }
    for (const step of this.list(this.submittalSteps)) {
      if (step.status === "Pending" && step.dueDate && step.dueDate < cutoff) {
        const submittal = this.submittals.get(step.submittalId);
        overdue.push({
          entityType: "submittal", entityId: step.submittalId,
          title: `Submittal ${submittal?.number ?? step.submittalId} review is overdue (due ${step.dueDate})`,
          assigneeName: step.approverName, dueDate: step.dueDate,
        });
      }
    }
    return overdue;
  }

  // ----- Seed data -----

  private seed(): void {
    // Submittals
    this.createSubmittal({
      title: "Structural Steel Shop Drawings - Levels 1-2", revision: 0,
      specSection: "05 12 00", submittalType: "Shop Drawing", status: "Approved",
      responsibleContractor: "Apex Steel Fabricators", receivedFrom: "Apex Steel Fabricators",
      submitBy: "J. Ramirez", ballInCourt: "Hartman + Cole Architects",
      dateSubmitted: daysFromToday(-45), dateReturned: daysFromToday(-30),
      dueDate: daysFromToday(-28), leadTimeDays: 60, requiredOnSiteDate: daysFromToday(20),
      description: "Fabrication and erection drawings for structural steel framing, levels 1 and 2.",
    });
    this.createSubmittal({
      title: "Curtain Wall System Product Data", revision: 1,
      specSection: "08 44 13", submittalType: "Product Data", status: "Revise and Resubmit",
      responsibleContractor: "ClearView Glazing", receivedFrom: "ClearView Glazing",
      submitBy: "M. Chen", ballInCourt: "ClearView Glazing",
      dateSubmitted: daysFromToday(-20), dateReturned: daysFromToday(-8),
      dueDate: daysFromToday(5), leadTimeDays: 90, requiredOnSiteDate: daysFromToday(95),
      description: "Aluminum curtain wall framing, glazing, and performance data. Architect requires updated thermal calcs.",
    });
    this.createSubmittal({
      title: "Rooftop AHU Equipment Submittal", revision: 0,
      specSection: "23 73 13", submittalType: "Product Data", status: "Pending Approval",
      responsibleContractor: "Metro HVAC", receivedFrom: "Metro HVAC",
      submitBy: "T. Okafor", ballInCourt: "Hartman + Cole Architects",
      dateSubmitted: daysFromToday(-5), dateReturned: null,
      dueDate: daysFromToday(9), leadTimeDays: 120, requiredOnSiteDate: daysFromToday(140),
      description: "Air handling units AHU-1 through AHU-4 with sound attenuation data.",
    });
    this.createSubmittal({
      title: "Lobby Stone Flooring Samples", revision: 0,
      specSection: "09 63 40", submittalType: "Sample", status: "Open",
      responsibleContractor: "Granite & Co. Interiors", receivedFrom: "Granite & Co. Interiors",
      submitBy: "L. Park", ballInCourt: "Granite & Co. Interiors",
      dateSubmitted: null, dateReturned: null,
      dueDate: daysFromToday(21), leadTimeDays: 45, requiredOnSiteDate: daysFromToday(180),
      description: "12x24 honed granite samples in three color options for owner selection.",
    });

    // RFIs
    this.createRfi({
      subject: "Footing F-12 conflict with existing utility duct bank",
      question: "Excavation at grid C-4 exposed an active electrical duct bank running through the footprint of footing F-12. Please advise on redesign or relocation.",
      answer: "Revised footing detail SK-S-014 issued. Step footing around duct bank per attached sketch; no relocation required.",
      status: "Closed", priority: "High",
      assignedTo: "D. Whitfield (Hartman + Cole)", rfiManager: "S. Patel (Summit Builders)",
      receivedFrom: "City Concrete", responsibleContractor: "City Concrete",
      specSection: "03 30 00", drawingNumber: "S-201", location: "Grid C-4",
      costImpact: "Yes", costImpactAmount: 18500, scheduleImpact: "Yes", scheduleImpactDays: 4,
      ballInCourt: "", dateInitiated: daysFromToday(-38), dueDate: daysFromToday(-31), dateClosed: daysFromToday(-29),
    });
    this.createRfi({
      subject: "Door hardware set HW-7 conflict with card reader spec",
      question: "Hardware set HW-7 calls for mortise locksets, but the security spec 28 13 00 requires card readers with electric strikes at the same openings. Which governs?",
      status: "Open", priority: "Medium",
      assignedTo: "D. Whitfield (Hartman + Cole)", rfiManager: "S. Patel (Summit Builders)",
      receivedFrom: "Secure Door Systems", responsibleContractor: "Secure Door Systems",
      specSection: "08 71 00", drawingNumber: "A-601", location: "Level 2 - East Corridor",
      costImpact: "TBD", costImpactAmount: 0, scheduleImpact: "No", scheduleImpactDays: 0,
      ballInCourt: "Hartman + Cole Architects", dateInitiated: daysFromToday(-6), dueDate: daysFromToday(4), dateClosed: null,
      answer: "",
    });
    this.createRfi({
      subject: "Ceiling height discrepancy in Imaging Suite 145",
      question: "RCP A-121 shows 9'-0\" AFF ceiling in room 145, but mechanical section M-301 shows ductwork bottom at 8'-6\" AFF. Confirm ceiling height or reroute duct.",
      status: "Open", priority: "Urgent",
      assignedTo: "R. Gomez (Hartman + Cole)", rfiManager: "S. Patel (Summit Builders)",
      receivedFrom: "Metro HVAC", responsibleContractor: "Metro HVAC",
      specSection: "23 31 13", drawingNumber: "M-301", location: "Level 1 - Room 145",
      costImpact: "TBD", costImpactAmount: 0, scheduleImpact: "TBD", scheduleImpactDays: 0,
      ballInCourt: "Hartman + Cole Architects", dateInitiated: daysFromToday(-2), dueDate: daysFromToday(5), dateClosed: null,
      answer: "",
    });

    // Drawings
    const drawings: Array<{ number: string; title: string; discipline: Drawing["discipline"]; revision: string; set: string; status: Drawing["status"] }> = [
      { number: "A-101", title: "Level 1 Floor Plan", discipline: "Architectural", revision: "2", set: "IFC", status: "Current" },
      { number: "A-102", title: "Level 2 Floor Plan", discipline: "Architectural", revision: "1", set: "IFC", status: "Current" },
      { number: "A-121", title: "Level 1 Reflected Ceiling Plan", discipline: "Architectural", revision: "1", set: "IFC", status: "Current" },
      { number: "A-401", title: "Building Elevations", discipline: "Architectural", revision: "0", set: "IFC", status: "Current" },
      { number: "S-201", title: "Foundation Plan", discipline: "Structural", revision: "3", set: "IFC", status: "Current" },
      { number: "S-301", title: "Framing Plan - Level 2", discipline: "Structural", revision: "1", set: "IFC", status: "Current" },
      { number: "M-101", title: "Level 1 HVAC Plan", discipline: "Mechanical", revision: "1", set: "IFC", status: "Current" },
      { number: "M-301", title: "Mechanical Sections", discipline: "Mechanical", revision: "0", set: "IFC", status: "Current" },
      { number: "E-101", title: "Level 1 Power Plan", discipline: "Electrical", revision: "2", set: "IFC", status: "Current" },
      { number: "P-101", title: "Level 1 Plumbing Plan", discipline: "Plumbing", revision: "1", set: "IFC", status: "Current" },
      { number: "C-100", title: "Site Grading & Utility Plan", discipline: "Civil", revision: "4", set: "Permit Set", status: "Current" },
    ];
    drawings.forEach((d, i) => this.createDrawing({
      number: d.number, title: d.title, discipline: d.discipline, revision: d.revision,
      drawingDate: daysFromToday(-100 + i), receivedDate: daysFromToday(-95 + i),
      drawingSet: d.set, status: d.status,
    }));

    // Specifications
    const specs: Array<[string, string, string]> = [
      ["03 30 00", "Cast-in-Place Concrete", "03 - Concrete"],
      ["05 12 00", "Structural Steel Framing", "05 - Metals"],
      ["07 21 00", "Thermal Insulation", "07 - Thermal and Moisture Protection"],
      ["08 44 13", "Glazed Aluminum Curtain Walls", "08 - Openings"],
      ["08 71 00", "Door Hardware", "08 - Openings"],
      ["09 29 00", "Gypsum Board", "09 - Finishes"],
      ["09 63 40", "Stone Flooring", "09 - Finishes"],
      ["22 11 16", "Domestic Water Piping", "22 - Plumbing"],
      ["23 31 13", "Metal Ducts", "23 - HVAC"],
      ["23 73 13", "Modular Indoor Central-Station Air-Handling Units", "23 - HVAC"],
      ["26 05 19", "Low-Voltage Electrical Power Conductors and Cables", "26 - Electrical"],
      ["28 13 00", "Access Control", "28 - Electronic Safety and Security"],
    ];
    specs.forEach(([number, title, division], i) => this.createSpecSection({
      number, title, division, revision: i % 3 === 0 ? "1" : "0", specSet: "IFC",
      issuedDate: daysFromToday(-100), receivedDate: daysFromToday(-95),
    }));

    // Daily log for yesterday with manpower
    const yesterdayLog = this.createDailyLog({
      logDate: daysFromToday(-1),
      weatherConditions: "Partly Cloudy", tempHigh: 78, tempLow: 61,
      precipitation: "0.0 in", windSpeed: "8 mph", weatherDelay: false,
      notes: "Steel erection continued on Level 2, east bay. MEP rough-in ongoing Level 1 west wing. Concrete pour for SOG section C completed.",
      delays: "None.",
      safetyNotes: "Toolbox talk held on fall protection. No incidents.",
      visitors: "Owner's rep (R. Alvarez) walked Level 1 at 10:30 AM. City inspector for SOG pre-pour at 7:00 AM - passed.",
      equipmentOnSite: "Tower crane TC-1, two telehandlers, concrete pump truck (AM only), scissor lifts x4.",
    });
    const manpower: Array<[string, number, number, string]> = [
      ["Apex Steel Fabricators", 12, 96, "Level 2 - East Bay"],
      ["City Concrete", 8, 64, "SOG Section C"],
      ["XYZ Electrical", 6, 48, "Level 1 - West Wing"],
      ["Smith Plumbing", 4, 32, "Level 1 - West Wing"],
      ["Summit Builders Inc.", 5, 40, "Site-wide supervision & cleanup"],
    ];
    manpower.forEach(([contractor, workers, hours, location]) =>
      this.createManpowerEntry({ dailyLogId: yesterdayLog.id, contractor, workers, hours, location, comments: "" }));

    // Punch items
    this.createPunchItem({
      title: "Drywall damage at corridor 2-C", description: "Gouge in GWB near door 245, approx 6\". Patch, sand, and repaint to match.",
      status: "Open", priority: "Medium", location: "Level 2 - Corridor 2-C", trade: "Drywall",
      assignee: "ABC Construction", ballInCourt: "ABC Construction", dueDate: daysFromToday(7), dateClosed: null,
    });
    this.createPunchItem({
      title: "Missing escutcheon plates at sprinkler heads", description: "Rooms 132, 134, and 138 missing escutcheons at pendant heads.",
      status: "Ready for Review", priority: "Low", location: "Level 1 - Rooms 132/134/138", trade: "Fire Protection",
      assignee: "SafeFlow Fire Protection", ballInCourt: "Summit Builders Inc.", dueDate: daysFromToday(3), dateClosed: null,
    });
    this.createPunchItem({
      title: "Exterior door 101A does not latch", description: "Door 101A requires slamming to latch. Adjust strike and closer sweep speed.",
      status: "Closed", priority: "High", location: "Level 1 - Main Entry", trade: "Doors/Hardware",
      assignee: "Secure Door Systems", ballInCourt: "", dueDate: daysFromToday(-5), dateClosed: daysFromToday(-3),
    });

    // Prime contract schedule of values
    const sov: Array<[string, string, string, number]> = [
      ["1", "01-000", "General Conditions", 1850000],
      ["2", "02-000", "Sitework & Utilities", 2400000],
      ["3", "03-000", "Concrete", 3150000],
      ["4", "05-000", "Structural & Misc. Steel", 4275000],
      ["5", "07-000", "Thermal & Moisture Protection", 1125000],
      ["6", "08-000", "Openings & Glazing", 2650000],
      ["7", "09-000", "Finishes", 3475000],
      ["8", "21-000", "Fire Suppression", 890000],
      ["9", "22-000", "Plumbing", 1675000],
      ["10", "23-000", "HVAC", 3825000],
      ["11", "26-000", "Electrical", 3360000],
      ["12", "31-000", "Earthwork", 1325000],
    ];
    sov.forEach(([itemNumber, costCode, description, scheduledValue]) =>
      this.createSovLineItem({ itemNumber, costCode, description, scheduledValue }));

    // Change events
    const ce1 = this.createChangeEvent({
      title: "Footing F-12 redesign at duct bank conflict",
      status: "Closed", scope: "Out of Scope", eventType: "Existing Condition",
      origin: "RFI-001", description: "Stepped footing redesign per SK-S-014 due to unforeseen active duct bank.",
    });
    this.createChangeEventLineItem({ changeEventId: ce1.id, costCode: "03-000", description: "Added formwork, rebar, and concrete for stepped footing", vendor: "City Concrete", romAmount: 14200 });
    this.createChangeEventLineItem({ changeEventId: ce1.id, costCode: "31-000", description: "Hand excavation and shoring at duct bank", vendor: "TerraFirm Earthworks", romAmount: 4300 });

    const ce2 = this.createChangeEvent({
      title: "Owner-requested imaging suite layout revision",
      status: "Open", scope: "Out of Scope", eventType: "Owner Change",
      origin: "Owner meeting 2026-05-28", description: "Owner requests revised equipment layout in Imaging Suite 145, affecting partitions, power, and HVAC.",
    });
    this.createChangeEventLineItem({ changeEventId: ce2.id, costCode: "09-000", description: "Partition relocation and finish revisions", vendor: "ABC Construction", romAmount: 22000 });
    this.createChangeEventLineItem({ changeEventId: ce2.id, costCode: "26-000", description: "Power and lighting circuit revisions", vendor: "XYZ Electrical", romAmount: 15500 });
    this.createChangeEventLineItem({ changeEventId: ce2.id, costCode: "23-000", description: "Duct reroute and diffuser relocation", vendor: "Metro HVAC", romAmount: 18750 });

    // Change orders
    const co1 = this.createChangeOrder({
      title: "PCO 001 - Footing F-12 Redesign", status: "Approved", changeEventId: ce1.id,
      description: "Stepped footing at grid C-4 per SK-S-014 including excavation support.",
      scheduleImpactDays: 4, executed: true, signedDate: daysFromToday(-20), dateCreated: daysFromToday(-27),
    });
    this.createChangeOrderLineItem({ changeOrderId: co1.id, costCode: "03-000", description: "Stepped footing concrete, formwork, rebar", amount: 14200 });
    this.createChangeOrderLineItem({ changeOrderId: co1.id, costCode: "31-000", description: "Hand excavation and shoring", amount: 4300 });

    const co2 = this.createChangeOrder({
      title: "PCO 002 - Imaging Suite 145 Revisions", status: "Pending - In Review", changeEventId: ce2.id,
      description: "Owner-directed layout revision to Imaging Suite 145.",
      scheduleImpactDays: 6, executed: false, signedDate: null, dateCreated: daysFromToday(-4),
    });
    this.createChangeOrderLineItem({ changeOrderId: co2.id, costCode: "09-000", description: "Partition and finish revisions", amount: 22000 });
    this.createChangeOrderLineItem({ changeOrderId: co2.id, costCode: "26-000", description: "Electrical revisions", amount: 15500 });
    this.createChangeOrderLineItem({ changeOrderId: co2.id, costCode: "23-000", description: "HVAC revisions", amount: 18750 });

    // Budget lines (mirroring SOV cost codes)
    const budget: Array<[string, string, number, number, number, number, number]> = [
      // costCode, description, original, mods, committed, direct, pending
      ["01-000", "General Conditions", 1850000, 0, 1850000, 412000, 0],
      ["02-000", "Sitework & Utilities", 2400000, 25000, 2380000, 1620000, 0],
      // committed costs for 03/05/08/23 come from seeded commitments below
      ["03-000", "Concrete", 3150000, 0, 0, 1890000, 0],
      ["05-000", "Structural & Misc. Steel", 4275000, 0, 0, 2310000, 0],
      ["07-000", "Thermal & Moisture Protection", 1125000, 0, 1098000, 86000, 0],
      ["08-000", "Openings & Glazing", 2650000, 0, 0, 0, 35000],
      ["09-000", "Finishes", 3475000, 0, 3402000, 0, 22000],
      ["21-000", "Fire Suppression", 890000, 0, 874000, 121000, 0],
      ["22-000", "Plumbing", 1675000, 0, 1675000, 410000, 0],
      ["23-000", "HVAC", 3825000, 0, 0, 655000, 18750],
      ["26-000", "Electrical", 3360000, 0, 3344000, 588000, 15500],
      ["31-000", "Earthwork", 1325000, -15000, 1329300, 1190000, 0],
    ];
    budget.forEach(([costCode, description, originalBudget, budgetModifications, committedCosts, directCosts, pendingBudgetChanges]) =>
      this.createBudgetLineItem({ costCode, description, originalBudget, budgetModifications, committedCosts, directCosts, pendingBudgetChanges }));

    // Project directory (all seed accounts use password "password123")
    const seedUsers: Array<[string, string, User["role"], string, string]> = [
      ["Sam Patel", "spatel@summitbuilders.com", "Admin", "Summit Builders Inc.", "Project Executive"],
      ["Jordan Lee", "jlee@summitbuilders.com", "Project Manager", "Summit Builders Inc.", "Project Manager"],
      ["Dana Brooks", "dbrooks@summitbuilders.com", "Superintendent", "Summit Builders Inc.", "Superintendent"],
      ["Devon Whitfield", "dwhitfield@hartmancole.com", "Architect", "Hartman + Cole Architects", "Project Architect"],
      ["Rosa Alvarez", "ralvarez@riversidehealth.com", "Owner Rep", "Riverside Health Partners LLC", "Owner's Representative"],
      ["Tunde Okafor", "tokafor@metrohvac.com", "Subcontractor", "Metro HVAC", "Project Manager"],
    ];
    const passwordHash = hashPassword("password123");
    seedUsers.forEach(([name, email, role, company, title]) =>
      this.createUser({ name, email, role, company, title, phone: "", passwordHash }));

    // Commitments — these drive the committed-cost column for their trades
    const commitmentSeed: Array<{
      title: string; type: Commitment["commitmentType"]; vendor: string;
      status: Commitment["status"]; lines: Array<[string, string, number]>;
    }> = [
      {
        title: "Structural Steel Subcontract", type: "Subcontract", vendor: "Apex Steel Fabricators",
        status: "Executed", lines: [["05-000", "Furnish & erect structural and misc. steel", 4275000]],
      },
      {
        title: "Cast-in-Place Concrete Subcontract", type: "Subcontract", vendor: "City Concrete",
        status: "Executed",
        lines: [
          ["03-000", "Foundations, SOG, and elevated decks", 3150000],
          ["03-000", "CCO 01 - Stepped footing F-12", 14200],
        ],
      },
      {
        title: "HVAC Subcontract", type: "Subcontract", vendor: "Metro HVAC",
        status: "Executed", lines: [["23-000", "Complete HVAC system per plans and specs", 3825000]],
      },
      {
        title: "Curtain Wall Material Purchase", type: "Purchase Order", vendor: "ClearView Glazing",
        status: "Executed", lines: [["08-000", "Curtain wall framing and glazing units", 2588000]],
      },
      {
        title: "Lobby Stone Flooring Subcontract", type: "Subcontract", vendor: "Granite & Co. Interiors",
        status: "Out for Signature", lines: [["09-000", "Furnish & install lobby stone flooring", 412000]],
      },
    ];
    for (const seed of commitmentSeed) {
      const commitment = this.createCommitment({
        title: seed.title, commitmentType: seed.type, vendor: seed.vendor,
        status: seed.status, retainagePercent: 10, description: "",
        executedDate: seed.status === "Executed" ? daysFromToday(-60) : null,
      });
      seed.lines.forEach(([costCode, description, amount]) =>
        this.createCommitmentLineItem({ commitmentId: commitment.id, costCode, description, amount }));
    }

    // Approval workflow for the submittal that is pending review (SUB-003)
    const pendingSubmittal = this.getSubmittals().find(s => s.status === "Pending Approval");
    if (pendingSubmittal) {
      const architect = this.findUserByName("Devon Whitfield");
      const pm = this.findUserByName("Jordan Lee");
      this.createSubmittalStep({
        submittalId: pendingSubmittal.id, stepNumber: 1,
        approverName: pm?.name ?? "Jordan Lee", approverUserId: pm?.id ?? null,
        dueDate: daysFromToday(2), status: "Approved",
        comments: "GC review complete; forwarded to design team.", respondedAt: now(),
      });
      this.createSubmittalStep({
        submittalId: pendingSubmittal.id, stepNumber: 2,
        approverName: architect?.name ?? "Devon Whitfield", approverUserId: architect?.id ?? null,
        dueDate: daysFromToday(9), status: "Pending", comments: "", respondedAt: null,
      });
      this.updateSubmittal(pendingSubmittal.id, { ballInCourt: architect?.name ?? "Devon Whitfield" });
    }
  }
}

export const procoreStorage = new ProcoreStorage();
