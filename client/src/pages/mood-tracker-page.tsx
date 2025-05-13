import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { CalendarIcon, ArrowDownIcon, ArrowUpIcon, BarChartIcon, PieChartIcon, CalendarDaysIcon, LineChartIcon, InfoIcon, MessageSquareHeartIcon, ActivityIcon } from "lucide-react";

// Mood color mapping
const MOOD_COLORS = {
  happy: "#81C784", // green
  calm: "#64B5F6", // blue
  neutral: "#B0BEC5", // gray
  sad: "#9575CD", // purple
  frustrated: "#FFB74D", // orange
  none: "#E0E0E0" // light gray
};

// Type definitions
type MoodType = 'happy' | 'calm' | 'neutral' | 'sad' | 'frustrated' | 'none';

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label, type }: { 
  active?: boolean; 
  payload?: Array<{payload: any; value: any}>; 
  label?: string; 
  type: string;
}) => {
  if (active && payload && payload.length) {
    if (type === "daily") {
      const mood = payload[0].payload.mood as MoodType;
      return (
        <div className="bg-background p-3 border rounded-md shadow-sm">
          <p className="font-medium">{format(new Date(label || ''), "MMM d, yyyy")}</p>
          <p className="text-sm">
            Mood: <span style={{ color: MOOD_COLORS[mood] }}>
              {mood === "none" ? "None" : mood.charAt(0).toUpperCase() + mood.slice(1)}
            </span>
          </p>
          <p className="text-sm">Entries: {payload[0].payload.count}</p>
        </div>
      );
    }
    if (type === "monthly") {
      return (
        <div className="bg-background p-3 border rounded-md shadow-sm">
          <p className="font-medium">{payload[0].payload.month}</p>
          <div className="space-y-1">
            {Object.entries(payload[0].payload.counts || {}).map(([mood, count]) => (
              <p key={mood} className="text-sm">
                <span style={{ color: MOOD_COLORS[mood as MoodType] }}>
                  {mood.charAt(0).toUpperCase() + mood.slice(1)}
                </span>: {count}
              </p>
            ))}
          </div>
          <p className="text-sm font-medium mt-1">Total: {payload[0].payload.total}</p>
        </div>
      );
    }
  }
  return null;
};

// Define insight type
type Insight = {
  type: string;
  title: string;
  description: string;
  emoji: string;
};

// Insight Card Component
const InsightCard = ({ insight }: { insight: Insight }) => {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center space-x-2">
          <div className="text-2xl">{insight.emoji}</div>
          <CardTitle className="text-lg">{insight.title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p>{insight.description}</p>
      </CardContent>
    </Card>
  );
};

