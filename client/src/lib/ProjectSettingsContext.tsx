

import React, { createContext, useContext, useState, useEffect } from 'react';

// Define types for project settings
export interface Holiday {
  id: string;
  name: string;
  date: string;
  isDefault: boolean;
}

interface WorkingDays {
  sunday: boolean;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
}

interface ProjectSettings {
  firstDayOfWeek: 'sunday' | 'monday';
  workingDays: WorkingDays;
  holidays: Holiday[];
}

interface ProjectSettingsContextType {
  settings: ProjectSettings;
  updateSettings: (newSettings: Partial<ProjectSettings>) => void;
  addHoliday: (holiday: Omit<Holiday, 'id'>) => void;
  removeHoliday: (id: string) => void;
  isWorkingDay: (dateString: string) => boolean;
  calculateWorkingDays: (startDate: string, endDate: string) => number;
}

// Create the context
const ProjectSettingsContext = createContext<ProjectSettingsContextType | undefined>(undefined);

// Default US federal holidays for current year
const getDefaultHolidays = (): Holiday[] => {
  const currentYear = new Date().getFullYear();
  
  return [
    { id: 'new-years', name: "New Year's Day", date: `${currentYear}-01-01`, isDefault: true },
    { id: 'mlk-day', name: "Martin Luther King Jr. Day", date: `${currentYear}-01-15`, isDefault: true }, // Third Monday in January
    { id: 'presidents-day', name: "Presidents' Day", date: `${currentYear}-02-19`, isDefault: true }, // Third Monday in February
    { id: 'memorial-day', name: "Memorial Day", date: `${currentYear}-05-27`, isDefault: true }, // Last Monday in May
    { id: 'juneteenth', name: "Juneteenth", date: `${currentYear}-06-19`, isDefault: true },
    { id: 'independence-day', name: "Independence Day", date: `${currentYear}-07-04`, isDefault: true },
    { id: 'labor-day', name: "Labor Day", date: `${currentYear}-09-02`, isDefault: true }, // First Monday in September
    { id: 'columbus-day', name: "Columbus Day", date: `${currentYear}-10-14`, isDefault: true }, // Second Monday in October
    { id: 'veterans-day', name: "Veterans Day", date: `${currentYear}-11-11`, isDefault: true },
    { id: 'thanksgiving', name: "Thanksgiving Day", date: `${currentYear}-11-28`, isDefault: true }, // Fourth Thursday in November
    { id: 'christmas', name: "Christmas Day", date: `${currentYear}-12-25`, isDefault: true },
  ];
};

// Provider component
export const ProjectSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<ProjectSettings>({
    firstDayOfWeek: 'monday',
    workingDays: {
      sunday: false,
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false
    },
    holidays: getDefaultHolidays()
  });
  
  // Update settings
  const updateSettings = (newSettings: Partial<ProjectSettings>) => {
    setSettings(prev => ({
      ...prev,
      ...newSettings
    }));
  };
  
  // Add a holiday
  const addHoliday = (holiday: Omit<Holiday, 'id'>) => {
    const id = `holiday-${Date.now()}`;
    setSettings(prev => ({
      ...prev,
      holidays: [...prev.holidays, { ...holiday, id }]
    }));
  };
  
  // Remove a holiday
  const removeHoliday = (id: string) => {
    setSettings(prev => ({
      ...prev,
      holidays: prev.holidays.filter(h => h.id !== id)
    }));
  };
  
  // Check if a date is a working day
  const isWorkingDay = (dateString: string): boolean => {
    // Check if it's a holiday
    const isHoliday = settings.holidays.some(h => h.date === dateString);
    if (isHoliday) return false;
    
    // Check if it's a weekend or non-working day
    const date = new Date(dateString);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    const dayMap: { [key: number]: keyof WorkingDays } = {
      0: 'sunday',
      1: 'monday',
      2: 'tuesday',
      3: 'wednesday',
      4: 'thursday',
      5: 'friday',
      6: 'saturday'
    };
    
    return settings.workingDays[dayMap[dayOfWeek]];
  };
  
  // Calculate working days between two dates
  const calculateWorkingDays = (startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Ensure end date is not before start date
    if (end < start) return 0;
    
    let workingDays = 0;
    const current = new Date(start);
    
    // Loop through each day and count working days
    while (current <= end) {
      const dateString = current.toISOString().split('T')[0];
      if (isWorkingDay(dateString)) {
        workingDays++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return workingDays;
  };
  
  const value = {
    settings,
    updateSettings,
    addHoliday,
    removeHoliday,
    isWorkingDay,
    calculateWorkingDays
  };
  
  return (
    <ProjectSettingsContext.Provider value={value}>
      {children}
    </ProjectSettingsContext.Provider>
  );
};

// Hook to use the context
export const useProjectSettings = (): ProjectSettingsContextType => {
  const context = useContext(ProjectSettingsContext);
  if (context === undefined) {
    throw new Error('useProjectSettings must be used within a ProjectSettingsProvider');
  }
  return context;
};
