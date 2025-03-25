'use client';

import { Activity, Day, Week, ThreeWeekView } from '@/lib/types';

// Format date for display (MM/DD/YYYY)
export const formatDateForDisplay = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  });
};

// Check if an activity falls on a specific date
export const activityFallsOnDate = (activity: Activity, dateString: string): boolean => {
  // Don't shift date as we want to match the exact day shown in the UI
  const date = new Date(dateString);
  
  const startDate = new Date(activity.start_date);
  const endDate = new Date(activity.end_date);
  
  // Reset time components for accurate date comparison
  date.setHours(0, 0, 0, 0);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  
  return date >= startDate && date <= endDate;
};

// Get date string in YYYY-MM-DD format
export const getDateString = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// Add days to a date
export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// Calculate the difference in days between two dates
export const daysBetween = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Reset time components for accurate date comparison
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  // Calculate the time difference in milliseconds
  const timeDiff = end.getTime() - start.getTime();
  
  // Convert to days and add 1 to include both start and end dates
  return Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1;
};
