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
} from "@shared/procore";

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

  private nextId: Record<string, number> = {
    submittal: 1, rfi: 1, drawing: 1, spec: 1, dailyLog: 1, manpower: 1,
    punch: 1, sov: 1, changeEvent: 1, ceLine: 1, changeOrder: 1, coLine: 1, budget: 1,
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
    this.seed();
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

  getBudgetSummary(): BudgetSummary {
    const coByCode = this.approvedCoAmountsByCostCode();
    const matchedCodes = new Set<string>();

    const rows: BudgetRow[] = this.getBudgetLineItems().map(item => {
      const approvedCOs = coByCode.get(item.costCode) ?? 0;
      if (coByCode.has(item.costCode)) matchedCodes.add(item.costCode);
      const revisedBudget = item.originalBudget + item.budgetModifications + approvedCOs;
      const projectedCosts = item.committedCosts + item.directCosts + item.pendingBudgetChanges;
      return {
        ...item,
        approvedCOs,
        revisedBudget,
        projectedCosts,
        projectedOverUnder: revisedBudget - projectedCosts,
        forecastToComplete: Math.max(0, revisedBudget - item.committedCosts - item.directCosts),
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
      ["03-000", "Concrete", 3150000, 0, 3164200, 1890000, 0],
      ["05-000", "Structural & Misc. Steel", 4275000, 0, 4275000, 2310000, 0],
      ["07-000", "Thermal & Moisture Protection", 1125000, 0, 1098000, 86000, 0],
      ["08-000", "Openings & Glazing", 2650000, 0, 2588000, 0, 35000],
      ["09-000", "Finishes", 3475000, 0, 3402000, 0, 22000],
      ["21-000", "Fire Suppression", 890000, 0, 874000, 121000, 0],
      ["22-000", "Plumbing", 1675000, 0, 1675000, 410000, 0],
      ["23-000", "HVAC", 3825000, 0, 3825000, 655000, 18750],
      ["26-000", "Electrical", 3360000, 0, 3344000, 588000, 15500],
      ["31-000", "Earthwork", 1325000, -15000, 1329300, 1190000, 0],
    ];
    budget.forEach(([costCode, description, originalBudget, budgetModifications, committedCosts, directCosts, pendingBudgetChanges]) =>
      this.createBudgetLineItem({ costCode, description, originalBudget, budgetModifications, committedCosts, directCosts, pendingBudgetChanges }));
  }
}

export const procoreStorage = new ProcoreStorage();
