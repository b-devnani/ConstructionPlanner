import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Activity, GroupByField } from '@/types/schedule';
import { format, parseISO, startOfDay } from 'date-fns';
import { 
  isDateInRange, 
  formatDate, 
  calculateDuration as calcDuration, 
  updateEndDateFromDuration as updateEndDate,
  isValidDateFormat,
  convertToInternalDateFormat,
  getDisplayDate,
  getDayNames
} from '@/utils/dateUtils';
import { getActivityColor } from '@/data/sampleData';
import { Input } from '@/components/ui/input';
import { Save, X, Check, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ScheduleGridProps {
  activities: Activity[];
  dates: Date[];
  currentWeekDates: Date[];
  nextWeekDates: Date[];
  nextTwoWeeksDates: Date[];
  monthYear: string;
  groupBy: GroupByField;
  nonWorkingDays: number[]; // 0 = Sunday, 1 = Monday, etc.
  firstDayOfWeek: 0 | 1; // 0 = Sunday, 1 = Monday
  onActivityUpdate?: (updatedActivity: Activity) => void;
  onActivityAdd?: (newActivity: Activity) => void;
}

const ScheduleGrid = ({ 
  activities, 
  dates, 
  currentWeekDates,
  nextWeekDates,
  nextTwoWeeksDates,
  monthYear,
  groupBy,
  nonWorkingDays = [0, 6], // Default to weekends (Sunday, Saturday)
  firstDayOfWeek = 0, // Default to Sunday
  onActivityUpdate,
  onActivityAdd
}: ScheduleGridProps) => {
  const [editingActivity, setEditingActivity] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Activity>>({});
  const [editingField, setEditingField] = useState<keyof Activity | null>(null);
  const [dateErrors, setDateErrors] = useState<{
    startDate?: string;
    endDate?: string;
  }>({});
  const [isSettingDateRange, setIsSettingDateRange] = useState(false);
  const [newActivity, setNewActivity] = useState<Activity | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  
  const dayAbbreviations = getDayNames(firstDayOfWeek);
  
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingActivity, editingField, newActivity]);
  
  const groupedActivities = useMemo(() => {
    if (groupBy === 'none') {
      return [{ group: 'All Activities', activities }];
    }
    
    const groups: Record<string, Activity[]> = {};
    
    activities.forEach(activity => {
      const groupKey = activity[groupBy];
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(activity);
    });
    
    return Object.keys(groups).map(key => ({
      group: key,
      activities: groups[key]
    }));
  }, [activities, groupBy]);

  const handleEdit = (activity: Activity, field: keyof Activity) => {
    setIsSettingDateRange(false);
    setEditingActivity(activity.id);
    setEditValues({
      ...activity
    });
    setEditingField(field);
    setDateErrors({});
  };

  const calculateDuration = (startDate: string, endDate: string): number => {
    return calcDuration(startDate, endDate, nonWorkingDays);
  };

  const updateDatesFromDuration = (startDate: string, duration: number): string => {
    return updateEndDate(startDate, duration, nonWorkingDays);
  };

  const validateDateEntry = (dateStr: string, field: 'startDate' | 'endDate'): boolean => {
    if (!isValidDateFormat(dateStr)) {
      setDateErrors(prev => ({
        ...prev,
        [field]: "Invalid format (MM/DD/YYYY)"
      }));
      return false;
    }
    
    const internalDate = parseISO(dateStr);
    if (!internalDate) {
      setDateErrors(prev => ({
        ...prev,
        [field]: "Invalid date"
      }));
      return false;
    }
    
    if (field === 'endDate' && editValues.startDate) {
      const startDateObj = parseISO(editValues.startDate as string);
      const endDateObj = internalDate;
      
      if (endDateObj < startDateObj) {
        setDateErrors(prev => ({
          ...prev,
          [field]: "End date must be after start date"
        }));
        return false;
      }
    }
    
    setDateErrors(prev => ({
      ...prev,
      [field]: undefined
    }));
    
    return true;
  };

  const handleSave = useCallback((activity: Activity) => {
    if (editValues) {
      let hasError = false;
      
      if (editingField === 'startDate' || editingField === 'endDate') {
        const field = editingField as 'startDate' | 'endDate';
        const dateValue = editValues[field] as string;
        
        if (dateValue && dateValue.includes('/')) {
          if (!validateDateEntry(dateValue, field)) {
            hasError = true;
          } else {
            const internalDate = parseISO(dateValue);
            if (internalDate) {
              editValues[field] = format(internalDate, 'yyyy-MM-dd');
            } else {
              hasError = true;
            }
          }
        }
      }
      
      if (hasError) {
        return;
      }
      
      // Ensure duration is a number
      const duration = typeof editValues.duration === 'string' 
        ? Number(editValues.duration) 
        : editValues.duration;
      
      const updatedValues = {
        ...editValues,
        duration: editingField === 'duration' && editValues.startDate && editValues.duration
          ? updateEndDate(editValues.startDate, Number(editValues.duration))
          : editValues.startDate && editValues.endDate
            ? calculateDuration(editValues.startDate, editValues.endDate)
            : duration
      };
      
      const updatedActivity = {
        ...activity,
        ...updatedValues
      };
      
      if (newActivity && activity.id === newActivity.id) {
        if (onActivityAdd) {
          const newActivityWithGroup = {
            ...updatedActivity,
            parentActivityId: `group-${updatedActivity.contractor?.toLowerCase().split(' ')[0] || 'ungrouped'}`
          };
          onActivityAdd(newActivityWithGroup as Activity);
          toast.success('Activity added', {
            description: 'The new activity has been added successfully'
          });
          setNewActivity(null);
          setEditingActivity(null);
          setEditingField(null);
          setEditValues({});
          setDateErrors({});
          setIsSettingDateRange(false);
        }
      } else if (onActivityUpdate) {
        onActivityUpdate(updatedActivity as Activity);
        toast.success('Activity updated', {
          description: 'Activity has been updated successfully'
        });
        setEditingActivity(null);
        setEditingField(null);
        setEditValues({});
        setDateErrors({});
        setIsSettingDateRange(false);
      }
    }
  }, [editValues, editingField, newActivity, onActivityAdd, onActivityUpdate, calculateDuration, updateEndDate]);

  const handleCancel = () => {
    setEditingActivity(null);
    setEditingField(null);
    setEditValues({});
    setDateErrors({});
    setIsSettingDateRange(false);
    
    if (newActivity) {
      setNewActivity(null);
    }
  };

  const handleChange = (field: keyof Activity, value: string | number) => {
    setEditValues(prevState => ({
      ...prevState,
      [field]: value
    }));
    
    if (field === 'duration' && editValues.startDate) {
      const numDuration = Number(value);
      if (!isNaN(numDuration) && numDuration > 0) {
        const newEndDate = updateDatesFromDuration(editValues.startDate as string, numDuration);
        setEditValues(prevState => ({
          ...prevState,
          endDate: newEndDate
        }));
      }
    }
  };

  const handleCellClick = useCallback((activity: Activity, date: Date) => {
    if (nonWorkingDays.includes(date.getDay())) {
      toast.error('Cannot select non-working days', {
        description: 'Please select a working day'
      });
      return;
    }

    const normalizedDate = startOfDay(date);
    const formattedDate = format(normalizedDate, 'yyyy-MM-dd');

    if (isSettingDateRange && editingActivity === activity.id) {
      const newValues = {
        ...editValues,
        endDate: formattedDate
      };

      try {
        if (newValues.startDate && new Date(formattedDate) >= new Date(newValues.startDate)) {
          setEditValues(newValues);
          setDateErrors({});
          setIsSettingDateRange(false);
          
          // Debounce the success message
          setTimeout(() => {
            toast.success('Date range updated successfully');
          }, 500);
        } else {
          throw new Error('End date must be after start date');
        }
      } catch (error) {
        toast.error('Invalid date range', {
          description: error instanceof Error ? error.message : 'End date must be after start date'
        });
        handleCancel();
      }
    } else {
      setEditingActivity(activity.id);
      setEditingField('startDate');
      setIsSettingDateRange(true);
      
      try {
        setEditValues({
          ...activity,
          startDate: formattedDate
        });
        
        toast.info('Select end date', {
          description: 'Now click on the end date for this activity'
        });
      } catch (error) {
        toast.error('Error setting start date', {
          description: error instanceof Error ? error.message : 'Failed to set start date'
        });
        handleCancel();
      }
    }
  }, [nonWorkingDays, editValues, isSettingDateRange, editingActivity]);

  const handleActivityUpdate = useCallback((activity: Activity) => {
    try {
      if (onActivityUpdate) {
        onActivityUpdate(activity);
        toast.success('Activity updated successfully');
      }
    } catch (error) {
      toast.error('Failed to update activity', {
        description: error instanceof Error ? error.message : 'Failed to update activity'
      });
    }
  }, [onActivityUpdate]);

  const handleKeyDown = (e: React.KeyboardEvent, activity: Activity, field: keyof Activity) => {
    if (e.key === 'Enter') {
      if (field === 'startDate' || field === 'endDate') {
        const dateValue = editValues[field] as string;
        if (dateValue && validateDateEntry(dateValue, field as 'startDate' | 'endDate')) {
          handleSave(activity);
        }
      } else {
        handleSave(activity);
      }
    } else if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      
      const fieldOrder: (keyof Activity)[] = ['name', 'location', 'contractor', 'startDate', 'endDate', 'duration'];
      const currentIndex = fieldOrder.indexOf(field);
      const nextIndex = (currentIndex + 1) % fieldOrder.length;
      
      if (field === 'startDate' || field === 'endDate') {
        const dateValue = editValues[field] as string;
        if (dateValue && !validateDateEntry(dateValue, field as 'startDate' | 'endDate')) {
          return;
        }
      }
      
      const currentValue = editValues[field];
      if (field === 'startDate' || field === 'endDate') {
        const dateStr = currentValue as string;
        if (dateStr && dateStr.includes('/')) {
          const internalDate = parseISO(dateStr);
          if (internalDate) {
            editValues[field] = format(internalDate, 'yyyy-MM-dd');
          }
        }
      }
      
      setEditingField(fieldOrder[nextIndex]);
    }
  };

  const renderDateInput = (activity: Activity, field: 'startDate' | 'endDate') => {
    let displayDate = '';
    
    const dateValue = (editValues[field] as string) || (activity[field] as string);
    
    if (dateValue && typeof dateValue === 'string') {
      if (dateValue.includes('/')) {
        displayDate = dateValue;
      } else {
        displayDate = getDisplayDate(dateValue);
      }
    }
    
    return (
      <div className="relative w-full h-full flex items-center">
        <Input 
          ref={inputRef}
          value={displayDate}
          onChange={(e) => handleChange(field, e.target.value)}
          className={cn(
            "h-full w-full px-2 py-1 border-0 focus:ring-0 focus-visible:ring-0 rounded-none bg-white dark:bg-gray-800",
            dateErrors[field] ? "outline outline-2 outline-red-500" : "outline outline-2 outline-blue-500"
          )}
          placeholder="MM/DD/YYYY"
          onBlur={() => validateDateEntry(displayDate, field)}
          onKeyDown={(e) => handleKeyDown(e, activity, field)}
        />
        {dateErrors[field] && (
          <div className="absolute right-0 top-full z-10 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs p-1 rounded shadow-md whitespace-nowrap">
            {dateErrors[field]}
          </div>
        )}
        <div className="absolute right-1 flex space-x-1">
          {dateErrors[field] ? (
            <button 
              className="text-red-500 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20" 
              onClick={handleCancel}
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <button 
              className="text-green-500 p-1 rounded-full hover:bg-green-50 dark:hover:bg-green-900/20" 
              onClick={() => handleSave(activity)}
            >
              <Check className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderCellContent = useCallback((activity: Activity, date: Date) => {
    const isWorkingDay = !nonWorkingDays.includes(date.getDay());
    const isInRange = activity.startDate && activity.endDate 
      ? isDateInRange(date, activity.startDate, activity.endDate)
      : false;
    const isStartDate = activity.startDate === format(date, 'yyyy-MM-dd');
    const isEndDate = activity.endDate === format(date, 'yyyy-MM-dd');
    const isEditing = editingActivity === activity.id;

    const handleClick = () => {
      if (!isWorkingDay) {
        toast.error('Cannot select non-working days', {
          description: 'Please select a working day'
        });
        return;
      }

      if (isEditing && editingField === 'startDate') {
        const formattedDate = format(date, 'yyyy-MM-dd');
        setEditValues(prev => ({
          ...prev,
          startDate: formattedDate
        }));
        setIsSettingDateRange(true);
        
        toast.info('Select end date', {
          description: 'Now click on the end date for this activity'
        });
      } else if (isEditing && editingField === 'endDate' && isSettingDateRange) {
        const formattedDate = format(date, 'yyyy-MM-dd');
        setEditValues(prev => ({
          ...prev,
          endDate: formattedDate
        }));
        setIsSettingDateRange(false);
        
        // Update duration after setting end date
        const startDateObj = parseISO(prev.startDate as string);
        const endDateObj = parseISO(formattedDate);
        const duration = calculateDuration(
          prev.startDate as string,
          formattedDate,
          nonWorkingDays
        );
        setEditValues(prev => ({
          ...prev,
          duration
        }));
      }
    };

    return (
      <div
        className={cn(
          'h-full w-full flex items-center justify-center cursor-pointer',
          isWorkingDay ? 'opacity-100' : 'opacity-50 cursor-not-allowed',
          isInRange ? 'bg-blue-100 dark:bg-blue-900/20' : '',
          isStartDate ? 'bg-blue-200 dark:bg-blue-900/30' : '',
          isEndDate ? 'bg-blue-300 dark:bg-blue-900/40' : '',
          isEditing ? 'hover:bg-blue-50 dark:hover:bg-blue-900/10' : '',
          isSettingDateRange ? 'border-2 border-dashed border-blue-500' : ''
        )}
        onClick={handleClick}
        title={format(date, 'MM/dd/yyyy')}
      >
        {isWorkingDay ? format(date, 'd') : ''}
      </div>
    );
  }, [nonWorkingDays, editingActivity, editingField, isSettingDateRange, calculateDuration]);

  const renderCell = useCallback((activity: Activity, date: Date) => {
    return (
      <div className="relative h-full w-full">
        {renderCellContent(activity, date)}
      </div>
    );
  }, [renderCellContent]);

  const isNonWorkingDay = (date: Date): boolean => {
    return nonWorkingDays.includes(date.getDay());
  };

  const getDayLetter = (date: Date): string => {
    const dayIndex = date.getDay();
    const adjustedIndex = firstDayOfWeek === 1 
      ? dayIndex === 0 ? 6 : dayIndex - 1 
      : dayIndex;
    return dayAbbreviations[adjustedIndex];
  };

  const handleAddNewActivity = () => {
    const newId = `new-activity-${Date.now()}`;
    const newDefaultActivity: Activity = {
      id: newId,
      name: '',
      location: '',
      contractor: '',
      startDate: '',
      endDate: '',
      duration: 0
    };
    
    setNewActivity(newDefaultActivity);
    setEditingActivity(newId);
    setEditingField('name');
    setEditValues({
      ...newDefaultActivity
    });
    setIsSettingDateRange(false);
    
    toast.info('Adding new activity', {
      description: 'Fill in the activity details and save'
    });
  };

  return (
    <div className="container-fluid p-0 overflow-x-auto">
      <div className="w-full min-w-[1200px]">
        <div className="grid grid-cols-[minmax(200px,1fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(100px,0.8fr)_minmax(100px,0.8fr)_minmax(100px,0.8fr)_5fr] border-b border-gray-200 dark:border-gray-700">
          <div className="col-span-6 bg-gray-100 dark:bg-gray-800 flex items-center justify-between p-2 border-r border-gray-200 dark:border-gray-700">
            <span className="font-medium dark:text-gray-200">TIMELINE</span>
          </div>
          <div className="col-span-1 relative">
            <div className="h-full p-2 text-center font-medium bg-gray-100 dark:bg-gray-800 dark:text-gray-200">
              {monthYear}
            </div>
          </div>
        </div>
          
        <div className="grid grid-cols-[minmax(200px,1fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(100px,0.8fr)_minmax(100px,0.8fr)_minmax(100px,0.8fr)_5fr] border-b border-gray-200 dark:border-gray-700">
          <div className="col-span-1 p-2 font-medium dark:text-gray-200 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">ACTIVITY</div>
          <div className="col-span-1 p-2 font-medium dark:text-gray-200 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">LOCATION</div>
          <div className="col-span-1 p-2 font-medium dark:text-gray-200 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">CONTRACTOR</div>
          <div className="col-span-1 p-2 font-medium dark:text-gray-200 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">START DATE</div>
          <div className="col-span-1 p-2 font-medium dark:text-gray-200 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">END DATE</div>
          <div className="col-span-1 p-2 font-medium dark:text-gray-200 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">DURATION</div>
          
          <div className="col-span-1 grid grid-cols-21">
            <div className="col-span-7 p-2 text-center font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border-r border-gray-200 dark:border-gray-700">
              CURRENT WEEK
            </div>
            <div className="col-span-7 p-2 text-center font-medium bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-r border-gray-200 dark:border-gray-700">
              NEXT WEEK
            </div>
            <div className="col-span-7 p-2 text-center font-medium bg-purple-50 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300">
              NEXT 2 WEEKS
            </div>
          </div>
        </div>
          
        <div className="grid grid-cols-[minmax(200px,1fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(100px,0.8fr)_minmax(100px,0.8fr)_minmax(100px,0.8fr)_5fr] border-b border-gray-200 dark:border-gray-700">
          <div className="col-span-6 border-r border-gray-200 dark:border-gray-700"></div>
          <div className="col-span-1 grid grid-cols-21">
            {dates.map((date, index) => (
              <div 
                key={`day-${index}`} 
                className={cn(
                  "px-0 py-1 text-center text-xs border-r border-gray-200 dark:border-gray-700 dark:text-gray-300",
                  index < 7 ? "bg-blue-50 dark:bg-blue-900/10" : 
                  index < 14 ? "bg-green-50 dark:bg-green-900/10" : 
                  "bg-purple-50 dark:bg-purple-900/10",
                  isNonWorkingDay(date) && "bg-gray-200 dark:bg-gray-700"
                )}
              >
                <div className="font-medium">
                  {getDayLetter(date)}
                </div>
                <div>{format(date, 'd')}</div>
              </div>
            ))}
          </div>
        </div>

        {groupedActivities.map((group, groupIndex) => (
          <div key={`group-${groupIndex}`}>
            {groupBy !== 'none' && (
              <div className="grid grid-cols-[minmax(200px,1fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(100px,0.8fr)_minmax(100px,0.8fr)_minmax(100px,0.8fr)_5fr] border-b border-gray-200 dark:border-gray-700">
                <div className="col-span-7 bg-gray-100 dark:bg-gray-800 p-2 font-medium sticky left-0 dark:text-gray-200">
                  {group.group}
                </div>
              </div>
            )}
            
            {group.activities.map((activity) => (
              <div 
                key={activity.id} 
                className="grid grid-cols-[minmax(200px,1fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(100px,0.8fr)_minmax(100px,0.8fr)_minmax(100px,0.8fr)_5fr] border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-800/50"
              >
                <div className="border-r border-gray-200 dark:border-gray-700 min-h-[48px] relative">
                  {renderCellContent(activity, 'name')}
                </div>
                <div className="border-r border-gray-200 dark:border-gray-700 min-h-[48px] relative">
                  {renderCellContent(activity, 'location')}
                </div>
                <div className="border-r border-gray-200 dark:border-gray-700 min-h-[48px] relative">
                  {renderCellContent(activity, 'contractor')}
                </div>
                <div className="border-r border-gray-200 dark:border-gray-700 min-h-[48px] relative">
                  {renderCellContent(activity, 'startDate')}
                </div>
                <div className="border-r border-gray-200 dark:border-gray-700 min-h-[48px] relative">
                  {renderCellContent(activity, 'endDate')}
                </div>
                <div className="border-r border-gray-200 dark:border-gray-700 min-h-[48px] relative">
                  {renderCellContent(activity, 'duration')}
                </div>

                <div className="grid grid-cols-21 min-h-[48px]">
                  {dates.map((date, dateIndex) => (
                    <div 
                      key={`day-${dateIndex}`} 
                      className={cn(
                        "border-r border-gray-200 dark:border-gray-700 h-full cursor-pointer",
                        dateIndex < 7 ? "bg-blue-50/30 dark:bg-blue-900/5" : 
                        dateIndex < 14 ? "bg-green-50/30 dark:bg-green-900/5" : 
                        "bg-purple-50/30 dark:bg-purple-900/5",
                        isNonWorkingDay(date) ? "bg-gray-200 dark:bg-gray-700 cursor-not-allowed" : "hover:bg-gray-100 dark:hover:bg-gray-700",
                        isDateInRange(date, activity.startDate, activity.endDate) && !isNonWorkingDay(date) && `${getActivityColor(activity.contractor)} bg-opacity-70`,
                        isSettingDateRange && editingActivity === activity.id ? 'bg-blue-100 dark:bg-blue-900/20' : ''
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCellClick(activity, date);
                      }}
                    >
                      {renderCell(activity, date)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
        
        {newActivity && (
          <div className="grid grid-cols-[minmax(200px,1fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(100px,0.8fr)_minmax(100px,0.8fr)_minmax(100px,0.8fr)_5fr] border-b border-gray-200 dark:border-gray-700 bg-blue-50/50 dark:bg-blue-900/20">
            <div className="border-r border-gray-200 dark:border-gray-700 min-h-[48px] relative">
              {renderCellContent(newActivity, 'name')}
            </div>
            <div className="border-r border-gray-200 dark:border-gray-700 min-h-[48px] relative">
              {renderCellContent(newActivity, 'location')}
            </div>
            <div className="border-r border-gray-200 dark:border-gray-700 min-h-[48px] relative">
              {renderCellContent(newActivity, 'contractor')}
            </div>
            <div className="border-r border-gray-200 dark:border-gray-700 min-h-[48px] relative">
              {renderCellContent(newActivity, 'startDate')}
            </div>
            <div className="border-r border-gray-200 dark:border-gray-700 min-h-[48px] relative">
              {renderCellContent(newActivity, 'endDate')}
            </div>
            <div className="border-r border-gray-200 dark:border-gray-700 min-h-[48px] relative">
              {renderCellContent(newActivity, 'duration')}
            </div>
            <div className="grid grid-cols-21 min-h-[48px]">
              {dates.map((date, dateIndex) => (
                <div 
                  key={`new-day-${dateIndex}`} 
                  className={cn(
                    "border-r border-gray-200 dark:border-gray-700 h-full cursor-pointer",
                    dateIndex < 7 ? "bg-blue-50/30 dark:bg-blue-900/5" : 
                    dateIndex < 14 ? "bg-green-50/30 dark:bg-green-900/5" : 
                    "bg-purple-50/30 dark:bg-purple-900/5",
                    isNonWorkingDay(date) ? "bg-gray-200 dark:bg-gray-700 cursor-not-allowed" : "hover:bg-gray-100 dark:hover:bg-gray-700",
                    isDateInRange(date, newActivity.startDate, newActivity.endDate) && !isNonWorkingDay(date) && "bg-green-200 dark:bg-green-900/20",
                    isSettingDateRange && editingActivity === newActivity.id ? 'bg-blue-100 dark:bg-blue-900/20' : ''
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCellClick(newActivity, date);
                  }}
                >
                  {renderCell(newActivity, date)}
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-[minmax(200px,1fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(100px,0.8fr)_minmax(100px,0.8fr)_minmax(100px,0.8fr)_5fr] border-b border-gray-200 dark:border-gray-700">
          <div className="col-span-7 p-2 bg-gray-50 dark:bg-gray-900 flex justify-center">
            <Button 
              onClick={handleAddNewActivity}
              variant="outline" 
              className="border-dashed border-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 w-full"
              disabled={!!newActivity}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add New Activity
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleGrid;
