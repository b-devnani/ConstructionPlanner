'use client';

import React from 'react';
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
  
  return (
    <div className={`${theme === 'dark' ? 'bg-gray-850' : 'bg-white'} rounded-lg shadow relative overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className={`min-w-full divide-y ${theme === 'dark' ? 'divide-slate-700' : 'divide-slate-200'} table-fixed`}>
          <thead>
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
              {threeWeekView.weeks.map(week => (
                week.days.map(day => (
                  <th 
                    key={day.date}
                    className={`p-1 ${theme === 'dark' ? 'bg-gray-800' : 'bg-slate-100'} 
                    text-center text-xs font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'} 
                    uppercase tracking-wider w-14 border-l 
                    ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}
                    ${!day.isWorkingDay ? (theme === 'dark' ? 'bg-gray-700' : 'bg-slate-200') : ''}
                    ${day.isToday ? (theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100') : ''}`}
                  >
                    <div className="flex flex-col items-center">
                      <span className="font-medium">{day.dayOfWeek}</span>
                      <span className="font-bold">{day.dayOfMonth}</span>
                    </div>
                  </th>
                ))
              ))}
            </tr>
          </thead>
          
          <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-700' : 'divide-slate-200'}`}>
            {Object.entries(groupedActivities).map(([groupName, groupActivities]) => (
              <React.Fragment key={groupName}>
                {groupBy !== 'none' && (
                  <tr className={theme === 'dark' ? 'bg-gray-800/50' : 'bg-slate-50'}>
                    <td colSpan={6 + threeWeekView.weeks.reduce((acc, week) => acc + week.days.length, 0)} 
                        className={`px-4 py-2 font-medium text-sm ${theme === 'dark' ? 'text-slate-200' : 'text-slate-900'} sticky left-0 z-10`}>
                      {groupName}
                    </td>
                  </tr>
                )}
                
                {groupActivities.map(activity => (
                  <tr key={activity.id} className={`hover:${theme === 'dark' ? 'bg-gray-800/50' : 'bg-slate-50'}`}>
                    <td className={`px-4 py-3 text-sm sticky left-0 z-10 ${theme === 'dark' ? 'bg-gray-850' : 'bg-white'} border-r ${theme === 'dark' ? 'border-slate-700' : 'border-slate-100'}`}>
                      <div 
                        className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'} cursor-pointer`}
                        onClick={() => onEditClick(activity)}
                      >
                        {activity.name}
                      </div>
                    </td>
                    
                    <td className="px-4 py-3 text-sm">
                      <div className={`${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                        {activity.location}
                      </div>
                    </td>
                    
                    <td className="px-4 py-3 text-sm">
                      <div className={`${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                        {activity.contractor}
                      </div>
                    </td>
                    
                    <td className="px-4 py-3 text-sm">
                      <div className={`${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                        {formatDateForDisplay(activity.start_date)}
                      </div>
                    </td>
                    
                    <td className="px-4 py-3 text-sm">
                      <div className={`${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                        {formatDateForDisplay(activity.end_date)}
                      </div>
                    </td>
                    
                    <td className="px-4 py-3 text-sm">
                      <div className={`${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                        {activity.duration} days
                      </div>
                    </td>
                    
                    {/* Activity Timeline Cells */}
                    {threeWeekView.weeks.map(week => (
                      week.days.map(day => {
                        const isActivityDay = activityFallsOnDate(activity, day.date);
                        const isWorkingDay = day.isWorkingDay;
                        
                        return (
                          <td 
                            key={`${activity.id}-${day.date}`}
                            className={`w-14 p-0 border ${theme === 'dark' ? 'border-slate-700' : 'border-slate-100'} 
                            ${isActivityDay ? getActivityColor(activity.contractor) : ''}
                            ${!isWorkingDay ? (theme === 'dark' ? 'bg-gray-700' : 'bg-slate-100') : ''}`}
                          ></td>
                        );
                      })
                    ))}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ScheduleTable;
