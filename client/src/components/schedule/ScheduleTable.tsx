
import React, { useState, useRef, useEffect } from 'react';
import { Activity, ThreeWeekView, Location, Contractor } from '@/lib/types';
import { activityFallsOnDate, formatDateForDisplay } from '@/lib/dateUtils';
import { useTheme } from '@/lib/ThemeContext';

interface ScheduleTableProps {
  activities: Activity[];
  threeWeekView: ThreeWeekView;
  onEditActivity: (activityId: number, field: keyof Activity, value: string | number) => void;
  onEditClick: (activity: Activity) => void;
  sortBy: string;
  groupBy: string;
  locations: Location[];
  contractors: Contractor[];
}

const ScheduleTable: React.FC<ScheduleTableProps> = ({
  activities,
  threeWeekView,
  onEditActivity,
  onEditClick,
  sortBy,
  groupBy,
  locations,
  contractors
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
  
  // Handle date cell click to update start/end dates
  const handleDateCellClick = (activity: Activity, date: string) => {
    const startDate = new Date(activity.start_date);
    const endDate = new Date(activity.end_date);
    const clickedDate = new Date(date);

    // If clicked after end date, extend end date
    if (clickedDate > endDate) {
      onEditActivity(activity.id, 'end_date', date);
    } 
    // If clicked before start date, move start date
    else if (clickedDate < startDate) {
      onEditActivity(activity.id, 'start_date', date);
    }
    // If clicked within range, do nothing or could implement other behavior
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
  
  // Sort activities based on sortBy
  const sortedActivities = [...activities].sort((a, b) => {
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
  
  // Group activities based on groupBy
  const groupedActivities: { [key: string]: Activity[] } = {};
  
  if (groupBy === 'none') {
    groupedActivities['All Activities'] = sortedActivities;
  } else {
    sortedActivities.forEach(activity => {
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
    
    const result = [];
    let currentMonth = '';
    let currentYear = '';
    let monthStartIndex = 0;
    let monthSpan = 0;
    
    // Create a flat array of all days
    const allDays = threeWeekView.weeks.flatMap(week => week.days);
    
    for (let i = 0; i < allDays.length; i++) {
      const date = new Date(allDays[i].date);
      const month = date.toLocaleString('default', { month: 'long' });
      const year = date.getFullYear().toString();
      
      if (month !== currentMonth || year !== currentYear) {
        if (currentMonth) {
          // Push the previous month
          result.push({
            month: currentMonth,
            year: currentYear,
            startIndex: monthStartIndex,
            span: monthSpan
          });
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
      
      const isEditableClass = field !== 'duration' ? 'hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer' : '';
      
      return (
        <div 
          className={`${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'} ${isEditableClass} px-2 py-1 rounded`}
          onClick={() => field !== 'duration' && handleStartEditing(activity, field)}
        >
          {displayValue}
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
                  <tr key={`activity-${activity.id}`} className={`hover:${theme === 'dark' ? 'bg-gray-800/50' : 'bg-slate-50'}`}>
                    <td className={`px-4 py-2 text-sm sticky left-0 z-10 ${theme === 'dark' ? 'bg-gray-850' : 'bg-white'} border-r ${theme === 'dark' ? 'border-slate-700' : 'border-slate-100'}`}>
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
                        
                        // Construct class names carefully to avoid spacing issues
                        let cellClasses = `w-14 p-0 border ${theme === 'dark' ? 'border-slate-700' : 'border-slate-100'} cursor-pointer hover:bg-opacity-80`;
                        
                        // Add activity color if this is an activity day
                        if (isActivityDay) {
                          cellClasses += ` ${getActivityColor(activity.contractor)}`;
                        }
                        
                        // Add non-working day styling (only if it's not a working day)
                        if (!isWorkingDay) {
                          cellClasses += ` ${theme === 'dark' ? 'bg-gray-700/60' : 'bg-slate-200/60'}`;
                        }
                        
                        return (
                          <td 
                            key={`${activity.id}-${day.date}`}
                            className={cellClasses}
                            onClick={() => handleDateCellClick(activity, day.date)}
                          ></td>
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
          onClick={() => onEditClick({ 
            id: -1, 
            name: '', 
            location: locations.length > 0 ? locations[0].name : '',
            contractor: contractors.length > 0 ? contractors[0].name : '',
            start_date: new Date().toISOString().split('T')[0],
            end_date: new Date().toISOString().split('T')[0],
            duration: 1
          })}
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
