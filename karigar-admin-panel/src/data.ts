import { ServiceProvider, User, Booking, Dispute, NotificationHistoryItem, AIAnalyticsSummary } from './types';

// Let's seed authentic data values
export const INITIAL_PROVIDERS: ServiceProvider[] = [
  {
    id: "SP-001",
    name: "Ahmed Raza",
    email: "ahmed.ac@karigar.ai",
    phone: "+92 300 1234210",
    profilePicture: "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&q=80&w=120",
    category: "AC Repair",
    rating: 4.8,
    reviewsCount: 42,
    city: "Karachi",
    region: "Gulshan-e-Iqbal",
    registrationDate: "2025-03-12",
    status: "Active",
    hourlyRate: 450,
    availableSlots: ["09:00 - 11:00", "11:00 - 13:00", "14:00 - 16:00", "16:00 - 18:00"],
    totalBookings: 124,
    completedBookings: 118,
    cancelledBookings: 4,
    revenueGenerated: 55800,
    completionRate: 95.1,
    about: "Expert in inverter AC diagnostics, compressor repairs, and seasonal servicing. 8+ years of field experience with major brands like Daikin, Gree, and Haier.",
    reviews: [
      { id: "R-101", customerName: "Hamza Tariq", rating: 5, comment: "Excellent service. Diagnosed the sensor issue in minutes and fixed it promptly. Fair pricing.", date: "2026-05-18" },
      { id: "R-102", customerName: "Ayesha Siddiqui", rating: 4, comment: "Punctual and very clean work. Left no mess behind after gas charging.", date: "2026-05-12" },
      { id: "R-103", customerName: "Usman Ali", rating: 5, comment: "Very polite. Explained the issue clearly before fixing.", date: "2026-05-01" }
    ]
  },
  {
    id: "SP-002",
    name: "Bilal Hussain",
    email: "bilal.plumb@karigar.ai",
    phone: "+92 321 2233344",
    profilePicture: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120",
    category: "Plumbing",
    rating: 4.6,
    reviewsCount: 31,
    city: "Karachi",
    region: "DHA Phase 5",
    registrationDate: "2025-04-05",
    status: "Active",
    hourlyRate: 350,
    availableSlots: ["10:00 - 12:00", "12:00 - 14:00", "15:00 - 17:00"],
    totalBookings: 88,
    completedBookings: 82,
    cancelledBookings: 5,
    revenueGenerated: 28700,
    completionRate: 93.1,
    about: "Specialist in high-pressure plumbing, underground leakage detection, bathroom sanitary installations, and emergency drain cleaning.",
    reviews: [
      { id: "R-201", customerName: "Kashif Mehmood", rating: 4, comment: "Arrived within 30 minutes for a major pipe burst. Sorted it out quickly.", date: "2026-05-20" },
      { id: "R-202", customerName: "Nadia Khan", rating: 5, comment: "Excellent work on installing the geyser and premium fixtures.", date: "2026-05-11" }
    ]
  },
  {
    id: "SP-003",
    name: "Asad Khan",
    email: "asad.electric@karigar.ai",
    phone: "+92 333 4567890",
    profilePicture: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=120",
    category: "Electrical",
    rating: 4.9,
    reviewsCount: 56,
    city: "Lahore",
    region: "Gulberg III",
    registrationDate: "2025-01-20",
    status: "Active",
    hourlyRate: 400,
    availableSlots: ["09:00 - 11:00", "14:00 - 16:00", "18:00 - 20:00"],
    totalBookings: 195,
    completedBookings: 190,
    cancelledBookings: 3,
    revenueGenerated: 78000,
    completionRate: 97.4,
    about: "Licensed industrial and residential electrician. Specializes in distribution board wiring, short-circuit diagnostics, smart home integrations, and heavy appliance cabling.",
    reviews: [
      { id: "R-301", customerName: "Bilal Ahmed", rating: 5, comment: "Incredibly professional. Fixed a persistent fuse-tripping issue that others couldn't resolve.", date: "2026-05-25" },
      { id: "R-302", customerName: "Sana Malik", rating: 5, comment: "Very prompt and followed all safety protocols with rubber gloves & insulated shoes.", date: "2026-05-14" }
    ]
  },
  {
    id: "SP-004",
    name: "Imran Yousaf",
    email: "imran.carp@karigar.ai",
    phone: "+92 301 8887777",
    profilePicture: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=120",
    category: "Carpentry",
    rating: 4.7,
    reviewsCount: 29,
    city: "Lahore",
    region: "Johar Town",
    registrationDate: "2025-06-15",
    status: "Active",
    hourlyRate: 500,
    availableSlots: ["09:00 - 13:00", "14:00 - 18:00"],
    totalBookings: 64,
    completedBookings: 60,
    cancelledBookings: 2,
    revenueGenerated: 32000,
    completionRate: 93.8,
    about: "Artisan carpenter with 12 years of expertise in customized furniture assembly, door alignment, modular kitchen fittings, and high-finish wood polishing.",
    reviews: [
      { id: "R-401", customerName: "Fatima Noor", rating: 5, comment: "Re-aligned our sagging wardrobe doors and built a custom study desk. Flawless finish.", date: "2026-05-15" }
    ]
  },
  {
    id: "SP-005",
    name: "Saima Bibi",
    email: "saima.clean@karigar.ai",
    phone: "+92 345 7776666",
    profilePicture: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=120",
    category: "Cleaning",
    rating: 4.5,
    reviewsCount: 68,
    city: "Islamabad",
    region: "F-7 Markaz",
    registrationDate: "2025-02-10",
    status: "Active",
    hourlyRate: 300,
    availableSlots: ["08:00 - 11:00", "11:00 - 14:00", "14:00 - 17:00"],
    totalBookings: 145,
    completedBookings: 135,
    cancelledBookings: 7,
    revenueGenerated: 40500,
    completionRate: 93.1,
    about: "Deep cleaning expert. We use eco-friendly compounds and commercial-grade cleaning equipment for sanitizing kitchens, bathrooms, sofas, and full villas.",
    reviews: [
      { id: "R-501", customerName: "Junaid Akram", rating: 5, comment: "Deep-cleaned my 3BHK flat. Absolutely spotless. Worth every rupee.", date: "2026-05-22" }
    ]
  },
  {
    id: "SP-006",
    name: "Naveed Anwar",
    email: "naveed.paint@karigar.ai",
    phone: "+92 302 6665555",
    profilePicture: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120",
    category: "Painting",
    rating: 4.2,
    reviewsCount: 18,
    city: "Islamabad",
    region: "G-11",
    registrationDate: "2025-08-22",
    status: "Suspended",
    hourlyRate: 600,
    availableSlots: ["09:00 - 18:00"],
    totalBookings: 25,
    completedBookings: 20,
    cancelledBookings: 5,
    revenueGenerated: 15000,
    completionRate: 80.0,
    about: "Wall painting services, texture coating, and waterproof priming. Temporarily suspended due to late cancelations and user complaints regarding cleanup.",
    reviews: [
      { id: "R-601", customerName: "Tariq Jameel", rating: 2, comment: "Left paint splatters on my wooden floors. Untidy cleanup and showed up very late.", date: "2026-04-18" }
    ]
  },
  {
    id: "SP-007",
    name: "Faraz Sheikh",
    email: "faraz.serv@karigar.ai",
    phone: "+92 311 5554444",
    profilePicture: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120",
    category: "Others",
    rating: 4.9,
    reviewsCount: 15,
    city: "Karachi",
    region: "Clifton",
    registrationDate: "2025-11-01",
    status: "Pending Verification",
    hourlyRate: 450,
    availableSlots: ["10:00 - 12:00", "14:00 - 16:00"],
    totalBookings: 15,
    completedBookings: 15,
    cancelledBookings: 0,
    revenueGenerated: 67500,
    completionRate: 100.0,
    about: "Smart appliance repairs, CCTV surveillance layout configuration, and smart electronic lock programming specialists.",
    reviews: [
      { id: "R-701", customerName: "Mehwish Iqbal", rating: 5, comment: "Highly technical. Perfect installation of CCTV dashboard and security gates.", date: "2026-05-19" }
    ]
  }
];

