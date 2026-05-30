/**
 * Karigar.ai - API Service
 *
 * Centralized layer for all backend API calls.
 * Base URL is read from the EXPO_PUBLIC_API_BASE_URL environment variable.
 */

const BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  "https://karigar-ai-backend.onrender.com";

// ─────────────────────────────────────────────
// Types (mirroring api-docs.json schemas)
// ─────────────────────────────────────────────

export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  givenName?: string | null;
  familyName?: string | null;
  photo?: string | null;
}

export interface GoogleUserData {
  user: GoogleUser;
  scopes?: string[] | null;
  serverAuthCode?: string | null;
  idToken?: string | null;
}

export interface SSOLoginRequest {
  type: string; // e.g. "google"
  data: GoogleUserData;
}

export interface BackendUser {
  id: number;
  name: string;
  email: string;
  google_id: string;
  photo: string;
  location: string;
  latitude: number;
  longitude: number;
}

export interface SSOLoginResponse {
  message: string;
  user: BackendUser;
}

export interface LocationUpdateRequest {
  user_id: number;
  latitude: number;
  longitude: number;
}

// ─────────────────────────────────────────────
// /chat
// ─────────────────────────────────────────────

export type MessageRole = "user" | "assistant";

export interface ChatMessage {
  role: MessageRole;
  content: string;
}

export interface ChatRequest {
  message?: string | null;
  user_id?: number | null;
  session_id?: number | null;
  selected_provider_id?: number | null;
  selected_slot?: string | null;
  selected_date?: string | null;
  selected_cancel_booking_id?: number | null;
  latitude?: number;
  longitude?: number;
  location_name?: string | null;
}

export interface SmartMatchReason {
  factor: string;
  title: string;
  description: string;
}

export interface SmartMatch {
  headline: string;
  confidence: number;
  match_reasons: SmartMatchReason[];
  is_top_pick: boolean;
  reasoning_summary?: string | null;
}

export interface Provider {
  id: number;
  name: string;
  location: string;
  rating: number;
  distance_km: number | null;
  hourly_rate?: number;
  booking_date?: string;
  available_slots: string[] | { [date: string]: string[] };
  available_dates?: string[];
  latitude?: number | null;
  longitude?: number | null;
  service_type?: string;
  smart_match?: SmartMatch | null;
}

export interface ChatState {
  service_type: string;
  location: string;
  location_overridden: boolean;
  booking_type: string | null;
  booking_date: string | null;
  language: string;
  phase: string;
}

export interface CancelBookingItem {
  booking_id: number;
  service_type: string;
  provider_name: string;
  provider_id: number;
  date: string;
  slot: string;
  price: number;
}

export interface ChatResponse {
  reply: string;
  language: string;
  phase: string;
  session_id: number;
  state: ChatState;
  providers: Provider[] | null;
  booking_summary: any | null;
  booking_id: number | null;
  requires_location?: boolean;
  cancel_bookings?: CancelBookingItem[] | null;
}

export interface BookingProvider {
  id: number;
  name: string;
  service_type: string;
  location: string;
  rating: number;
}

export interface BookingUser {
  id: number;
  name: string;
  email: string;
  location: string;
}

export interface BookingItem {
  id: number;
  user_intent: string;
  user_id: number;
  provider_id: number;
  time_slot: string;
  booking_date: string;
  status: string;
  service_type: string;
  price: number;
  description: string | null;
  feedback: string | null;
  customer_feedback: string | null;
  customer_rating: number | null;
  prompt: string | null;
  provider: BookingProvider;
  user: BookingUser;
}

