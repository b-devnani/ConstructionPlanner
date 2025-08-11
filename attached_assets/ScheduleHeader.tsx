
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Moon, Sun, RefreshCw, Settings, Calendar } from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GroupByField, SortField } from '@/types/schedule';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from 'sonner';

interface ScheduleHeaderProps {
  onSortChange: (field: SortField) => void;
  onGroupChange: (field: GroupByField) => void;
  onRefresh: () => void;
  onNonWorkingDaysChange: (days: number[]) => void;
  onFirstDayOfWeekChange: (firstDay: 0 | 1) => void;
  sortField: SortField;
  groupField: GroupByField;
  nonWorkingDays: number[]; // 0 = Sunday, 1 = Monday, etc.
  firstDayOfWeek: 0 | 1; // 0 = Sunday, 1 = Monday
}

const ScheduleHeader = ({ 
  onSortChange, 
  onGroupChange, 
  onRefresh,
  onNonWorkingDaysChange,
  onFirstDayOfWeekChange,
  sortField,
  groupField,
  nonWorkingDays = [0, 6], // Default to weekends (Sunday, Saturday)
  firstDayOfWeek = 0 // Default to Sunday
}: ScheduleHeaderProps) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [workingDays, setWorkingDays] = useState<{[key: number]: boolean}>({
    0: !nonWorkingDays.includes(0), // Sunday
    1: !nonWorkingDays.includes(1), // Monday
    2: !nonWorkingDays.includes(2), // Tuesday
    3: !nonWorkingDays.includes(3), // Wednesday
    4: !nonWorkingDays.includes(4), // Thursday
    5: !nonWorkingDays.includes(5), // Friday
    6: !nonWorkingDays.includes(6), // Saturday
  });

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    const htmlElement = document.documentElement;
    if (!isDarkMode) {
      htmlElement.classList.add('dark');
    } else {
      htmlElement.classList.remove('dark');
    }
  };

  const handleWorkingDayChange = (day: number, isChecked: boolean) => {
    setWorkingDays(prev => ({
      ...prev,
      [day]: isChecked
    }));
  };

  const handleFirstDayOfWeekChange = (value: string) => {
    const newFirstDay = value === 'monday' ? 1 : 0;
    onFirstDayOfWeekChange(newFirstDay as 0 | 1);
  };

  const saveSettings = () => {
    const newNonWorkingDays = Object.entries(workingDays)
      .filter(([_, isWorking]) => !isWorking)
      .map(([day]) => parseInt(day));
    
    onNonWorkingDaysChange(newNonWorkingDays);
    setSettingsOpen(false);
    toast.success('Settings saved', {
      description: 'Working days and calendar settings have been updated'
    });
  };

  const handleSortChange = (value: SortField) => {
    if (value !== sortField) {
      onSortChange(value);
    }
  };

  const handleGroupChange = (value: GroupByField) => {
    if (value !== groupField) {
      onGroupChange(value);
    }
  };

  return (
    <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-construction-border dark:border-gray-700">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h1 className="text-xl font-bold text-construction-blue dark:text-blue-300">Construction Schedule</h1>
          <div className="bg-construction-blue text-white rounded-md px-2 py-1 text-sm">
            Three Week Look Ahead
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleDarkMode}
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </Button>
          
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                aria-label="Settings"
              >
                <Settings size={20} />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Project Settings</DialogTitle>
                <DialogDescription>
                  Configure your construction schedule settings
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="projectName" className="text-right">
                    Project Name
                  </Label>
                  <Input
                    id="projectName"
                    defaultValue="Construction Project"
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="projectCode" className="text-right">
                    Project Code
                  </Label>
                  <Input
                    id="projectCode"
                    defaultValue="CONST-001"
                    className="col-span-3"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="firstDayOfWeek" className="text-right">
                    First Day of Week
                  </Label>
                  <Select
                    value={firstDayOfWeek === 1 ? 'monday' : 'sunday'}
                    onValueChange={handleFirstDayOfWeekChange}
                  >
                    <SelectTrigger id="firstDayOfWeek" className="col-span-3">
                      <SelectValue placeholder="Select first day of week" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sunday">Sunday</SelectItem>
                      <SelectItem value="monday">Monday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label className="text-right pt-2">
                    Working Days
                  </Label>
                  <div className="col-span-3 space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="monday" 
                        checked={workingDays[1]} 
                        onCheckedChange={(checked) => handleWorkingDayChange(1, checked === true)}
                      />
                      <Label htmlFor="monday">Monday</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="tuesday" 
                        checked={workingDays[2]} 
                        onCheckedChange={(checked) => handleWorkingDayChange(2, checked === true)}
                      />
                      <Label htmlFor="tuesday">Tuesday</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="wednesday" 
                        checked={workingDays[3]} 
                        onCheckedChange={(checked) => handleWorkingDayChange(3, checked === true)}
                      />
                      <Label htmlFor="wednesday">Wednesday</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="thursday" 
                        checked={workingDays[4]} 
                        onCheckedChange={(checked) => handleWorkingDayChange(4, checked === true)}
                      />
                      <Label htmlFor="thursday">Thursday</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="friday" 
                        checked={workingDays[5]} 
                        onCheckedChange={(checked) => handleWorkingDayChange(5, checked === true)}
                      />
                      <Label htmlFor="friday">Friday</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="saturday" 
                        checked={workingDays[6]} 
                        onCheckedChange={(checked) => handleWorkingDayChange(6, checked === true)}
                      />
                      <Label htmlFor="saturday">Saturday</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="sunday" 
                        checked={workingDays[0]} 
                        onCheckedChange={(checked) => handleWorkingDayChange(0, checked === true)}
                      />
                      <Label htmlFor="sunday">Sunday</Label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="autoRefresh" className="text-right">
                    Auto Refresh
                  </Label>
                  <Switch id="autoRefresh" defaultChecked={false} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSettingsOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={saveSettings}>
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-2 flex flex-wrap items-center justify-between border-t border-construction-border dark:border-gray-700">
        <div className="flex space-x-2 my-1">
          <Button variant="outline" className="text-sm">
            <span className="mr-1">←</span> Previous
          </Button>
          <Button variant="default" className="bg-construction-blue text-white hover:bg-blue-700 text-sm">
            Today
          </Button>
          <Button variant="outline" className="text-sm">
            Next <span className="ml-1">→</span>
          </Button>
        </div>
        
        <div className="flex space-x-3 my-1">
          <Button 
            variant="outline" 
            className="flex items-center text-sm"
            onClick={onRefresh}
          >
            <RefreshCw size={16} className="mr-1" /> Refresh
          </Button>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm dark:text-gray-300">Sort By:</span>
            <Select 
              value={sortField} 
              onValueChange={handleSortChange}
            >
              <SelectTrigger className="w-36 h-9 text-sm">
                <SelectValue placeholder="Start Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="startDate">Start Date</SelectItem>
                <SelectItem value="endDate">End Date</SelectItem>
                <SelectItem value="duration">Duration</SelectItem>
                <SelectItem value="location">Location</SelectItem>
                <SelectItem value="contractor">Contractor</SelectItem>
                <SelectItem value="name">Activity Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm dark:text-gray-300">Group By:</span>
            <Select 
              value={groupField} 
              onValueChange={handleGroupChange}
            >
              <SelectTrigger className="w-36 h-9 text-sm">
                <SelectValue placeholder="Contractor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contractor">Contractor</SelectItem>
                <SelectItem value="location">Location</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </header>
  );
};

export default ScheduleHeader;
