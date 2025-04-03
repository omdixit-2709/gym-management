import { parseISO, format, differenceInMinutes, isWithinInterval, parse, addMinutes, isAfter } from 'date-fns';
import { AttendanceSettings, SlotConfig } from '../types/staff';
import { AttendanceSlot, AttendanceStatus, DailyAttendance } from '../types/staff';

export const isWithinTimeSlot = (time: Date, slotConfig: SlotConfig): boolean => {
  const startTime = parse(slotConfig.start, 'HH:mm', time);
  const endTime = parse(slotConfig.end, 'HH:mm', time);
  
  return isWithinInterval(time, { start: startTime, end: endTime });
};

export const calculateSlotStatus = (
  checkInTime: string | null,
  slotConfig: SlotConfig
): AttendanceSlot => {
  if (!checkInTime) {
    return { status: 'absent' };
  }

  const checkInDate = parseISO(checkInTime);
  const slotStartTime = parse(slotConfig.start, 'HH:mm', checkInDate);
  const lateMinutes = Math.max(0, differenceInMinutes(checkInDate, slotStartTime));
  const halfDayLimitTime = parse(slotConfig.halfDayLimit, 'HH:mm', checkInDate);
  
  return {
    checkInTime,
    status: isAfter(checkInDate, halfDayLimitTime) ? 'late' : 'present',
    lateMinutes: lateMinutes > 0 ? lateMinutes : undefined
  };
};

export const calculateDailyStatus = (
  morningSlot: AttendanceSlot | undefined,
  eveningSlot: AttendanceSlot | undefined,
  settings: AttendanceSettings
): AttendanceStatus => {
  if (!morningSlot && !eveningSlot) return 'absent';
  
  const morningPresent = morningSlot?.status === 'present';
  const eveningPresent = eveningSlot?.status === 'present';
  
  if (morningPresent && eveningPresent) return 'present';
  if (morningPresent || eveningPresent) return 'halfDay';
  return 'absent';
};

export const createDailyAttendance = (
  staffId: string,
  branchId: string,
  date: string,
  settings: AttendanceSettings,
  morningCheckIn?: string,
  eveningCheckIn?: string
): DailyAttendance => {
  const morningSlot = morningCheckIn ? 
    calculateSlotStatus(morningCheckIn, settings.morningSlot) : undefined;
  
  const eveningSlot = eveningCheckIn ?
    calculateSlotStatus(eveningCheckIn, settings.eveningSlot) : undefined;
  
  const status = calculateDailyStatus(morningSlot, eveningSlot, settings);
  
  const now = new Date().toISOString();
  
  return {
    staffId,
    branchId,
    date,
    morningSlot,
    eveningSlot,
    status,
    createdAt: now,
    updatedAt: now
  };
};

export const validateLeaveRequest = (
  staffId: string,
  startDate: string,
  endDate: string,
  leaveType: 'paid' | 'unpaid',
  currentBalance: number,
  settings: AttendanceSettings
): { isValid: boolean; message?: string } => {
  if (leaveType === 'paid') {
    const requestedDays = differenceInMinutes(parseISO(endDate), parseISO(startDate)) / (24 * 60);
    
    if (requestedDays > currentBalance) {
      return {
        isValid: false,
        message: `Insufficient paid leave balance. Available: ${currentBalance} days`
      };
    }
    
    const maxPaidLeavePerMonth = settings.maxPaidLeavePerMonth || 2; // Default to 2 if not set
    if (requestedDays > maxPaidLeavePerMonth) {
      return {
        isValid: false,
        message: `Cannot take more than ${maxPaidLeavePerMonth} paid leaves per month`
      };
    }
  }
  
  return { isValid: true };
};

export const isWithinSlotTime = (
  settings: AttendanceSettings,
  slotType: 'morningSlot' | 'eveningSlot',
  time: string | null = null
): boolean => {
  const now = time ? parse(time, 'HH:mm', new Date()) : new Date();
  const currentTime = format(now, 'HH:mm');
  const slotConfig = settings[slotType];
  
  const startTime = parse(slotConfig.start, 'HH:mm', now);
  const endTime = parse(slotConfig.end, 'HH:mm', now);
  const currentDateTime = parse(currentTime, 'HH:mm', now);
  const bufferEndTime = addMinutes(endTime, settings.allowedBuffer);

  return isWithinInterval(currentDateTime, { start: startTime, end: bufferEndTime });
};

export const getCurrentSlot = (
  settings: AttendanceSettings,
  time: string | null = null
): 'morningSlot' | 'eveningSlot' | null => {
  if (isWithinSlotTime(settings, 'morningSlot', time)) return 'morningSlot';
  if (isWithinSlotTime(settings, 'eveningSlot', time)) return 'eveningSlot';
  return null;
};

export const isWithinHalfDayLimit = (
  settings: AttendanceSettings,
  slotType: 'morningSlot' | 'eveningSlot',
  time: string | null = null
): boolean => {
  const now = time ? parse(time, 'HH:mm', new Date()) : new Date();
  const currentTime = format(now, 'HH:mm');
  const slotConfig = settings[slotType];
  
  const halfDayLimit = parse(slotConfig.halfDayLimit, 'HH:mm', now);
  const currentDateTime = parse(currentTime, 'HH:mm', now);

  return isAfter(currentDateTime, halfDayLimit);
};

export const calculateAttendanceStatus = (
  morningSlot: AttendanceSlot | undefined,
  eveningSlot: AttendanceSlot | undefined,
  leaveType?: 'paid' | 'unpaid'
): DailyAttendance['status'] => {
  if (leaveType === 'paid') return 'paidLeave';
  if (leaveType === 'unpaid') return 'unpaidLeave';

  const morningStatus = morningSlot?.status || 'absent';
  const eveningStatus = eveningSlot?.status || 'absent';

  if (morningStatus === 'present' && eveningStatus === 'present') {
    return 'present';
  } else if (morningStatus === 'present' || eveningStatus === 'present') {
    return 'halfDay';
  }

  return 'absent';
}; 