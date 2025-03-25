import { 
  type Location, type InsertLocation,
  type Contractor, type InsertContractor,
  type Activity, type InsertActivity,
  type Holiday, type InsertHoliday,
  type ProjectSettings, type InsertProjectSettings
} from "@shared/schema";

// Storage interface for our construction schedule app
export interface IStorage {
  // Locations
  getLocations(): Promise<Location[]>;
  getLocation(id: number): Promise<Location | undefined>;
  createLocation(location: InsertLocation): Promise<Location>;
  updateLocation(id: number, location: Partial<Location>): Promise<Location | undefined>;
  deleteLocation(id: number): Promise<boolean>;

  // Contractors
  getContractors(): Promise<Contractor[]>;
  getContractor(id: number): Promise<Contractor | undefined>;
  createContractor(contractor: InsertContractor): Promise<Contractor>;
  updateContractor(id: number, contractor: Partial<Contractor>): Promise<Contractor | undefined>;
  deleteContractor(id: number): Promise<boolean>;

  // Activities
  getActivities(): Promise<Activity[]>;
  getActivity(id: number): Promise<Activity | undefined>;
  getActivitiesInDateRange(startDate: string, endDate: string): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  updateActivity(id: number, activity: Partial<Activity>): Promise<Activity | undefined>;
  deleteActivity(id: number): Promise<boolean>;

  // Holidays
  getHolidays(): Promise<Holiday[]>;
  createHoliday(holiday: InsertHoliday): Promise<Holiday>;
  deleteHoliday(id: number): Promise<boolean>;

  // Project Settings
  getProjectSettings(): Promise<ProjectSettings | undefined>;
  updateProjectSettings(settings: Partial<ProjectSettings>): Promise<ProjectSettings | undefined>;
}

export class MemStorage implements IStorage {
  private locations: Map<number, Location>;
  private contractors: Map<number, Contractor>;
  private activities: Map<number, Activity>;
  private holidays: Map<number, Holiday>;
  private projectSettings?: ProjectSettings;
  
  private locationId: number;
  private contractorId: number;
  private activityId: number;
  private holidayId: number;
  private settingsId: number;
  
  constructor() {
    this.locations = new Map();
    this.contractors = new Map();
    this.activities = new Map();
    this.holidays = new Map();
    
    this.locationId = 1;
    this.contractorId = 1;
    this.activityId = 1;
    this.holidayId = 1;
    this.settingsId = 1;
    
    // Initialize with some default settings
    this.projectSettings = {
      id: this.settingsId,
      first_day_of_week: "sunday",
      sunday_working: 0,
      monday_working: 1,
      tuesday_working: 1,
      wednesday_working: 1,
      thursday_working: 1,
      friday_working: 1,
      saturday_working: 0
    };
    
    // Initialize with sample data
    this.initSampleData();
  }
  
  private initSampleData(): void {
    // Add sample locations
    const locations = [
      { id: this.locationId++, name: "North Wing" },
      { id: this.locationId++, name: "South Wing" },
      { id: this.locationId++, name: "East Tower" },
      { id: this.locationId++, name: "West Tower" },
      { id: this.locationId++, name: "Parking Garage" }
    ];
    
    locations.forEach(location => this.locations.set(location.id, location));
    
    // Add sample contractors
    const contractors = [
      { id: this.contractorId++, name: "ABC Construction" },
      { id: this.contractorId++, name: "XYZ Electrical" },
      { id: this.contractorId++, name: "Smith Plumbing" },
      { id: this.contractorId++, name: "City Concrete" },
      { id: this.contractorId++, name: "Metro HVAC" }
    ];
    
    contractors.forEach(contractor => this.contractors.set(contractor.id, contractor));
    
    // Add sample activities
    const today = new Date();
    const futureDate = (days: number): string => {
      const date = new Date(today);
      date.setDate(date.getDate() + days);
      return date.toISOString().split('T')[0];
    };
    
    const activities = [
      { 
        id: this.activityId++, 
        name: "Foundation Pouring", 
        location_id: 1, 
        contractor_id: 4, 
        start_date: futureDate(1), 
        end_date: futureDate(5), 
        duration: 5,
        created_at: new Date()
      },
      { 
        id: this.activityId++, 
        name: "Framing", 
        location_id: 2, 
        contractor_id: 1, 
        start_date: futureDate(6), 
        end_date: futureDate(12), 
        duration: 7,
        created_at: new Date()
      },
      { 
        id: this.activityId++, 
        name: "Electrical Wiring", 
        location_id: 3, 
        contractor_id: 2, 
        start_date: futureDate(8), 
        end_date: futureDate(15), 
        duration: 8,
        created_at: new Date()
      },
      { 
        id: this.activityId++, 
        name: "Plumbing Installation", 
        location_id: 4, 
        contractor_id: 3, 
        start_date: futureDate(10), 
        end_date: futureDate(18), 
        duration: 9,
        created_at: new Date()
      },
      { 
        id: this.activityId++, 
        name: "HVAC Installation", 
        location_id: 5, 
        contractor_id: 5, 
        start_date: futureDate(12), 
        end_date: futureDate(19), 
        duration: 8,
        created_at: new Date()
      }
    ];
    
    activities.forEach(activity => this.activities.set(activity.id, activity));
    
    // Add sample holidays
    const holidays = [
      {
        id: this.holidayId++,
        name: "Labor Day",
        date: "2025-09-01",
        is_default: 1
      },
      {
        id: this.holidayId++,
        name: "Thanksgiving",
        date: "2025-11-27",
        is_default: 1
      },
      {
        id: this.holidayId++,
        name: "Christmas",
        date: "2025-12-25",
        is_default: 1
      }
    ];
    
    holidays.forEach(holiday => this.holidays.set(holiday.id, holiday));
  }

