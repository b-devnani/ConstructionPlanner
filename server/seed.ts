import { count } from "drizzle-orm";
import { db } from "./db";
import { users_t } from "@shared/schema";
import { procoreStorage as store } from "./procore-storage";
import { hashPassword } from "./password";

const daysFromToday = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
};
const today = () => new Date().toISOString().split("T")[0];

/**
 * Idempotent demo seed. Only runs when the users table is empty, so it never
 * stomps a real project's data even if restarts hit the seed path.
 */
export async function seedIfEmpty(): Promise<void> {
  const [{ value }] = await db.select({ value: count() }).from(users_t);
  if (Number(value) > 0) return;

  console.log("[seed] empty database detected; seeding demo project");

  // Prime contract
  await store.updatePrimeContract({
    number: "PC-001",
    title: "General Construction Agreement - Riverside Medical Center",
    owner: "Riverside Health Partners LLC",
    contractor: "Summit Builders Inc.",
    architect: "Hartman + Cole Architects",
    status: "Approved", executed: true,
    contractDate: daysFromToday(-120), startDate: daysFromToday(-90),
    substantialCompletionDate: daysFromToday(275),
    signedContractReceivedDate: daysFromToday(-110),
    retainagePercent: 10,
    description: "Lump sum agreement for the ground-up construction of a 4-story, 85,000 SF medical office building including sitework, core & shell, and interior fit-out.",
    inclusions: "All labor, materials, equipment, and supervision per the contract documents dated as issued for construction.",
    exclusions: "Owner-furnished medical equipment, FF&E, low-voltage cabling beyond conduit and boxes, utility company fees.",
  });

  // Submittals
  const sub1 = await store.createSubmittal({
    title: "Structural Steel Shop Drawings - Levels 1-2", revision: 0,
    specSection: "05 12 00", submittalType: "Shop Drawing", status: "Approved",
    responsibleContractor: "Apex Steel Fabricators", receivedFrom: "Apex Steel Fabricators",
    submitBy: "J. Ramirez", ballInCourt: "Hartman + Cole Architects",
    dateSubmitted: daysFromToday(-45), dateReturned: daysFromToday(-30),
    dueDate: daysFromToday(-28), leadTimeDays: 60, requiredOnSiteDate: daysFromToday(20),
    description: "Fabrication and erection drawings for structural steel framing, levels 1 and 2.",
  });
  await store.createSubmittal({
    title: "Curtain Wall System Product Data", revision: 1,
    specSection: "08 44 13", submittalType: "Product Data", status: "Revise and Resubmit",
    responsibleContractor: "ClearView Glazing", receivedFrom: "ClearView Glazing",
    submitBy: "M. Chen", ballInCourt: "ClearView Glazing",
    dateSubmitted: daysFromToday(-20), dateReturned: daysFromToday(-8),
    dueDate: daysFromToday(5), leadTimeDays: 90, requiredOnSiteDate: daysFromToday(95),
    description: "Aluminum curtain wall framing, glazing, and performance data. Architect requires updated thermal calcs.",
  });
  const sub3 = await store.createSubmittal({
    title: "Rooftop AHU Equipment Submittal", revision: 0,
    specSection: "23 73 13", submittalType: "Product Data", status: "Pending Approval",
    responsibleContractor: "Metro HVAC", receivedFrom: "Metro HVAC",
    submitBy: "T. Okafor", ballInCourt: "Hartman + Cole Architects",
    dateSubmitted: daysFromToday(-5), dateReturned: null,
    dueDate: daysFromToday(9), leadTimeDays: 120, requiredOnSiteDate: daysFromToday(140),
    description: "Air handling units AHU-1 through AHU-4 with sound attenuation data.",
  });
  await store.createSubmittal({
    title: "Lobby Stone Flooring Samples", revision: 0,
    specSection: "09 63 40", submittalType: "Sample", status: "Open",
    responsibleContractor: "Granite & Co. Interiors", receivedFrom: "Granite & Co. Interiors",
    submitBy: "L. Park", ballInCourt: "Granite & Co. Interiors",
    dateSubmitted: null, dateReturned: null,
    dueDate: daysFromToday(21), leadTimeDays: 45, requiredOnSiteDate: daysFromToday(180),
    description: "12x24 honed granite samples in three color options for owner selection.",
  });

  // RFIs
  await store.createRfi({
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
  await store.createRfi({
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
  await store.createRfi({
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
  const drawings = [
    { number: "A-101", title: "Level 1 Floor Plan", discipline: "Architectural", revision: "2", set: "IFC" },
    { number: "A-102", title: "Level 2 Floor Plan", discipline: "Architectural", revision: "1", set: "IFC" },
    { number: "A-121", title: "Level 1 Reflected Ceiling Plan", discipline: "Architectural", revision: "1", set: "IFC" },
    { number: "A-401", title: "Building Elevations", discipline: "Architectural", revision: "0", set: "IFC" },
    { number: "S-201", title: "Foundation Plan", discipline: "Structural", revision: "3", set: "IFC" },
    { number: "S-301", title: "Framing Plan - Level 2", discipline: "Structural", revision: "1", set: "IFC" },
    { number: "M-101", title: "Level 1 HVAC Plan", discipline: "Mechanical", revision: "1", set: "IFC" },
    { number: "M-301", title: "Mechanical Sections", discipline: "Mechanical", revision: "0", set: "IFC" },
    { number: "E-101", title: "Level 1 Power Plan", discipline: "Electrical", revision: "2", set: "IFC" },
    { number: "P-101", title: "Level 1 Plumbing Plan", discipline: "Plumbing", revision: "1", set: "IFC" },
    { number: "C-100", title: "Site Grading & Utility Plan", discipline: "Civil", revision: "4", set: "Permit Set" },
  ] as const;
  for (let i = 0; i < drawings.length; i++) {
    const d = drawings[i];
    await store.createDrawing({
      number: d.number, title: d.title, discipline: d.discipline as any, revision: d.revision,
      drawingDate: daysFromToday(-100 + i), receivedDate: daysFromToday(-95 + i),
      drawingSet: d.set, status: "Current",
    });
  }

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
  for (let i = 0; i < specs.length; i++) {
    const [number, title, division] = specs[i];
    await store.createSpecSection({
      number, title, division, revision: i % 3 === 0 ? "1" : "0", specSet: "IFC",
      issuedDate: daysFromToday(-100), receivedDate: daysFromToday(-95),
    });
  }

  // Daily log
  const yesterdayLog = await store.createDailyLog({
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
  for (const [contractor, workers, hours, location] of manpower) {
    await store.createManpowerEntry({ dailyLogId: yesterdayLog.id, contractor, workers, hours, location, comments: "" });
  }

  // Punch items
  await store.createPunchItem({
    title: "Drywall damage at corridor 2-C", description: "Gouge in GWB near door 245, approx 6\". Patch, sand, and repaint to match.",
    status: "Open", priority: "Medium", location: "Level 2 - Corridor 2-C", trade: "Drywall",
    assignee: "ABC Construction", ballInCourt: "ABC Construction", dueDate: daysFromToday(7), dateClosed: null,
  });
  await store.createPunchItem({
    title: "Missing escutcheon plates at sprinkler heads", description: "Rooms 132, 134, and 138 missing escutcheons at pendant heads.",
    status: "Ready for Review", priority: "Low", location: "Level 1 - Rooms 132/134/138", trade: "Fire Protection",
    assignee: "SafeFlow Fire Protection", ballInCourt: "Summit Builders Inc.", dueDate: daysFromToday(3), dateClosed: null,
  });
  await store.createPunchItem({
    title: "Exterior door 101A does not latch", description: "Door 101A requires slamming to latch. Adjust strike and closer sweep speed.",
    status: "Closed", priority: "High", location: "Level 1 - Main Entry", trade: "Doors/Hardware",
    assignee: "Secure Door Systems", ballInCourt: "", dueDate: daysFromToday(-5), dateClosed: daysFromToday(-3),
  });

  // Schedule of values
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
  for (const [itemNumber, costCode, description, scheduledValue] of sov) {
    await store.createSovLineItem({ itemNumber, costCode, description, scheduledValue });
  }

  // Change events + line items
  const ce1 = await store.createChangeEvent({
    title: "Footing F-12 redesign at duct bank conflict",
    status: "Closed", scope: "Out of Scope", eventType: "Existing Condition",
    origin: "RFI-001", description: "Stepped footing redesign per SK-S-014 due to unforeseen active duct bank.",
  });
  await store.createChangeEventLineItem({ changeEventId: ce1.id, costCode: "03-000", description: "Added formwork, rebar, and concrete for stepped footing", vendor: "City Concrete", romAmount: 14200 });
  await store.createChangeEventLineItem({ changeEventId: ce1.id, costCode: "31-000", description: "Hand excavation and shoring at duct bank", vendor: "TerraFirm Earthworks", romAmount: 4300 });

  const ce2 = await store.createChangeEvent({
    title: "Owner-requested imaging suite layout revision",
    status: "Open", scope: "Out of Scope", eventType: "Owner Change",
    origin: "Owner meeting 2026-05-28",
    description: "Owner requests revised equipment layout in Imaging Suite 145, affecting partitions, power, and HVAC.",
  });
  await store.createChangeEventLineItem({ changeEventId: ce2.id, costCode: "09-000", description: "Partition relocation and finish revisions", vendor: "ABC Construction", romAmount: 22000 });
  await store.createChangeEventLineItem({ changeEventId: ce2.id, costCode: "26-000", description: "Power and lighting circuit revisions", vendor: "XYZ Electrical", romAmount: 15500 });
  await store.createChangeEventLineItem({ changeEventId: ce2.id, costCode: "23-000", description: "Duct reroute and diffuser relocation", vendor: "Metro HVAC", romAmount: 18750 });

  // Change orders
  const co1 = await store.createChangeOrder({
    title: "PCO 001 - Footing F-12 Redesign", status: "Approved", changeEventId: ce1.id,
    description: "Stepped footing at grid C-4 per SK-S-014 including excavation support.",
    scheduleImpactDays: 4, executed: true, signedDate: daysFromToday(-20), dateCreated: daysFromToday(-27),
  });
  await store.createChangeOrderLineItem({ changeOrderId: co1.id, costCode: "03-000", description: "Stepped footing concrete, formwork, rebar", amount: 14200 });
  await store.createChangeOrderLineItem({ changeOrderId: co1.id, costCode: "31-000", description: "Hand excavation and shoring", amount: 4300 });

  const co2 = await store.createChangeOrder({
    title: "PCO 002 - Imaging Suite 145 Revisions", status: "Pending - In Review", changeEventId: ce2.id,
    description: "Owner-directed layout revision to Imaging Suite 145.",
    scheduleImpactDays: 6, executed: false, signedDate: null, dateCreated: daysFromToday(-4),
  });
  await store.createChangeOrderLineItem({ changeOrderId: co2.id, costCode: "09-000", description: "Partition and finish revisions", amount: 22000 });
  await store.createChangeOrderLineItem({ changeOrderId: co2.id, costCode: "26-000", description: "Electrical revisions", amount: 15500 });
  await store.createChangeOrderLineItem({ changeOrderId: co2.id, costCode: "23-000", description: "HVAC revisions", amount: 18750 });

  // Budget — committed for 03/05/08/23 comes from commitments below
  const budget: Array<[string, string, number, number, number, number, number]> = [
    ["01-000", "General Conditions", 1850000, 0, 1850000, 412000, 0],
    ["02-000", "Sitework & Utilities", 2400000, 25000, 2380000, 1620000, 0],
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
  for (const [costCode, description, originalBudget, budgetModifications, committedCosts, directCosts, pendingBudgetChanges] of budget) {
    await store.createBudgetLineItem({ costCode, description, originalBudget, budgetModifications, committedCosts, directCosts, pendingBudgetChanges });
  }

  // Directory (all seed accounts use password "password123")
  const seedUsers: Array<[string, string, string, string, string]> = [
    ["Sam Patel", "spatel@summitbuilders.com", "Admin", "Summit Builders Inc.", "Project Executive"],
    ["Jordan Lee", "jlee@summitbuilders.com", "Project Manager", "Summit Builders Inc.", "Project Manager"],
    ["Dana Brooks", "dbrooks@summitbuilders.com", "Superintendent", "Summit Builders Inc.", "Superintendent"],
    ["Devon Whitfield", "dwhitfield@hartmancole.com", "Architect", "Hartman + Cole Architects", "Project Architect"],
    ["Rosa Alvarez", "ralvarez@riversidehealth.com", "Owner Rep", "Riverside Health Partners LLC", "Owner's Representative"],
    ["Tunde Okafor", "tokafor@metrohvac.com", "Subcontractor", "Metro HVAC", "Project Manager"],
  ];
  const passwordHash = hashPassword("password123");
  for (const [name, email, role, company, title] of seedUsers) {
    await store.createUser({ name, email, role: role as any, company, title, phone: "", passwordHash });
  }

  // Commitments — these drive the committed-cost column for their trades
  const commitmentSeed: Array<{
    title: string; type: "Subcontract" | "Purchase Order"; vendor: string;
    status: "Draft" | "Out for Signature" | "Executed" | "Complete" | "Terminated";
    lines: Array<[string, string, number]>;
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
    const commitment = await store.createCommitment({
      title: seed.title, commitmentType: seed.type, vendor: seed.vendor,
      status: seed.status, retainagePercent: 10, description: "",
      executedDate: seed.status === "Executed" ? daysFromToday(-60) : null,
    });
    for (const [costCode, description, amount] of seed.lines) {
      await store.createCommitmentLineItem({ commitmentId: commitment.id, costCode, description, amount });
    }
  }

  // Approval workflow for SUB-003 (pending review)
  const architect = await store.findUserByName("Devon Whitfield");
  const pm = await store.findUserByName("Jordan Lee");
  await store.createSubmittalStep({
    submittalId: sub3.id, stepNumber: 1,
    approverName: pm?.name ?? "Jordan Lee", approverUserId: pm?.id ?? null,
    dueDate: daysFromToday(2), status: "Approved",
    comments: "GC review complete; forwarded to design team.",
    respondedAt: new Date().toISOString(),
  });
  await store.createSubmittalStep({
    submittalId: sub3.id, stepNumber: 2,
    approverName: architect?.name ?? "Devon Whitfield", approverUserId: architect?.id ?? null,
    dueDate: daysFromToday(9), status: "Pending", comments: "", respondedAt: null,
  });
  await store.updateSubmittal(sub3.id, { ballInCourt: architect?.name ?? "Devon Whitfield" });

  console.log("[seed] demo project ready");
}