export const INITIAL_USERS: User[] = [
  {
    id: "USR-001",
    name: "Ali Hassan",
    email: "ali.hassan@gmail.com",
    googleId: "google_1122334455",
    deviceType: "Android",
    deviceToken: "fcm_token_ali_88921",
    registrationDate: "2025-02-15",
    status: "Active",
    totalChatSessions: 18,
    totalBookings: 8,
    totalSpend: 3450,
    lastLocation: { latitude: 24.9215, longitude: 67.0954, name: "Gulshan-e-Iqbal, Karachi" },
    totalTokensConsumed: 28400,
    totalConversations: 12
  },
  {
    id: "USR-002",
    name: "Zainab Fatima",
    email: "zainab.f@yahoo.com",
    googleId: "google_9988776655",
    deviceType: "iOS",
    deviceToken: "apns_token_zainab_010203",
    registrationDate: "2025-03-01",
    status: "Active",
    totalChatSessions: 24,
    totalBookings: 12,
    totalSpend: 5900,
    lastLocation: { latitude: 24.8008, longitude: 67.0631, name: "DHA, Karachi" },
    totalTokensConsumed: 45000,
    totalConversations: 19
  },
  {
    id: "USR-003",
    name: "Hassan Raza",
    email: "hassan.r@gmail.com",
    deviceType: "Android",
    deviceToken: "fcm_token_hassan_492040",
    registrationDate: "2025-05-10",
    status: "Active",
    totalChatSessions: 5,
    totalBookings: 2,
    totalSpend: 900,
    lastLocation: { latitude: 31.5497, longitude: 74.3436, name: "Mall Road, Lahore" },
    totalTokensConsumed: 9500,
    totalConversations: 4
  },
  {
    id: "USR-004",
    name: "Kamran Akmal",
    email: "kamran.akmal@gmail.com",
    deviceType: "iOS",
    deviceToken: "apns_token_kamran_592810",
    registrationDate: "2025-01-11",
    status: "Suspended",
    totalChatSessions: 32,
    totalBookings: 15,
    totalSpend: 8200,
    lastLocation: { latitude: 31.4697, longitude: 74.2728, name: "Johar Town, Lahore" },
    totalTokensConsumed: 62000,
    totalConversations: 25
  },
  {
    id: "USR-005",
    name: "Hira Mansoor",
    email: "hira.m@gmail.com",
    googleId: "google_7766554433",
    deviceType: "iOS",
    deviceToken: "apns_token_hira_482103",
    registrationDate: "2025-05-20",
    status: "Active",
    totalChatSessions: 3,
    totalBookings: 1,
    totalSpend: 450,
    lastLocation: { latitude: 24.8138, longitude: 67.0300, name: "Clifton, Karachi" },
    totalTokensConsumed: 3200,
    totalConversations: 2
  }
];

