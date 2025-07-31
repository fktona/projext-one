export interface Plugin {
  name: string;
  author: string;
  description: string;
  price: number;
  installed: boolean;
  status: "active" | "inactive" | "pending";
  free: boolean;
  href: string;
  category: string;
  icon: string;
}

export const plugins: Plugin[] = [
  {
    name: "App Usage Analyser",
    author: "Project One",
    description:
      "Analyze your app usage based on OCR activity. Select a date range to see which applications you use most, ranked by frequency. Visualize your productivity and discover your top-used apps.",
    price: 0,
    installed: false,
    status: "active",
    free: true,
    href: "/app-usage",
    category: "Productivity",
    icon: "📱",
  },
  {
    name: "Chrome Site Analytics",
    author: "Project One",
    description:
      "Analyze your chrome site usage based on OCR activity. Select a date range to see which sites you visit most, ranked by frequency. Visualize your productivity and discover your top-used sites.",
    price: 0,
    installed: false,
    status: "active",
    free: true,
    href: "/chrom-site",
    category: "Web Analytics",
    icon: "🌐",
  }, 
  {
    name: "App Monitor",
    author: "Project One",
    description:
      "Monitor your app usage and set time limits for each app. Get alerts when you exceed your time limits and stay productive.",
    price: 0,
    installed: false,
    status: "active",
    free: true,
    href: "/app-discovery",
    category: "Productivity",
    icon: "📱",
  },
  
  {
    name: "Focus Time Tracker",
    author: "Project One",
    description:
      "Track your deep work sessions and focus time. Identify when you're most productive and analyze your concentration patterns. Get insights on your best working hours and distraction patterns.",
    price: 0,
    installed: false,
    status: "pending",
    free: true,
    href: "/focus-tracker",
    category: "Productivity",
    icon: "⏱️",
  },
  {
    name: "Meeting Analytics",
    author: "Project One",
    description:
      "Analyze your meeting patterns and communication habits. Track time spent in video calls, identify meeting efficiency, and get insights on your communication style and meeting productivity.",
    price: 0,
    installed: false,
    status: "pending",
    free: true,
    href: "/meeting-analytics",
    category: "Communication",
    icon: "🎥",
  },
  {
    name: "Code Activity Monitor",
    author: "Project One",
    description:
      "Track your coding sessions, identify your most productive programming hours, and analyze your development workflow. Monitor time spent in IDEs and version control activities.",
    price: 0,
    installed: false,
    status: "pending",
    free: true,
    href: "/code-monitor",
    category: "Development",
    icon: "💻",
  },
  {
    name: "Social Media Insights",
    author: "Project One",
    description:
      "Analyze your social media usage patterns and digital wellbeing. Track time spent on social platforms, identify usage trends, and get recommendations for healthier digital habits.",
    price: 0,
    installed: false,
    status: "pending",
    free: true,
    href: "/social-insights",
    category: "Digital Wellness",
    icon: "📱",
  },
  {
    name: "Email Productivity",
    author: "Project One",
    description:
      "Track your email habits and communication patterns. Analyze response times, email volume, and identify your most active communication periods. Optimize your email workflow.",
    price: 0,
    installed: false,
    status: "pending",
    free: true,
    href: "/email-analytics",
    category: "Communication",
    icon: "📧",
  },
  {
    name: "Document Workflow",
    author: "Project One",
    description:
      "Monitor your document creation and editing patterns. Track time spent in word processors, spreadsheets, and presentation tools. Analyze your content creation productivity.",
    price: 0,
    installed: false,
    status: "pending",
    free: true,
    href: "/document-workflow",
    category: "Productivity",
    icon: "📄",
  },
  {
    name: "Gaming Time Tracker",
    author: "Project One",
    description:
      "Track your gaming sessions and entertainment patterns. Monitor time spent in games, identify gaming habits, and balance entertainment with productivity goals.",
    price: 0,
    installed: false,
    status: "pending",
    free: true,
    href: "/gaming-tracker",
    category: "Entertainment",
    icon: "🎮",
  },
  {
    name: "Learning Analytics",
    author: "Project One",
    description:
      "Track your learning activities and educational content consumption. Monitor time spent on educational platforms, courses, and research activities. Analyze your learning patterns.",
    price: 0,
    installed: false,
    status: "pending",
    free: true,
    href: "/learning-analytics",
    category: "Education",
    icon: "📚",
  },
  {
    name: "Financial Activity Monitor",
    author: "Project One",
    description:
      "Track your financial app usage and banking activities. Monitor time spent on financial platforms, identify financial planning patterns, and analyze your money management habits.",
    price: 0,
    installed: false,
    status: "pending",
    free: true,
    href: "/financial-monitor",
    category: "Finance",
    icon: "💰",
  },
  {
    name: "Health & Fitness Tracker",
    author: "Project One",
    description:
      "Monitor your health and fitness app usage. Track workout sessions, health monitoring activities, and wellness app engagement. Analyze your health and fitness patterns.",
    price: 0,
    installed: false,
    status: "pending",
    free: true,
    href: "/health-fitness",
    category: "Health",
    icon: "🏃‍♂️",
  },
]; 