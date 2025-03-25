

import React, { useState, useEffect } from 'react';
import ScheduleTable from './ScheduleTable';
import ActivityFormModal from './ActivityFormModal';
import SettingsButton from '../settings/SettingsButton';
import ThemeToggle from '../ui/theme-toggle';
import { Activity, ThreeWeekView, Week, Day, Location, Contractor } from '@/lib/types';
import { addDays, getDateString, daysBetween } from '@/lib/dateUtils';
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
  const { settings, isWorkingDay } = useProjectSettings();
  
  const calculateWorkingDays = (startDate: string, endDate: string): number => {
    // Use daysBetween utility function to get the total calendar days
    const totalDays = daysBetween(startDate, endDate);
    
    // Count working days - ensure it's at least 1 day
    let workingDaysCount = 0;
    
    // Loop through each day and check if it's a working day
    for (let i = 0; i <= totalDays; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateString = getDateString(date);
      
      if (isWorkingDay(dateString)) {
        workingDaysCount++;
      }
    }
    
    return Math.max(1, workingDaysCount); // Ensure at least 1 day
  };
  
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [threeWeekView, setThreeWeekView] = useState<ThreeWeekView>({ weeks: [] });
  const [sortBy, setSortBy] = useState<string>('start_date');
  const [groupBy, setGroupBy] = useState<string>('none');
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [showNewRow, setShowNewRow] = useState(false);
  
  // Default values for new activity
  const getDefaultActivity = (): Omit<Activity, 'id'> => {
    const today = new Date().toISOString().split('T')[0];
    return {
      name: '',
      location: locations.length > 0 ? locations[0].name : '',
      contractor: contractors.length > 0 ? contractors[0].name : '',
      start_date: today,
      end_date: today,
      duration: 1
    };
  };
  
  // New activity data for inline creation
  const [newActivity, setNewActivity] = useState<Omit<Activity, 'id'>>(getDefaultActivity());
  
  // Generate three week view based on current date
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    console.log('DEBUG - Current date:', 
                currentDate.toISOString().split('T')[0], 
                'Day of week:', 
                currentDate.getDay(),
                'Today:', 
                today.toISOString().split('T')[0]);
    
    // Find the first day of the current week based on firstDayOfWeek setting
    const firstDayOffset = settings.firstDayOfWeek === 'monday' ? 1 : 0;
    let dayOfWeek = currentDate.getDay(); // 0=Sunday, 1=Monday, etc.
    
    console.log('DEBUG - Before adjustment - Day of week:', dayOfWeek);
    
    // Adjust day of week based on first day setting
    if (settings.firstDayOfWeek === 'monday') {
      // Convert to Monday=0, Tuesday=1, ..., Sunday=6
      dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    }
    
    console.log('DEBUG - After adjustment - Day of week:', dayOfWeek);
    
    // Calculate difference to first day of week
    const diff = currentDate.getDate() - dayOfWeek;
    const firstDayOfWeek = new Date(currentDate);
    firstDayOfWeek.setDate(diff);
    
    console.log('DEBUG - First day of week:', firstDayOfWeek.toISOString().split('T')[0]);
    
    const weeks: Week[] = [];
    
    // Generate 3 weeks
    for (let weekIndex = 0; weekIndex < 3; weekIndex++) {
      const weekStartDate = new Date(firstDayOfWeek);
      weekStartDate.setDate(weekStartDate.getDate() + (weekIndex * 7));
      
      const days: Day[] = [];
      
      // Generate 7 days for each week
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const date = new Date(weekStartDate);
        date.setDate(date.getDate() + dayIndex);
        
        const dateString = getDateString(date);
        const isCurrentDay = date.getTime() === today.getTime();
        const workingDay = isWorkingDay(dateString);
        
        days.push({
          date: dateString,
          dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0),
          dayOfMonth: date.getDate(),
          isToday: isCurrentDay,
          isWorkingDay: workingDay
        });
      }
      
      weeks.push({
        name: `Week ${weekIndex + 1}`,
        days
      });
    }
    
    setThreeWeekView({ weeks });
  }, [currentDate, settings.firstDayOfWeek, isWorkingDay]);
  
  // Reset new activity fields when locations or contractors change
  useEffect(() => {
    setNewActivity(getDefaultActivity());
  }, [locations, contractors]);
  
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
  
  const handleAddActivityClick = () => {
    // Toggle spreadsheet-like "Add Row" feature
    setShowNewRow(prev => !prev);
    
    // Reset new activity form
    if (!showNewRow) {
      setNewActivity(getDefaultActivity());
    }
  };
  
  const handleAddActivityModal = () => {
    setSelectedActivity(null);
    setIsActivityModalOpen(true);
  };
  
  const handleEditActivity = (activity: Activity) => {
    setSelectedActivity(activity);
    setIsActivityModalOpen(true);
  };
  
  const handleActivityModalClose = () => {
    setIsActivityModalOpen(false);
  };
  
  const handleNewActivityChange = (field: keyof Omit<Activity, 'id'>, value: string | number) => {
    setNewActivity(prev => {
      const updated = { ...prev, [field]: value };
      
      // Update duration if start or end date changes
      if (field === 'start_date' || field === 'end_date') {
        const workingDays = calculateWorkingDays(
          field === 'start_date' ? String(value) : prev.start_date,
          field === 'end_date' ? String(value) : prev.end_date
        );
        updated.duration = workingDays;
      }
      
      return updated;
    });
  };
  
  const handleCreateActivity = () => {
    // Validate the new activity
    if (!newActivity.name || !newActivity.location || !newActivity.contractor || 
        !newActivity.start_date || !newActivity.end_date) {
      return; // Don't submit invalid data
    }
    
    onAddActivity(newActivity);
    
    // Reset the form and hide the row
    setNewActivity(getDefaultActivity());
    setShowNewRow(false);
  };
  
  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-slate-50 text-slate-900'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-30 ${theme === 'dark' ? 'bg-gray-850' : 'bg-white'} shadow-sm`}>
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold">Construction Schedule</h1>
            <span className="text-sm px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 rounded-full hidden md:inline-block">Three Week Look Ahead</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            <SettingsButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Schedule Controls */}
        <div className={`mb-6 ${theme === 'dark' ? 'bg-gray-850' : 'bg-white'} rounded-lg shadow p-4`}>
          <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
            {/* Date Navigation */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrevious}
                className={`px-3 py-2 ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-slate-200 hover:bg-slate-300'} rounded-md transition-colors duration-150 flex items-center`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>
              <button
                onClick={handleToday}
                className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors duration-150"
              >
                Today
              </button>
              <button
                onClick={handleNext}
                className={`px-3 py-2 ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-slate-200 hover:bg-slate-300'} rounded-md transition-colors duration-150 flex items-center`}
              >
                Next
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Sort & Group Options */}
            <div className="flex flex-wrap items-center space-x-3">
              {/* Sort Option */}
              <div className="flex items-center space-x-2">
                <label htmlFor="sortBy" className="text-sm font-medium whitespace-nowrap">Sort By:</label>
                <select
                  id="sortBy"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className={`form-select rounded-md ${theme === 'dark' ? 'border-slate-600 bg-gray-800' : 'border-slate-300 bg-white'} text-sm py-1.5 pl-2 pr-8`}
                >
                  <option value="start_date">Start Date</option>
                  <option value="end_date">End Date</option>
                  <option value="location">Location</option>
                  <option value="contractor">Contractor</option>
                </select>
              </div>

              {/* Group Option */}
              <div className="flex items-center space-x-2">
                <label htmlFor="groupBy" className="text-sm font-medium whitespace-nowrap">Group By:</label>
                <select
                  id="groupBy"
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                  className={`form-select rounded-md ${theme === 'dark' ? 'border-slate-600 bg-gray-800' : 'border-slate-300 bg-white'} text-sm py-1.5 pl-2 pr-8`}
                >
                  <option value="none">No Grouping</option>
                  <option value="location">Location</option>
                  <option value="contractor">Contractor</option>
                </select>
              </div>


            </div>
          </div>
        </div>



        {/* Schedule Table */}
        <ScheduleTable
          activities={activities}
          threeWeekView={threeWeekView}
          onEditActivity={onEditActivity}
          onEditClick={handleEditActivity}
          sortBy={sortBy}
          groupBy={groupBy}
          locations={locations}
          contractors={contractors}
        />

        {/* Activity Form Modal */}
        <ActivityFormModal
          isOpen={isActivityModalOpen}
          onClose={handleActivityModalClose}
          activity={selectedActivity}
          onAddActivity={onAddActivity}
          onEditActivity={onEditActivity}
          locations={locations}
          contractors={contractors}
        />
      </main>
    </div>
  );
};

export default ScheduleView;
