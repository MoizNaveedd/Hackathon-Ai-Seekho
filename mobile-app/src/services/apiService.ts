/**
 * Karigar.ai - API Service
 *
 * Centralized layer for all backend API calls.
 * Base URL is read from the EXPO_PUBLIC_API_BASE_URL environment variable.
 */

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://karigar-ai-backend.onrender.com";

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
  type: string;          // e.g. "google"
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

export type MessageRole = 'user' | 'assistant';

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
}

export interface Provider {
  id: number;
  name: string;
  location: string;
  rating: number;
  distance_km: number;
  hourly_rate?: number;
  booking_date?: string;
  available_slots: string[];
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

export interface ChatResponse {
  reply: string;
  language: string;
  phase: string;
  session_id: number;
  state: ChatState;
  providers: Provider[] | null;
  booking_summary: any | null;
  booking_id: number | null;
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

// ─────────────────────────────────────────────
// Endpoints
// ─────────────────────────────────────────────

/**
 * POST /sso_login
 * Matches (or auto-registers) the Google user in the backend.
 * Returns the backend user object which includes `user_id`.
 */
export async function ssoLogin(googleUserData: GoogleUserData): Promise<SSOLoginResponse> {
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
  longitude: number
): Promise<void> {
  const body: LocationUpdateRequest = { user_id: userId, latitude, longitude };
  await post<unknown>("/update_user_location", body);
}

/**
 * POST /chat/v2
 * Sends the message to the AI orchestrator.
 * @param request - ChatRequest for v2 endpoint
 */
export async function chat(
  request: ChatRequest
): Promise<ChatResponse> {
  return post<ChatResponse>("/chat/v2", request);
}
