import { Activity, Location, Contractor } from '@/lib/types';

// Initial activities data
export const initialActivities: Activity[] = [
  {
    id: 1,
    name: 'Drywall Installation',
    location: 'Building A',
    contractor: 'ABC Drywall',
    start_date: '2023-07-10',
    end_date: '2023-07-18',
    duration: 7
  },
  {
    id: 2,
    name: 'Electrical Wiring',
    location: 'Building B',
    contractor: 'Spark Electric',
    start_date: '2023-07-12',
    end_date: '2023-07-20',
    duration: 7
  },
  {
    id: 3,
    name: 'Plumbing Installation',
    location: 'Building A',
    contractor: 'Fluid Plumbing',
    start_date: '2023-07-17',
    end_date: '2023-07-25',
    duration: 7
  },
  {
    id: 4,
    name: 'Steel Framing',
    location: 'Building C',
    contractor: 'Steel Framers Inc.',
    start_date: '2023-07-15',
    end_date: '2023-07-23',
    duration: 7
  }
];

// Location data
export const locationData: Location[] = [
  { id: 1, name: 'Building A' },
  { id: 2, name: 'Building B' },
  { id: 3, name: 'Building C' },
  { id: 4, name: 'Parking Lot' },
  { id: 5, name: 'Common Area' }
];

// Contractor data
export const contractorData: Contractor[] = [
  { id: 1, name: 'ABC Drywall' },
  { id: 2, name: 'Spark Electric' },
  { id: 3, name: 'Fluid Plumbing' },
  { id: 4, name: 'Steel Framers Inc.' },
  { id: 5, name: 'Glass & Windows Co.' }
];
