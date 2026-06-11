import { eq, and, sql, count, asc } from "drizzle-orm";
import { db } from "./db";
import {
  users_t, primeContracts_t, sovLineItems_t, submittals_t, submittalSteps_t,
  rfis_t, drawings_t, drawingPins_t, specSections_t, dailyLogs_t,
  manpowerEntries_t, punchItems_t, changeEvents_t, changeEventLineItems_t,
  changeOrders_t, changeOrderLineItems_t, budgetLineItems_t,
  commitments_t, commitmentLineItems_t, ownerInvoices_t, invoiceLineItems_t,
  attachments_t, notifications_t,
} from "@shared/schema";
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

const today = () => new Date().toISOString().split("T")[0];

const pad = (n: number) => String(n).padStart(3, "0");

// ---------------------------------------------------------------------------
// Row mappers: snake_case DB rows → camelCase shared types
// ---------------------------------------------------------------------------

function iso(value: Date | string | null | undefined): string {
  if (!value) return new Date().toISOString();
  return value instanceof Date ? value.toISOString() : value;
}

function isoOrNull(value: Date | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return value instanceof Date ? value.toISOString() : value;
}

function mapUser(row: typeof users_t.$inferSelect): User {
  return {
    id: row.id, name: row.name, email: row.email, role: row.role as User["role"],
    company: row.company, title: row.title, phone: row.phone,
    passwordHash: row.password_hash, createdAt: iso(row.created_at),
  };
}

function toSafeUser(user: User): SafeUser {
  const { passwordHash, ...safe } = user;
  return safe;
}

function mapPrimeContract(row: typeof primeContracts_t.$inferSelect): PrimeContract {
  return {
    id: row.id, number: row.number, title: row.title,
    owner: row.owner, contractor: row.contractor, architect: row.architect,
    status: row.status as PrimeContract["status"], executed: row.executed,
    contractDate: row.contract_date, startDate: row.start_date,
    substantialCompletionDate: row.substantial_completion_date,
    actualCompletionDate: row.actual_completion_date,
    signedContractReceivedDate: row.signed_contract_received_date,
    retainagePercent: row.retainage_percent, description: row.description,
    inclusions: row.inclusions, exclusions: row.exclusions,
    createdAt: iso(row.created_at),
  };
}

function mapSov(row: typeof sovLineItems_t.$inferSelect): SovLineItem {
  return {
    id: row.id, itemNumber: row.item_number, costCode: row.cost_code,
    description: row.description, scheduledValue: row.scheduled_value,
  };
}

function mapSubmittal(row: typeof submittals_t.$inferSelect): Submittal {
  return {
    id: row.id, number: row.number, revision: row.revision, title: row.title,
    specSection: row.spec_section,
    submittalType: row.submittal_type as Submittal["submittalType"],
    status: row.status as Submittal["status"],
    responsibleContractor: row.responsible_contractor,
    receivedFrom: row.received_from, submitBy: row.submit_by,
    ballInCourt: row.ball_in_court,
    dateSubmitted: row.date_submitted, dateReturned: row.date_returned,
    dueDate: row.due_date, leadTimeDays: row.lead_time_days,
    requiredOnSiteDate: row.required_on_site_date,
    description: row.description, createdAt: iso(row.created_at),
  };
}

function mapSubmittalStep(row: typeof submittalSteps_t.$inferSelect): SubmittalStep {
  return {
    id: row.id, submittalId: row.submittal_id, stepNumber: row.step_number,
    approverName: row.approver_name, approverUserId: row.approver_user_id,
    dueDate: row.due_date, status: row.status as SubmittalStep["status"],
    comments: row.comments, respondedAt: isoOrNull(row.responded_at),
  };
}

function mapRfi(row: typeof rfis_t.$inferSelect): Rfi {
  return {
    id: row.id, number: row.number, subject: row.subject,
    question: row.question, answer: row.answer,
    status: row.status as Rfi["status"], priority: row.priority as Rfi["priority"],
    assignedTo: row.assigned_to, rfiManager: row.rfi_manager,
    receivedFrom: row.received_from, responsibleContractor: row.responsible_contractor,
    specSection: row.spec_section, drawingNumber: row.drawing_number,
    location: row.location,
    costImpact: row.cost_impact as Rfi["costImpact"],
    costImpactAmount: row.cost_impact_amount,
    scheduleImpact: row.schedule_impact as Rfi["scheduleImpact"],
    scheduleImpactDays: row.schedule_impact_days,
    ballInCourt: row.ball_in_court,
    dateInitiated: row.date_initiated, dueDate: row.due_date,
    dateClosed: row.date_closed, createdAt: iso(row.created_at),
  };
}

function mapDrawing(row: typeof drawings_t.$inferSelect): Drawing {
  return {
    id: row.id, number: row.number, title: row.title,
    discipline: row.discipline as Drawing["discipline"],
    revision: row.revision, drawingDate: row.drawing_date,
    receivedDate: row.received_date, drawingSet: row.drawing_set,
    status: row.status as Drawing["status"], createdAt: iso(row.created_at),
  };
}

function mapDrawingPin(row: typeof drawingPins_t.$inferSelect): DrawingPin {
  return {
    id: row.id, drawingId: row.drawing_id, x: row.x, y: row.y,
    linkType: row.link_type as DrawingPin["linkType"],
    linkedId: row.linked_id, note: row.note, createdBy: row.created_by,
    createdAt: iso(row.created_at),
  };
}

function mapSpecSection(row: typeof specSections_t.$inferSelect): SpecSection {
  return {
    id: row.id, number: row.number, title: row.title, division: row.division,
    revision: row.revision, specSet: row.spec_set,
    issuedDate: row.issued_date, receivedDate: row.received_date,
    createdAt: iso(row.created_at),
  };
}

function mapDailyLog(row: typeof dailyLogs_t.$inferSelect): DailyLog {
  return {
    id: row.id, logDate: row.log_date,
    weatherConditions: row.weather_conditions as DailyLog["weatherConditions"],
    tempHigh: row.temp_high, tempLow: row.temp_low,
    precipitation: row.precipitation, windSpeed: row.wind_speed,
    weatherDelay: row.weather_delay, notes: row.notes, delays: row.delays,
    safetyNotes: row.safety_notes, visitors: row.visitors,
    equipmentOnSite: row.equipment_on_site,
    createdAt: iso(row.created_at),
  };
}

function mapManpowerEntry(row: typeof manpowerEntries_t.$inferSelect): ManpowerEntry {
  return {
    id: row.id, dailyLogId: row.daily_log_id, contractor: row.contractor,
    workers: row.workers, hours: row.hours, location: row.location,
    comments: row.comments,
  };
}

function mapPunchItem(row: typeof punchItems_t.$inferSelect): PunchItem {
  return {
    id: row.id, number: row.number, title: row.title,
    description: row.description,
    status: row.status as PunchItem["status"],
    priority: row.priority as PunchItem["priority"],
    location: row.location, trade: row.trade, assignee: row.assignee,
    ballInCourt: row.ball_in_court, dueDate: row.due_date,
    dateClosed: row.date_closed, createdAt: iso(row.created_at),
  };
}

function mapChangeEvent(row: typeof changeEvents_t.$inferSelect): ChangeEvent {
  return {
    id: row.id, number: row.number, title: row.title,
    status: row.status as ChangeEvent["status"],
    scope: row.scope as ChangeEvent["scope"],
    eventType: row.event_type as ChangeEvent["eventType"],
    origin: row.origin, description: row.description,
    createdAt: iso(row.created_at),
  };
}

function mapChangeEventLine(row: typeof changeEventLineItems_t.$inferSelect): ChangeEventLineItem {
  return {
    id: row.id, changeEventId: row.change_event_id, costCode: row.cost_code,
    description: row.description, vendor: row.vendor, romAmount: row.rom_amount,
  };
}

function mapChangeOrder(row: typeof changeOrders_t.$inferSelect): ChangeOrder {
  return {
    id: row.id, number: row.number, title: row.title,
    status: row.status as ChangeOrder["status"],
    changeEventId: row.change_event_id, description: row.description,
    scheduleImpactDays: row.schedule_impact_days, executed: row.executed,
    signedDate: row.signed_date, dateCreated: row.date_created,
    createdAt: iso(row.created_at),
  };
}

function mapChangeOrderLine(row: typeof changeOrderLineItems_t.$inferSelect): ChangeOrderLineItem {
  return {
    id: row.id, changeOrderId: row.change_order_id, costCode: row.cost_code,
    description: row.description, amount: row.amount,
  };
}

function mapBudgetLine(row: typeof budgetLineItems_t.$inferSelect): BudgetLineItem {
  return {
    id: row.id, costCode: row.cost_code, description: row.description,
    originalBudget: row.original_budget,
    budgetModifications: row.budget_modifications,
    committedCosts: row.committed_costs, directCosts: row.direct_costs,
    pendingBudgetChanges: row.pending_budget_changes,
  };
}

function mapCommitment(row: typeof commitments_t.$inferSelect): Commitment {
  return {
    id: row.id, number: row.number, title: row.title,
    commitmentType: row.commitment_type as Commitment["commitmentType"],
    status: row.status as Commitment["status"], vendor: row.vendor,
    executedDate: row.executed_date, retainagePercent: row.retainage_percent,
    description: row.description, createdAt: iso(row.created_at),
  };
}

