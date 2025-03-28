
import React, { useState, useRef, useEffect } from 'react';
import { Activity, ThreeWeekView, Location, Contractor } from '@/lib/types';
import { activityFallsOnDate, formatDateForDisplay, daysDifference } from '@/lib/dateUtils';
import { useTheme } from '@/lib/ThemeContext';

interface ScheduleTableProps {
  activities: Activity[];
  threeWeekView: ThreeWeekView;
  onEditActivity: (activityId: number, field: keyof Activity, value: string | number) => void;
  onEditClick: (activity: Activity) => void;
  onAddActivity: (activity: Omit<Activity, 'id'>) => void;
  sortBy: string;
  groupBy: string;
  locations: Location[];
  contractors: Contractor[];
  refreshCounter?: number; // Optional counter to trigger re-sorting
}

const ScheduleTable: React.FC<ScheduleTableProps> = ({
  activities,
  threeWeekView,
  onEditActivity,
  onEditClick,
  onAddActivity,
  sortBy,
  groupBy,
  locations,
  contractors,
  refreshCounter = 0 // Default to 0 if not provided
}) => {
  const { theme } = useTheme();
  
  // State for inline editing
  const [editingCell, setEditingCell] = useState<{
    activityId: number | null;
    field: keyof Activity | null;
  }>({ activityId: null, field: null });
  
  const [editValue, setEditValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  
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
  
  // Effect to focus the input when editing begins
  useEffect(() => {
    if (editingCell.activityId !== null && editingCell.field !== null && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingCell]);
  
  // Handle start editing
  const handleStartEditing = (activity: Activity, field: keyof Activity) => {
    // Skip editing for duration, as it's calculated
    if (field === 'duration') return;
    
    setEditingCell({
      activityId: activity.id,
      field
    });
    
    setEditValue(String(activity[field]));
  };
  
  // Handle save edit
  const handleSaveEdit = (activityId: number, field: keyof Activity) => {
    if (field === 'duration') return;
    
    // Convert to appropriate type before saving
    let valueToSave: string | number = editValue;
    
    // Special handling for different field types
    if (field === 'start_date' || field === 'end_date') {
      if (!editValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // If not in YYYY-MM-DD format, revert to original
        const activity = activities.find(a => a.id === activityId);
        if (activity) {
          valueToSave = activity[field] as string;
        }
      }
    }
    
    onEditActivity(activityId, field, valueToSave);
    
    // Reset editing state
    setEditingCell({ activityId: null, field: null });
  };
  
  // Handle date cell click to toggle the activity status for this date (checkbox-like behavior)
  const handleDateCellClick = (activity: Activity, date: string) => {
    console.log(`Clicked date: ${date}`);
    console.log(`Activity start: ${activity.start_date}, end: ${activity.end_date}`);
    
    // Use the clicked date directly without shifting (to fix the wonky date issue)
    const shiftedDate = date;

    // Check if this date is already in the activity's range
    const isDateInActivity = activityFallsOnDate(activity, date);
    
    if (isDateInActivity) {
      // If the date is already in the activity, we need to remove it
      console.log(`Removing date ${shiftedDate} from activity`);
      
      // Calculate new start and end dates based on the clicked date
      const currentStart = new Date(activity.start_date);
      const currentEnd = new Date(activity.end_date);
      const dateToToggle = new Date(shiftedDate);
      
      // Reset time components for accurate date comparison
      currentStart.setHours(0, 0, 0, 0);
      currentEnd.setHours(0, 0, 0, 0);
      dateToToggle.setHours(0, 0, 0, 0);
      
      // If the clicked date is the start date
      if (dateToToggle.getTime() === currentStart.getTime()) {
        if (currentStart.getTime() === currentEnd.getTime()) {
          // This is a single-day activity, set both to empty (or handle as needed)
          console.log("Single day activity - clearing dates");
          onEditActivity(activity.id, 'start_date', '');
          onEditActivity(activity.id, 'end_date', '');
        } else {
          // Move start date one day forward
          const newStartDate = new Date(currentStart);
          newStartDate.setDate(newStartDate.getDate() + 1);
          console.log(`Moving start date to ${newStartDate.toISOString().split('T')[0]}`);
          onEditActivity(activity.id, 'start_date', newStartDate.toISOString().split('T')[0]);
        }
      }
      // If the clicked date is the end date
      else if (dateToToggle.getTime() === currentEnd.getTime()) {
        // Move end date one day back
        const newEndDate = new Date(currentEnd);
        newEndDate.setDate(newEndDate.getDate() - 1);
        console.log(`Moving end date to ${newEndDate.toISOString().split('T')[0]}`);
        onEditActivity(activity.id, 'end_date', newEndDate.toISOString().split('T')[0]);
      }
      // If the clicked date is in the middle, handle splitting by creating a gap
      else {
        console.log("Removing date in the middle by creating a gap");
        
        // Create an end date for the first segment (one day before clicked date)
        const firstSegmentEnd = new Date(dateToToggle);
        firstSegmentEnd.setDate(firstSegmentEnd.getDate() - 1);
        
        // Create a start date for the second segment (one day after clicked date)
        const secondSegmentStart = new Date(dateToToggle);
        secondSegmentStart.setDate(secondSegmentStart.getDate() + 1);
        
        // For simplicity in our model, we'll just update the original activity to be the first segment
        // And then create a new activity for the second segment
        
        // But in this implementation, we'll just shrink the activity to end at the day before the clicked date
        // This effectively removes the day without full splitting
        onEditActivity(activity.id, 'end_date', firstSegmentEnd.toISOString().split('T')[0]);
      }
    } else {
      // If the date is not in the activity, we need to add it
      console.log(`Adding date ${shiftedDate} to activity`);
      
      // If activity has no start/end dates yet, set both to this date
      if (!activity.start_date || !activity.end_date) {
        console.log("Setting initial activity dates");
        onEditActivity(activity.id, 'start_date', shiftedDate);
        onEditActivity(activity.id, 'end_date', shiftedDate);
        return;
      }
      
      const currentStart = new Date(activity.start_date);
      const currentEnd = new Date(activity.end_date);
      const dateToToggle = new Date(shiftedDate);
      
      // Reset time components for accurate date comparison
      currentStart.setHours(0, 0, 0, 0);
      currentEnd.setHours(0, 0, 0, 0);
      dateToToggle.setHours(0, 0, 0, 0);
      
      // If the clicked date is before the start date
      if (dateToToggle < currentStart) {
        console.log("Extending start date backward");
        onEditActivity(activity.id, 'start_date', shiftedDate);
      }
      // If the clicked date is after the end date
      else if (dateToToggle > currentEnd) {
        console.log("Extending end date forward");
        onEditActivity(activity.id, 'end_date', shiftedDate);
      }
      // If the clicked date is exactly 1 day before the start, extend start backwards
      else if ((currentStart.getTime() - dateToToggle.getTime()) === 86400000) {
        console.log("Extending start date backward by 1 day");
        onEditActivity(activity.id, 'start_date', shiftedDate);
      }
      // If the clicked date is exactly 1 day after the end, extend end forwards
      else if ((dateToToggle.getTime() - currentEnd.getTime()) === 86400000) {
        console.log("Extending end date forward by 1 day");
        onEditActivity(activity.id, 'end_date', shiftedDate);
      }
    }
  };
  
  // Handle keyboard events during editing
  const handleKeyDown = (e: React.KeyboardEvent, activityId: number, field: keyof Activity) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit(activityId, field);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingCell({ activityId: null, field: null });
    }
  };
  
  // Store sorted activities separately from the input activities
  const [sortedActivities, setSortedActivities] = useState<Activity[]>([]);
  
  // Track whether we need to sort on the next render
  const [triggerSort, setTriggerSort] = useState(false);
  
  // Keep track of the previous sort trigger values to detect changes
  const prevRefreshCounter = useRef(refreshCounter || 0);
  const prevSortBy = useRef(sortBy);
  const prevGroupBy = useRef(groupBy);
  
  // Check for changes in sort triggers that would require re-sorting
  useEffect(() => {
    // Only set trigger for valid sort changes - refresh button, sortBy or groupBy
    if (refreshCounter !== prevRefreshCounter.current || 
        sortBy !== prevSortBy.current || 
        groupBy !== prevGroupBy.current) {
      console.log("Sort trigger detected - will sort on next render");
      setTriggerSort(true);
      
      // Update previous values
      prevRefreshCounter.current = refreshCounter || 0;
      prevSortBy.current = sortBy;
      prevGroupBy.current = groupBy;
    }
  }, [refreshCounter, sortBy, groupBy]);
  
  // Handle actual sorting when activities change OR when triggerSort is true
  useEffect(() => {
    // Always use the current activities as the base
    const newActivities = [...activities];
    
    // Only perform sort if the sort trigger changed
    if (triggerSort) {
      console.log("Performing sort based on", sortBy);
      
      newActivities.sort((a, b) => {
        switch (sortBy) {
          case 'start_date':
            return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
          case 'end_date':
            return new Date(a.end_date).getTime() - new Date(b.end_date).getTime();
          case 'location':
            return a.location.localeCompare(b.location);
          case 'contractor':
            return a.contractor.localeCompare(b.contractor);
          default:
            return 0;
        }
      });
      
      // Reset the sort trigger
      setTriggerSort(false);
    }
    
    // Update the sorted activities regardless
    setSortedActivities(newActivities);
  }, [activities, triggerSort, sortBy]);
  
  // Use sortedActivities for display instead of raw activities
  const activitiesToUse = sortedActivities.length > 0 ? sortedActivities : activities;
  
  // Group activities based on groupBy
  const groupedActivities: { [key: string]: Activity[] } = {};
  
  if (groupBy === 'none') {
    groupedActivities['All Activities'] = activitiesToUse;
  } else {
    activitiesToUse.forEach(activity => {
      const groupKey = activity[groupBy as keyof Activity] as string;
      if (!groupedActivities[groupKey]) {
        groupedActivities[groupKey] = [];
      }
      groupedActivities[groupKey].push(activity);
    });
  }
  
  // Get activity color based on contractor
  const getActivityColor = (contractor: string): string => {
    const colorMap: { [key: string]: string } = {
      'ABC Drywall': 'bg-blue-100 dark:bg-blue-900/30',
      'Spark Electric': 'bg-purple-100 dark:bg-purple-900/30',
      'Fluid Plumbing': 'bg-green-100 dark:bg-green-900/30',
      'Steel Framers Inc.': 'bg-amber-100 dark:bg-amber-900/30',
      'Glass & Windows Co.': 'bg-rose-100 dark:bg-rose-900/30'
    };
    
    return colorMap[contractor] || 'bg-gray-100 dark:bg-gray-700/30';
  };
  
  // Generate month and year labels for the weeks
  const getWeekHeaderInfo = () => {
    if (!threeWeekView.weeks.length || !threeWeekView.weeks[0].days.length) return [];
    
    console.log('DEBUG - Generating month headers from weeks:', threeWeekView.weeks);
    
    const result = [];
    let currentMonth = '';
    let currentYear = '';
    let monthStartIndex = 0;
    let monthSpan = 0;
    
    // Create a flat array of all days
    const allDays = threeWeekView.weeks.flatMap(week => week.days);
    
    console.log('DEBUG - All days flattened:', allDays.map(day => day.date).join(', '));
    
    for (let i = 0; i < allDays.length; i++) {
      // Shift the date calculation by one day forward for correct month display
      const date = new Date(allDays[i].date);
      date.setDate(date.getDate() + 1); // Shift by one day
      const month = date.toLocaleString('default', { month: 'long' });
      const year = date.getFullYear().toString();
      
      console.log('DEBUG - Processing day:', i, allDays[i].date, 'Month:', month, 'Year:', year);
      
      if (month !== currentMonth || year !== currentYear) {
        if (currentMonth) {
          // Push the previous month
          result.push({
            month: currentMonth,
            year: currentYear,
            startIndex: monthStartIndex,
            span: monthSpan
          });
          console.log('DEBUG - Added month header:', currentMonth, currentYear, 'Span:', monthSpan, 'Start:', monthStartIndex);
        }
        
        // Start a new month
        currentMonth = month;
        currentYear = year;
        monthStartIndex = i;
        monthSpan = 1;
      } else {
        monthSpan++;
      }
    }
    
    // Add the last month
    if (currentMonth) {
      result.push({
        month: currentMonth,
        year: currentYear,
        startIndex: monthStartIndex,
        span: monthSpan
      });
    }
    
    return result;
  };
  
  const monthHeaders = getWeekHeaderInfo();
  
  // Render editable cell content
  // Handle Add Activity button click
  const handleAddActivityClick = () => {
    // Get default activity and immediately add it
    const defaultActivity = getDefaultActivity();
    onAddActivity(defaultActivity);
  };
  


  const renderEditableCell = (activity: Activity, field: keyof Activity) => {
    const isEditing = editingCell.activityId === activity.id && editingCell.field === field;
    
    if (isEditing) {
      // Render input for editing
      if (field === 'location') {
        return (
          <select
            ref={selectRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => handleSaveEdit(activity.id, field)}
            onKeyDown={(e) => handleKeyDown(e, activity.id, field)}
            className={`w-full py-1 px-2 ${theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-white text-slate-800'} border ${theme === 'dark' ? 'border-gray-600' : 'border-slate-300'} rounded-sm`}
          >
            {locations.map(location => (
              <option key={location.id} value={location.name}>
                {location.name}
              </option>
            ))}
          </select>
        );
      } else if (field === 'contractor') {
        return (
          <select
            ref={selectRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => handleSaveEdit(activity.id, field)}
            onKeyDown={(e) => handleKeyDown(e, activity.id, field)}
            className={`w-full py-1 px-2 ${theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-white text-slate-800'} border ${theme === 'dark' ? 'border-gray-600' : 'border-slate-300'} rounded-sm`}
          >
            {contractors.map(contractor => (
              <option key={contractor.id} value={contractor.name}>
                {contractor.name}
              </option>
            ))}
          </select>
        );
      } else if (field === 'start_date' || field === 'end_date') {
        return (
          <input
            ref={inputRef}
            type="date"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => handleSaveEdit(activity.id, field)}
            onKeyDown={(e) => handleKeyDown(e, activity.id, field)}
            className={`w-full py-1 px-2 ${theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-white text-slate-800'} border ${theme === 'dark' ? 'border-gray-600' : 'border-slate-300'} rounded-sm`}
          />
        );
      } else {
        return (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => handleSaveEdit(activity.id, field)}
            onKeyDown={(e) => handleKeyDown(e, activity.id, field)}
            className={`w-full py-1 px-2 ${theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-white text-slate-800'} border ${theme === 'dark' ? 'border-gray-600' : 'border-slate-300'} rounded-sm`}
          />
        );
      }
    } else {
      // Render static content with click to edit
      let displayValue: React.ReactNode;
      
      if (field === 'start_date' || field === 'end_date') {
        displayValue = formatDateForDisplay(activity[field] as string);
      } else if (field === 'duration') {
        displayValue = `${activity[field]} days`;
      } else {
        displayValue = activity[field];
      }
      
      const isEditableClass = field !== 'duration' 
        ? `hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer 
           relative transition-all duration-150 hover:shadow
           after:content-[''] after:absolute after:bottom-0 after:left-0 
           after:w-0 hover:after:w-full after:h-0.5 
           after:bg-blue-500 after:transition-all after:duration-300` 
        : '';
      
      return (
        <div 
          className={`${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'} 
                    ${isEditableClass} px-2 py-1 rounded group`}
          onClick={() => field !== 'duration' && handleStartEditing(activity, field)}
        >
          {displayValue}
          {field !== 'duration' && (
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 inline-block transition-opacity duration-200" 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          )}
        </div>
      );
    }
  };
  
  return (
    <div className={`${theme === 'dark' ? 'bg-gray-850' : 'bg-white'} rounded-lg shadow relative overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className={`min-w-full divide-y ${theme === 'dark' ? 'divide-slate-700' : 'divide-slate-200'} table-fixed`}>
          <thead>
            {/* Year and Month header row */}
            <tr className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-slate-100'}`}>
              <th colSpan={6} className="border-b border-r"></th>
              {monthHeaders.map((header, idx) => (
                <th 
                  key={`month-${idx}`} 
                  colSpan={header.span}
                  className={`px-1 py-1 text-center text-xs font-bold ${theme === 'dark' ? 'text-slate-300 border-slate-700' : 'text-slate-600 border-slate-200'} uppercase tracking-wider border-b border-l`}
                >
                  {header.month} {header.year}
                </th>
              ))}
            </tr>
            
            {/* Week header row */}
            <tr className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-slate-100'}`}>
              <th colSpan={6} className="border-b border-r"></th>
              {threeWeekView.weeks.map((week, idx) => (
                <th 
                  key={`week-${idx}`} 
                  colSpan={week.days.length}
                  className={`px-1 py-1 text-center text-xs font-medium ${theme === 'dark' ? 'text-slate-300 border-slate-700' : 'text-slate-600 border-slate-200'} uppercase tracking-wider border-b border-l`}
                >
                  {idx === 0 ? "Current Week" : idx === 1 ? "Next Week" : "Next 2 Weeks"}
                </th>
              ))}
            </tr>
            
            {/* Day header row */}
            <tr>
              <th className={`px-4 py-3 ${theme === 'dark' ? 'bg-gray-800' : 'bg-slate-100'} text-left text-xs font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'} uppercase tracking-wider sticky left-0 z-10 w-48`}>
                Activity
              </th>
              <th className={`px-4 py-3 ${theme === 'dark' ? 'bg-gray-800' : 'bg-slate-100'} text-left text-xs font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'} uppercase tracking-wider w-40`}>
                Location
              </th>
              <th className={`px-4 py-3 ${theme === 'dark' ? 'bg-gray-800' : 'bg-slate-100'} text-left text-xs font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'} uppercase tracking-wider w-40`}>
                Contractor
              </th>
              <th className={`px-4 py-3 ${theme === 'dark' ? 'bg-gray-800' : 'bg-slate-100'} text-left text-xs font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'} uppercase tracking-wider w-32`}>
                Start Date
              </th>
              <th className={`px-4 py-3 ${theme === 'dark' ? 'bg-gray-800' : 'bg-slate-100'} text-left text-xs font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'} uppercase tracking-wider w-32`}>
                End Date
              </th>
              <th className={`px-4 py-3 ${theme === 'dark' ? 'bg-gray-800' : 'bg-slate-100'} text-left text-xs font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'} uppercase tracking-wider w-32`}>
                Duration
              </th>
              
              {/* Day Headers */}
              {threeWeekView.weeks.flatMap(week => 
                week.days.map(day => {
                  // Construct class names carefully to avoid spacing issues
                  let headerClasses = "p-1 text-center text-xs font-medium uppercase tracking-wider w-14 border-l";
                  
                  // Add border styling
                  headerClasses += ` ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`;
                  
                  // Add working day styling
                  console.log('DEBUG - Day header styling for:', day.date, 
                             'Day of week:', day.dayOfWeek, 
                             'Working day:', day.isWorkingDay);
                  
                  if (day.isWorkingDay) {
                    headerClasses += ` ${theme === 'dark' ? 'bg-gray-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`;
                  } else {
                    headerClasses += ` ${theme === 'dark' ? 'bg-gray-700 text-slate-400' : 'bg-slate-200 text-slate-500'}`;
                  }
                  
                  // Add today styling
                  if (day.isToday) {
                    headerClasses += ` ${theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'}`;
                  }
                  
                  return (
                    <th 
                      key={day.date}
                      className={headerClasses}
                    >
                      <div className="flex flex-col items-center">
                        <span className="font-medium">{day.dayOfWeek}</span>
                        <span className="font-bold">{day.dayOfMonth}</span>
                      </div>
                    </th>
                  );
                })
              )}
            </tr>
          </thead>
          
          <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-700' : 'divide-slate-200'}`}>
            
            {Object.entries(groupedActivities).flatMap(([groupName, groupActivities]) => {
              // Use an array instead of React.Fragment to avoid Replit metadata issues
              const rows = [];
              
              // Add the group header row if needed
              if (groupBy !== 'none') {
                rows.push(
                  <tr key={`group-${groupName}`} className={theme === 'dark' ? 'bg-gray-800/50' : 'bg-slate-50'}>
                    <td colSpan={6 + threeWeekView.weeks.reduce((acc, week) => acc + week.days.length, 0)} 
                        className={`px-4 py-2 font-medium text-sm ${theme === 'dark' ? 'text-slate-200' : 'text-slate-900'} sticky left-0 z-10`}>
                      {groupName}
                    </td>
                  </tr>
                );
              }
              
              // Add all the activity rows
              groupActivities.forEach(activity => {
                rows.push(
                  <tr 
                    key={`activity-${activity.id}`} 
                    className={`hover:${theme === 'dark' ? 'bg-gray-800/50' : 'bg-slate-50'} transition-all duration-200`}
                  >
                    <td className={`px-4 py-2 text-sm sticky left-0 z-10 ${
                      theme === 'dark' ? 'bg-gray-850' : 'bg-white'
                    } border-r ${theme === 'dark' ? 'border-slate-700' : 'border-slate-100'}`}>
                      {renderEditableCell(activity, 'name')}
                    </td>
                    
                    <td className="px-4 py-2 text-sm">
                      {renderEditableCell(activity, 'location')}
                    </td>
                    
                    <td className="px-4 py-2 text-sm">
                      {renderEditableCell(activity, 'contractor')}
                    </td>
                    
                    <td className="px-4 py-2 text-sm">
                      {renderEditableCell(activity, 'start_date')}
                    </td>
                    
                    <td className="px-4 py-2 text-sm">
                      {renderEditableCell(activity, 'end_date')}
                    </td>
                    
                    <td className="px-4 py-2 text-sm">
                      {renderEditableCell(activity, 'duration')}
                    </td>
                    
                    {/* Activity Timeline Cells */}
                    {threeWeekView.weeks.flatMap(week => 
                      week.days.map(day => {
                        const isActivityDay = activityFallsOnDate(activity, day.date);
                        const isWorkingDay = day.isWorkingDay;
                        
                        // Start date and end date indicators
                        const isStartDate = activity.start_date === day.date;
                        const isEndDate = activity.end_date === day.date;

                        // Construct base class names - make it look like a checkbox when active
                        let cellClasses = `w-14 h-6 p-0 border ${theme === 'dark' ? 'border-slate-700' : 'border-slate-100'} 
                                          cursor-pointer relative transition-all duration-150
                                          hover:shadow-md hover:z-10 hover:scale-105`;
                        
                        // Add hover effects
                        if (isActivityDay) {
                          // When active, show hover as "removing" the activity
                          cellClasses += ` hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-400 hover:border-2
                                         ${getActivityColor(activity.contractor)}`;
                        } else {
                          // When inactive, show hover as "adding" the activity
                          cellClasses += ` hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-400 hover:border-2
                                         ${theme === 'dark' ? 'bg-gray-800/80' : 'bg-slate-100/70'}`;
                        }
                        
                        // Add non-working day styling (only if it's not a working day)
                        if (!isWorkingDay) {
                          cellClasses += ` ${theme === 'dark' ? 'bg-gray-700/60' : 'bg-slate-200/60'}`;
                        }
                        
                        // Create the cell content with a cleaner filled dot for activity days
                        const cellContent = (
                          <div className="w-full h-full flex items-center justify-center">
                            {isActivityDay && (
                              <div className={`w-3 h-3 rounded-full ${theme === 'dark' ? 'bg-blue-400' : 'bg-blue-500'}`}></div>
                            )}
                            
                            {/* Start date indicator - left triangle */}
                            {isStartDate && (
                              <div className={`absolute top-0 left-0 w-2 h-0 
                                              border-t-[6px] border-r-[6px] border-b-0 
                                              ${theme === 'dark' ? 'border-t-green-500 border-r-transparent' : 
                                                                  'border-t-green-600 border-r-transparent'}`}>
                              </div>
                            )}
                            
                            {/* End date indicator - right triangle */}
                            {isEndDate && (
                              <div className={`absolute top-0 right-0 w-2 h-0 
                                              border-t-[6px] border-l-[6px] border-b-0 
                                              ${theme === 'dark' ? 'border-t-red-500 border-l-transparent' : 
                                                                  'border-t-red-600 border-l-transparent'}`}>
                              </div>
                            )}
                          </div>
                        );
                        
                        return (
                          <td 
                            key={`${activity.id}-${day.date}`}
                            className={cellClasses}
                            onClick={() => handleDateCellClick(activity, day.date)}
                            title={isActivityDay ? `Remove ${activity.name} on ${formatDateForDisplay(day.date)}` : `Add ${activity.name} on ${formatDateForDisplay(day.date)}`}
                            draggable={isActivityDay}
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', JSON.stringify({
                                activityId: activity.id,
                                date: day.date,
                                isStartDate,
                                isEndDate
                              }));
                            }}
                            onDragOver={(e) => {
                              e.preventDefault(); // Allow drop
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                              // If we're dragging a start date, update the start date
                              if (data.isStartDate) {
                                onEditActivity(data.activityId, 'start_date', day.date);
                              }
                              // If we're dragging an end date, update the end date
                              else if (data.isEndDate) {
                                onEditActivity(data.activityId, 'end_date', day.date);
                              }
                              // If we're dragging a middle cell, move the entire activity
                              else if (data.activityId) {
                                const draggedActivity = activities.find(a => a.id === data.activityId);
                                if (draggedActivity) {
                                  // Use our daysDifference function to calculate the shift
                                  const daysToShift = daysDifference(data.date, day.date);
                                  
                                  const newStartDate = new Date(draggedActivity.start_date);
                                  newStartDate.setDate(newStartDate.getDate() + daysToShift);
                                  
                                  const newEndDate = new Date(draggedActivity.end_date);
                                  newEndDate.setDate(newEndDate.getDate() + daysToShift);
                                  
                                  // Update both start and end dates to move the activity
                                  onEditActivity(data.activityId, 'start_date', newStartDate.toISOString().split('T')[0]);
                                  onEditActivity(data.activityId, 'end_date', newEndDate.toISOString().split('T')[0]);
                                }
                              }
                            }}
                          >
                            {cellContent}
                          </td>
                        );
                      })
                    )}
                  </tr>
                );
              });
              
              return rows;
            })}
          </tbody>
        </table>
      </div>
      {/* Add Activity Button at bottom of table */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={handleAddActivityClick}
          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Activity
        </button>
      </div>
    </div>
  );
};

export default ScheduleTable;
