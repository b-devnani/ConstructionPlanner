export interface Activity {
  id: string | number;
  name: string;
  location: string;
  contractor: string;
  start_date: string;
  end_date: string;
  duration: number;
  parentActivityId?: string; // For grouping
}

export type SortField = 'startDate' | 'endDate' | 'duration' | 'location' | 'contractor' | 'name';
export type GroupByField = 'contractor' | 'location' | 'none';

export interface Day {
  date: string;
  dayOfWeek: string;
  dayOfMonth: number;
  isToday: boolean;
  isWorkingDay: boolean;
}

export interface Week {
  name: string;
  days: Day[];
}

export interface ThreeWeekView {
  startDate: string;
  endDate: string;
  weeks: Week[];
}

export interface Contractor {
  id: number | string;
  name: string;
}

export interface Location {
  id: number | string;
  name: string;
}