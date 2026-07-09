export const kpiData = {
  waterUsageToday: '12,450 gal',
  activeLeaks: 3,
  supplyReadiness: '85%',
  openWorkOrders: 12,
  estMonthlyCost: '$4,250',
}

export const waterAnalyticsData = [
  { time: '12 AM', usage: 120,  baseline: 110 },
  { time: '3 AM',  usage: 80,   baseline: 90  },
  { time: '6 AM',  usage: 250,  baseline: 240 },
  { time: '9 AM',  usage: 800,  baseline: 750 },
  { time: '12 PM', usage: 950,  baseline: 900 },
  { time: '3 PM',  usage: 1250, baseline: 850 },
  { time: '6 PM',  usage: 600,  baseline: 650 },
  { time: '9 PM',  usage: 300,  baseline: 320 },
]

export const alertsData = [
  {
    id: 1,
    location: 'Building A — 4th Floor Restroom',
    lat: 1.29352,
    lng: 103.85725, // Singapore center
    severity: 'Critical',
    timeDetected: '10 mins ago',
    waterWasted: '45 gal/hr',
    status: 'Unresolved',
    description: 'Continuous flow detected from Sensor B-04. Possible broken valve or burst pipe behind the wall. Estimated 45 gallons per hour being wasted.',
  },
  {
    id: 2,
    location: 'Building C — Main Boiler Room',
    lat: 1.29348,
    lng: 103.85710,
    severity: 'Warning',
    timeDetected: '1 hr ago',
    waterWasted: '12 gal/hr',
    status: 'Investigating',
    description: 'Sensor C-02 reporting elevated flow inconsistent with typical boiler operation. Possible slow pipe drip or faulty pressure relief valve.',
  },
  {
    id: 3,
    location: 'Building B — Irrigation System',
    lat: 1.29360,
    lng: 103.85715,
    severity: 'Critical',
    timeDetected: '2 hrs ago',
    waterWasted: '80 gal/hr',
    status: 'Assigned',
    description: 'Irrigation system running outside scheduled hours. Possible faulty timer or sensor malfunction. 80 gal/hr waste detected.',
  },
]

export const allAlertsData = [
  ...alertsData,
  {
    id: 4,
    location: 'Building D — Cafeteria Sink',
    lat: 1.29340,
    lng: 103.85720,
    severity: 'Warning',
    timeDetected: '3 hrs ago',
    waterWasted: '8 gal/hr',
    status: 'Resolved',
    description: 'Dripping tap in cafeteria. Washer replaced by maintenance team. Confirmed resolved.',
  },
  {
    id: 5,
    location: 'Building A — 2nd Floor Toilet',
    lat: 1.29355,
    lng: 103.85695,
    severity: 'Warning',
    timeDetected: '5 hrs ago',
    waterWasted: '5 gal/hr',
    status: 'Resolved',
    description: 'Running toilet detected. Flapper valve replaced, issue resolved.',
  },
  {
    id: 6,
    location: 'Building B — Parking Garage',
    lat: 1.29335,
    lng: 103.85710,
    severity: 'Critical',
    timeDetected: '6 hrs ago',
    waterWasted: '120 gal/hr',
    status: 'Resolved',
    description: 'Major pipe burst in underground parking. Emergency repair completed. Road closed for 2 hours during repair.',
  },
]

export const suppliesData = [
  { item: 'Soap Dispensers',    level: 45, status: 'yellow', stock: '45 units',  reorderPoint: 50  },
  { item: 'Toilet Paper',       level: 85, status: 'green',  stock: '850 rolls', reorderPoint: 200 },
  { item: 'Hand Sanitizer',     level: 20, status: 'red',    stock: '12 units',  reorderPoint: 30  },
  { item: 'Cleaning Chemicals', level: 60, status: 'green',  stock: '18 L',      reorderPoint: 10  },
  { item: 'Paper Towels',       level: 35, status: 'yellow', stock: '280 rolls', reorderPoint: 300 },
]