export const INITIAL_BOOKINGS: Booking[] = [
  {
    id: "BKG-101",
    bookingDate: "2026-05-28",
    timeSlot: "11:00 - 13:00",
    status: "Completed",
    serviceType: "AC Repair",
    customerId: "USR-001",
    customerName: "Ali Hassan",
    customerEmail: "ali.hassan@gmail.com",
    customerPhone: "+92 300 1112223",
    customerLocation: "Flat 402, Saima Tower, Gulshan-e-Iqbal, Karachi",
    providerId: "SP-001",
    providerName: "Ahmed Raza",
    providerCategory: "AC Repair",
    providerRating: 4.8,
    aiPrompt: "My Gree inverter split AC has stopped cooling completely. The indoor unit fan starts but works for 2 minutes and then triggers an E6 error light code. I need a tech who can check the outdoor circuit board.",
    aiRecommendedProviders: [
      { id: "SP-001", name: "Ahmed Raza", score: 98, reason: "Specialist in Gree microprocessors & inverter boards with active stock of spares. Located 1.5 km away." },
      { id: "SP-007", name: "Faraz Sheikh", score: 85, reason: "Deals in smart PCB programming, but 8 km away from location." }
    ],
    aiRecommendationReason: "Ali was matched with Ahmed due to Ahmed's certified Gree parts supply, 95% + completion rate, and local proximity to Gulshan-e-Iqbal reducing dispatch latency.",
    amount: 1500,
    serviceCharges: 150,
    platformCommission: 300,
    netRevenue: 1200,
    feedbackRating: 5,
    feedbackText: "Outstanding diagnostic! Ahmed fixed the communication line error on my outdoor PCB in no time. cooling is excellent now."
  },
  {
    id: "BKG-102",
    bookingDate: "2026-05-30",
    timeSlot: "15:00 - 17:00",
    status: "Confirmed",
    serviceType: "Plumbing",
    customerId: "USR-002",
    customerName: "Zainab Fatima",
    customerEmail: "zainab.f@yahoo.com",
    customerPhone: "+92 321 2223334",
    customerLocation: "Villa 12, DHA Phase 6, Karachi",
    providerId: "SP-002",
    providerName: "Bilal Hussain",
    providerCategory: "Plumbing",
    providerRating: 4.6,
    aiPrompt: "Looking for an expert plumber who can reconstruct a concealed shower mixer unit in our guest toilet. The current Hansgrohe diverter leaks behind the wall tile.",
    aiRecommendedProviders: [
      { id: "SP-002", name: "Bilal Hussain", score: 95, reason: "Certified on major luxury sanitary brands (Hansgrohe, Master) and has underground water detection equipment." }
    ],
    aiRecommendationReason: "Bilal matches custom luxury concealed mixer reconstruction. High rating for premium bathroom finishes and currently available in the required Slot.",
    amount: 3500,
    serviceCharges: 350,
    platformCommission: 700,
    netRevenue: 2800
  },
  {
    id: "BKG-103",
    bookingDate: "2026-05-25",
    timeSlot: "14:00 - 16:00",
    status: "Dispute",
    serviceType: "Cleaning",
    customerId: "USR-004",
    customerName: "Kamran Akmal",
    customerEmail: "kamran.akmal@gmail.com",
    customerPhone: "+92 333 3344455",
    customerLocation: "House 80, Block C, Johar Town, Lahore",
    providerId: "SP-005",
    providerName: "Saima Bibi",
    providerCategory: "Cleaning",
    providerRating: 4.5,
    aiPrompt: "Need a full 3BHK deep clean with carpet vacuuming, kitchen degreasing, and balcony pressure washing. Need it done thoroughly on Monday afternoon.",
    aiRecommendedProviders: [
      { id: "SP-005", name: "Saima Bibi", score: 92, reason: "Professional cleaning agency lead, has mechanized floor polishers and steam vacuums. Proximity: Johar Town Lahore." }
    ],
    aiRecommendationReason: "Saima possesses high-grade heavy vacuums and industrial pressure washers requested. Her ratings show strong reliability for full deep clean modules.",
    amount: 5500,
    serviceCharges: 500,
    platformCommission: 1100,
    netRevenue: 4400,
    feedbackRating: 2,
    feedbackText: "The kitchen cabinets look slightly greasy and they refused to wash the window grills from the outer facade."
  },
  {
    id: "BKG-104",
    bookingDate: "2026-05-29",
    timeSlot: "10:00 - 12:00",
    status: "Cancelled",
    serviceType: "Painting",
    customerId: "USR-003",
    customerName: "Hassan Raza",
    customerEmail: "hassan.r@gmail.com",
    customerPhone: "+92 300 4445556",
    customerLocation: "House 2A, Gulberg III, Lahore",
    providerId: "SP-006",
    providerName: "Naveed Anwar",
    providerCategory: "Painting",
    providerRating: 4.2,
    aiPrompt: "Need emergency moisture-sealing primer coat on our dining wall as we have minor damp patch appearing after rains. Just one single wet patch to dry and seal.",
    aiRecommendedProviders: [
      { id: "SP-006", name: "Naveed Anwar", score: 78, reason: "Only painting provider currently configured near Gulberg." }
    ],
    aiRecommendationReason: "Assigned Naveed as the sole available paint contractor in Central Lahore context.",
    amount: 1200,
    serviceCharges: 100,
    platformCommission: 240,
    netRevenue: 960
  }
];

