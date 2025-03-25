'use client';

import React, { useState, useEffect } from 'react';
import ScheduleView from '@/components/schedule/ScheduleView';
import { Activity, Location, Contractor } from '@/lib/types';
import { useProjectSettings } from '@/lib/ProjectSettingsContext';

export default function Home() {
  const { calculateWorkingDays } = useProjectSettings();
  const [activities, setActivities] = useState<Activity[]>([
    {
      id: 1,
      name: 'Drywall Installation',
      location: 'Building A',
      contractor: 'ABC Drywall',
      start_date: '2025-03-18',
      end_date: '2025-03-26',
      duration: 7
    },
    {
      id: 2,
      name: 'Electrical Wiring',
      location: 'Building B',
      contractor: 'Spark Electric',
      start_date: '2025-03-20',
      end_date: '2025-03-28',
      duration: 7
    },
    {
      id: 3,
      name: 'Plumbing Installation',
      location: 'Building A',
      contractor: 'Fluid Plumbing',
      start_date: '2025-03-25',
      end_date: '2025-04-02',
      duration: 7
    }
  ]);
  
  const [locations] = useState<Location[]>([
    { id: 1, name: 'Building A' },
    { id: 2, name: 'Building B' },
    { id: 3, name: 'Building C' },
    { id: 4, name: 'Parking Lot' },
    { id: 5, name: 'Common Area' }
  ]);
  
  const [contractors] = useState<Contractor[]>([
    { id: 1, name: 'ABC Drywall' },
    { id: 2, name: 'Spark Electric' },
    { id: 3, name: 'Fluid Plumbing' },
    { id: 4, name: 'Steel Framers Inc.' },
    { id: 5, name: 'Glass & Windows Co.' }
  ]);
  
  // Update all activity durations based on working days when settings change
  useEffect(() => {
    const updatedActivities = activities.map(activity => {
      const workingDays = calculateWorkingDays(activity.start_date, activity.end_date);
      return {
        ...activity,
        duration: workingDays
      };
    });
    
    setActivities(updatedActivities);
  }, [calculateWorkingDays]);
  
  const handleEditActivity = (activityId: number, field: keyof Activity, value: string | number) => {
    setActivities(prevActivities => {
      return prevActivities.map(activity => {
        if (activity.id === activityId) {
          const updatedActivity = { ...activity, [field]: value };
          
          // If start_date or end_date changed, recalculate duration
          if (field === 'start_date' || field === 'end_date') {
            const workingDays = calculateWorkingDays(
              field === 'start_date' ? String(value) : activity.start_date,
              field === 'end_date' ? String(value) : activity.end_date
            );
            updatedActivity.duration = workingDays;
          }
          
          return updatedActivity;
        }
        return activity;
      });
    });
  };
  
  const handleAddActivity = (newActivity: Omit<Activity, 'id'>) => {
    const id = Math.max(0, ...activities.map(a => a.id)) + 1;
    
    // Calculate duration based on working days
    const workingDays = calculateWorkingDays(newActivity.start_date, newActivity.end_date);
    
    setActivities(prevActivities => [
      ...prevActivities,
      {
        ...newActivity,
        id,
        duration: workingDays
      }
    ]);
  };
  
  return (
    <main className="min-h-screen">
      <ScheduleView 
        activities={activities}
        onEditActivity={handleEditActivity}
        onAddActivity={handleAddActivity}
        locations={locations}
        contractors={contractors}
      />
    </main>
  );
}
