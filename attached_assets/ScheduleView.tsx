'use client';

import React, { useState, useEffect } from 'react';
import ScheduleTable from './ScheduleTable';
import SettingsButton from '../settings/SettingsButton';
import { Activity, ThreeWeekView, Week, Day, Location, Contractor } from '@/lib/types';
import { addDays, getDateString } from '@/lib/dateUtils';
import { useTheme } from '@/lib/ThemeContext';
import { useProjectSettings } from '@/lib/ProjectSettingsContext';

interface ScheduleViewProps {
  activities: Activity[];
  onEditActivity: (activityId: number, field: keyof Activity, value: string | number) => void;
  onAddActivity: (activity: Omit<Activity, 'id'>) => void;
  locations: Location[];
  contractors: Contractor[];
}

const ScheduleView: React.FC<ScheduleViewProps> = ({
  activities,
  onEditActivity,
  onAddActivity,
  locations,
  contractors
}) => {
  const { theme } = useTheme();
  const { firstDayOfWeek, isWorkingDay } = useProjectSettings();
  
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [threeWeekView, setThreeWeekView] = useState<ThreeWeekView>({ weeks: [] });
  const [sortBy, setSortBy] = useState<string>('start_date');
  const [groupBy, setGroupBy] = useState<string>('none');
  
  // Generate three week view based on current date
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Find the first day of the current week based on firstDayOfWeek setting
    const firstDayOffset = firstDayOfWeek === 'monday' ? 1 : 0;
    const dayOfWeek = currentDate.getDay();
    const diff = currentDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : firstDayOffset);
    const firstDayOfWeek1 = new Date(currentDate);
    firstDayOfWeek1.setDate(diff);
    
    const weeks: Week[] = [];
    
    // Generate 3 weeks
    for (let weekIndex = 0; weekIndex < 3; weekIndex++) {
      const weekStartDate = new Date(firstDayOfWeek1);
      weekStartDate.setDate(weekStartDate.getDate() + (weekIndex * 7));
      
      const days: Day[] = [];
      
      // Generate 7 days for each week
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const date = new Date(weekStartDate);
        date.setDate(date.getDate() + dayIndex);
        
        const dateString = getDateString(date);
        const isToday = date.getTime() === today.getTime();
        const workingDay = isWorkingDay(dateString);
        
        days.push({
          date: dateString,
          dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0),
          dayOfMonth: date.getDate(),
          isToday,
          isWorkingDay: workingDay
        });
      }
      
      weeks.push({
        name: `Week ${weekIndex + 1}`,
        days
      });
    }
    
    setThreeWeekView({ weeks });
  }, [currentDate, firstDayOfWeek, isWorkingDay]);
  
  const handlePrevious = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };
  
  const handleNext = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };
  
  const handleToday = () => {
    setCurrentDate(new Date());
  };
  
  return (
    <div className={`container mx-auto px-4 py-8 ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Construction Schedule</h1>
        <SettingsButton />
      </div>
      
      <p className="text-lg mb-8">Three Week Look Ahead Schedule for Construction Superintendents</p>
      
      <div className="flex flex-wrap justify-between items-center mb-6">
        <div className="flex space-x-2 mb-4 sm:mb-0">
          <button
            onClick={handlePrevious}
            className={`px-4 py-2 rounded-md ${
              theme === 'dark'
                ? 'bg-gray-800 text-white hover:bg-gray-700'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            &lt; Previous
          </button>
          <button
            onClick={handleToday}
            className={`px-4 py-2 rounded-md ${
              theme === 'dark'
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            Today
          </button>
          <button
            onClick={handleNext}
            className={`px-4 py-2 rounded-md ${
              theme === 'dark'
                ? 'bg-gray-800 text-white hover:bg-gray-700'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            Next &gt;
          </button>
        </div>
        
        <div className="flex flex-wrap space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={`rounded-md border px-3 py-2 text-sm ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="start_date">Start Date</option>
              <option value="end_date">End Date</option>
              <option value="location">Location</option>
              <option value="contractor">Contractor</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium">Group By</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className={`rounded-md border px-3 py-2 text-sm ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="none">No Grouping</option>
              <option value="location">Location</option>
              <option value="contractor">Contractor</option>
            </select>
          </div>
        </div>
      </div>
      
      <ScheduleTable
        activities={activities}
        threeWeekView={threeWeekView}
        onEditActivity={onEditActivity}
        onAddActivity={onAddActivity}
        sortBy={sortBy}
        groupBy={groupBy}
        locations={locations}
        contractors={contractors}
      />
    </div>
  );
};

export default ScheduleView;
