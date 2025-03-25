'use client';

import React, { useState, useEffect } from 'react';
import { Activity, Location, Contractor } from '@/lib/types';
import { useTheme } from '@/lib/ThemeContext';
import { useProjectSettings } from '@/lib/ProjectSettingsContext';

interface ActivityFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  activity: Activity | null;
  onAddActivity: (activity: Omit<Activity, 'id'>) => void;
  onEditActivity: (activityId: number, field: keyof Activity, value: string | number) => void;
  locations: Location[];
  contractors: Contractor[];
}

const ActivityFormModal: React.FC<ActivityFormModalProps> = ({
  isOpen,
  onClose,
  activity,
  onAddActivity,
  onEditActivity,
  locations,
  contractors
}) => {
  const { theme } = useTheme();
  const { calculateWorkingDays } = useProjectSettings();
  
  const [formValues, setFormValues] = useState<Omit<Activity, 'id'>>({
    name: '',
    location: '',
    contractor: '',
    start_date: '',
    end_date: '',
    duration: 0
  });
  
  // Set initial form values when activity changes
  useEffect(() => {
    if (activity) {
      setFormValues({
        name: activity.name,
        location: activity.location,
        contractor: activity.contractor,
        start_date: activity.start_date,
        end_date: activity.end_date,
        duration: activity.duration
      });
    } else {
      // Default values for new activity
      const today = new Date().toISOString().split('T')[0];
      setFormValues({
        name: '',
        location: locations.length > 0 ? locations[0].name : '',
        contractor: contractors.length > 0 ? contractors[0].name : '',
        start_date: today,
        end_date: today,
        duration: 1
      });
    }
  }, [activity, locations, contractors]);
  
  // Handle form input changes
  const handleInputChange = (field: keyof Omit<Activity, 'id' | 'duration'>, value: string) => {
    setFormValues(prev => {
      const newValues = { ...prev, [field]: value };
      
      // Update duration when start_date or end_date changes
      if (field === 'start_date' || field === 'end_date') {
        const workingDays = calculateWorkingDays(
          field === 'start_date' ? value : prev.start_date,
          field === 'end_date' ? value : prev.end_date
        );
        newValues.duration = workingDays;
      }
      
      return newValues;
    });
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formValues.name || !formValues.location || !formValues.contractor || !formValues.start_date || !formValues.end_date) {
      return;
    }
    
    if (activity) {
      // Update existing activity
      Object.entries(formValues).forEach(([key, value]) => {
        onEditActivity(activity.id, key as keyof Activity, value);
      });
    } else {
      // Create new activity
      onAddActivity(formValues);
    }
    
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
      <div className={`${theme === 'dark' ? 'bg-gray-850' : 'bg-white'} rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto`}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">{activity ? 'Edit Activity' : 'Add New Activity'}</h2>
            <button 
              onClick={onClose}
              className={`${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="mb-4">
                <label 
                  className={`block ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} text-sm font-bold mb-2`} 
                  htmlFor="name"
                >
                  Activity Name
                </label>
                <input
                  id="name"
                  type="text"
                  className={`shadow appearance-none border rounded w-full py-2 px-3 ${
                    theme === 'dark' ? 'text-white bg-gray-800 border-gray-700' : 'text-gray-700'
                  } leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  value={formValues.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </div>
              
              <div className="mb-4">
                <label 
                  className={`block ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} text-sm font-bold mb-2`} 
                  htmlFor="location"
                >
                  Location
                </label>
                <select
                  id="location"
                  className={`shadow appearance-none border rounded w-full py-2 px-3 ${
                    theme === 'dark' ? 'text-white bg-gray-800 border-gray-700' : 'text-gray-700'
                  } leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  value={formValues.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  required
                >
                  <option value="">Select Location</option>
                  {locations.map(location => (
                    <option key={location.id} value={location.name}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="mb-4">
                <label 
                  className={`block ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} text-sm font-bold mb-2`} 
                  htmlFor="contractor"
                >
                  Responsible Contractor
                </label>
                <select
                  id="contractor"
                  className={`shadow appearance-none border rounded w-full py-2 px-3 ${
                    theme === 'dark' ? 'text-white bg-gray-800 border-gray-700' : 'text-gray-700'
                  } leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  value={formValues.contractor}
                  onChange={(e) => handleInputChange('contractor', e.target.value)}
                  required
                >
                  <option value="">Select Contractor</option>
                  {contractors.map(contractor => (
                    <option key={contractor.id} value={contractor.name}>
                      {contractor.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="mb-4">
                <label 
                  className={`block ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} text-sm font-bold mb-2`} 
                  htmlFor="startDate"
                >
                  Start Date
                </label>
                <input
                  id="startDate"
                  type="date"
                  className={`shadow appearance-none border rounded w-full py-2 px-3 ${
                    theme === 'dark' ? 'text-white bg-gray-800 border-gray-700' : 'text-gray-700'
                  } leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  value={formValues.start_date}
                  onChange={(e) => handleInputChange('start_date', e.target.value)}
                  required
                />
              </div>
              
              <div className="mb-4">
                <label 
                  className={`block ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} text-sm font-bold mb-2`} 
                  htmlFor="endDate"
                >
                  End Date
                </label>
                <input
                  id="endDate"
                  type="date"
                  className={`shadow appearance-none border rounded w-full py-2 px-3 ${
                    theme === 'dark' ? 'text-white bg-gray-800 border-gray-700' : 'text-gray-700'
                  } leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  value={formValues.end_date}
                  onChange={(e) => handleInputChange('end_date', e.target.value)}
                  required
                />
              </div>
              
              <div className="mb-4">
                <label 
                  className={`block ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} text-sm font-bold mb-2`} 
                  htmlFor="duration"
                >
                  Duration (days)
                </label>
                <input
                  id="duration"
                  type="number"
                  className={`shadow appearance-none border rounded w-full py-2 px-3 ${
                    theme === 'dark' ? 'text-white bg-gray-900 border-gray-700' : 'text-gray-700 bg-gray-100'
                  } leading-tight focus:outline-none cursor-not-allowed`}
                  value={formValues.duration}
                  readOnly
                />
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                  Duration is calculated automatically based on working days
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2 ${
                  theme === 'dark' ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                } rounded`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                {activity ? 'Update Activity' : 'Add Activity'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ActivityFormModal;
