
import { Booking, Dispute, ServiceType } from '../types';

export const MOCK_BOOKINGS: Booking[] = [
  {
    id: 'B1',
    customer: {
      id: 'C1',
      name: 'John Doe',
      phone: '+92 300 1234567',
      email: 'john@example.com',
      address: '123 Maple St, Springfield'
    },
    serviceType: 'AC Repair',
    status: 'In Progress',
    date: '2026-05-18',
    time: '10:00 AM',
    price: 15000,
    description: 'AC unit making loud noise and not cooling properly.',
    createdAt: '2026-05-15T10:00:00Z'
  },
  {
    id: 'B2',
    customer: {
      id: 'C2',
      name: 'Jane Smith',
      phone: '+92 321 9876543',
      email: 'jane@example.com',
      address: '456 Oak Ave, Riverside'
    },
    serviceType: 'AC Repair',
    status: 'Pending',
    date: '2026-05-18',
    time: '02:00 PM',
    price: 8500,
    description: 'Routine maintenance and filter cleaning.',
    createdAt: '2026-05-16T14:30:00Z'
  },
  {
    id: 'B3',
    customer: {
      id: 'C3',
      name: 'Robert Brown',
      phone: '+92 333 5550109',
      email: 'robert@example.com',
      address: '789 Pine Ln, Laketown'
    },
    serviceType: 'AC Repair',
    status: 'Completed',
    date: '2026-05-17',
    time: '09:00 AM',
    price: 21000,
    description: 'Compressor replacement.',
    createdAt: '2026-05-14T08:00:00Z',
    feedback: {
      rating: 5,
      comment: 'Excellent work! The AC is cooling perfectly now. Very professional and on time.',
      createdAt: '2026-05-17T14:30:00Z'
    }
  },
  {
    id: 'B4',
    customer: {
      id: 'C4',
      name: 'Alice Wilson',
      phone: '+92 312 4442223',
      email: 'alice@example.com',
      address: '321 Elm Dr, Hillcrest'
    },
    serviceType: 'AC Repair',
    status: 'Dispute',
    date: '2026-05-16',
    time: '11:00 AM',
    price: 12000,
    description: 'Leaking water after service.',
    createdAt: '2026-05-15T09:00:00Z',
    feedback: {
      rating: 2,
      comment: 'The technician left quickly but the unit started leaking again within hours. Very disappointed.',
      createdAt: '2026-05-16T16:45:00Z'
    }
  }
];

export const MOCK_DISPUTES: Dispute[] = [
  {
    id: 'D1',
    bookingId: 'B4',
    type: 'poor service',
    status: 'open',
    description: 'The unit started leaking water just 2 hours after the technician left.',
    createdAt: '2026-05-16T15:00:00Z'
  }
];

export const SERVICE_CATEGORIES: { type: ServiceType; icon: string; color: string }[] = [
  { type: 'Electrician', icon: 'zap', color: 'bg-yellow-500' },
  { type: 'Plumber', icon: 'droplets', color: 'bg-blue-500' },
  { type: 'AC Repair', icon: 'wind', color: 'bg-cyan-500' },
  { type: 'Cleaning', icon: 'sparkles', color: 'bg-green-500' },
  { type: 'Car Wash', icon: 'car', color: 'bg-indigo-500' },
  { type: 'Beautician', icon: 'scissors', color: 'bg-pink-500' },
  { type: 'Tutor', icon: 'book-open', color: 'bg-orange-500' },
  { type: 'Carpenter', icon: 'hammer', color: 'bg-amber-700' },
  { type: 'Delivery', icon: 'truck', color: 'bg-red-500' },
  { type: 'Mechanic', icon: 'wrench', color: 'bg-gray-600' },
  { type: 'Photography', icon: 'camera', color: 'bg-purple-500' },
  { type: 'Others', icon: 'more-horizontal', color: 'bg-slate-400' },
];
