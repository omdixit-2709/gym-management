import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  FormHelperText,
  IconButton,
  SelectChangeEvent
} from '@mui/material';
import { format, parse, isWithinInterval, addMinutes, isAfter, isBefore } from 'date-fns';
import { StaffMember, DailyAttendance, AttendanceStatus, AttendanceSlot, AttendanceSettings } from '../../types/staff';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { recordAttendance, deleteAttendance } from '../../store/slices/staffSlice';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import DeleteIcon from '@mui/icons-material/Delete';

interface AttendanceDialogProps {
  open: boolean;
  onClose: () => void;
  staff: StaffMember | null;
  existingAttendance?: DailyAttendance;
}

const AttendanceDialog: React.FC<AttendanceDialogProps> = ({ open, onClose, staff, existingAttendance }) => {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<AttendanceSettings | null>(null);
  
  const [attendanceData, setAttendanceData] = useState<Partial<DailyAttendance>>({
    date: format(new Date(), 'yyyy-MM-dd'),
    morningSlot: { status: 'absent' },
    eveningSlot: { status: 'absent' },
    status: 'absent',
    notes: '',
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'attendance'));
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          const settingsData: AttendanceSettings = {
            morningSlot: {
              start: data.morningSlot?.start || '06:00',
              end: data.morningSlot?.end || '11:00',
              halfDayLimit: data.morningSlot?.halfDayLimit || '08:30'
            },
            eveningSlot: {
              start: data.eveningSlot?.start || '18:00',
              end: data.eveningSlot?.end || '22:00',
              halfDayLimit: data.eveningSlot?.halfDayLimit || '19:30'
            },
            allowedBuffer: data.allowedBuffer || 15,
            workingDays: data.workingDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
          };
          setSettings(settingsData);
        } else {
          const defaultSettings: AttendanceSettings = {
            morningSlot: { 
              start: '06:00', 
              end: '11:00',
              halfDayLimit: '08:30'
            },
            eveningSlot: { 
              start: '18:00', 
              end: '22:00',
              halfDayLimit: '19:30'
            },
            allowedBuffer: 15,
            workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
          };
          setSettings(defaultSettings);
        }
      } catch (err) {
        setError('Failed to load attendance settings. Please try again.');
      }
    };

    fetchSettings();
  }, []);

  useEffect(() => {
    if (existingAttendance) {
      setAttendanceData({
        ...existingAttendance,
        date: existingAttendance.date,
        morningSlot: existingAttendance.morningSlot || { status: 'absent' },
        eveningSlot: existingAttendance.eveningSlot || { status: 'absent' },
        status: existingAttendance.status,
        notes: existingAttendance.notes,
        leaveReason: existingAttendance.leaveReason,
      });
    }
  }, [existingAttendance]);

  const isWithinSlotTime = (slotType: 'morningSlot' | 'eveningSlot'): boolean => {
    if (!settings) return false;

    const now = new Date();
    const currentTime = format(now, 'HH:mm');
    const slotConfig = settings[slotType];
    
    const startTime = parse(slotConfig.start, 'HH:mm', now);
    const endTime = parse(slotConfig.end, 'HH:mm', now);
    const currentDateTime = parse(currentTime, 'HH:mm', now);
    const bufferEndTime = addMinutes(endTime, settings.allowedBuffer);

    return isWithinInterval(currentDateTime, { start: startTime, end: bufferEndTime });
  };

  const getCurrentSlot = (): 'morningSlot' | 'eveningSlot' | null => {
    if (isWithinSlotTime('morningSlot')) return 'morningSlot';
    if (isWithinSlotTime('eveningSlot')) return 'eveningSlot';
    return null;
  };

  const isWithinHalfDayLimit = (slotType: 'morningSlot' | 'eveningSlot'): boolean => {
    if (!settings) return false;

    const now = new Date();
    const currentTime = format(now, 'HH:mm');
    const slotConfig = settings[slotType];
    
    const halfDayLimit = parse(slotConfig.halfDayLimit, 'HH:mm', now);
    const currentDateTime = parse(currentTime, 'HH:mm', now);

    return isAfter(currentDateTime, halfDayLimit);
  };

  const handleStatusChange = (event: SelectChangeEvent<AttendanceStatus>) => {
    const status = event.target.value as AttendanceStatus;
    const currentSlot = getCurrentSlot();
    const isHalfDay = currentSlot && isWithinHalfDayLimit(currentSlot);

    if (currentSlot) {
      if (status === 'present' && isHalfDay) {
        setAttendanceData(prev => ({
          ...prev,
          status: 'halfDay',
          [currentSlot]: {
            status: 'late',
            checkInTime: format(new Date(), 'HH:mm'),
          }
        }));
      } else {
        setAttendanceData(prev => ({
          ...prev,
          status,
          [currentSlot]: {
            status: status === 'present' ? 'present' : 'absent',
            checkInTime: status === 'present' ? format(new Date(), 'HH:mm') : undefined,
          }
        }));
      }
    } else {
      setAttendanceData(prev => ({
        ...prev,
        status,
        morningSlot: { status: 'absent' },
        eveningSlot: { status: 'absent' },
      }));
    }
  };

  const handleDelete = async () => {
    if (!existingAttendance?.id) return;

    try {
      setLoading(true);
      setError(null);
      await dispatch(deleteAttendance(existingAttendance.id)).unwrap();
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!staff?.id || !settings) {
      setError('Staff information or settings not available');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const currentSlot = getCurrentSlot();
      const currentDate = new Date();
      const selectedDate = parse(attendanceData.date!, 'yyyy-MM-dd', new Date());
      
      if (isAfter(selectedDate, currentDate)) {
        throw new Error('Cannot mark attendance for future dates');
      }

      if (!currentSlot && !['paidLeave', 'unpaidLeave'].includes(attendanceData.status || '')) {
        throw new Error('Attendance can only be marked during designated time slots');
      }

      if (currentSlot && attendanceData.status === 'present' && isWithinHalfDayLimit(currentSlot)) {
        throw new Error('Cannot mark full attendance after half-day limit');
      }

      const attendance: Omit<DailyAttendance, 'id' | 'createdAt' | 'updatedAt'> = {
        staffId: staff.id,
        branchId: staff.branchId,
        date: attendanceData.date!,
        morningSlot: attendanceData.morningSlot!,
        eveningSlot: attendanceData.eveningSlot!,
        status: attendanceData.status!,
        leaveReason: attendanceData.leaveReason,
        notes: attendanceData.notes || '',
      };

      await dispatch(recordAttendance(attendance)).unwrap();
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to record attendance');
    } finally {
      setLoading(false);
    }
  };

  if (!settings) {
    return (
      <Dialog open={open} onClose={onClose}>
        <DialogContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  const currentSlot = getCurrentSlot();
  const isHalfDay = currentSlot && isWithinHalfDayLimit(currentSlot);
  const isLeaveStatus = ['paidLeave', 'unpaidLeave'].includes(attendanceData.status || '');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {existingAttendance ? 'Edit Attendance' : 'Record Attendance'} - {staff?.firstName} {staff?.lastName}
        {existingAttendance && (
          <IconButton
            onClick={handleDelete}
            color="error"
            sx={{ position: 'absolute', right: 8, top: 8 }}
            disabled={loading}
          >
            <DeleteIcon />
          </IconButton>
        )}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={attendanceData.status || 'absent'}
                onChange={handleStatusChange}
                label="Status"
                disabled={loading}
              >
                {currentSlot && (
                  <>
                    <MenuItem value="present" disabled={Boolean(isHalfDay)}>Present</MenuItem>
                    <MenuItem value="halfDay">Half Day</MenuItem>
                  </>
                )}
                <MenuItem value="paidLeave">Paid Leave</MenuItem>
                <MenuItem value="unpaidLeave">Unpaid Leave</MenuItem>
                <MenuItem value="absent">Absent</MenuItem>
              </Select>
              <FormHelperText>
                {currentSlot 
                  ? `Current slot: ${currentSlot === 'morningSlot' ? 'Morning' : 'Evening'}${isHalfDay ? ' (Half Day)' : ''}`
                  : 'Outside attendance hours'}
              </FormHelperText>
            </FormControl>
          </Grid>

          {isLeaveStatus && (
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Leave Reason"
                multiline
                rows={2}
                value={attendanceData.leaveReason || ''}
                onChange={(e) => setAttendanceData(prev => ({
                  ...prev,
                  leaveReason: e.target.value
                }))}
                required
                disabled={loading}
              />
            </Grid>
          )}

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Notes"
              multiline
              rows={2}
              value={attendanceData.notes || ''}
              onChange={(e) => setAttendanceData(prev => ({
                ...prev,
                notes: e.target.value
              }))}
              disabled={loading}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || (!currentSlot && 
            !['paidLeave', 'unpaidLeave', 'absent'].includes(attendanceData.status || ''))}
        >
          {loading ? <CircularProgress size={24} /> : 'Save Attendance'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AttendanceDialog; 