import { useState } from 'react';
import { Activity } from '@/types/schedule';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { contractors, locations } from '@/data/sampleData';
import { calculateDuration, isValidDateFormat } from '@/utils/dateUtils';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AddActivityFormProps {
  onAddActivity: (activity: Activity) => void;
}

interface ActivityFormState extends Partial<Activity> {
  error?: string;
  loading: boolean;
  startDateError?: string;
  endDateError?: string;
}

const AddActivityForm = ({ onAddActivity }: AddActivityFormProps) => {
  const [open, setOpen] = useState(false);
  const [activity, setActivity] = useState<ActivityFormState>({
    name: '',
    location: '',
    contractor: '',
    startDate: '',
    endDate: '',
    duration: 0,
    loading: false,
    error: undefined,
    startDateError: undefined,
    endDateError: undefined
  });

  const handleChange = (field: keyof Activity, value: string | number) => {
    const newActivity = { ...activity, [field]: value } as ActivityFormState;

    // Clear errors when changing values
    if (field === 'startDate') {
      newActivity.startDateError = undefined;
    }
    if (field === 'endDate') {
      newActivity.endDateError = undefined;
    }

    // Update duration if both dates are valid
    if ((field === 'startDate' || field === 'endDate') && 
        newActivity.startDate && newActivity.endDate) {
      try {
        const duration = calculateDuration(
          newActivity.startDate as string, 
          newActivity.endDate as string
        );
        newActivity.duration = duration;
      } catch (error) {
        newActivity.error = 'Failed to calculate duration';
      }
    }
    
    setActivity(newActivity);
  };

  const validateDates = () => {
    const errors: Partial<ActivityFormState> = {};
    
    if (activity.startDate && !isValidDateFormat(activity.startDate)) {
      errors.startDateError = 'Invalid start date format';
    }
    
    if (activity.endDate && !isValidDateFormat(activity.endDate)) {
      errors.endDateError = 'Invalid end date format';
    }
    
    if (activity.startDate && activity.endDate) {
      const start = new Date(activity.startDate);
      const end = new Date(activity.endDate);
      if (start >= end) {
        errors.endDateError = 'End date must be after start date';
      }
    }
    
    return errors;
  };

  const handleSubmit = async () => {
    const dateErrors = validateDates();
    
    if (Object.keys(dateErrors).length > 0) {
      setActivity(prev => ({ ...prev, ...dateErrors }));
      return;
    }

    if (!isValid()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setActivity(prev => ({ ...prev, loading: true }));
      
      // Generate a more robust ID using timestamp and random number
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 5);
      const newId = `act-${timestamp}-${random}`;

      const newActivity: Activity = {
        ...activity as Activity,
        id: newId,
        parentActivityId: `group-${activity.contractor?.toLowerCase().split(' ')[0] || 'ungrouped'}`
      };

      onAddActivity(newActivity);
      toast.success('Activity added successfully');
      
      // Reset form with delay to show success message
      setTimeout(() => {
        setActivity({
          name: '',
          location: '',
          contractor: '',
          startDate: '',
          endDate: '',
          duration: 0,
          loading: false,
          error: undefined,
          startDateError: undefined,
          endDateError: undefined
        });
        setOpen(false);
      }, 500);
    } catch (error) {
      console.error('Error adding activity:', error);
      toast.error('Failed to add activity', {
        description: error instanceof Error ? error.message : 'An unexpected error occurred'
      });
      setActivity(prev => ({ ...prev, loading: false }));
    }
  };

  const isValid = () => {
    return (
      activity.name &&
      activity.location &&
      activity.contractor &&
      activity.startDate &&
      activity.endDate &&
      activity.duration > 0
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="fixed bottom-6 right-6 w-12 h-12 rounded-full shadow-lg bg-green-500 hover:bg-green-600 text-white">
          <Plus size={24} />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Activity</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Activity Name
            </Label>
            <Input
              id="name"
              value={activity.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="col-span-3"
              placeholder="Enter activity name"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="location" className="text-right">
              Location
            </Label>
            <div className="col-span-3">
              <Select 
                value={activity.location} 
                onValueChange={(value) => handleChange('location', value)}
                required
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="contractor" className="text-right">
              Contractor
            </Label>
            <div className="col-span-3">
              <Select 
                value={activity.contractor} 
                onValueChange={(value) => handleChange('contractor', value)}
                required
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select contractor" />
                </SelectTrigger>
                <SelectContent>
                  {contractors.map((contractor) => (
                    <SelectItem key={contractor.id} value={contractor.name}>
                      {contractor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="startDate" className="text-right">
              Start Date
            </Label>
            <div className="col-span-3">
              <Input
                id="startDate"
                type="date"
                value={activity.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
                className={cn(
                  "w-full",
                  activity.startDateError && "border-red-500"
                )}
              />
              {activity.startDateError && (
                <p className="text-red-500 text-sm mt-1">{activity.startDateError}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="endDate" className="text-right">
              End Date
            </Label>
            <div className="col-span-3">
              <Input
                id="endDate"
                type="date"
                value={activity.endDate}
                onChange={(e) => handleChange('endDate', e.target.value)}
                className={cn(
                  "w-full",
                  activity.endDateError && "border-red-500"
                )}
              />
              {activity.endDateError && (
                <p className="text-red-500 text-sm mt-1">{activity.endDateError}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="duration" className="text-right">
              Duration
            </Label>
            <div className="col-span-3 flex items-center space-x-2">
              <Input
                id="duration"
                type="text"
                value={activity.duration || ''}
                readOnly
                className="bg-gray-100"
              />
              <span>days</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => {
              setActivity({
                name: '',
                location: '',
                contractor: '',
                startDate: '',
                endDate: '',
                duration: 0,
                loading: false,
                error: undefined,
                startDateError: undefined,
                endDateError: undefined
              });
              setOpen(false);
            }}
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleSubmit}
            disabled={!isValid() || activity.loading}
            className={cn(
              "w-full",
              activity.loading && "opacity-50 cursor-not-allowed"
            )}
          >
            {activity.loading ? 'Adding...' : 'Add Activity'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddActivityForm;
