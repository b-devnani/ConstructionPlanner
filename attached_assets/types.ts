export interface Activity {
  id: number;
  name: string;
  location_id?: number;
  location?: Location;
  contractor_id?: number;
  contractor?: Contractor;
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
  dayOfMonth: number;
  dayOfWeek: string;
  isToday: boolean;
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
