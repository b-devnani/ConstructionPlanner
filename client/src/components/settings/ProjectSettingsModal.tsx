'use client';

import React, { useState } from 'react';
import { useProjectSettings, Holiday } from '@/lib/ProjectSettingsContext';
import { useTheme } from '@/lib/ThemeContext';

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, addHoliday, removeHoliday } = useProjectSettings();
  const { theme } = useTheme();
  
  // Local state for form inputs
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');
  
  // Handle working days toggle
  const handleWorkingDayToggle = (day: keyof typeof settings.workingDays) => {
    updateSettings({
      workingDays: {
        ...settings.workingDays,
        [day]: !settings.workingDays[day]
      }
    });
  };
  
  // Handle first day of week change
  const handleFirstDayChange = (firstDay: 'sunday' | 'monday') => {
    updateSettings({ firstDayOfWeek: firstDay });
  };
  
  // Handle adding a new holiday
  const handleAddHoliday = () => {
    if (newHolidayName && newHolidayDate) {
      addHoliday({
        name: newHolidayName,
        date: newHolidayDate,
        isDefault: false
      });
      
      // Reset form
      setNewHolidayName('');
      setNewHolidayDate('');
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${theme === 'dark' ? 'bg-gray-850' : 'bg-white'} rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto`}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Project Settings</h2>
            <button 
              onClick={onClose}
              className={`${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* First Day of Week */}
          <div className="mb-8">
            <h3 className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>First Day of Week</h3>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio h-5 w-5 text-blue-600"
                  checked={settings.firstDayOfWeek === 'sunday'}
                  onChange={() => handleFirstDayChange('sunday')}
                />
                <span className={`ml-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Sunday</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio h-5 w-5 text-blue-600"
                  checked={settings.firstDayOfWeek === 'monday'}
                  onChange={() => handleFirstDayChange('monday')}
                />
                <span className={`ml-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Monday</span>
              </label>
            </div>
          </div>
          
          {/* Working Days */}
          <div className="mb-8">
            <h3 className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Working Days</h3>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {Object.entries(settings.workingDays).map(([day, isWorking]) => (
                <div key={day} className="flex flex-col items-center">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      className="form-checkbox h-5 w-5 text-blue-600"
                      checked={isWorking}
                      onChange={() => handleWorkingDayToggle(day as keyof typeof settings.workingDays)}
                    />
                    <span className={`ml-2 capitalize ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {day.slice(0, 3)}
                    </span>
                  </label>
                </div>
              ))}
            </div>
          </div>
          
          {/* Holidays */}
          <div className="mb-8">
            <h3 className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Holidays</h3>
            
            {/* Add new holiday */}
            <div className={`mb-4 p-4 border rounded-lg ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <h4 className={`text-md font-medium mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>Add Custom Holiday</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <div>
                  <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Holiday Name</label>
                  <input
                    type="text"
                    value={newHolidayName}
                    onChange={(e) => setNewHolidayName(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                      theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'border-gray-300'
                    }`}
                    placeholder="Holiday Name"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Date</label>
                  <input
                    type="date"
                    value={newHolidayDate}
                    onChange={(e) => setNewHolidayDate(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                      theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'border-gray-300'
                    }`}
                  />
                </div>
              </div>
              <button
                onClick={handleAddHoliday}
                disabled={!newHolidayName || !newHolidayDate}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Holiday
              </button>
            </div>
            
            {/* Holiday list */}
            <div className={`border rounded-lg overflow-hidden ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <table className={`min-w-full divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                <thead className={theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}>
                  <tr>
                    <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                      Holiday Name
                    </th>
                    <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                      Date
                    </th>
                    <th scope="col" className={`px-6 py-3 text-right text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700 bg-gray-900' : 'divide-gray-200 bg-white'}`}>
                  {settings.holidays.map((holiday) => (
                    <tr key={holiday.id}>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
                        {holiday.name}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
                        {new Date(holiday.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {!holiday.isDefault && (
                          <button
                            onClick={() => removeHoliday(holiday.id)}
                            className={`${theme === 'dark' ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-900'}`}
                          >
                            Remove
                          </button>
                        )}
                        {holiday.isDefault && (
                          <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>Default</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              US Federal holidays are included by default. You can add custom holidays as needed.
            </p>
          </div>
          
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Save & Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectSettingsModal;
