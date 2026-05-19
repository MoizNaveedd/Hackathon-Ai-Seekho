
const API_BASE_URL = 'https://karigar-backend-795466151653.us-central1.run.app';

export interface ServiceOption {
  service_type: string;
  provider_count: number;
}

export async function fetchServices(): Promise<ServiceOption[]> {
  const response = await fetch(`${API_BASE_URL}/providers/services`, {
    headers: { 'accept': 'application/json' }
  });
  if (!response.ok) throw new Error('Failed to fetch services');
  return response.json();
}

export interface RegisterData {
  name: string;
  phone: string;
  email: string;
  password: string;
  service_type: string;
  avatar?: File | null;
}

export async function loginUser(email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Login failed');
  }
  return result;
}

export async function fetchBookingById(id: string | number) {
  const response = await fetch(`${API_BASE_URL}/bookings/${id}`, {
    headers: { 'accept': 'application/json' }
  });
  if (!response.ok) throw new Error('Failed to fetch booking');
  const result = await response.json();
  if (!result.success) throw new Error(result.message || 'Booking not found');
  return result.data;
}

export async function completeBooking(bookingId: number | string, providerId: number | string, feedback: string, rating: number) {
  const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/complete`, {
    method: 'POST',
    headers: { 'accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider_id: Number(providerId), feedback, rating }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to complete booking');
  return result;
}

export async function cancelBooking(bookingId: number | string, providerId: number | string, reason = "Cancelled by provider") {
  const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/cancel`, {
    method: 'POST',
    headers: { 'accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider_id: Number(providerId), reason }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to cancel booking');
  return result;
}

export async function fetchBookings(providerId: number | string, page = 1, limit = 10) {
  const response = await fetch(
    `${API_BASE_URL}/bookings?provider_id=${providerId}&page=${page}&limit=${limit}`,
    { headers: { 'accept': 'application/json' } }
  );
  if (!response.ok) throw new Error('Failed to fetch bookings');
  return response.json();
}

export async function registerUser(data: RegisterData) {
  const formData = new FormData();
  formData.append('name', data.name);
  formData.append('phone', data.phone);
  formData.append('email', data.email);
  formData.append('password', data.password);
  formData.append('service_type', data.service_type);
  if (data.avatar) {
    formData.append('avatar', data.avatar);
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'accept': 'application/json' },
    body: formData,
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Registration failed');
  }
  return result;
}
