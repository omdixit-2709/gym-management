export interface TimeSlot {
  startTime: string;  // Format: "HH:mm"
  endTime: string;    // Format: "HH:mm"
  halfDayLimit?: number; // Minutes after which attendance is marked as half day
}

export interface AttendanceSettings {
  morningSlot: TimeSlot;
  eveningSlot: TimeSlot;
  allowPaidLeave: boolean;
  maxPaidLeavePerMonth: number;
  maxPaidLeavePerYear: number;
  halfDayCount: boolean; // Whether to count half days
}

export interface Settings {
  attendance: AttendanceSettings;
  // Add other settings categories here as needed
}

export const DEFAULT_SETTINGS: Settings = {
  attendance: {
    morningSlot: {
      startTime: "06:00",
      endTime: "06:15",
      halfDayLimit: 15
    },
    eveningSlot: {
      startTime: "18:00",
      endTime: "18:15",
      halfDayLimit: 15
    },
    allowPaidLeave: true,
    maxPaidLeavePerMonth: 2,
    maxPaidLeavePerYear: 12,
    halfDayCount: true
  }
}; 