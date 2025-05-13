import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Feather } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function JournalSidebar() {
  const [dateRange, setDateRange] = useState('7days');
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  
  const handleMoodSelect = (mood: string) => {
    setSelectedMood(mood === selectedMood ? null : mood);
  };
  
  const moodOptions = [
    { emoji: '😊', value: 'happy' },
    { emoji: '😌', value: 'calm' },
    { emoji: '😐', value: 'neutral' },
    { emoji: '😔', value: 'sad' },
    { emoji: '😤', value: 'frustrated' },
  ];
  
  const commonTags = [
    { name: '#gratitude', class: 'bg-primary/10 text-primary' },
    { name: '#reflection', class: 'bg-secondary/10 text-secondary' },
    { name: '#goals', class: 'bg-accent/10 text-accent' },
    { name: '#mindfulness', class: 'bg-primary/10 text-primary' },
    { name: '#nature', class: 'bg-accent/10 text-accent' },
  ];
  
  return (
    <>
      <Card className="mb-4 shadow-sm">
        <CardContent className="p-4 overflow-y-auto">
          <h3 className="font-quicksand font-semibold text-lg text-foreground mb-3 flex items-center">
            <span className="mr-2">Filters</span>
            <span className="text-xs text-muted-foreground font-normal">(tap to select)</span>
          </h3>
          <div className="space-y-3">
            <div>
              <Label className="block text-sm text-muted-foreground mb-1">Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-full rounded-[0.75rem] border-border">
                  <SelectValue placeholder="Select a date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Last 7 days</SelectItem>
                  <SelectItem value="30days">Last 30 days</SelectItem>
                  <SelectItem value="year">This year</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="block text-sm text-muted-foreground mb-1">Mood</Label>
              <div className="flex justify-between">
                {moodOptions.map((mood) => (
                  <button
                    key={mood.value}
                    className={`p-2 rounded-full min-w-[40px] min-h-[40px] text-xl 
                      ${selectedMood === mood.value 
                        ? 'bg-background shadow-md scale-110 transition-all duration-200' 
                        : 'opacity-70 hover:opacity-90 hover:bg-background/50 transition-all duration-200'}`
                    }
                    onClick={() => handleMoodSelect(mood.value)}
                    aria-label={`Filter by ${mood.value} mood`}
                  >
                    {mood.emoji}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <Label className="block text-sm text-muted-foreground mb-1">Tags</Label>
              <div className="flex flex-wrap gap-2">
                {commonTags.map((tag, index) => (
                  <span 
                    key={index} 
                    className={`text-sm ${tag.class} px-3 py-1.5 rounded-full cursor-pointer 
                      hover:shadow-sm transition-all duration-200 hover:opacity-90 active:scale-95`}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="bg-primary/5 rounded-[0.75rem] p-5 shadow-sm hover:shadow-md transition-shadow duration-300">
        <div className="flex items-center space-x-2 mb-3">
          <div className="bg-primary/10 rounded-full p-1.5">
            <Feather className="h-5 w-5 text-primary" />
          </div>
          <h3 className="font-quicksand font-semibold text-foreground">
            Flappy Says
          </h3>
        </div>
        <p className="text-sm text-foreground/80 italic leading-relaxed">
          "I notice that your writing carries the rhythm of ocean waves. Sometimes crashing with energy, sometimes gentle and reflective. Both are beautiful parts of your journey."
        </p>
      </div>
    </>
  );
}
