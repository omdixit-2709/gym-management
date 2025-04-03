import { Timestamp } from 'firebase/firestore';

export type StaffRole = 'admin' | 'manager' | 'receptionist';

export type AttendanceStatus = 'present' | 'absent' | 'halfDay' | 'paidLeave' | 'unpaidLeave';

export interface SlotConfig {
  start: string; // HH:mm format
  end: string;
  halfDayLimit: string; // HH:mm format
}

export interface TimeSlot {
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  halfDayLimit: number; // minutes
}

export interface AttendanceSlot {
  status: 'present' | 'absent' | 'late';
  checkInTime?: string;
  checkOutTime?: string;
  lateMinutes?: number;
}

export interface AttendanceSettings {
  morningSlot: SlotConfig;
  eveningSlot: SlotConfig;
  allowedBuffer: number; // minutes
  workingDays: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[];
  maxPaidLeavePerMonth?: number;
}

export interface StaffMember {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  designation: string;
  photoUrl?: string;
  isActive: boolean;
  branchId: string;
  joinDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Attendance {
  id: string;
  staffId: string;
  branchId: string;
  date: string;
  slot: AttendanceSlot;
  status: AttendanceStatus;
  checkInTime?: string;
  checkOutTime?: string;
  leaveReason?: string;
  notes?: string;
  morningSlot?: {
    status: AttendanceStatus;
    checkInTime?: string;
  };
  eveningSlot?: {
    status: AttendanceStatus;
    checkInTime?: string;
  };
  leaveStatus?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DailyAttendance {
  id?: string;
  staffId: string;
  branchId: string;
  date: string;
  morningSlot?: AttendanceSlot;
  eveningSlot?: AttendanceSlot;
  status: AttendanceStatus;
  leaveType?: 'paid' | 'unpaid';
  leaveReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyAttendance {
  staffId: string;
  firstName: string;
  lastName: string;
  month: number;
  year: number;
  totalDays: number;
  presentDays: number;
  halfDays: number;
  absentDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  totalWorkingDays: number;
  attendancePercentage: number;
}

export interface StaffFilters {
  searchQuery?: string;
  isActive?: boolean;
  branchId?: string;
  dateRange?: {
    start: string | null;
    end: string | null;
  };
}

export interface BiometricDevice {
  isConnected: boolean;
  deviceInfo: {
    id: string;
    name: string;
    type: string;
  } | null;
  error: string | null;
}

export interface LeaveBalance {
  staffId: string;
  year: number;
  totalPaidLeave: number;
  usedPaidLeave: number;
  remainingPaidLeave: number;
  lastUpdated: string;  // ISO string
} 