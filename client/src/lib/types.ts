export interface Activity {
  id: number;
  name: string;
  location: string;
  contractor: string;
  start_date: string;
  end_date: string;
  duration: number;
}

export interface Location {
  id: number;
  name: string;
}

export interface Contractor {
  id: number;
  name: string;
}

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
  weeks: Week[];
}