export const workOrdersData = [
  {
    id: 'WO-2041',
    task: 'Fix leaking pipe in 4F',
    team: 'Plumbing',
    priority: 'High',
    dueDate: 'Today',
    status: 'In Progress',
    location: 'Building A — 4th Floor',
    description: 'Address the leak reported at Building A 4th Floor. Sensor B-04 confirms 45 gal/hr loss. Check both hot and cold supply lines.',
  },
  {
    id: 'WO-2042',
    task: 'Refill hand sanitizer in Lobby',
    team: 'Janitorial',
    priority: 'Medium',
    dueDate: 'Today',
    status: 'Pending',
    location: 'Building C — Lobby',
    description: 'Stock at 20%. Restock all lobby dispensers. Supplies are in storage room B-12.',
  },
  {
    id: 'WO-2043',
    task: 'Inspect Boiler C pressure',
    team: 'Maintenance',
    priority: 'Low',
    dueDate: 'Tomorrow',
    status: 'Scheduled',
    location: 'Building C — Boiler Room',
    description: 'Monthly pressure check for Boiler C. Check relief valve and pressure gauges. Log results.',
  },
  {
    id: 'WO-2044',
    task: 'Monthly HVAC filter change',
    team: 'Maintenance',
    priority: 'Low',
    dueDate: 'Next Week',
    status: 'Scheduled',
    location: 'All Buildings',
    description: 'Routine monthly filter replacement for all HVAC units. Filters are in maintenance storage.',
  },
]

export const allWorkOrdersData = [
  ...workOrdersData,
  {
    id: 'WO-2045',
    task: 'Replace main valve in Bldg B',
    team: 'Plumbing',
    priority: 'High',
    dueDate: 'Tomorrow',
    status: 'Pending',
    location: 'Building B — Basement',
    description: 'Main shutoff valve showing signs of corrosion. Schedule after-hours replacement to minimise service disruption.',
  },
  {
    id: 'WO-2040',
    task: 'Annual water meter calibration',
    team: 'Maintenance',
    priority: 'Low',
    dueDate: 'Next Month',
    status: 'Scheduled',
    location: 'All Buildings',
    description: 'Annual calibration of all 5 water meters across campus. Coordinate with water authority.',
  },
  {
    id: 'WO-2039',
    task: 'Fix Sensor B-04 false readings',
    team: 'Technical',
    priority: 'High',
    dueDate: 'Today',
    status: 'In Progress',
    location: 'Building B — 4th Floor',
    description: 'Sensor B-04 intermittently reporting anomalous readings. May need firmware update or hardware replacement.',
  },
  {
    id: 'WO-2038',
    task: 'Restock Building C supplies',
    team: 'Janitorial',
    priority: 'Medium',
    dueDate: 'Yesterday',
    status: 'Completed',
    location: 'Building C',
    description: 'Restock all supply dispensers in Building C. Completed on schedule.',
  },
]

export const facilityRiskData = [
  { id: 1, x: 20, y: 30, severity: 'green',  name: 'Sensor A-01', location: 'Building A — Lobby',       reading: '8.2 L/hr',  lastChecked: '2 min ago' },
  { id: 2, x: 50, y: 40, severity: 'red',    name: 'Sensor B-04', location: 'Building B — 4th Floor',   reading: '420 L/hr',  lastChecked: '1 min ago' },
  { id: 3, x: 70, y: 80, severity: 'yellow', name: 'Sensor C-02', location: 'Building C — Boiler Room', reading: '95 L/hr',   lastChecked: '5 min ago' },
  { id: 4, x: 80, y: 20, severity: 'green',  name: 'Sensor D-01', location: 'Building D — Basement',    reading: '12.1 L/hr', lastChecked: '3 min ago' },
]

export const usersData = [
  { id: 1, name: 'Sarah Chen',       email: 'sarah.chen@facility.com',  role: 'admin',            lastActive: 'Just now',   status: 'Active'   },
  { id: 2, name: 'Marcus Rodriguez', email: 'marcus.r@facility.com',    role: 'facility_manager', lastActive: '2 hrs ago',  status: 'Active'   },
  { id: 3, name: 'Priya Patel',      email: 'priya.patel@facility.com', role: 'technician',       lastActive: '1 day ago',  status: 'Active'   },
  { id: 4, name: 'James Okafor',     email: 'james.o@facility.com',     role: 'technician',       lastActive: '3 days ago', status: 'Active'   },
  { id: 5, name: 'Lin Zhao',         email: 'lin.zhao@facility.com',    role: 'viewer',           lastActive: '1 week ago', status: 'Inactive' },
]

