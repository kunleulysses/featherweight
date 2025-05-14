import { Container } from "@/components/ui/container";
import { JournalSidebar } from "@/components/journal/journal-sidebar";

export function JournalDemoSection() {
  // Demo journal entries
  const demoEntries = [
    {
      id: 1,
      title: "Morning Reflections",
      date: "May 15, 2023 • 9:42 AM",
      content: "Today I watched the sunrise from my window. Flappy's message about finding small moments of joy really resonated with me. I noticed how the light changed the color of the leaves on the tree outside - from deep green to an almost golden hue. It's something I would have missed before.",
      mood: "happy",
      tags: ["#gratitude", "#morning"]
    },
    {
      id: 2,
      title: "Work Challenges",
      date: "May 14, 2023 • 6:18 PM",
      content: "The project deadline is approaching and I'm feeling the pressure. But as Flappy mentioned in today's email, \"even the mightiest ocean waves eventually find their way to peaceful shores.\" Taking deep breaths and focusing on one task at a time.",
      mood: "neutral",
      tags: ["#work", "#challenges"]
    },
    {
      id: 3,
      title: "Weekend Hike",
      date: "May 13, 2023 • 11:05 AM",
      content: "Took Flappy's advice and went for a hike in the mountains today. The trail was challenging but the view at the top was worth it. I sat there for almost an hour just breathing and being present. Attached a photo to remember this feeling.",
      mood: "happy",
      tags: ["#nature", "#mindfulness"],
      image: "https://images.unsplash.com/photo-1465056836041-7f43ac27dcb5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
    }
  ];

  return (
    <section className="py-16 bg-white">
      <Container>
        <div className="text-center mb-16">
          <h2 className="font-quicksand font-bold text-3xl md:text-4xl text-gray-900 mb-4">
            Your Journal, Beautifully Organized
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            All your reflections, safely stored and easily accessible in your personal dashboard.
          </p>
        </div>
        
        <div className="max-w-5xl mx-auto bg-background rounded-[0.75rem] p-6 md:p-8 shadow-lg">
          {/* Journal Interface Demo */}
          <div className="flex flex-col md:flex-row gap-6">
            {/* Sidebar */}
            <div className="md:w-1/4">
              <JournalSidebar />
            </div>
            
            {/* Journal Entries */}
            <div className="md:w-3/4">
              {demoEntries.map(entry => (
                <div key={entry.id} className={`bg-white rounded-[0.75rem] p-5 shadow-md mb-5 border-l-4 ${
                  entry.mood === 'happy' ? 'border-primary' : 
                  entry.mood === 'neutral' ? 'border-secondary' : 'border-accent'
                }`}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-quicksand font-semibold text-lg text-gray-900">{entry.title}</h3>
                      <p className="text-sm text-gray-500">{entry.date}</p>
                    </div>
                    <div className="text-xl">{entry.mood === 'happy' ? '😊' : entry.mood === 'neutral' ? '😐' : '😌'}</div>
                  </div>
                  <p className="text-gray-700 mb-4">
                    {entry.content}
                  </p>
                  
                  {entry.image && (
                    <div className="mb-4 rounded-[0.75rem] overflow-hidden">
                      <img src={entry.image} alt="Journal entry" className="w-full h-auto" />
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <div className="flex flex-wrap gap-2">
                      {entry.tags.map((tag, idx) => (
                        <span 
                          key={idx} 
                          className={`text-xs ${
                            tag === '#gratitude' || tag === '#mindfulness' ? 'bg-primary/10 text-primary' : 
                            tag === '#work' || tag === '#challenges' ? 'bg-secondary/10 text-secondary' : 
                            'bg-accent/10 text-accent'
                          } px-2 py-1 rounded-full`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex space-x-2">
                      <button className="text-gray-500 hover:text-primary transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                      </button>
                      <button className="text-gray-500 hover:text-primary transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