export interface BookingsResponse {
  bookings: BookingItem[];
  total_count: number;
  page: number;
  limit: number;
  total_pages: number;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

async function post<T>(path: string, body: unknown): Promise<T> {
  const url = `${BASE_URL}${path}`;
  console.log(`📡 POST ${url}`, JSON.stringify(body));

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  console.log(`📩 Response ${response.status}: ${text}`);

  if (!response.ok) {
    throw new Error(`API error ${response.status}: ${text}`);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    // Some endpoints return an empty body on 200
    return {} as T;
  }
}

async function get<T>(path: string): Promise<T> {
  const url = `${BASE_URL}${path}`;
  console.log(`📡 GET ${url}`);

  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  const text = await response.text();
  console.log(`📩 Response ${response.status}: ${text}`);

  if (!response.ok) {
    throw new Error(`API error ${response.status}: ${text}`);
  }

  return JSON.parse(text) as T;
}

// ─────────────────────────────────────────────
// Endpoints
// ─────────────────────────────────────────────

/**
 * POST /sso_login
 * Matches (or auto-registers) the Google user in the backend.
 * Returns the backend user object which includes `user_id`.
 */
export async function ssoLogin(
  googleUserData: GoogleUserData,
): Promise<SSOLoginResponse> {
  const body: SSOLoginRequest = {
    type: "google",
    data: googleUserData,
  };
  return post<SSOLoginResponse>("/sso_login", body);
}

/**
 * POST /update_user_location
 * Updates the user's current coordinates in the backend.
 */
export async function updateUserLocation(
  userId: number,
  latitude: number,
  longitude: number,
): Promise<void> {
  const body: LocationUpdateRequest = { user_id: userId, latitude, longitude };
  await post<unknown>("/update_user_location", body);
}

/**
 * POST /chat/v2
 * Sends the message to the AI orchestrator.
 * @param request - ChatRequest for v2 endpoint
 */
export async function chat(request: ChatRequest): Promise<ChatResponse> {
  return post<ChatResponse>("/chat/v2", request);
}

/**
 * GET /bookings
 * Lists all bookings for a user.
 */
export async function getUserBookings(
  userId: number,
  status?: "upcoming" | "completed" | "cancelled",
): Promise<BookingsResponse> {
  const statusParam = status ? `&status=${status}` : "";
  return get<BookingsResponse>(`/bookings?user_id=${userId}${statusParam}`);
}

/**
 * POST /bookings/{booking_id}/cancel
 * Cancels a booking.
 */
export async function cancelBooking(
  bookingId: number,
  userId: number,
  reason?: string,
): Promise<void> {
  await post<void>(`/bookings/${bookingId}/cancel`, {
    user_id: userId,
    reason: reason || null,
  });
}

/**
 * POST /bookings/{booking_id}/complete
 * Marks a booking as completed.
 */
export async function completeBooking(
  bookingId: number,
  userId: number,
  rating?: number,
  feedback?: string,
): Promise<void> {
  await post<void>(`/bookings/${bookingId}/complete`, {
    user_id: userId,
    rating: rating || null,
    feedback: feedback || null,
  });
}

export interface ProviderListResponse {
  providers: Provider[];
  total_count: number;
  page: number;
  limit: number;
  total_pages: number;
}

/**
 * GET /providers
 * Fetches the list of service providers, optionally sorted by distance if coordinates are provided.
 */
export async function getProviders(params?: {
  service_type?: string;
  location?: string;
  min_rating?: number;
  latitude?: number;
  longitude?: number;
  max_distance_km?: number;
  booking_date?: string;
  sort_by?: "rating" | "distance" | "name";
  page?: number;
  limit?: number;
}): Promise<ProviderListResponse> {
  let query = "";
  if (params) {
    const parts: string[] = [];
    if (params.service_type)
      parts.push(`service_type=${encodeURIComponent(params.service_type)}`);
    if (params.location)
      parts.push(`location=${encodeURIComponent(params.location)}`);
    if (params.min_rating !== undefined)
      parts.push(`min_rating=${params.min_rating}`);
    if (params.latitude !== undefined && params.latitude !== null)
      parts.push(`latitude=${params.latitude}`);
    if (params.longitude !== undefined && params.longitude !== null)
      parts.push(`longitude=${params.longitude}`);
    if (params.max_distance_km !== undefined)
      parts.push(`max_distance_km=${params.max_distance_km}`);
    if (params.booking_date) parts.push(`booking_date=${params.booking_date}`);
    if (params.sort_by) parts.push(`sort_by=${params.sort_by}`);
    if (params.page !== undefined) parts.push(`page=${params.page}`);
    if (params.limit !== undefined) parts.push(`limit=${params.limit}`);

    if (parts.length > 0) {
      query = "?" + parts.join("&");
    }
  }
  return get<ProviderListResponse>(`/providers${query}`);
}

/**
 * GET /providers/{provider_id}
 * Retrieves details of a single provider by ID.
 */
export async function getProviderDetails(
  providerId: number,
  latitude?: number | null,
  longitude?: number | null,
): Promise<Provider> {
  let query = "";
  if (
    latitude !== undefined &&
    latitude !== null &&
    longitude !== undefined &&
    longitude !== null
  ) {
    query = `?latitude=${latitude}&longitude=${longitude}`;
  }
  return get<Provider>(`/providers/${providerId}${query}`);
}

export interface SessionItem {
  session_id: number;
  status: string;
  service_type: string;
  phase: string;
  message_count: number;
  last_message: string;
  last_message_at: string;
  created_at: string;
}

export interface SessionsResponse {
  user_id: number;
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
  sessions: SessionItem[];
}

export interface ChatHistoryMessage {
  role: string;
  content: string;
  created_at: string;
}

export interface ChatHistoryResponse {
  session_id: number;
  user_id: number;
  status: string;
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
  messages: ChatHistoryMessage[];
}

/**
 * GET /users/{user_id}/sessions
 * Retrieves past chat sessions for a user.
 */
export async function getUserSessions(
  userId: number,
  limit: number = 20,
): Promise<SessionsResponse> {
  return get<SessionsResponse>(`/users/${userId}/sessions?limit=${limit}`);
}

/**
 * GET /chat/{session_id}/history
 * Retrieves full history of a given chat session.
 */
export async function getChatHistory(
  sessionId: number,
  limit: number = 100,
): Promise<ChatHistoryResponse> {
  return get<ChatHistoryResponse>(`/chat/${sessionId}/history?limit=${limit}`);
}