function mapCommitmentLine(row: typeof commitmentLineItems_t.$inferSelect): CommitmentLineItem {
  return {
    id: row.id, commitmentId: row.commitment_id, costCode: row.cost_code,
    description: row.description, amount: row.amount,
  };
}

function mapOwnerInvoice(row: typeof ownerInvoices_t.$inferSelect): OwnerInvoice {
  return {
    id: row.id, number: row.number, periodStart: row.period_start,
    periodEnd: row.period_end, billingDate: row.billing_date,
    status: row.status as OwnerInvoice["status"], createdAt: iso(row.created_at),
  };
}

function mapInvoiceLine(row: typeof invoiceLineItems_t.$inferSelect): InvoiceLineItem {
  return {
    id: row.id, invoiceId: row.invoice_id, sovLineItemId: row.sov_line_item_id,
    workThisPeriod: row.work_this_period, storedMaterials: row.stored_materials,
  };
}

function mapAttachment(row: typeof attachments_t.$inferSelect): Attachment {
  return {
    id: row.id, entityType: row.entity_type as Attachment["entityType"],
    entityId: row.entity_id, filename: row.filename, mimeType: row.mime_type,
    size: row.size, storagePath: row.storage_path, uploadedBy: row.uploaded_by,
    createdAt: iso(row.created_at),
  };
}

function mapNotification(row: typeof notifications_t.$inferSelect): Notification {
  return {
    id: row.id, userId: row.user_id, title: row.title, body: row.body,
    entityType: row.entity_type, entityId: row.entity_id, read: row.read,
    createdAt: iso(row.created_at),
  };
}

// ---------------------------------------------------------------------------
// Storage: a thin async DAL backed by Postgres. Multi-instance safe by virtue
// of the database being the single source of truth.
// ---------------------------------------------------------------------------

export class ProcoreStorage {
  private primeContractId = 1;

  // ----- Users -----

  async getUsers(): Promise<SafeUser[]> {
    const rows = await db.select().from(users_t).orderBy(asc(users_t.id));
    return rows.map(r => toSafeUser(mapUser(r)));
  }

  async getUser(id: number): Promise<SafeUser | undefined> {
    const rows = await db.select().from(users_t).where(eq(users_t.id, id));
    return rows[0] ? toSafeUser(mapUser(rows[0])) : undefined;
  }

  async getUserWithPassword(email: string): Promise<User | undefined> {
    const rows = await db.select().from(users_t).where(sql`LOWER(${users_t.email}) = LOWER(${email})`);
    return rows[0] ? mapUser(rows[0]) : undefined;
  }

  async findUserByName(name: string): Promise<SafeUser | undefined> {
    const trimmed = name.trim();
    if (!trimmed) return undefined;
    const rows = await db.select().from(users_t).where(sql`LOWER(${users_t.name}) = LOWER(${trimmed})`);
    return rows[0] ? toSafeUser(mapUser(rows[0])) : undefined;
  }

