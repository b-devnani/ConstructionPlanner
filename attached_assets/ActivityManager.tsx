'use client';

import React, { useState } from 'react';
import { Activity, Contractor, Location } from '@/lib/types';
import ActivityForm from './ActivityForm';

interface ActivityManagerProps {
  activities: Activity[];
  locations: Location[];
  contractors: Contractor[];
  onAddActivity: (activity: Omit<Activity, 'id'>) => Promise<void>;
  onUpdateActivity: (id: number, activity: Partial<Activity>) => Promise<void>;
  onDeleteActivity: (id: number) => Promise<void>;
}

const ActivityManager: React.FC<ActivityManagerProps> = ({
  activities,
  locations,
  contractors,
  onAddActivity,
  onUpdateActivity,
  onDeleteActivity
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  const handleAddClick = () => {
    setEditingActivity(null);
    setShowForm(true);
  };

  const handleEditClick = (activity: Activity) => {
    setEditingActivity(activity);
    setShowForm(true);
  };

  const handleFormSubmit = async (activityData: Omit<Activity, 'id'>) => {
    if (editingActivity) {
      await onUpdateActivity(editingActivity.id, activityData);
    } else {
      await onAddActivity(activityData);
    }
    setShowForm(false);
    setEditingActivity(null);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingActivity(null);
  };

  const handleDeleteClick = async (id: number) => {
    if (confirm('Are you sure you want to delete this activity?')) {
      await onDeleteActivity(id);
    }
  };

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Activities</h2>
        <button
          onClick={handleAddClick}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Add Activity
        </button>
      </div>

      {showForm && (
        <div className="mb-6">
          <ActivityForm
            locations={locations}
            contractors={contractors}
            onSubmit={handleFormSubmit}
            initialActivity={editingActivity || undefined}
            onCancel={handleFormCancel}
          />
        </div>
      )}

      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Activity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contractor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Start Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                End Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {activities.map((activity) => (
              <tr key={activity.id}>
                <td className="px-6 py-4 whitespace-nowrap">{activity.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{activity.location?.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{activity.contractor?.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{activity.start_date}</td>
                <td className="px-6 py-4 whitespace-nowrap">{activity.end_date}</td>
                <td className="px-6 py-4 whitespace-nowrap">{activity.duration} days</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleEditClick(activity)}
                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteClick(activity.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ActivityManager;
