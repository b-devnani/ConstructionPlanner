import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { 
  insertLocationSchema, 
  insertContractorSchema, 
  insertActivitySchema,
  insertHolidaySchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // API Routes for the Construction Schedule application
  // All routes are prefixed with /api

  // Locations API
  app.get("/api/locations", async (_req: Request, res: Response) => {
    const locations = await storage.getLocations();
    return res.json(locations);
  });

  app.get("/api/locations/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid location ID" });
    }

    const location = await storage.getLocation(id);
    if (!location) {
      return res.status(404).json({ message: "Location not found" });
    }

    return res.json(location);
  });

  app.post("/api/locations", async (req: Request, res: Response) => {
    try {
      const locationData = insertLocationSchema.parse(req.body);
      const newLocation = await storage.createLocation(locationData);
      return res.status(201).json(newLocation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid location data", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to create location" });
    }
  });

  app.put("/api/locations/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid location ID" });
    }

    try {
      const locationData = insertLocationSchema.partial().parse(req.body);
      const updatedLocation = await storage.updateLocation(id, locationData);
      
      if (!updatedLocation) {
        return res.status(404).json({ message: "Location not found" });
      }

      return res.json(updatedLocation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid location data", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to update location" });
    }
  });

  app.delete("/api/locations/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid location ID" });
    }

    const deleted = await storage.deleteLocation(id);
    if (!deleted) {
      return res.status(404).json({ message: "Location not found" });
    }

    return res.json({ success: true });
  });

  // Contractors API
  app.get("/api/contractors", async (_req: Request, res: Response) => {
    const contractors = await storage.getContractors();
    return res.json(contractors);
  });

  app.get("/api/contractors/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid contractor ID" });
    }

    const contractor = await storage.getContractor(id);
    if (!contractor) {
      return res.status(404).json({ message: "Contractor not found" });
    }

    return res.json(contractor);
  });

  app.post("/api/contractors", async (req: Request, res: Response) => {
    try {
      const contractorData = insertContractorSchema.parse(req.body);
      const newContractor = await storage.createContractor(contractorData);
      return res.status(201).json(newContractor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid contractor data", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to create contractor" });
    }
  });

  app.put("/api/contractors/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid contractor ID" });
    }

    try {
      const contractorData = insertContractorSchema.partial().parse(req.body);
      const updatedContractor = await storage.updateContractor(id, contractorData);
      
      if (!updatedContractor) {
        return res.status(404).json({ message: "Contractor not found" });
      }

      return res.json(updatedContractor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid contractor data", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to update contractor" });
    }
  });

  app.delete("/api/contractors/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid contractor ID" });
    }

    const deleted = await storage.deleteContractor(id);
    if (!deleted) {
      return res.status(404).json({ message: "Contractor not found" });
    }

    return res.json({ success: true });
  });

  // Activities API
  app.get("/api/activities", async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;
    
    if (startDate && endDate && typeof startDate === 'string' && typeof endDate === 'string') {
      const activities = await storage.getActivitiesInDateRange(startDate, endDate);
      return res.json(activities);
    } else {
      const activities = await storage.getActivities();
      return res.json(activities);
    }
  });

  app.get("/api/activities/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid activity ID" });
    }

    const activity = await storage.getActivity(id);
    if (!activity) {
      return res.status(404).json({ message: "Activity not found" });
    }

    return res.json(activity);
  });

  app.post("/api/activities", async (req: Request, res: Response) => {
    try {
      const activityData = insertActivitySchema.parse(req.body);
      const newActivity = await storage.createActivity(activityData);
      return res.status(201).json(newActivity);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid activity data", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to create activity" });
    }
  });

  app.put("/api/activities/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid activity ID" });
    }

    try {
      const activityData = insertActivitySchema.partial().parse(req.body);
      const updatedActivity = await storage.updateActivity(id, activityData);
      
      if (!updatedActivity) {
        return res.status(404).json({ message: "Activity not found" });
      }

      return res.json(updatedActivity);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid activity data", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to update activity" });
    }
  });

  app.delete("/api/activities/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid activity ID" });
    }

    const deleted = await storage.deleteActivity(id);
    if (!deleted) {
      return res.status(404).json({ message: "Activity not found" });
    }

    return res.json({ success: true });
  });

  // Holidays API
  app.get("/api/holidays", async (_req: Request, res: Response) => {
    const holidays = await storage.getHolidays();
    return res.json(holidays);
  });

  app.post("/api/holidays", async (req: Request, res: Response) => {
    try {
      const holidayData = insertHolidaySchema.parse(req.body);
      const newHoliday = await storage.createHoliday(holidayData);
      return res.status(201).json(newHoliday);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid holiday data", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to create holiday" });
    }
  });

  app.delete("/api/holidays/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid holiday ID" });
    }

    const deleted = await storage.deleteHoliday(id);
    if (!deleted) {
      return res.status(404).json({ message: "Holiday not found" });
    }

    return res.json({ success: true });
  });

  // Project Settings API
  app.get("/api/project-settings", async (_req: Request, res: Response) => {
    const settings = await storage.getProjectSettings();
    if (!settings) {
      return res.status(404).json({ message: "Project settings not found" });
    }
    return res.json(settings);
  });

  app.put("/api/project-settings", async (req: Request, res: Response) => {
    try {
      const updatedSettings = await storage.updateProjectSettings(req.body);
      if (!updatedSettings) {
        return res.status(404).json({ message: "Project settings not found" });
      }
      return res.json(updatedSettings);
    } catch (error) {
      return res.status(500).json({ message: "Failed to update project settings" });
    }
  });

  // Initialize the server
  const httpServer = createServer(app);
  return httpServer;
}