export const INITIAL_DISPUTES: Dispute[] = [
  {
    id: "DSP-501",
    bookingId: "BKG-103",
    bookingServiceType: "Cleaning",
    bookingAmount: 5500,
    customerName: "Kamran Akmal",
    providerName: "Saima Bibi",
    complaintText: "The cleaning team arrived late and completely missed cleaning behind the refrigerator. Furthermore, they left sticky residues on the kitchen countertops and claimed 'window grill facades' aren't covered in deep cleaning standard contracts. I want a 40% refund on this package.",
    providerResponseText: "Our contract states that outer facade window cleaning is restricted above the first floor for safety compliance. For Clifton and Lahore regulations, external harness-based facade washing requires pre-approval and special pricing. We spent 4.5 hours deep scrubbing. The residue is from a faulty polish the owner used, not our chemicals.",
    status: "In Review",
    evidenceUrls: [
      "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=200",
      "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&q=80&w=200"
    ],
    createdAt: "2026-05-26"
  }
];

export const INITIAL_NOTIFICATIONS: NotificationHistoryItem[] = [
  {
    id: "NOTI-001",
    title: "Monsoon Preparedness: Leakage Shield Discounts",
    message: "Protect your home from seepage! Book high-pressure waterproofing consultations on Karigar.ai today at flat 15% discount. Coupon: SHIELD15",
    sentDate: "2026-05-20",
    audience: "All Users",
    deliveryStatus: "Sent",
    recipientsCount: 4500
  },
  {
    id: "NOTI-002",
    title: "Urgent Commission Matrix Reconfiguration",
    message: "Attention Partners: Platform service commission has been adjusted to flat 15% across all smart match AC/Plumbing categories to help support fuel surcharge indexes.",
    sentDate: "2026-05-15",
    audience: "All Providers",
    deliveryStatus: "Sent",
    recipientsCount: 380
  }
];