export default function MoodTrackerPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("daily");
  
  // Type for analytics response
  type MoodAnalytics = {
    moodFrequency: Record<string, number>;
    dailyTrends: Array<{
      date: string;
      mood: MoodType;
      count: number;
    }>;
    monthlyTrends: Array<{
      month: string;
      monthKey: string;
      counts: Record<string, number>;
      total: number;
    }>;
    streaks: {
      current: number;
      longest: number;
    };
    insights: Insight[];
    entryCount: number;
  };

  // Fetch mood analytics data
  const { data, isLoading, isError, refetch } = useQuery<MoodAnalytics>({
    queryKey: ["/api/analytics/mood"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/analytics/mood");
        if (!res.ok) {
          throw new Error("Failed to fetch mood analytics");
        }
        return await res.json();
      } catch (error) {
        // The error will be handled by the isError flag
        throw error;
      }
    }
  });
  
  // Prepare data for pie chart
  const preparePieData = () => {
    if (!data?.moodFrequency) return [];
    
    return Object.entries(data.moodFrequency).map(([mood, count]) => ({
      name: mood.charAt(0).toUpperCase() + mood.slice(1),
      value: count,
      mood: mood
    }));
  };
  
  // Function to get emoji for mood
  const getMoodEmoji = (mood: string) => {
    const emojiMap: Record<string, string> = {
      happy: "😊",
      calm: "😌",
      neutral: "😐",
      sad: "😔",
      frustrated: "😤",
      none: "❓"
    };
    
    return emojiMap[mood as keyof typeof emojiMap] || "❓";
  };
  
  // Default empty data for when data is undefined
  const emptyData: MoodAnalytics = {
    moodFrequency: {},
    dailyTrends: [],
    monthlyTrends: [],
    streaks: { current: 0, longest: 0 },
    insights: [],
    entryCount: 0
  };
  
  return (
    <>
      <Helmet>
        <title>Mood Tracker - Featherweight</title>
        <meta name="description" content="Track your mood patterns and journal analytics with Featherweight's Mood Tracker." />
      </Helmet>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow py-8 bg-background">
          <Container>
            <div className="mb-6">
              <h1 className="font-quicksand font-bold text-3xl mb-2">Mood Tracker</h1>
              <p className="text-foreground/70">
                Insights and patterns from your journal entries
              </p>
            </div>
            
            {isLoading ? (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardHeader className="pb-2">
                        <Skeleton className="h-6 w-24" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-3/4" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                <Card>
                  <CardHeader>
                    <Skeleton className="h-7 w-36" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-[300px] w-full rounded-md" />
                  </CardContent>
                </Card>
              </div>
            ) : isError ? (
              <Card className="mb-6 border-destructive">
                <CardHeader>
                  <CardTitle className="text-destructive">Error loading mood data</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>There was a problem loading your mood analytics. Please try refreshing the page.</p>
                  <Button variant="outline" onClick={() => refetch()} className="mt-4">Try Again</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-8">
                {/* Insights Cards */}
                {data?.insights && data.insights.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {data.insights.map((insight, index) => (
                      <InsightCard key={index} insight={insight} />
                    ))}
                  </div>
                )}
                
                {/* Stats Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-medium">Total Entries</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-3xl font-bold">{data?.entryCount || 0}</span>
                        <MessageSquareHeartIcon className="h-6 w-6 text-primary opacity-75" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-medium">Current Streak</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-3xl font-bold">{data?.streaks?.current || 0}</span>
                        <div className="text-2xl">🔥</div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Longest: {data?.streaks?.longest || 0} days
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-medium">Mood Diversity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-3xl font-bold">{Object.keys(data?.moodFrequency || {}).length}</span>
                        <div className="flex space-x-1">
                          {Object.keys(data?.moodFrequency || {}).slice(0, 3).map(mood => (
                            <span key={mood} className="text-xl">{getMoodEmoji(mood)}</span>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-medium">
                        Top Mood
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {Object.entries(data?.moodFrequency || {}).length > 0 ? (
                        <div className="flex items-center justify-between">
                          {(() => {
                            const sorted = Object.entries(data?.moodFrequency || {}).sort((a, b) => (b[1] as number) - (a[1] as number));
                            const topMood = sorted[0][0];
                            const count = sorted[0][1];
                            
                            return (
                              <>
                                <div>
                                  <span className="text-xl font-medium capitalize">{topMood}</span>
                                  <p className="text-xs text-muted-foreground">{count} entries</p>
                                </div>
                                <span className="text-2xl">{getMoodEmoji(topMood)}</span>
                              </>
                            );
                          })()}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No mood data yet</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
                
                {/* Charts */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <ActivityIcon className="mr-2 h-5 w-5" /> 
                      Mood Trends
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                      <TabsList className="grid w-full grid-cols-3 mb-8">
                        <TabsTrigger value="daily" className="flex items-center">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          Daily
                        </TabsTrigger>
                        <TabsTrigger value="monthly" className="flex items-center">
                          <CalendarDaysIcon className="mr-2 h-4 w-4" />
                          Monthly
                        </TabsTrigger>
                        <TabsTrigger value="distribution" className="flex items-center">
                          <PieChartIcon className="mr-2 h-4 w-4" />
                          Distribution
                        </TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="daily" className="space-y-4">
                        <div className="h-[400px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={data?.dailyTrends || []}
                              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                              <XAxis 
                                dataKey="date" 
                                tickFormatter={(value) => format(new Date(value), "MMM d")}
                                interval={6}
                              />
                              <YAxis allowDecimals={false} />
                              <Tooltip content={<CustomTooltip type="daily" />} />
                              <Legend />
                              <Line 
                                type="monotone" 
                                dataKey="count" 
                                name="Journal Entries" 
                                stroke="#64B5F6" 
                                strokeWidth={2}
                                // Implement custom dot as a separate component
                                dot={false}
                                activeDot={{ r: 6, fill: "#64B5F6" }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 justify-center">
                          {Object.entries(MOOD_COLORS).map(([mood, color]) => (
                            <Badge key={mood} variant="outline" style={{ borderColor: color, color: mood === 'none' ? 'inherit' : color }}>
                              {getMoodEmoji(mood)} {mood.charAt(0).toUpperCase() + mood.slice(1)}
                            </Badge>
                          ))}
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="monthly" className="space-y-4">
                        <div className="h-[400px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={data?.monthlyTrends || []}
                              margin={{ top: 20, right: 20, left: 10, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                              <XAxis dataKey="month" />
                              <YAxis allowDecimals={false} />
                              <Tooltip content={<CustomTooltip type="monthly" />} />
                              <Legend />
                              {Object.keys(MOOD_COLORS).map((mood) => (
                                <Bar 
                                  key={mood}
                                  dataKey={`counts.${mood}`} 
                                  name={mood.charAt(0).toUpperCase() + mood.slice(1)} 
                                  stackId="a" 
                                  fill={MOOD_COLORS[mood as keyof typeof MOOD_COLORS]} 
                                />
                              ))}
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="distribution" className="space-y-4">
                        <div className="h-[400px] w-full flex items-center justify-center">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={preparePieData()}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={150}
                                fill="#8884d8"
                                dataKey="value"
                                nameKey="name"
                                label={({ name, percent }) => 
                                  typeof name === 'string' && typeof percent === 'number' 
                                    ? `${name} ${(percent * 100).toFixed(0)}%` 
                                    : ''
                                }
                              >
                                {preparePieData().map((entry, index) => (
                                  <Cell 
                                    key={`cell-${index}`} 
                                    fill={MOOD_COLORS[entry.mood as MoodType]} 
                                  />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value) => [`${value} entries`, 'Count']} />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
                
                {/* How to use */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <InfoIcon className="mr-2 h-5 w-5" />
                      About Mood Tracking
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p>
                        Your mood tracker visualizes emotions from your journal entries over time. 
                        Add mood tags to your entries to see patterns and trends in how you're feeling.
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h3 className="font-medium mb-2">Tips for Better Tracking</h3>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>Journal consistently to build a more accurate picture</li>
                            <li>Always tag your entries with a mood</li>
                            <li>Use the daily view to spot day-to-day patterns</li>
                            <li>Track streaks to build a journaling habit</li>
                          </ul>
                        </div>
                        
                        <div>
                          <h3 className="font-medium mb-2">Benefits of Mood Tracking</h3>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>Identify triggers for negative moods</li>
                            <li>Recognize patterns in your emotional health</li>
                            <li>Feel motivated by seeing your journaling streaks</li>
                            <li>Celebrate positive mood trends</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </Container>
        </main>
        <Footer />
      </div>
    </>
  );
}