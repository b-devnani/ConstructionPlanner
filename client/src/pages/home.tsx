'use client';

import React, { useState, useEffect } from 'react';
import ScheduleView from '@/components/schedule/ScheduleView';
import { Activity, Location, Contractor } from '@/lib/types';
import { initialActivities, locationData, contractorData } from '@/lib/mockData';
import { useProjectSettings } from '@/lib/ProjectSettingsContext';

export default function Home() {
  const { calculateWorkingDays } = useProjectSettings();
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [locations] = useState<Location[]>(locationData);
  const [contractors] = useState<Contractor[]>(contractorData);
  
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
    <ScheduleView 
      activities={activities}
      onEditActivity={handleEditActivity}
      onAddActivity={handleAddActivity}
      locations={locations}
      contractors={contractors}
    />
  );
}
