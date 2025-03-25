'use client';

import React, { useState } from 'react';
import { Activity, Contractor, Location } from '@/lib/types';
import { calculateDuration } from '@/lib/dateUtils';

interface ActivityFormProps {
  locations: Location[];
  contractors: Contractor[];
  onSubmit: (activity: Omit<Activity, 'id'>) => void;
  initialActivity?: Activity;
  onCancel: () => void;
}

const ActivityForm: React.FC<ActivityFormProps> = ({
  locations,
  contractors,
  onSubmit,
  initialActivity,
  onCancel
}) => {
  const [name, setName] = useState(initialActivity?.name || '');
  const [locationId, setLocationId] = useState(initialActivity?.location_id || locations[0]?.id || 0);
  const [contractorId, setContractorId] = useState(initialActivity?.contractor_id || contractors[0]?.id || 0);
  const [startDate, setStartDate] = useState(initialActivity?.start_date || new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(initialActivity?.end_date || new Date().toISOString().split('T')[0]);
  const [duration, setDuration] = useState(initialActivity?.duration || 1);

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = e.target.value;
    setStartDate(newStartDate);
    
    // Recalculate duration when start date changes
    if (endDate) {
      setDuration(calculateDuration(newStartDate, endDate));
    }
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEndDate = e.target.value;
    setEndDate(newEndDate);
    
    // Recalculate duration when end date changes
    if (startDate) {
      setDuration(calculateDuration(startDate, newEndDate));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const activity: Omit<Activity, 'id'> = {
      name,
      location_id: locationId,
      contractor_id: contractorId,
      start_date: startDate,
      end_date: endDate,
      duration
    };
    
    onSubmit(activity);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4">
        {initialActivity ? 'Edit Activity' : 'Add New Activity'}
      </h2>
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
              Activity Name
            </label>
            <input
              id="name"
              type="text"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="location">
              Location
            </label>
            <select
              id="location"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={locationId}
              onChange={(e) => setLocationId(Number(e.target.value))}
              required
            >
              {locations.map(location => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="contractor">
              Responsible Contractor
            </label>
            <select
              id="contractor"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={contractorId}
              onChange={(e) => setContractorId(Number(e.target.value))}
              required
            >
              {contractors.map(contractor => (
                <option key={contractor.id} value={contractor.id}>
                  {contractor.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="startDate">
              Start Date
            </label>
            <input
              id="startDate"
              type="date"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={startDate}
              onChange={handleStartDateChange}
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="endDate">
              End Date
            </label>
            <input
              id="endDate"
              type="date"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={endDate}
              onChange={handleEndDateChange}
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="duration">
              Duration (days)
            </label>
            <input
              id="duration"
              type="number"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              min="1"
              required
              readOnly
            />
          </div>
        </div>
        
        <div className="flex justify-end space-x-2 mt-6">
          <button
            type="button"
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {initialActivity ? 'Update' : 'Add'} Activity
          </button>
        </div>
      </form>
    </div>
  );
};

export default ActivityForm;