  // Location methods
  async getLocations(): Promise<Location[]> {
    return Array.from(this.locations.values());
  }

  async getLocation(id: number): Promise<Location | undefined> {
    return this.locations.get(id);
  }

  async createLocation(insertLocation: InsertLocation): Promise<Location> {
    const id = this.locationId++;
    const location: Location = { ...insertLocation, id };
    this.locations.set(id, location);
    return location;
  }

  async updateLocation(id: number, location: Partial<Location>): Promise<Location | undefined> {
    const existingLocation = this.locations.get(id);
    if (!existingLocation) return undefined;
    
    const updatedLocation = { ...existingLocation, ...location };
    this.locations.set(id, updatedLocation);
    return updatedLocation;
  }

  async deleteLocation(id: number): Promise<boolean> {
    return this.locations.delete(id);
  }

  // Contractor methods
  async getContractors(): Promise<Contractor[]> {
    return Array.from(this.contractors.values());
  }

  async getContractor(id: number): Promise<Contractor | undefined> {
    return this.contractors.get(id);
  }

  async createContractor(insertContractor: InsertContractor): Promise<Contractor> {
    const id = this.contractorId++;
    const contractor: Contractor = { ...insertContractor, id };
    this.contractors.set(id, contractor);
    return contractor;
  }

  async updateContractor(id: number, contractor: Partial<Contractor>): Promise<Contractor | undefined> {
    const existingContractor = this.contractors.get(id);
    if (!existingContractor) return undefined;
    
    const updatedContractor = { ...existingContractor, ...contractor };
    this.contractors.set(id, updatedContractor);
    return updatedContractor;
  }

  async deleteContractor(id: number): Promise<boolean> {
    return this.contractors.delete(id);
  }

  // Activity methods
  async getActivities(): Promise<Activity[]> {
    return Array.from(this.activities.values());
  }

  async getActivity(id: number): Promise<Activity | undefined> {
    return this.activities.get(id);
  }

  async getActivitiesInDateRange(startDate: string, endDate: string): Promise<Activity[]> {
    return Array.from(this.activities.values()).filter(activity => {
      return (
        (activity.start_date >= startDate && activity.start_date <= endDate) ||
        (activity.end_date >= startDate && activity.end_date <= endDate) ||
        (activity.start_date <= startDate && activity.end_date >= endDate)
      );
    });
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const id = this.activityId++;
    const created_at = new Date();
    const activity: Activity = { ...insertActivity, id, created_at };
    this.activities.set(id, activity);
    return activity;
  }

  async updateActivity(id: number, activity: Partial<Activity>): Promise<Activity | undefined> {
    const existingActivity = this.activities.get(id);
    if (!existingActivity) return undefined;
    
    const updatedActivity = { ...existingActivity, ...activity };
    this.activities.set(id, updatedActivity);
    return updatedActivity;
  }

  async deleteActivity(id: number): Promise<boolean> {
    return this.activities.delete(id);
  }

  // Holiday methods
  async getHolidays(): Promise<Holiday[]> {
    return Array.from(this.holidays.values());
  }

  async createHoliday(insertHoliday: InsertHoliday): Promise<Holiday> {
    const id = this.holidayId++;
    const holiday: Holiday = { 
      ...insertHoliday, 
      id,
      is_default: insertHoliday.is_default ?? 0
    };
    this.holidays.set(id, holiday);
    return holiday;
  }

  async deleteHoliday(id: number): Promise<boolean> {
    return this.holidays.delete(id);
  }

  // Project Settings methods
  async getProjectSettings(): Promise<ProjectSettings | undefined> {
    return this.projectSettings;
  }

  async updateProjectSettings(settings: Partial<ProjectSettings>): Promise<ProjectSettings | undefined> {
    if (!this.projectSettings) return undefined;
    
    this.projectSettings = { ...this.projectSettings, ...settings };
    return this.projectSettings;
  }
}

export const storage = new MemStorage();
