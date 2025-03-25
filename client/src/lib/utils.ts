import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  });
}

export function calculateDaysBetween(startDate: Date, endDate: Date): number {
  // Reset time components for accurate date comparison
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  
  // Calculate the time difference in milliseconds
  const timeDiff = end.getTime() - start.getTime();
  
  // Convert to days and add 1 to include both start and end dates
  return Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1;
}

// Generate a unique ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}
