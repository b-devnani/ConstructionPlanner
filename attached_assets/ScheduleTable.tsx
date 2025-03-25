'use client';

import React, { useState, useEffect } from 'react';
import { Activity, ThreeWeekView, Location, Contractor } from '@/lib/types';
import { activityFallsOnDate, formatDateForDisplay } from '@/lib/dateUtils';
import { useTheme } from '@/lib/ThemeContext';
import { useProjectSettings } from '@/lib/ProjectSettingsContext';

interface ScheduleTableProps {
  activities: Activity[];
  threeWeekView: ThreeWeekView;
  onEditActivity: (activityId: number, field: keyof Activity, value: string | number) => void;
  onAddActivity: (activity: Omit<Activity, 'id'>) => void;
  sortBy: string;
  groupBy: string;
  locations: Location[];
  contractors: Contractor[];
}

const ScheduleTable: React.FC<ScheduleTableProps> = ({
  activities,
  threeWeekView,
  onEditActivity,
  onAddActivity,
  sortBy,
  groupBy,
  locations,
  contractors
}) => {
  const { theme } = useTheme();
  const { isWorkingDay, calculateWorkingDays } = useProjectSettings();
  
  const [editingCell, setEditingCell] = useState<{ id: number; field: keyof Activity } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  
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
  
  const handleCellClick = (id: number, field: keyof Activity, currentValue: string | number) => {
    setEditingCell({ id, field });
    setEditValue(String(currentValue));
  };
  
  const handleCellBlur = () => {
    if (editingCell) {
      const { id, field } = editingCell;
      
      // Handle different field types
      if (field === 'duration') {
        const numValue = parseInt(editValue, 10);
        if (!isNaN(numValue) && numValue > 0) {
          onEditActivity(id, field, numValue);
        }
      } else {
        onEditActivity(id, field, editValue);
      }
      
      setEditingCell(null);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCellBlur();
    }
  };
  
  const handleDateCellClick = (activity: Activity, date: string) => {
    const activityStart = new Date(activity.start_date);
    const activityEnd = new Date(activity.end_date);
    const clickedDate = new Date(date);
    
    // Only allow clicking on working days
    if (!isWorkingDay(date)) {
      return;
    }
    
    // If clicked date is before current start, update start date
    if (clickedDate < activityStart) {
      const newStartDate = date;
      const workingDays = calculateWorkingDays(newStartDate, activity.end_date);
      
      onEditActivity(activity.id, 'start_date', newStartDate);
      onEditActivity(activity.id, 'duration', workingDays);
    } 
    // If clicked date is after current end, update end date
    else if (clickedDate > activityEnd) {
      const newEndDate = date;
      const workingDays = calculateWorkingDays(activity.start_date, newEndDate);
      
      onEditActivity(activity.id, 'end_date', newEndDate);
      onEditActivity(activity.id, 'duration', workingDays);
    }
    // If clicked within current range, do nothing
  };
  
  const handleAddActivity = () => {
    // Add a blank activity with default values
    onAddActivity({
      name: '',
      location: '',
      contractor: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0],
      duration: 1
    });
  };
  
  return (
    <div className={`border rounded-lg overflow-hidden ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                Activity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                Contractor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                Start Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                End Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                Duration (Working Days)
              </th>
              {threeWeekView.weeks.map(week => (
                <React.Fragment key={week.name}>
                  {week.days.map(day => (
                    <th 
                      key={day.date} 
                      className={`px-1 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300 ${
                        !day.isWorkingDay 
                          ? (theme === 'dark' ? 'bg-gray-900 text-gray-600' : 'bg-gray-200 text-gray-400') 
                          : day.isToday 
                            ? (theme === 'dark' ? 'bg-blue-900' : 'bg-blue-100') 
                            : ''
                      }`}
                    >
                      <div>{day.dayOfWeek}</div>
                      <div>{day.dayOfMonth}</div>
                    </th>
                  ))}
                </React.Fragment>
              ))}
            </tr>
          </thead>
          
          <tbody className={`divide-y divide-gray-200 dark:divide-gray-700 ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
            {Object.entries(groupedActivities).map(([groupName, groupActivities]) => (
              <React.Fragment key={groupName}>
                {groupBy !== 'none' && (
                  <tr className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    <td colSpan={6 + threeWeekView.weeks.reduce((acc, week) => acc + week.days.length, 0)} className="px-6 py-2 font-semibold text-gray-800 dark:text-gray-200">
                      {groupName}
                    </td>
                  </tr>
                )}
                
                {groupActivities.map(activity => (
                  <tr key={activity.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-800 dark:text-gray-200">
                      {editingCell?.id === activity.id && editingCell?.field === 'name' ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleCellBlur}
                          onKeyDown={handleKeyDown}
                          autoFocus
                          className={`w-full px-2 py-1 border rounded ${
                            theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'
                          }`}
                        />
                      ) : (
                        <div
                          onClick={() => handleCellClick(activity.id, 'name', activity.name)}
                          className="cursor-pointer"
                        >
                          {activity.name}
                        </div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-gray-800 dark:text-gray-200">
                      {editingCell?.id === activity.id && editingCell?.field === 'location' ? (
                        <select
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleCellBlur}
                          autoFocus
                          className={`w-full px-2 py-1 border rounded ${
                            theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'
                          }`}
                        >
                          <option value="">Select Location</option>
                          {locations.map(location => (
                            <option key={location.id} value={location.name}>
                              {location.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div
                          onClick={() => handleCellClick(activity.id, 'location', activity.location)}
                          className="cursor-pointer"
                        >
                          {activity.location}
                        </div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-gray-800 dark:text-gray-200">
                      {editingCell?.id === activity.id && editingCell?.field === 'contractor' ? (
                        <select
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleCellBlur}
                          autoFocus
                          className={`w-full px-2 py-1 border rounded ${
                            theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'
                          }`}
                        >
                          <option value="">Select Contractor</option>
                          {contractors.map(contractor => (
                            <option key={contractor.id} value={contractor.name}>
                              {contractor.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div
                          onClick={() => handleCellClick(activity.id, 'contractor', activity.contractor)}
                          className="cursor-pointer"
                        >
                          {activity.contractor}
                        </div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-gray-800 dark:text-gray-200">
                      {editingCell?.id === activity.id && editingCell?.field === 'start_date' ? (
                        <input
                          type="date"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleCellBlur}
                          onKeyDown={handleKeyDown}
                          autoFocus
                          className={`w-full px-2 py-1 border rounded ${
                            theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'
                          }`}
                        />
                      ) : (
                        <div
                          onClick={() => handleCellClick(activity.id, 'start_date', activity.start_date)}
                          className="cursor-pointer"
                        >
                          {formatDateForDisplay(activity.start_date)}
                        </div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-gray-800 dark:text-gray-200">
                      {editingCell?.id === activity.id && editingCell?.field === 'end_date' ? (
                        <input
                          type="date"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleCellBlur}
                          onKeyDown={handleKeyDown}
                          autoFocus
                          className={`w-full px-2 py-1 border rounded ${
                            theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'
                          }`}
                        />
                      ) : (
                        <div
                          onClick={() => handleCellClick(activity.id, 'end_date', activity.end_date)}
                          className="cursor-pointer"
                        >
                          {formatDateForDisplay(activity.end_date)}
                        </div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-gray-800 dark:text-gray-200">
                      {activity.duration}
                    </td>
                    
                    {threeWeekView.weeks.map(week => (
                      <React.Fragment key={week.name}>
                        {week.days.map(day => {
                          const isActive = activityFallsOnDate(activity, day.date);
                          const isWorkDay = day.isWorkingDay;
                          
                          return (
                            <td 
                              key={day.date} 
                              onClick={() => handleDateCellClick(activity, day.date)}
                              className={`px-1 py-4 text-center ${
                                !isWorkDay 
                                  ? (theme === 'dark' ? 'bg-gray-900 text-gray-600' : 'bg-gray-200 text-gray-400') 
                                  : isActive 
                                    ? (theme === 'dark' ? 'bg-blue-900' : 'bg-blue-100') 
                                    : 'cursor-pointer'
                              }`}
                            >
                              {isActive && isWorkDay ? '•' : ''}
                            </td>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </tr>
                ))}
              </React.Fragment>
            ))}
            
            {/* Add Activity Row - Only show at the bottom of the entire table */}
            <tr className={`${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}>
              <td 
                colSpan={6 + threeWeekView.weeks.reduce((acc, week) => acc + week.days.length, 0)} 
                className="px-6 py-3 text-center cursor-pointer text-gray-800 dark:text-gray-200"
                onClick={handleAddActivity}
              >
                <span className="font-semibold">+ Add Activity</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Sche<response clipped><NOTE>To save on context only part of this file has been shown to you. You should retry this tool after you have searched inside the file with `grep -n` in order to find the line numbers of what you are looking for.</NOTE>