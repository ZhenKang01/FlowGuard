export const kpiData = {
  waterUsageToday: "12,450 gal",
  activeLeaks: 3,
  supplyReadiness: "85%",
  openWorkOrders: 12,
  estMonthlyCost: "$4,250"
};

export const waterAnalyticsData = [
  { time: "12 AM", usage: 120, baseline: 110 },
  { time: "3 AM", usage: 80, baseline: 90 },
  { time: "6 AM", usage: 250, baseline: 240 },
  { time: "9 AM", usage: 800, baseline: 750 },
  { time: "12 PM", usage: 950, baseline: 900 },
  { time: "3 PM", usage: 1250, baseline: 850 }, // Highlight abnormal spike
  { time: "6 PM", usage: 600, baseline: 650 },
  { time: "9 PM", usage: 300, baseline: 320 },
];

export const alertsData = [
  {
    id: 1,
    location: "Building A - 4th Floor Restroom",
    severity: "Critical",
    timeDetected: "10 mins ago",
    waterWasted: "45 gal/hr",
    status: "Unresolved"
  },
  {
    id: 2,
    location: "Building C - Main Boiler Room",
    severity: "Warning",
    timeDetected: "1 hr ago",
    waterWasted: "12 gal/hr",
    status: "Investigating"
  },
  {
    id: 3,
    location: "Building B - Irrigation System",
    severity: "Critical",
    timeDetected: "2 hrs ago",
    waterWasted: "80 gal/hr",
    status: "Assigned"
  }
];

export const suppliesData = [
  { item: "Soap Dispensers", level: 45, status: "yellow" },
  { item: "Toilet Paper", level: 85, status: "green" },
  { item: "Hand Sanitizer", level: 20, status: "red" },
  { item: "Cleaning Chemicals", level: 60, status: "green" },
  { item: "Paper Towels", level: 35, status: "yellow" }
];

export const workOrdersData = [
  {
    id: "WO-2041",
    task: "Fix leaking pipe in 4F",
    team: "Plumbing",
    priority: "High",
    dueDate: "Today",
    status: "In Progress"
  },
  {
    id: "WO-2042",
    task: "Refill hand sanitizer in Lobby",
    team: "Janitorial",
    priority: "Medium",
    dueDate: "Today",
    status: "Pending"
  },
  {
    id: "WO-2043",
    task: "Inspect Boiler C pressure",
    team: "Maintenance",
    priority: "Low",
    dueDate: "Tomorrow",
    status: "Scheduled"
  },
  {
    id: "WO-2044",
    task: "Monthly HVAC filter change",
    team: "Maintenance",
    priority: "Low",
    dueDate: "Next Week",
    status: "Scheduled"
  }
];

export const facilityRiskData = [
  { id: 1, x: 20, y: 30, severity: "green" },
  { id: 2, x: 50, y: 40, severity: "red" },
  { id: 3, x: 70, y: 80, severity: "yellow" },
  { id: 4, x: 80, y: 20, severity: "green" },
];
