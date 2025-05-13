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
      <Card className="mb-4">
        <CardContent className="p-4">
          <h3 className="font-quicksand font-semibold text-lg text-foreground mb-3">
            Filters
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
                    className={`text-xl ${selectedMood === mood.value ? 'scale-125 transition-transform' : 'opacity-70'}`}
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
                    className={`text-xs ${tag.class} px-2 py-1 rounded-full cursor-pointer hover:opacity-80`}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="bg-primary/5 rounded-[0.75rem] p-4">
        <div className="flex items-center space-x-2 mb-3">
          <Feather className="h-4 w-4 text-primary" />
          <h3 className="font-quicksand font-semibold text-foreground">
            Flappy Says
          </h3>
        </div>
        <p className="text-sm text-foreground/80 italic">
          "I notice that your writing carries the rhythm of ocean waves. Sometimes crashing with energy, sometimes gentle and reflective. Both are beautiful parts of your journey."
        </p>
      </div>
    </>
  );
}