  async createUser(data: Omit<User, "id" | "createdAt">): Promise<SafeUser> {
    const [row] = await db.insert(users_t).values({
      name: data.name, email: data.email, role: data.role,
      company: data.company, title: data.title, phone: data.phone,
      password_hash: data.passwordHash,
    }).returning();
    return toSafeUser(mapUser(row));
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users_t).where(eq(users_t.id, id)).returning({ id: users_t.id });
    return result.length > 0;
  }

  // ----- Prime contract (singleton) -----

  async getPrimeContract(): Promise<PrimeContract> {
    const rows = await db.select().from(primeContracts_t).orderBy(asc(primeContracts_t.id)).limit(1);
    if (!rows[0]) {
      const [row] = await db.insert(primeContracts_t).values({ title: "Untitled Prime Contract" }).returning();
      this.primeContractId = row.id;
      return mapPrimeContract(row);
    }
    this.primeContractId = rows[0].id;
    return mapPrimeContract(rows[0]);
  }

  async updatePrimeContract(data: UpdatePrimeContract): Promise<PrimeContract> {
    const current = await this.getPrimeContract();
    const updates: Record<string, unknown> = {};
    if (data.number !== undefined) updates.number = data.number;
    if (data.title !== undefined) updates.title = data.title;
    if (data.owner !== undefined) updates.owner = data.owner;
    if (data.contractor !== undefined) updates.contractor = data.contractor;
    if (data.architect !== undefined) updates.architect = data.architect;
    if (data.status !== undefined) updates.status = data.status;
    if (data.executed !== undefined) updates.executed = data.executed;
    if (data.contractDate !== undefined) updates.contract_date = data.contractDate;
    if (data.startDate !== undefined) updates.start_date = data.startDate;
    if (data.substantialCompletionDate !== undefined) updates.substantial_completion_date = data.substantialCompletionDate;
    if (data.actualCompletionDate !== undefined) updates.actual_completion_date = data.actualCompletionDate;
    if (data.signedContractReceivedDate !== undefined) updates.signed_contract_received_date = data.signedContractReceivedDate;
    if (data.retainagePercent !== undefined) updates.retainage_percent = data.retainagePercent;
    if (data.description !== undefined) updates.description = data.description;
    if (data.inclusions !== undefined) updates.inclusions = data.inclusions;
    if (data.exclusions !== undefined) updates.exclusions = data.exclusions;
    if (Object.keys(updates).length === 0) return current;
    const [row] = await db.update(primeContracts_t).set(updates)
      .where(eq(primeContracts_t.id, current.id)).returning();
    return mapPrimeContract(row);
  }

  async getSovLineItems(): Promise<SovLineItem[]> {
    const contract = await this.getPrimeContract();
    const rows = await db.select().from(sovLineItems_t)
      .where(eq(sovLineItems_t.prime_contract_id, contract.id))
      .orderBy(asc(sovLineItems_t.id));
    return rows.map(mapSov);
  }

  async createSovLineItem(data: InsertSovLineItem): Promise<SovLineItem> {
    const contract = await this.getPrimeContract();
    const [row] = await db.insert(sovLineItems_t).values({
      prime_contract_id: contract.id, item_number: data.itemNumber,
      cost_code: data.costCode, description: data.description,
      scheduled_value: data.scheduledValue,
    }).returning();
    return mapSov(row);
  }

  async updateSovLineItem(id: number, data: Partial<SovLineItem>): Promise<SovLineItem | undefined> {
    const updates: Record<string, unknown> = {};
    if (data.itemNumber !== undefined) updates.item_number = data.itemNumber;
    if (data.costCode !== undefined) updates.cost_code = data.costCode;
    if (data.description !== undefined) updates.description = data.description;
    if (data.scheduledValue !== undefined) updates.scheduled_value = data.scheduledValue;
    if (Object.keys(updates).length === 0) return (await db.select().from(sovLineItems_t).where(eq(sovLineItems_t.id, id))).map(mapSov)[0];
    const [row] = await db.update(sovLineItems_t).set(updates).where(eq(sovLineItems_t.id, id)).returning();
    return row ? mapSov(row) : undefined;
  }

  async deleteSovLineItem(id: number): Promise<boolean> {
    const result = await db.delete(sovLineItems_t).where(eq(sovLineItems_t.id, id)).returning({ id: sovLineItems_t.id });
    return result.length > 0;
  }

  // ----- Generic helpers for auto-numbering. PostgreSQL's COUNT is the
  // source of truth so all instances agree on the next number.

  private async nextNumber(table: any, prefix: string): Promise<string> {
    const [{ value }] = await db.select({ value: count() }).from(table);
    return `${prefix}-${pad(Number(value) + 1)}`;
  }

  // ----- Submittals -----

  async getSubmittals(): Promise<Submittal[]> {
    const rows = await db.select().from(submittals_t).orderBy(asc(submittals_t.id));
    return rows.map(mapSubmittal);
  }

  async getSubmittal(id: number): Promise<Submittal | undefined> {
    const rows = await db.select().from(submittals_t).where(eq(submittals_t.id, id));
    return rows[0] ? mapSubmittal(rows[0]) : undefined;
  }

  async createSubmittal(data: InsertSubmittal): Promise<Submittal> {
    const number = data.number ?? await this.nextNumber(submittals_t, "SUB");
    const [row] = await db.insert(submittals_t).values({
      number,
      revision: data.revision ?? 0,
      title: data.title,
      spec_section: data.specSection ?? "",
      submittal_type: data.submittalType ?? "Product Data",
      status: data.status ?? "Draft",
      responsible_contractor: data.responsibleContractor ?? "",
      received_from: data.receivedFrom ?? "",
      submit_by: data.submitBy ?? "",
      ball_in_court: data.ballInCourt ?? "",
      date_submitted: data.dateSubmitted ?? null,
      date_returned: data.dateReturned ?? null,
      due_date: data.dueDate ?? null,
      lead_time_days: data.leadTimeDays ?? 0,
      required_on_site_date: data.requiredOnSiteDate ?? null,
      description: data.description ?? "",
    }).returning();
    return mapSubmittal(row);
  }

  async updateSubmittal(id: number, data: Partial<Submittal>): Promise<Submittal | undefined> {
    const updates: Record<string, unknown> = {};
    if (data.number !== undefined) updates.number = data.number;
    if (data.revision !== undefined) updates.revision = data.revision;
    if (data.title !== undefined) updates.title = data.title;
    if (data.specSection !== undefined) updates.spec_section = data.specSection;
    if (data.submittalType !== undefined) updates.submittal_type = data.submittalType;
    if (data.status !== undefined) updates.status = data.status;
    if (data.responsibleContractor !== undefined) updates.responsible_contractor = data.responsibleContractor;
    if (data.receivedFrom !== undefined) updates.received_from = data.receivedFrom;
    if (data.submitBy !== undefined) updates.submit_by = data.submitBy;
    if (data.ballInCourt !== undefined) updates.ball_in_court = data.ballInCourt;
    if (data.dateSubmitted !== undefined) updates.date_submitted = data.dateSubmitted;
    if (data.dateReturned !== undefined) updates.date_returned = data.dateReturned;
    if (data.dueDate !== undefined) updates.due_date = data.dueDate;
    if (data.leadTimeDays !== undefined) updates.lead_time_days = data.leadTimeDays;
    if (data.requiredOnSiteDate !== undefined) updates.required_on_site_date = data.requiredOnSiteDate;
    if (data.description !== undefined) updates.description = data.description;
    if (Object.keys(updates).length === 0) return this.getSubmittal(id);
    const [row] = await db.update(submittals_t).set(updates).where(eq(submittals_t.id, id)).returning();
    return row ? mapSubmittal(row) : undefined;
  }

  async deleteSubmittal(id: number): Promise<boolean> {
    await db.delete(submittalSteps_t).where(eq(submittalSteps_t.submittal_id, id));
    const result = await db.delete(submittals_t).where(eq(submittals_t.id, id)).returning({ id: submittals_t.id });
    return result.length > 0;
  }

  // ----- Submittal workflow steps -----

  async getSubmittalSteps(submittalId: number): Promise<SubmittalStep[]> {
    const rows = await db.select().from(submittalSteps_t)
      .where(eq(submittalSteps_t.submittal_id, submittalId))
      .orderBy(asc(submittalSteps_t.step_number));
    return rows.map(mapSubmittalStep);
  }

  async getSubmittalStep(id: number): Promise<SubmittalStep | undefined> {
    const rows = await db.select().from(submittalSteps_t).where(eq(submittalSteps_t.id, id));
    return rows[0] ? mapSubmittalStep(rows[0]) : undefined;
  }

  async createSubmittalStep(data: InsertSubmittalStep): Promise<SubmittalStep> {
    const [row] = await db.insert(submittalSteps_t).values({
      submittal_id: data.submittalId, step_number: data.stepNumber,
      approver_name: data.approverName, approver_user_id: data.approverUserId,
      due_date: data.dueDate, status: data.status ?? "Pending",
      comments: data.comments ?? "",
      responded_at: data.respondedAt ? new Date(data.respondedAt) : null,
    }).returning();
    const step = mapSubmittalStep(row);

    // Putting the first pending step in play moves the submittal into review
    const submittal = await this.getSubmittal(data.submittalId);
    if (submittal && (submittal.status === "Draft" || submittal.status === "Open")) {
      const firstPending = (await this.getSubmittalSteps(data.submittalId))
        .find(s => s.status === "Pending");
      if (firstPending) {
        await this.updateSubmittal(submittal.id, {
          status: "Pending Approval",
          ballInCourt: firstPending.approverName,
          dateSubmitted: submittal.dateSubmitted ?? today(),
        });
      }
    }
    return step;
  }

  async deleteSubmittalStep(id: number): Promise<boolean> {
    const result = await db.delete(submittalSteps_t).where(eq(submittalSteps_t.id, id)).returning({ id: submittalSteps_t.id });
    return result.length > 0;
  }

  /**
   * Records an approver's response and advances the workflow. Wrapped in a
   * single SQL transaction so a partial advance can't leave the submittal in
   * an inconsistent state mid-update.
   */
  async respondToSubmittalStep(
    stepId: number,
    status: SubmittalStep["status"],
    comments: string,
  ): Promise<{ step: SubmittalStep; submittal: Submittal | undefined } | undefined> {
    return db.transaction(async tx => {
      const [updatedRow] = await tx.update(submittalSteps_t).set({
        status, comments, responded_at: new Date(),
      }).where(eq(submittalSteps_t.id, stepId)).returning();
      if (!updatedRow) return undefined;
      const step = mapSubmittalStep(updatedRow);

      const submittalRows = await tx.select().from(submittals_t).where(eq(submittals_t.id, step.submittalId));
      let submittal = submittalRows[0] ? mapSubmittal(submittalRows[0]) : undefined;
      if (!submittal) return { step, submittal };

      const allSteps = (await tx.select().from(submittalSteps_t)
        .where(eq(submittalSteps_t.submittal_id, step.submittalId))
        .orderBy(asc(submittalSteps_t.step_number))).map(mapSubmittalStep);

      const applyUpdate = async (patch: Record<string, unknown>) => {
        const [row] = await tx.update(submittals_t).set(patch)
          .where(eq(submittals_t.id, submittal!.id)).returning();
        submittal = row ? mapSubmittal(row) : submittal;
      };

      if (status === "Approved" || status === "Approved as Noted") {
        const next = allSteps.find(s => s.status === "Pending");
        if (next) {
          await applyUpdate({ status: "Pending Approval", ball_in_court: next.approverName });
        } else {
          const anyNoted = allSteps.some(s => s.status === "Approved as Noted");
          await applyUpdate({
            status: anyNoted ? "Approved as Noted" : "Approved",
            ball_in_court: submittal.responsibleContractor,
            date_returned: today(),
          });
        }
      } else if (status === "Revise and Resubmit" || status === "Rejected") {
        await applyUpdate({
          status, ball_in_court: submittal.responsibleContractor,
          date_returned: today(),
        });
      }
      return { step, submittal };
    });
  }

  // ----- RFIs -----

  async getRfis(): Promise<Rfi[]> {
    const rows = await db.select().from(rfis_t).orderBy(asc(rfis_t.id));
    return rows.map(mapRfi);
  }

  async getRfi(id: number): Promise<Rfi | undefined> {
    const rows = await db.select().from(rfis_t).where(eq(rfis_t.id, id));
    return rows[0] ? mapRfi(rows[0]) : undefined;
  }

  async createRfi(data: InsertRfi): Promise<Rfi> {
    const number = data.number ?? await this.nextNumber(rfis_t, "RFI");
    const [row] = await db.insert(rfis_t).values({
      number, subject: data.subject,
      question: data.question ?? "", answer: data.answer ?? "",
      status: data.status ?? "Draft", priority: data.priority ?? "Medium",
      assigned_to: data.assignedTo ?? "", rfi_manager: data.rfiManager ?? "",
      received_from: data.receivedFrom ?? "",
      responsible_contractor: data.responsibleContractor ?? "",
      spec_section: data.specSection ?? "",
      drawing_number: data.drawingNumber ?? "",
      location: data.location ?? "",
      cost_impact: data.costImpact ?? "TBD",
      cost_impact_amount: data.costImpactAmount ?? 0,
      schedule_impact: data.scheduleImpact ?? "TBD",
      schedule_impact_days: data.scheduleImpactDays ?? 0,
      ball_in_court: data.ballInCourt ?? "",
      date_initiated: data.dateInitiated ?? null,
      due_date: data.dueDate ?? null,
      date_closed: data.dateClosed ?? null,
    }).returning();
    return mapRfi(row);
  }

  async updateRfi(id: number, data: Partial<Rfi>): Promise<Rfi | undefined> {
    const existing = await this.getRfi(id);
    if (!existing) return undefined;
    const updates: Record<string, unknown> = {};
    if (data.number !== undefined) updates.number = data.number;
    if (data.subject !== undefined) updates.subject = data.subject;
    if (data.question !== undefined) updates.question = data.question;
    if (data.answer !== undefined) updates.answer = data.answer;
    if (data.status !== undefined) updates.status = data.status;
    if (data.priority !== undefined) updates.priority = data.priority;
    if (data.assignedTo !== undefined) updates.assigned_to = data.assignedTo;
    if (data.rfiManager !== undefined) updates.rfi_manager = data.rfiManager;
    if (data.receivedFrom !== undefined) updates.received_from = data.receivedFrom;
    if (data.responsibleContractor !== undefined) updates.responsible_contractor = data.responsibleContractor;
    if (data.specSection !== undefined) updates.spec_section = data.specSection;
    if (data.drawingNumber !== undefined) updates.drawing_number = data.drawingNumber;
    if (data.location !== undefined) updates.location = data.location;
    if (data.costImpact !== undefined) updates.cost_impact = data.costImpact;
    if (data.costImpactAmount !== undefined) updates.cost_impact_amount = data.costImpactAmount;
    if (data.scheduleImpact !== undefined) updates.schedule_impact = data.scheduleImpact;
    if (data.scheduleImpactDays !== undefined) updates.schedule_impact_days = data.scheduleImpactDays;
    if (data.ballInCourt !== undefined) updates.ball_in_court = data.ballInCourt;
    if (data.dateInitiated !== undefined) updates.date_initiated = data.dateInitiated;
    if (data.dueDate !== undefined) updates.due_date = data.dueDate;
    if (data.dateClosed !== undefined) updates.date_closed = data.dateClosed;
    // Stamp the closed date when an RFI transitions to Closed
    if (data.status === "Closed" && existing.status !== "Closed" && data.dateClosed === undefined) {
      updates.date_closed = today();
    }
    if (Object.keys(updates).length === 0) return existing;
    const [row] = await db.update(rfis_t).set(updates).where(eq(rfis_t.id, id)).returning();
    return row ? mapRfi(row) : undefined;
  }

  async deleteRfi(id: number): Promise<boolean> {
    const result = await db.delete(rfis_t).where(eq(rfis_t.id, id)).returning({ id: rfis_t.id });
    return result.length > 0;
  }

  // ----- Drawings -----

  async getDrawings(): Promise<Drawing[]> {
    const rows = await db.select().from(drawings_t).orderBy(asc(drawings_t.id));
    return rows.map(mapDrawing);
  }

  async getDrawing(id: number): Promise<Drawing | undefined> {
    const rows = await db.select().from(drawings_t).where(eq(drawings_t.id, id));
    return rows[0] ? mapDrawing(rows[0]) : undefined;
  }

  async createDrawing(data: InsertDrawing): Promise<Drawing> {
    return db.transaction(async tx => {
      // Atomically supersede prior Current revisions of the same number so two
      // concurrent uploads can't both leave a row marked Current.
      await tx.update(drawings_t).set({ status: "Superseded" })
        .where(and(eq(drawings_t.number, data.number), eq(drawings_t.status, "Current")));
      const [row] = await tx.insert(drawings_t).values({
        number: data.number, title: data.title,
        discipline: data.discipline ?? "Architectural",
        revision: data.revision ?? "0",
        drawing_date: data.drawingDate ?? null,
        received_date: data.receivedDate ?? null,
        drawing_set: data.drawingSet ?? "",
        status: data.status ?? "Current",
      }).returning();
      return mapDrawing(row);
    });
  }

  async updateDrawing(id: number, data: Partial<Drawing>): Promise<Drawing | undefined> {
    const updates: Record<string, unknown> = {};
    if (data.number !== undefined) updates.number = data.number;
    if (data.title !== undefined) updates.title = data.title;
    if (data.discipline !== undefined) updates.discipline = data.discipline;
    if (data.revision !== undefined) updates.revision = data.revision;
    if (data.drawingDate !== undefined) updates.drawing_date = data.drawingDate;
    if (data.receivedDate !== undefined) updates.received_date = data.receivedDate;
    if (data.drawingSet !== undefined) updates.drawing_set = data.drawingSet;
    if (data.status !== undefined) updates.status = data.status;
    if (Object.keys(updates).length === 0) return this.getDrawing(id);
    const [row] = await db.update(drawings_t).set(updates).where(eq(drawings_t.id, id)).returning();
    return row ? mapDrawing(row) : undefined;
  }

  async deleteDrawing(id: number): Promise<boolean> {
    await db.delete(drawingPins_t).where(eq(drawingPins_t.drawing_id, id));
    const result = await db.delete(drawings_t).where(eq(drawings_t.id, id)).returning({ id: drawings_t.id });
    return result.length > 0;
  }

  // ----- Drawing pins -----

  async getDrawingPins(drawingId: number): Promise<DrawingPin[]> {
    const rows = await db.select().from(drawingPins_t)
      .where(eq(drawingPins_t.drawing_id, drawingId)).orderBy(asc(drawingPins_t.id));
    return rows.map(mapDrawingPin);
  }

  async createDrawingPin(data: InsertDrawingPin): Promise<DrawingPin> {
    const [row] = await db.insert(drawingPins_t).values({
      drawing_id: data.drawingId, x: data.x, y: data.y,
      link_type: data.linkType ?? "note", linked_id: data.linkedId,
      note: data.note ?? "", created_by: data.createdBy ?? "",
    }).returning();
    return mapDrawingPin(row);
  }

  async updateDrawingPin(id: number, data: Partial<DrawingPin>): Promise<DrawingPin | undefined> {
    const updates: Record<string, unknown> = {};
    if (data.x !== undefined) updates.x = data.x;
    if (data.y !== undefined) updates.y = data.y;
    if (data.linkType !== undefined) updates.link_type = data.linkType;
    if (data.linkedId !== undefined) updates.linked_id = data.linkedId;
    if (data.note !== undefined) updates.note = data.note;
    if (Object.keys(updates).length === 0) {
      const rows = await db.select().from(drawingPins_t).where(eq(drawingPins_t.id, id));
      return rows[0] ? mapDrawingPin(rows[0]) : undefined;
    }
    const [row] = await db.update(drawingPins_t).set(updates).where(eq(drawingPins_t.id, id)).returning();
    return row ? mapDrawingPin(row) : undefined;
  }

  async deleteDrawingPin(id: number): Promise<boolean> {
    const result = await db.delete(drawingPins_t).where(eq(drawingPins_t.id, id)).returning({ id: drawingPins_t.id });
    return result.length > 0;
  }

  // ----- Specifications -----

  async getSpecSections(): Promise<SpecSection[]> {
    const rows = await db.select().from(specSections_t).orderBy(asc(specSections_t.id));
    return rows.map(mapSpecSection);
  }

  async getSpecSection(id: number): Promise<SpecSection | undefined> {
    const rows = await db.select().from(specSections_t).where(eq(specSections_t.id, id));
    return rows[0] ? mapSpecSection(rows[0]) : undefined;
  }

  async createSpecSection(data: InsertSpecSection): Promise<SpecSection> {
    const [row] = await db.insert(specSections_t).values({
      number: data.number, title: data.title, division: data.division,
      revision: data.revision ?? "0", spec_set: data.specSet ?? "",
      issued_date: data.issuedDate ?? null, received_date: data.receivedDate ?? null,
    }).returning();
    return mapSpecSection(row);
  }

  async updateSpecSection(id: number, data: Partial<SpecSection>): Promise<SpecSection | undefined> {
    const updates: Record<string, unknown> = {};
    if (data.number !== undefined) updates.number = data.number;
    if (data.title !== undefined) updates.title = data.title;
    if (data.division !== undefined) updates.division = data.division;
    if (data.revision !== undefined) updates.revision = data.revision;
    if (data.specSet !== undefined) updates.spec_set = data.specSet;
    if (data.issuedDate !== undefined) updates.issued_date = data.issuedDate;
    if (data.receivedDate !== undefined) updates.received_date = data.receivedDate;
    if (Object.keys(updates).length === 0) return this.getSpecSection(id);
    const [row] = await db.update(specSections_t).set(updates).where(eq(specSections_t.id, id)).returning();
    return row ? mapSpecSection(row) : undefined;
  }

  async deleteSpecSection(id: number): Promise<boolean> {
    const result = await db.delete(specSections_t).where(eq(specSections_t.id, id)).returning({ id: specSections_t.id });
    return result.length > 0;
  }

  // ----- Daily Logs -----

  async getDailyLogs(): Promise<DailyLog[]> {
    const rows = await db.select().from(dailyLogs_t).orderBy(asc(dailyLogs_t.log_date));
    return rows.map(mapDailyLog);
  }

  async getDailyLog(id: number): Promise<DailyLog | undefined> {
    const rows = await db.select().from(dailyLogs_t).where(eq(dailyLogs_t.id, id));
    return rows[0] ? mapDailyLog(rows[0]) : undefined;
  }

  async getDailyLogByDate(logDate: string): Promise<DailyLog | undefined> {
    const rows = await db.select().from(dailyLogs_t).where(eq(dailyLogs_t.log_date, logDate));
    return rows[0] ? mapDailyLog(rows[0]) : undefined;
  }

  async createDailyLog(data: InsertDailyLog): Promise<DailyLog> {
    const existing = await this.getDailyLogByDate(data.logDate);
    if (existing) return existing;
    const [row] = await db.insert(dailyLogs_t).values({
      log_date: data.logDate,
      weather_conditions: data.weatherConditions ?? "Clear",
      temp_high: data.tempHigh ?? null, temp_low: data.tempLow ?? null,
      precipitation: data.precipitation ?? "",
      wind_speed: data.windSpeed ?? "",
      weather_delay: data.weatherDelay ?? false,
      notes: data.notes ?? "", delays: data.delays ?? "",
      safety_notes: data.safetyNotes ?? "",
      visitors: data.visitors ?? "",
      equipment_on_site: data.equipmentOnSite ?? "",
    }).returning();
    return mapDailyLog(row);
  }

  async updateDailyLog(id: number, data: Partial<DailyLog>): Promise<DailyLog | undefined> {
    const updates: Record<string, unknown> = {};
    if (data.logDate !== undefined) updates.log_date = data.logDate;
    if (data.weatherConditions !== undefined) updates.weather_conditions = data.weatherConditions;
    if (data.tempHigh !== undefined) updates.temp_high = data.tempHigh;
    if (data.tempLow !== undefined) updates.temp_low = data.tempLow;
    if (data.precipitation !== undefined) updates.precipitation = data.precipitation;
    if (data.windSpeed !== undefined) updates.wind_speed = data.windSpeed;
    if (data.weatherDelay !== undefined) updates.weather_delay = data.weatherDelay;
    if (data.notes !== undefined) updates.notes = data.notes;
    if (data.delays !== undefined) updates.delays = data.delays;
    if (data.safetyNotes !== undefined) updates.safety_notes = data.safetyNotes;
    if (data.visitors !== undefined) updates.visitors = data.visitors;
    if (data.equipmentOnSite !== undefined) updates.equipment_on_site = data.equipmentOnSite;
    if (Object.keys(updates).length === 0) return this.getDailyLog(id);
    const [row] = await db.update(dailyLogs_t).set(updates).where(eq(dailyLogs_t.id, id)).returning();
    return row ? mapDailyLog(row) : undefined;
  }

  async deleteDailyLog(id: number): Promise<boolean> {
    await db.delete(manpowerEntries_t).where(eq(manpowerEntries_t.daily_log_id, id));
    const result = await db.delete(dailyLogs_t).where(eq(dailyLogs_t.id, id)).returning({ id: dailyLogs_t.id });
    return result.length > 0;
  }

  async getManpowerEntries(dailyLogId: number): Promise<ManpowerEntry[]> {
    const rows = await db.select().from(manpowerEntries_t)
      .where(eq(manpowerEntries_t.daily_log_id, dailyLogId)).orderBy(asc(manpowerEntries_t.id));
    return rows.map(mapManpowerEntry);
  }

  async createManpowerEntry(data: InsertManpowerEntry): Promise<ManpowerEntry> {
    const [row] = await db.insert(manpowerEntries_t).values({
      daily_log_id: data.dailyLogId, contractor: data.contractor,
      workers: data.workers ?? 0, hours: data.hours ?? 0,
      location: data.location ?? "", comments: data.comments ?? "",
    }).returning();
    return mapManpowerEntry(row);
  }

  async updateManpowerEntry(id: number, data: Partial<ManpowerEntry>): Promise<ManpowerEntry | undefined> {
    const updates: Record<string, unknown> = {};
    if (data.contractor !== undefined) updates.contractor = data.contractor;
    if (data.workers !== undefined) updates.workers = data.workers;
    if (data.hours !== undefined) updates.hours = data.hours;
    if (data.location !== undefined) updates.location = data.location;
    if (data.comments !== undefined) updates.comments = data.comments;
    if (Object.keys(updates).length === 0) {
      const rows = await db.select().from(manpowerEntries_t).where(eq(manpowerEntries_t.id, id));
      return rows[0] ? mapManpowerEntry(rows[0]) : undefined;
    }
    const [row] = await db.update(manpowerEntries_t).set(updates).where(eq(manpowerEntries_t.id, id)).returning();
    return row ? mapManpowerEntry(row) : undefined;
  }

  async deleteManpowerEntry(id: number): Promise<boolean> {
    const result = await db.delete(manpowerEntries_t).where(eq(manpowerEntries_t.id, id)).returning({ id: manpowerEntries_t.id });
    return result.length > 0;
  }

  // ----- Punch List -----

  async getPunchItems(): Promise<PunchItem[]> {
    const rows = await db.select().from(punchItems_t).orderBy(asc(punchItems_t.id));
    return rows.map(mapPunchItem);
  }

  async getPunchItem(id: number): Promise<PunchItem | undefined> {
    const rows = await db.select().from(punchItems_t).where(eq(punchItems_t.id, id));
    return rows[0] ? mapPunchItem(rows[0]) : undefined;
  }

  async createPunchItem(data: InsertPunchItem): Promise<PunchItem> {
    const number = data.number ?? String((await db.select({ value: count() }).from(punchItems_t))[0].value + 1);
    const [row] = await db.insert(punchItems_t).values({
      number, title: data.title, description: data.description ?? "",
      status: data.status ?? "Open", priority: data.priority ?? "Medium",
      location: data.location ?? "", trade: data.trade ?? "",
      assignee: data.assignee ?? "", ball_in_court: data.ballInCourt ?? "",
      due_date: data.dueDate ?? null, date_closed: data.dateClosed ?? null,
    }).returning();
    return mapPunchItem(row);
  }

  async updatePunchItem(id: number, data: Partial<PunchItem>): Promise<PunchItem | undefined> {
    const existing = await this.getPunchItem(id);
    if (!existing) return undefined;
    const updates: Record<string, unknown> = {};
    if (data.number !== undefined) updates.number = data.number;
    if (data.title !== undefined) updates.title = data.title;
    if (data.description !== undefined) updates.description = data.description;
    if (data.status !== undefined) updates.status = data.status;
    if (data.priority !== undefined) updates.priority = data.priority;
    if (data.location !== undefined) updates.location = data.location;
    if (data.trade !== undefined) updates.trade = data.trade;
    if (data.assignee !== undefined) updates.assignee = data.assignee;
    if (data.ballInCourt !== undefined) updates.ball_in_court = data.ballInCourt;
    if (data.dueDate !== undefined) updates.due_date = data.dueDate;
    if (data.dateClosed !== undefined) updates.date_closed = data.dateClosed;
    if (data.status === "Closed" && existing.status !== "Closed" && data.dateClosed === undefined) {
      updates.date_closed = today();
    }
    if (Object.keys(updates).length === 0) return existing;
    const [row] = await db.update(punchItems_t).set(updates).where(eq(punchItems_t.id, id)).returning();
    return row ? mapPunchItem(row) : undefined;
  }

  async deletePunchItem(id: number): Promise<boolean> {
    const result = await db.delete(punchItems_t).where(eq(punchItems_t.id, id)).returning({ id: punchItems_t.id });
    return result.length > 0;
  }

  // ----- Change Events -----

  async getChangeEvents(): Promise<ChangeEvent[]> {
    const rows = await db.select().from(changeEvents_t).orderBy(asc(changeEvents_t.id));
    return rows.map(mapChangeEvent);
  }

  async getChangeEvent(id: number): Promise<ChangeEvent | undefined> {
    const rows = await db.select().from(changeEvents_t).where(eq(changeEvents_t.id, id));
    return rows[0] ? mapChangeEvent(rows[0]) : undefined;
  }

  async createChangeEvent(data: InsertChangeEvent): Promise<ChangeEvent> {
    const number = data.number ?? await this.nextNumber(changeEvents_t, "CE");
    const [row] = await db.insert(changeEvents_t).values({
      number, title: data.title,
      status: data.status ?? "Open", scope: data.scope ?? "TBD",
      event_type: data.eventType ?? "Owner Change",
      origin: data.origin ?? "", description: data.description ?? "",
    }).returning();
    return mapChangeEvent(row);
  }

  async updateChangeEvent(id: number, data: Partial<ChangeEvent>): Promise<ChangeEvent | undefined> {
    const updates: Record<string, unknown> = {};
    if (data.number !== undefined) updates.number = data.number;
    if (data.title !== undefined) updates.title = data.title;
    if (data.status !== undefined) updates.status = data.status;
    if (data.scope !== undefined) updates.scope = data.scope;
    if (data.eventType !== undefined) updates.event_type = data.eventType;
    if (data.origin !== undefined) updates.origin = data.origin;
    if (data.description !== undefined) updates.description = data.description;
    if (Object.keys(updates).length === 0) return this.getChangeEvent(id);
    const [row] = await db.update(changeEvents_t).set(updates).where(eq(changeEvents_t.id, id)).returning();
    return row ? mapChangeEvent(row) : undefined;
  }

  async deleteChangeEvent(id: number): Promise<boolean> {
    await db.delete(changeEventLineItems_t).where(eq(changeEventLineItems_t.change_event_id, id));
    const result = await db.delete(changeEvents_t).where(eq(changeEvents_t.id, id)).returning({ id: changeEvents_t.id });
    return result.length > 0;
  }

  async getChangeEventLineItems(changeEventId?: number): Promise<ChangeEventLineItem[]> {
    if (changeEventId === undefined) {
      const rows = await db.select().from(changeEventLineItems_t).orderBy(asc(changeEventLineItems_t.id));
      return rows.map(mapChangeEventLine);
    }
    const rows = await db.select().from(changeEventLineItems_t)
      .where(eq(changeEventLineItems_t.change_event_id, changeEventId))
      .orderBy(asc(changeEventLineItems_t.id));
    return rows.map(mapChangeEventLine);
  }

  async createChangeEventLineItem(data: InsertChangeEventLineItem): Promise<ChangeEventLineItem> {
    const [row] = await db.insert(changeEventLineItems_t).values({
      change_event_id: data.changeEventId, cost_code: data.costCode,
      description: data.description, vendor: data.vendor,
      rom_amount: data.romAmount,
    }).returning();
    return mapChangeEventLine(row);
  }

  async updateChangeEventLineItem(id: number, data: Partial<ChangeEventLineItem>): Promise<ChangeEventLineItem | undefined> {
    const updates: Record<string, unknown> = {};
    if (data.costCode !== undefined) updates.cost_code = data.costCode;
    if (data.description !== undefined) updates.description = data.description;
    if (data.vendor !== undefined) updates.vendor = data.vendor;
    if (data.romAmount !== undefined) updates.rom_amount = data.romAmount;
    if (Object.keys(updates).length === 0) {
      const rows = await db.select().from(changeEventLineItems_t).where(eq(changeEventLineItems_t.id, id));
      return rows[0] ? mapChangeEventLine(rows[0]) : undefined;
    }
    const [row] = await db.update(changeEventLineItems_t).set(updates).where(eq(changeEventLineItems_t.id, id)).returning();
    return row ? mapChangeEventLine(row) : undefined;
  }

  async deleteChangeEventLineItem(id: number): Promise<boolean> {
    const result = await db.delete(changeEventLineItems_t).where(eq(changeEventLineItems_t.id, id)).returning({ id: changeEventLineItems_t.id });
    return result.length > 0;
  }

  // ----- Change Orders -----

  async getChangeOrders(): Promise<ChangeOrder[]> {
    const rows = await db.select().from(changeOrders_t).orderBy(asc(changeOrders_t.id));
    return rows.map(mapChangeOrder);
  }

  async getChangeOrder(id: number): Promise<ChangeOrder | undefined> {
    const rows = await db.select().from(changeOrders_t).where(eq(changeOrders_t.id, id));
    return rows[0] ? mapChangeOrder(rows[0]) : undefined;
  }

  async createChangeOrder(data: InsertChangeOrder): Promise<ChangeOrder> {
    const number = data.number ?? await this.nextNumber(changeOrders_t, "PCO");
    const [row] = await db.insert(changeOrders_t).values({
      number, title: data.title,
      status: data.status ?? "Draft", change_event_id: data.changeEventId,
      description: data.description ?? "",
      schedule_impact_days: data.scheduleImpactDays ?? 0,
      executed: data.executed ?? false,
      signed_date: data.signedDate ?? null,
      date_created: data.dateCreated ?? today(),
    }).returning();
    return mapChangeOrder(row);
  }

  async updateChangeOrder(id: number, data: Partial<ChangeOrder>): Promise<ChangeOrder | undefined> {
    const updates: Record<string, unknown> = {};
    if (data.number !== undefined) updates.number = data.number;
    if (data.title !== undefined) updates.title = data.title;
    if (data.status !== undefined) updates.status = data.status;
    if (data.changeEventId !== undefined) updates.change_event_id = data.changeEventId;
    if (data.description !== undefined) updates.description = data.description;
    if (data.scheduleImpactDays !== undefined) updates.schedule_impact_days = data.scheduleImpactDays;
    if (data.executed !== undefined) updates.executed = data.executed;
    if (data.signedDate !== undefined) updates.signed_date = data.signedDate;
    if (data.dateCreated !== undefined) updates.date_created = data.dateCreated;
    if (Object.keys(updates).length === 0) return this.getChangeOrder(id);
    const [row] = await db.update(changeOrders_t).set(updates).where(eq(changeOrders_t.id, id)).returning();
    return row ? mapChangeOrder(row) : undefined;
  }

  async deleteChangeOrder(id: number): Promise<boolean> {
    await db.delete(changeOrderLineItems_t).where(eq(changeOrderLineItems_t.change_order_id, id));
    const result = await db.delete(changeOrders_t).where(eq(changeOrders_t.id, id)).returning({ id: changeOrders_t.id });
    return result.length > 0;
  }

  async getChangeOrderLineItems(changeOrderId?: number): Promise<ChangeOrderLineItem[]> {
    if (changeOrderId === undefined) {
      const rows = await db.select().from(changeOrderLineItems_t).orderBy(asc(changeOrderLineItems_t.id));
      return rows.map(mapChangeOrderLine);
    }
    const rows = await db.select().from(changeOrderLineItems_t)
      .where(eq(changeOrderLineItems_t.change_order_id, changeOrderId))
      .orderBy(asc(changeOrderLineItems_t.id));
    return rows.map(mapChangeOrderLine);
  }

  async createChangeOrderLineItem(data: InsertChangeOrderLineItem): Promise<ChangeOrderLineItem> {
    const [row] = await db.insert(changeOrderLineItems_t).values({
      change_order_id: data.changeOrderId, cost_code: data.costCode,
      description: data.description, amount: data.amount,
    }).returning();
    return mapChangeOrderLine(row);
  }

  async updateChangeOrderLineItem(id: number, data: Partial<ChangeOrderLineItem>): Promise<ChangeOrderLineItem | undefined> {
    const updates: Record<string, unknown> = {};
    if (data.costCode !== undefined) updates.cost_code = data.costCode;
    if (data.description !== undefined) updates.description = data.description;
    if (data.amount !== undefined) updates.amount = data.amount;
    if (Object.keys(updates).length === 0) {
      const rows = await db.select().from(changeOrderLineItems_t).where(eq(changeOrderLineItems_t.id, id));
      return rows[0] ? mapChangeOrderLine(rows[0]) : undefined;
    }
    const [row] = await db.update(changeOrderLineItems_t).set(updates).where(eq(changeOrderLineItems_t.id, id)).returning();
    return row ? mapChangeOrderLine(row) : undefined;
  }

  async deleteChangeOrderLineItem(id: number): Promise<boolean> {
    const result = await db.delete(changeOrderLineItems_t).where(eq(changeOrderLineItems_t.id, id)).returning({ id: changeOrderLineItems_t.id });
    return result.length > 0;
  }

  // ----- Budget -----

  async getBudgetLineItems(): Promise<BudgetLineItem[]> {
    const rows = await db.select().from(budgetLineItems_t).orderBy(asc(budgetLineItems_t.id));
    return rows.map(mapBudgetLine);
  }

  async createBudgetLineItem(data: InsertBudgetLineItem): Promise<BudgetLineItem> {
    const [row] = await db.insert(budgetLineItems_t).values({
      cost_code: data.costCode, description: data.description,
      original_budget: data.originalBudget,
      budget_modifications: data.budgetModifications,
      committed_costs: data.committedCosts,
      direct_costs: data.directCosts,
      pending_budget_changes: data.pendingBudgetChanges,
    }).returning();
    return mapBudgetLine(row);
  }

  async updateBudgetLineItem(id: number, data: Partial<BudgetLineItem>): Promise<BudgetLineItem | undefined> {
    const updates: Record<string, unknown> = {};
    if (data.costCode !== undefined) updates.cost_code = data.costCode;
    if (data.description !== undefined) updates.description = data.description;
    if (data.originalBudget !== undefined) updates.original_budget = data.originalBudget;
    if (data.budgetModifications !== undefined) updates.budget_modifications = data.budgetModifications;
    if (data.committedCosts !== undefined) updates.committed_costs = data.committedCosts;
    if (data.directCosts !== undefined) updates.direct_costs = data.directCosts;
    if (data.pendingBudgetChanges !== undefined) updates.pending_budget_changes = data.pendingBudgetChanges;
    if (Object.keys(updates).length === 0) {
      const rows = await db.select().from(budgetLineItems_t).where(eq(budgetLineItems_t.id, id));
      return rows[0] ? mapBudgetLine(rows[0]) : undefined;
    }
    const [row] = await db.update(budgetLineItems_t).set(updates).where(eq(budgetLineItems_t.id, id)).returning();
    return row ? mapBudgetLine(row) : undefined;
  }

  async deleteBudgetLineItem(id: number): Promise<boolean> {
    const result = await db.delete(budgetLineItems_t).where(eq(budgetLineItems_t.id, id)).returning({ id: budgetLineItems_t.id });
    return result.length > 0;
  }

  /** Approved change order amounts grouped by cost code. */
  private async approvedCoAmountsByCostCode(): Promise<Map<string, number>> {
    const rows = await db.select({
      cost_code: changeOrderLineItems_t.cost_code,
      amount: sql<number>`SUM(${changeOrderLineItems_t.amount})`,
    })
      .from(changeOrderLineItems_t)
      .innerJoin(changeOrders_t, eq(changeOrders_t.id, changeOrderLineItems_t.change_order_id))
      .where(eq(changeOrders_t.status, "Approved"))
      .groupBy(changeOrderLineItems_t.cost_code);
    const map = new Map<string, number>();
    for (const row of rows) map.set(row.cost_code, Number(row.amount));
    return map;
  }

  /** Executed/complete commitment dollars grouped by cost code. */
  private async commitmentAmountsByCostCode(): Promise<Map<string, number>> {
    const rows = await db.select({
      cost_code: commitmentLineItems_t.cost_code,
      amount: sql<number>`SUM(${commitmentLineItems_t.amount})`,
    })
      .from(commitmentLineItems_t)
      .innerJoin(commitments_t, eq(commitments_t.id, commitmentLineItems_t.commitment_id))
      .where(sql`${commitments_t.status} IN ('Executed', 'Complete')`)
      .groupBy(commitmentLineItems_t.cost_code);
    const map = new Map<string, number>();
    for (const row of rows) map.set(row.cost_code, Number(row.amount));
    return map;
  }

  async getBudgetSummary(): Promise<BudgetSummary> {
    const [budgetLines, coByCode, commitByCode] = await Promise.all([
      this.getBudgetLineItems(),
      this.approvedCoAmountsByCostCode(),
      this.commitmentAmountsByCostCode(),
    ]);
    const matchedCodes = new Set<string>();

    const rows: BudgetRow[] = budgetLines.map(item => {
      const approvedCOs = coByCode.get(item.costCode) ?? 0;
      if (coByCode.has(item.costCode)) matchedCodes.add(item.costCode);
      // committed = manual entry + executed commitments
      const committedCosts = item.committedCosts + (commitByCode.get(item.costCode) ?? 0);
      const revisedBudget = item.originalBudget + item.budgetModifications + approvedCOs;
      const projectedCosts = committedCosts + item.directCosts + item.pendingBudgetChanges;
      return {
        ...item, committedCosts, approvedCOs, revisedBudget, projectedCosts,
        projectedOverUnder: revisedBudget - projectedCosts,
        forecastToComplete: Math.max(0, revisedBudget - committedCosts - item.directCosts),
      };
    });

    let unmatchedCOs = 0;
    coByCode.forEach((amount, code) => {
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

  async getContractFinancials(): Promise<ContractFinancials> {
    const [{ original }] = await db.select({
      original: sql<number>`COALESCE(SUM(${sovLineItems_t.scheduled_value}), 0)`,
    }).from(sovLineItems_t);
    const originalContractValue = Number(original);

    const groupedRows = await db.select({
      status: changeOrders_t.status,
      total: sql<number>`COALESCE(SUM(${changeOrderLineItems_t.amount}), 0)`,
    })
      .from(changeOrders_t)
      .leftJoin(changeOrderLineItems_t, eq(changeOrderLineItems_t.change_order_id, changeOrders_t.id))
      .groupBy(changeOrders_t.status);

    let approved = 0;
    let pending = 0;
    for (const row of groupedRows) {
      const amount = Number(row.total);
      if (row.status === "Approved") approved += amount;
      else if (row.status === "Pending - In Review" || row.status === "Draft") pending += amount;
    }
    return {
      originalContractValue,
      approvedChangeOrders: approved,
      pendingChangeOrders: pending,
      revisedContractValue: originalContractValue + approved,
      pendingRevisedContractValue: originalContractValue + approved + pending,
    };
  }

  // ----- Commitments -----

  async getCommitments(): Promise<Commitment[]> {
    const rows = await db.select().from(commitments_t).orderBy(asc(commitments_t.id));
    return rows.map(mapCommitment);
  }

  async getCommitment(id: number): Promise<Commitment | undefined> {
    const rows = await db.select().from(commitments_t).where(eq(commitments_t.id, id));
    return rows[0] ? mapCommitment(rows[0]) : undefined;
  }

  async createCommitment(data: InsertCommitment): Promise<Commitment> {
    const commitmentType = data.commitmentType ?? "Subcontract";
    let number = data.number;
    if (!number) {
      const prefix = commitmentType === "Purchase Order" ? "PO" : "SC";
      const [{ value }] = await db.select({ value: count() }).from(commitments_t)
        .where(eq(commitments_t.commitment_type, commitmentType));
      number = `${prefix}-${pad(Number(value) + 1)}`;
    }
    const [row] = await db.insert(commitments_t).values({
      number, title: data.title, commitment_type: commitmentType,
      status: data.status ?? "Draft", vendor: data.vendor ?? "",
      executed_date: data.executedDate ?? null,
      retainage_percent: data.retainagePercent ?? 10,
      description: data.description ?? "",
    }).returning();
    return mapCommitment(row);
  }

  async updateCommitment(id: number, data: Partial<Commitment>): Promise<Commitment | undefined> {
    const existing = await this.getCommitment(id);
    if (!existing) return undefined;
    const updates: Record<string, unknown> = {};
    if (data.number !== undefined) updates.number = data.number;
    if (data.title !== undefined) updates.title = data.title;
    if (data.commitmentType !== undefined) updates.commitment_type = data.commitmentType;
    if (data.status !== undefined) updates.status = data.status;
    if (data.vendor !== undefined) updates.vendor = data.vendor;
    if (data.executedDate !== undefined) updates.executed_date = data.executedDate;
    if (data.retainagePercent !== undefined) updates.retainage_percent = data.retainagePercent;
    if (data.description !== undefined) updates.description = data.description;
    if (data.status === "Executed" && existing.status !== "Executed" && data.executedDate === undefined) {
      updates.executed_date = today();
    }
    if (Object.keys(updates).length === 0) return existing;
    const [row] = await db.update(commitments_t).set(updates).where(eq(commitments_t.id, id)).returning();
    return row ? mapCommitment(row) : undefined;
  }

  async deleteCommitment(id: number): Promise<boolean> {
    await db.delete(commitmentLineItems_t).where(eq(commitmentLineItems_t.commitment_id, id));
    const result = await db.delete(commitments_t).where(eq(commitments_t.id, id)).returning({ id: commitments_t.id });
    return result.length > 0;
  }

  async getCommitmentLineItems(commitmentId?: number): Promise<CommitmentLineItem[]> {
    if (commitmentId === undefined) {
      const rows = await db.select().from(commitmentLineItems_t).orderBy(asc(commitmentLineItems_t.id));
      return rows.map(mapCommitmentLine);
    }
    const rows = await db.select().from(commitmentLineItems_t)
      .where(eq(commitmentLineItems_t.commitment_id, commitmentId))
      .orderBy(asc(commitmentLineItems_t.id));
    return rows.map(mapCommitmentLine);
  }

  async createCommitmentLineItem(data: InsertCommitmentLineItem): Promise<CommitmentLineItem> {
    const [row] = await db.insert(commitmentLineItems_t).values({
      commitment_id: data.commitmentId, cost_code: data.costCode,
      description: data.description, amount: data.amount,
    }).returning();
    return mapCommitmentLine(row);
  }

  async updateCommitmentLineItem(id: number, data: Partial<CommitmentLineItem>): Promise<CommitmentLineItem | undefined> {
    const updates: Record<string, unknown> = {};
    if (data.costCode !== undefined) updates.cost_code = data.costCode;
    if (data.description !== undefined) updates.description = data.description;
    if (data.amount !== undefined) updates.amount = data.amount;
    if (Object.keys(updates).length === 0) {
      const rows = await db.select().from(commitmentLineItems_t).where(eq(commitmentLineItems_t.id, id));
      return rows[0] ? mapCommitmentLine(rows[0]) : undefined;
    }
    const [row] = await db.update(commitmentLineItems_t).set(updates).where(eq(commitmentLineItems_t.id, id)).returning();
    return row ? mapCommitmentLine(row) : undefined;
  }

  async deleteCommitmentLineItem(id: number): Promise<boolean> {
    const result = await db.delete(commitmentLineItems_t).where(eq(commitmentLineItems_t.id, id)).returning({ id: commitmentLineItems_t.id });
    return result.length > 0;
  }

  // ----- Owner invoices (pay applications) -----

  async getOwnerInvoices(): Promise<OwnerInvoice[]> {
    const rows = await db.select().from(ownerInvoices_t).orderBy(asc(ownerInvoices_t.id));
    return rows.map(mapOwnerInvoice);
  }

  async getOwnerInvoice(id: number): Promise<OwnerInvoice | undefined> {
    const rows = await db.select().from(ownerInvoices_t).where(eq(ownerInvoices_t.id, id));
    return rows[0] ? mapOwnerInvoice(rows[0]) : undefined;
  }

  async createOwnerInvoice(data: InsertOwnerInvoice): Promise<OwnerInvoice> {
    const number = data.number ?? await this.nextNumber(ownerInvoices_t, "INV");
    return db.transaction(async tx => {
      const [row] = await tx.insert(ownerInvoices_t).values({
        number,
        period_start: data.periodStart ?? null,
        period_end: data.periodEnd,
        billing_date: data.billingDate,
        status: data.status ?? "Draft",
      }).returning();
      const invoice = mapOwnerInvoice(row);
      const sovItems = await this.getSovLineItems();
      for (const item of sovItems) {
        await tx.insert(invoiceLineItems_t).values({
          invoice_id: invoice.id, sov_line_item_id: item.id,
          work_this_period: 0, stored_materials: 0,
        });
      }
      return invoice;
    });
  }

  async updateOwnerInvoice(id: number, data: Partial<OwnerInvoice>): Promise<OwnerInvoice | undefined> {
    const updates: Record<string, unknown> = {};
    if (data.number !== undefined) updates.number = data.number;
    if (data.periodStart !== undefined) updates.period_start = data.periodStart;
    if (data.periodEnd !== undefined) updates.period_end = data.periodEnd;
    if (data.billingDate !== undefined) updates.billing_date = data.billingDate;
    if (data.status !== undefined) updates.status = data.status;
    if (Object.keys(updates).length === 0) return this.getOwnerInvoice(id);
    const [row] = await db.update(ownerInvoices_t).set(updates).where(eq(ownerInvoices_t.id, id)).returning();
    return row ? mapOwnerInvoice(row) : undefined;
  }

  async deleteOwnerInvoice(id: number): Promise<boolean> {
    await db.delete(invoiceLineItems_t).where(eq(invoiceLineItems_t.invoice_id, id));
    const result = await db.delete(ownerInvoices_t).where(eq(ownerInvoices_t.id, id)).returning({ id: ownerInvoices_t.id });
    return result.length > 0;
  }

  async getInvoiceLineItems(invoiceId: number): Promise<InvoiceLineItem[]> {
    const rows = await db.select().from(invoiceLineItems_t)
      .where(eq(invoiceLineItems_t.invoice_id, invoiceId))
      .orderBy(asc(invoiceLineItems_t.id));
    return rows.map(mapInvoiceLine);
  }

  async createInvoiceLineItem(data: InsertInvoiceLineItem): Promise<InvoiceLineItem> {
    const [row] = await db.insert(invoiceLineItems_t).values({
      invoice_id: data.invoiceId, sov_line_item_id: data.sovLineItemId,
      work_this_period: data.workThisPeriod, stored_materials: data.storedMaterials,
    }).returning();
    return mapInvoiceLine(row);
  }

  async updateInvoiceLineItem(id: number, data: Partial<InvoiceLineItem>): Promise<InvoiceLineItem | undefined> {
    const updates: Record<string, unknown> = {};
    if (data.workThisPeriod !== undefined) updates.work_this_period = data.workThisPeriod;
    if (data.storedMaterials !== undefined) updates.stored_materials = data.storedMaterials;
    if (Object.keys(updates).length === 0) {
      const rows = await db.select().from(invoiceLineItems_t).where(eq(invoiceLineItems_t.id, id));
      return rows[0] ? mapInvoiceLine(rows[0]) : undefined;
    }
    const [row] = await db.update(invoiceLineItems_t).set(updates).where(eq(invoiceLineItems_t.id, id)).returning();
    return row ? mapInvoiceLine(row) : undefined;
  }

  /** G702/G703 summary for one pay app. Pulls previous billings from earlier apps. */
  async getG702Summary(invoiceId: number): Promise<G702Summary | undefined> {
    const invoice = await this.getOwnerInvoice(invoiceId);
    if (!invoice) return undefined;
    const contract = await this.getPrimeContract();
    const retainagePercent = contract.retainagePercent;

    // Sum prior period work + stored materials per SOV line for invoices with id < current
    const priorRows = await db.select({
      sov_id: invoiceLineItems_t.sov_line_item_id,
      total: sql<number>`COALESCE(SUM(${invoiceLineItems_t.work_this_period} + ${invoiceLineItems_t.stored_materials}), 0)`,
    })
      .from(invoiceLineItems_t)
      .where(sql`${invoiceLineItems_t.invoice_id} < ${invoiceId}`)
      .groupBy(invoiceLineItems_t.sov_line_item_id);
    const priorBySov = new Map<number, number>();
    for (const row of priorRows) priorBySov.set(row.sov_id, Number(row.total));

    const [lines, sovItems] = await Promise.all([
      this.getInvoiceLineItems(invoiceId),
      this.getSovLineItems(),
    ]);
    const sovById = new Map(sovItems.map(item => [item.id, item]));

    const rows: G703Row[] = [];
    for (const line of lines) {
      const sovItem = sovById.get(line.sovLineItemId);
      if (!sovItem) continue;
      const previousCompleted = priorBySov.get(line.sovLineItemId) ?? 0;
      const totalCompletedAndStored = previousCompleted + line.workThisPeriod + line.storedMaterials;
      rows.push({
        lineItemId: line.id, sovLineItemId: sovItem.id,
        itemNumber: sovItem.itemNumber, costCode: sovItem.costCode,
        description: sovItem.description, scheduledValue: sovItem.scheduledValue,
        previousCompleted, workThisPeriod: line.workThisPeriod,
        storedMaterials: line.storedMaterials, totalCompletedAndStored,
        percentComplete: sovItem.scheduledValue > 0
          ? (totalCompletedAndStored / sovItem.scheduledValue) * 100 : 0,
        balanceToFinish: sovItem.scheduledValue - totalCompletedAndStored,
        retainage: totalCompletedAndStored * (retainagePercent / 100),
      });
    }

    const originalContractSum = sovItems.reduce((acc, item) => acc + item.scheduledValue, 0);
    const financials = await this.getContractFinancials();
    const netChangeOrders = financials.approvedChangeOrders;
    const contractSumToDate = originalContractSum + netChangeOrders;
    const totalCompletedAndStored = rows.reduce((acc, r) => acc + r.totalCompletedAndStored, 0);
    const totalRetainage = totalCompletedAndStored * (retainagePercent / 100);
    const totalEarnedLessRetainage = totalCompletedAndStored - totalRetainage;
    const previousCompletedTotal = rows.reduce((acc, r) => acc + r.previousCompleted, 0);
    const previousCertificates = previousCompletedTotal - previousCompletedTotal * (retainagePercent / 100);

    return {
      invoice, rows, originalContractSum, netChangeOrders, contractSumToDate,
      totalCompletedAndStored, retainagePercent, totalRetainage,
      totalEarnedLessRetainage, previousCertificates,
      currentPaymentDue: totalEarnedLessRetainage - previousCertificates,
      balanceToFinishIncludingRetainage: contractSumToDate - totalEarnedLessRetainage,
    };
  }

  // ----- Attachments -----

  async getAttachments(entityType: string, entityId: number): Promise<Attachment[]> {
    const rows = await db.select().from(attachments_t).where(
      and(eq(attachments_t.entity_type, entityType), eq(attachments_t.entity_id, entityId)),
    ).orderBy(asc(attachments_t.id));
    return rows.map(mapAttachment);
  }

  async getAttachment(id: number): Promise<Attachment | undefined> {
    const rows = await db.select().from(attachments_t).where(eq(attachments_t.id, id));
    return rows[0] ? mapAttachment(rows[0]) : undefined;
  }

  async createAttachment(data: Omit<Attachment, "id" | "createdAt">): Promise<Attachment> {
    const [row] = await db.insert(attachments_t).values({
      entity_type: data.entityType, entity_id: data.entityId,
      filename: data.filename, mime_type: data.mimeType, size: data.size,
      storage_path: data.storagePath, uploaded_by: data.uploadedBy,
    }).returning();
    return mapAttachment(row);
  }

  async deleteAttachment(id: number): Promise<boolean> {
    const result = await db.delete(attachments_t).where(eq(attachments_t.id, id)).returning({ id: attachments_t.id });
    return result.length > 0;
  }

  // ----- Notifications -----

  async getNotifications(userId: number): Promise<Notification[]> {
    const rows = await db.select().from(notifications_t)
      .where(eq(notifications_t.user_id, userId))
      .orderBy(sql`${notifications_t.created_at} DESC`);
    return rows.map(mapNotification);
  }

  /**
   * Inserts a notification and dedupes per (user_id, entity_type, entity_id,
   * title) inside a transaction. The unique index notifications_dedup_idx
   * still guards against races; the explicit SELECT lets us return a null
   * sentinel when the row already exists so the caller can skip the email.
   */
  async createNotification(data: Omit<Notification, "id" | "createdAt">): Promise<Notification | null> {
    return db.transaction(async tx => {
      const hasEntity = data.entityType !== "" && data.entityId !== null;
      if (hasEntity) {
        const existing = await tx.select({ id: notifications_t.id }).from(notifications_t).where(and(
          eq(notifications_t.user_id, data.userId),
          eq(notifications_t.entity_type, data.entityType),
          eq(notifications_t.entity_id, data.entityId as number),
          eq(notifications_t.title, data.title),
        )).limit(1);
        if (existing.length > 0) return null;
      }
      try {
        const [row] = await tx.insert(notifications_t).values({
          user_id: data.userId, title: data.title, body: data.body,
          entity_type: data.entityType, entity_id: data.entityId, read: data.read,
        }).returning();
        return mapNotification(row);
      } catch (error: any) {
        // unique_violation on the partial dedup index — racing instances
        if (error?.code === "23505") return null;
        throw error;
      }
    });
  }

  async markNotificationRead(id: number): Promise<Notification | undefined> {
    const [row] = await db.update(notifications_t).set({ read: true })
      .where(eq(notifications_t.id, id)).returning();
    return row ? mapNotification(row) : undefined;
  }

  async markAllNotificationsRead(userId: number): Promise<void> {
    await db.update(notifications_t).set({ read: true })
      .where(and(eq(notifications_t.user_id, userId), eq(notifications_t.read, false)));
  }

  // ----- Overdue scan -----

  async findOverdueItems(): Promise<Array<{
    entityType: string; entityId: number; title: string;
    assigneeName: string; dueDate: string;
  }>> {
    const cutoff = today();
    const overdue: Array<{
      entityType: string; entityId: number; title: string;
      assigneeName: string; dueDate: string;
    }> = [];

    const rfis = await db.select().from(rfis_t).where(
      and(eq(rfis_t.status, "Open"), sql`${rfis_t.due_date} IS NOT NULL AND ${rfis_t.due_date} < ${cutoff}`),
    );
    for (const rfi of rfis) {
      overdue.push({
        entityType: "rfi", entityId: rfi.id,
        title: `RFI ${rfi.number} is overdue (due ${rfi.due_date})`,
        assigneeName: rfi.assigned_to || rfi.ball_in_court,
        dueDate: rfi.due_date ?? cutoff,
      });
    }
    const punches = await db.select().from(punchItems_t).where(
      and(sql`${punchItems_t.status} IN ('Open', 'Ready for Review')`,
        sql`${punchItems_t.due_date} IS NOT NULL AND ${punchItems_t.due_date} < ${cutoff}`),
    );
    for (const item of punches) {
      overdue.push({
        entityType: "punchItem", entityId: item.id,
        title: `Punch item #${item.number} is overdue (due ${item.due_date})`,
        assigneeName: item.assignee || item.ball_in_court,
        dueDate: item.due_date ?? cutoff,
      });
    }
    const stepRows = await db.select({
      step: submittalSteps_t, number: submittals_t.number,
    })
      .from(submittalSteps_t)
      .leftJoin(submittals_t, eq(submittals_t.id, submittalSteps_t.submittal_id))
      .where(and(
        eq(submittalSteps_t.status, "Pending"),
        sql`${submittalSteps_t.due_date} IS NOT NULL AND ${submittalSteps_t.due_date} < ${cutoff}`,
      ));
    for (const { step, number } of stepRows) {
      overdue.push({
        entityType: "submittal", entityId: step.submittal_id,
        title: `Submittal ${number ?? step.submittal_id} review is overdue (due ${step.due_date})`,
        assigneeName: step.approver_name, dueDate: step.due_date ?? cutoff,
      });
    }
    return overdue;
  }
}

export const procoreStorage = new ProcoreStorage();
