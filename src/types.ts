export type Role = 'admin' | 'tnv';

export interface User {
  id: string;
  role: Role;
  fullName: string;
  email: string;
  phone: string;
  facebookLink?: string;
  department: string;
  notes?: string;
  salaryRate: number; // e.g. 50000 VND / shift
  createdAt: number;
  updatedAt: number;
}

export interface Checkin {
  id: string;
  userId: string;
  fullName: string;
  department: string;
  shiftName?: string; // e.g. "Ca Sáng (08:00 - 12:00)", "Ca Chiều (13:00 - 17:00)"
  status: 'pending' | 'approved';
  createdAt: number;
  updatedAt: number;
}
