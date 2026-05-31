export type UserRole = 'Super Admin' | 'Operations Admin' | 'Support Agent' | 'Finance Admin';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export type ProviderStatus = 'Active' | 'Suspended' | 'Pending Verification';

export interface Review {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  date: string;
}

export interface ServiceProvider {
  id: string;
  name: string;
  email: string;
  phone: string;
  profilePicture?: string;
  category: 'AC Repair' | 'Plumbing' | 'Electrical' | 'Carpentry' | 'Cleaning' | 'Painting' | 'Others';
  rating: number;
  reviewsCount: number;
  city: string;
  region: string;
  registrationDate: string;
  status: ProviderStatus;
  hourlyRate: number;
  availableSlots: string[];
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  revenueGenerated: number;
  completionRate: number;
  reviews: Review[];
  about: string;
}

export type UserStatus = 'Active' | 'Suspended';

export interface User {
  id: string;
  name: string;
  email: string;
  googleId?: string;
  deviceType: 'Android' | 'iOS';
  deviceToken: string;
  registrationDate: string;
  status: UserStatus;
  totalChatSessions: number;
  totalBookings: number;
  totalSpend: number;
  lastLocation: {
    latitude: number;
    longitude: number;
    name: string;
  };
  totalTokensConsumed: number;
  totalConversations: number;
}

export type BookingStatus = 'Confirmed' | 'Completed' | 'Cancelled' | 'Dispute';

export interface RecommendedProvider {
  id: string;
  name: string;
  score: number;
  reason: string;
}

export interface Booking {
  id: string;
  bookingDate: string;
  timeSlot: string;
  status: BookingStatus;
  serviceType: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerLocation: string;
  providerId: string;
  providerName: string;
  providerCategory: string;
  providerRating: number;
  aiPrompt?: string;
  aiRecommendedProviders?: RecommendedProvider[];
  aiRecommendationReason?: string;
  amount: number;
  serviceCharges: number;
  platformCommission: number;
  netRevenue: number;
  feedbackRating?: number;
  feedbackText?: string;
}

export type DisputeStatus = 'Open' | 'In Review' | 'Resolved';

export interface Dispute {
  id: string;
  bookingId: string;
  bookingServiceType: string;
  bookingAmount: number;
  customerName: string;
  providerName: string;
  complaintText: string;
  providerResponseText?: string;
  status: DisputeStatus;
  evidenceUrls: string[];
  resolutionNotes?: string;
  createdAt: string;
}

export type NotificationAudience = 'All Users' | 'All Providers' | 'Selected Segment';

export interface NotificationHistoryItem {
  id: string;
  title: string;
  message: string;
  sentDate: string;
  audience: NotificationAudience;
  deliveryStatus: 'Sent' | 'Failed';
  recipientsCount: number;
}

export interface AgentMetric {
  name: string;
  requestsCount: number;
  successRate: number;
  failureRate: number;
  avgProcessingTime: number; // in ms
}

export interface AIAnalyticsSummary {
  totalRequests: number;
  totalTokensUsed: number;
  groqUsageCount: number;
  geminiUsageCount: number;
  fallbackRate: number; // e.g., 2.5%
  avgResponseTime: number; // in ms
  agents: AgentMetric[];
}