export const INITIAL_AI_SUMMARY: AIAnalyticsSummary = {
  totalRequests: 14205,
  totalTokensUsed: 8452090,
  groqUsageCount: 4850,
  geminiUsageCount: 9355,
  fallbackRate: 2.1,
  avgResponseTime: 820,
  agents: [
    {
      name: "IntentValidationAgent",
      requestsCount: 14205,
      successRate: 98.6,
      failureRate: 1.4,
      avgProcessingTime: 180
    },
    {
      name: "ProviderDiscoveryAgent",
      requestsCount: 12110,
      successRate: 97.4,
      failureRate: 2.6,
      avgProcessingTime: 320
    },
    {
      name: "SmartMatchAgent",
      requestsCount: 10450,
      successRate: 96.2,
      failureRate: 3.8,
      avgProcessingTime: 450
    },
    {
      name: "BookingConfirmationAgent",
      requestsCount: 8120,
      successRate: 99.1,
      failureRate: 0.9,
      avgProcessingTime: 120
    },
    {
      name: "ChatSummarizerAgent",
      requestsCount: 14205,
      successRate: 99.8,
      failureRate: 0.2,
      avgProcessingTime: 220
    }
  ]
};

// Simple helpers to handle local storage persistence
export const loadData = <T>(key: string, defaultValue: T): T => {
  const data = localStorage.getItem(key);
  if (!data) return defaultValue;
  try {
    return JSON.parse(data);
  } catch (e) {
    return defaultValue;
  }
};

export const saveData = <T>(key: string, value: T): void => {
  localStorage.setItem(key, JSON.stringify(value));
};
