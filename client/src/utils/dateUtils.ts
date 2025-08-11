import { format, addDays, differenceInDays, parse, isValid, parseISO } from 'date-fns';

// Format date for display (MM/DD/YYYY)
export const formatDateForDisplay = (dateString: string): string => {
  try {
    if (!dateString) return '';
    
    // If already in display format, return as is
    if (dateString.includes('/')) {
      return dateString;
    }
    
    const date = new Date(dateString);
    return format(date, 'MM/dd/yyyy');
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString;
  }
};

// Check if activity falls on a specific date
export const activityFallsOnDate = (activity: { start_date: string; end_date: string }, dateString: string): boolean => {
  if (!activity.start_date || !activity.end_date) return false;
  
  try {
    const date = new Date(dateString);
    const startDate = new Date(activity.start_date);
    const endDate = new Date(activity.end_date);
    
    // Reset time components for accurate date comparison
    date.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    
    return date >= startDate && date <= endDate;
  } catch (error) {
    console.error("Error checking if activity falls on date:", error);
    return false;
  }
};

// Get date string in YYYY-MM-DD format
export const getDateString = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

// Add days to a date
export const addDaysToDate = (date: Date, days: number): Date => {
  return addDays(date, days);
};

// Calculate days between two dates
export const daysBetween = (startDate: string, endDate: string): number => {
  if (!startDate || !endDate) return 0;
  
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return differenceInDays(end, start) + 1; // Include both start and end days
  } catch (error) {
    console.error("Error calculating days between:", error);
    return 0;
  }
};

// Check if a date is a working day
export const isWorkingDay = (dateString: string, nonWorkingDays: number[] = [0, 6]): boolean => {
  try {
    const date = new Date(dateString);
    const dayOfWeek = date.getDay();
    return !nonWorkingDays.includes(dayOfWeek);
  } catch (error) {
    console.error("Error checking if working day:", error);
    return true;
  }
};

// Calculate duration excluding non-working days
export const calculateDuration = (startDate: string, endDate: string, nonWorkingDays: number[] = [0, 6]): number => {
  if (!startDate || !endDate) return 0;
  
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    let duration = 0;
    let currentDate = new Date(start);
    
    while (currentDate <= end) {
      if (!nonWorkingDays.includes(currentDate.getDay())) {
        duration++;
      }
      currentDate = addDays(currentDate, 1);
    }
    
    return duration;
  } catch (error) {
    console.error("Error calculating duration:", error);
    return 0;
  }
};

// Update end date based on start date and duration
export const updateEndDateFromDuration = (startDate: string, duration: number, nonWorkingDays: number[] = [0, 6]): string => {
  if (!startDate || duration <= 0) return startDate;
  
  try {
    const start = new Date(startDate);
    let workingDaysCount = 0;
    let currentDate = new Date(start);
    
    while (workingDaysCount < duration) {
      if (!nonWorkingDays.includes(currentDate.getDay())) {
        workingDaysCount++;
      }
      
      if (workingDaysCount < duration) {
        currentDate = addDays(currentDate, 1);
      }
    }
    
    return format(currentDate, 'yyyy-MM-dd');
  } catch (error) {
    console.error("Error updating end date from duration:", error);
    return startDate;
  }
};

// Check if a string is a valid date format (YYYY-MM-DD or MM/DD/YYYY)
export const isValidDateFormat = (dateStr: string): boolean => {
  if (!dateStr) return false;
  
  // Try for YYYY-MM-DD format
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return isValid(parseISO(dateStr));
  }
  
  // Try for MM/DD/YYYY format
  if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
    const parsedDate = parse(dateStr, 'MM/dd/yyyy', new Date());
    return isValid(parsedDate);
  }
  
  return false;
};

// Convert MM/DD/YYYY to YYYY-MM-DD format
export const convertToInternalDateFormat = (dateStr: string): string => {
  if (!dateStr) return '';
  
  // If already in YYYY-MM-DD format, return as is
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateStr;
  }
  
  // Convert from MM/DD/YYYY to YYYY-MM-DD
  try {
    const parsedDate = parse(dateStr, 'MM/dd/yyyy', new Date());
    if (isValid(parsedDate)) {
      return format(parsedDate, 'yyyy-MM-dd');
    }
  } catch (error) {
    console.error("Error converting date format:", error);
  }
  
  return '';
};

// Get MM/DD/YYYY from YYYY-MM-DD
export const getDisplayDate = (dateStr: string): string => {
  if (!dateStr) return '';
  
  // If already in MM/DD/YYYY format, return as is
  if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
    return dateStr;
  }
  
  // Convert from YYYY-MM-DD to MM/DD/YYYY
  try {
    const parsedDate = parseISO(dateStr);
    if (isValid(parsedDate)) {
      return format(parsedDate, 'MM/dd/yyyy');
    }
  } catch (error) {
    console.error("Error converting to display date:", error);
  }
  
  return dateStr;
};

// Calculate days difference between two dates
export const daysDifference = (fromDate: string, toDate: string): number => {
  if (!fromDate || !toDate) return 0;
  
  try {
    const start = new Date(fromDate);
    const end = new Date(toDate);
    return differenceInDays(end, start);
  } catch (error) {
    console.error("Error calculating days difference:", error);
    return 0;
  }
};

// Get day names for calendar headers
export const getDayNames = (firstDayOfWeek: 0 | 1 = 0): string[] => {
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  if (firstDayOfWeek === 1) {
    // Start with Monday
    return [...days.slice(1), days[0]];
  }
  return days;
};