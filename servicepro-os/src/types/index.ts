
export type ServiceType = 
  | 'Electrician' 
  | 'Plumber' 
  | 'AC Repair' 
  | 'Cleaning' 
  | 'Car Wash' 
  | 'Beautician' 
  | 'Tutor' 
  | 'Carpenter' 
  | 'Delivery' 
  | 'Mechanic' 
  | 'Photography' 
  | 'Others'
  | 'Locksmith'
  | 'Pest Control'
  | 'Appliance Repair'
  | 'Painter'
  | 'Plumbing'
  | 'Electrical'
  | 'AC Technician'
  | 'Home Cleaning';

export type BookingStatus = 'Pending' | 'In Progress' | 'Completed' | 'Cancelled' | 'Dispute';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
}

export interface BookingFeedback {
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Booking {
  id: string;
  customer: Customer;
  serviceType: ServiceType;
  status: BookingStatus;
  date: string;
  time: string;
  price: number;
  description: string;
  createdAt: string;
  feedback?: BookingFeedback;
}

export interface Dispute {
  id: string;
  bookingId: string;
  type: 'delay' | 'payment issue' | 'poor service' | 'cancellation';
  status: 'open' | 'in review' | 'resolved';
  description: string;
  createdAt: string;
}

export interface User {
  name: string;
  phone: string;
  email: string;
  serviceType: ServiceType;
  profileImage?: string;
}