export const reportsArchiveData = [
  { id: 1, title: 'Monthly Water Usage',   period: 'May 2026', type: 'Usage',      generatedDate: '2 Jun 2026',  size: '1.2 MB' },
  { id: 2, title: 'Sanitation Compliance', period: 'May 2026', type: 'Compliance', generatedDate: '1 Jun 2026',  size: '0.8 MB' },
  { id: 3, title: 'Leak Incident Summary', period: 'May 2026', type: 'Incidents',  generatedDate: '10 Jun 2026', size: '0.5 MB' },
  { id: 4, title: 'Monthly Water Usage',   period: 'Apr 2026', type: 'Usage',      generatedDate: '2 May 2026',  size: '1.1 MB' },
  { id: 5, title: 'Q1 Facility Report',    period: 'Q1 2026',  type: 'Quarterly',  generatedDate: '5 Apr 2026',  size: '3.4 MB' },
  { id: 6, title: 'Annual Water Audit',    period: '2025',     type: 'Annual',     generatedDate: '15 Jan 2026', size: '8.2 MB' },
]

export const buildingsList = ['All Buildings', 'Building A', 'Building B', 'Building C', 'Building D']

export const notificationsData = [
  { id: 1, title: 'Critical leak detected',      message: 'Building A — 4th Floor Restroom, 45 gal/hr', time: '10 min ago', read: false },
  { id: 2, title: 'WO-2041 assigned',             message: 'Fix leaking pipe in 4F -> Plumbing team',     time: '32 min ago', read: false },
  { id: 3, title: 'Supply alert: Hand Sanitizer', message: 'Stock at 20% in Building C Lobby',            time: '1 hr ago',   read: true  },
]

// 24-hour reading windows (L/hr, hourly, oldest first) sent to the LSTM model.
// These are fixed mock values — we have no live sensors.
// The anomaly VERDICT still comes from the real model on every call.
// meter_02: sustained ~400 L/hr, well above its training range [3.2, 171.4] → model flags it.
export const meterReadings = {
  meter_00: [  8,  6,  5,  4,  4,  5, 15, 48, 80, 95, 88, 82, 70, 64, 60, 72, 85, 80, 60, 44, 30, 20, 14,  9 ],
  meter_01: [  5,  4,  3,  3,  3,  4, 12, 38, 68, 82, 76, 70, 58, 53, 50, 62, 74, 68, 50, 37, 25, 16, 10,  6 ],
  meter_02: [350,380,400,420,410,390,400,415,408,395,420,435,410,400,390,405,415,425,410,400,395,385,375,360],
  meter_03: [  6,  5,  4,  4,  4,  5, 14, 42, 72, 88, 82, 76, 64, 59, 55, 68, 80, 74, 56, 41, 28, 18, 11,  7 ],
  meter_04: [  5,  4,  3,  3,  3,  4, 13, 40, 70, 85, 78, 72, 60, 55, 52, 64, 76, 70, 52, 39, 26, 17, 10,  6 ],
}

export const waterAnalyticsDataWeek = [
  { time: 'Mon', usage: 12000, baseline: 11000 },
  { time: 'Tue', usage: 11500, baseline: 11000 },
  { time: 'Wed', usage: 12450, baseline: 11500 },
  { time: 'Thu', usage: 13000, baseline: 12000 },
  { time: 'Fri', usage: 12800, baseline: 12000 },
  { time: 'Sat', usage: 8000,  baseline: 8500  },
  { time: 'Sun', usage: 7500,  baseline: 8000  },
]

export const waterAnalyticsDataMonth = [
  { time: 'Week 1', usage: 75000, baseline: 76000 },
  { time: 'Week 2', usage: 78000, baseline: 76000 },
  { time: 'Week 3', usage: 77250, baseline: 76000 },
  { time: 'Week 4', usage: 79000, baseline: 76000 },
]

