import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  TextField,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Avatar,
  Chip,
  SelectChangeEvent,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format, parse, isWithinInterval, addMinutes } from 'date-fns';
import { StaffMember, Attendance, DailyAttendance, AttendanceStatus, AttendanceSlot } from '../../types/staff';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { recordAttendance, fetchStaffAttendance, updateAttendance } from '../../store/slices/staffSlice';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import EditIcon from '@mui/icons-material/Edit';
import AttendanceDialog from './AttendanceDialog';
import { RootState } from '../../store';

interface LeaveDialogProps {
  open: boolean;
  onClose: () => void;
  staff: StaffMember;
  date: Date;
  onSave: (leaveType: 'paid_leave' | 'half_day_leave', reason: string) => void;
}

const LeaveDialog: React.FC<LeaveDialogProps> = ({ open, onClose, staff, date, onSave }) => {
  const [leaveType, setLeaveType] = useState<'paid_leave' | 'half_day_leave'>('paid_leave');
  const [reason, setReason] = useState('');

  const handleSave = () => {
    onSave(leaveType, reason);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Mark Leave - {staff.firstName} {staff.lastName}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Leave Type</InputLabel>
              <Select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as 'paid_leave' | 'half_day_leave')}
                label="Leave Type"
              >
                <MenuItem value="paid_leave">Paid Leave</MenuItem>
                <MenuItem value="half_day_leave">Half Day Leave</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Reason"
              multiline
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={!reason}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

interface Props {
  attendance: DailyAttendance;
  onClose: () => void;
}

const AttendanceManagement: React.FC<Props> = ({ attendance, onClose }) => {
  const dispatch = useAppDispatch();
  const settings = useAppSelector((state: RootState) => state.settings.data.attendance);
  const staff = useAppSelector((state: RootState) => state.staff.staff.find(s => s.id === attendance.staffId));
  
  const [currentAttendance, setCurrentAttendance] = useState<DailyAttendance>(attendance);
  const [leaveReason, setLeaveReason] = useState(attendance.leaveReason || '');

  const handleStatusChange = (slot: 'morningSlot' | 'eveningSlot') => (event: SelectChangeEvent) => {
    const status = event.target.value as AttendanceSlot['status'];
    const now = new Date().toISOString();
    
    setCurrentAttendance(prev => ({
      ...prev,
      [slot]: {
        status,
        checkInTime: status === 'present' ? now : undefined,
        lateMinutes: 0
      },
      status: calculateOverallStatus(
        slot === 'morningSlot' ? status : prev.morningSlot?.status,
        slot === 'eveningSlot' ? status : prev.eveningSlot?.status
      ),
      updatedAt: now
    }));
  };

  const handleLeaveStatusChange = (event: SelectChangeEvent) => {
    const leaveType = event.target.value as 'paid' | 'unpaid' | '';
    const now = new Date().toISOString();
    
    setCurrentAttendance(prev => ({
      ...prev,
      status: leaveType === 'paid' ? 'paidLeave' : leaveType === 'unpaid' ? 'unpaidLeave' : 'absent',
      leaveType: leaveType || undefined,
      leaveReason: leaveType ? leaveReason : undefined,
      morningSlot: undefined,
      eveningSlot: undefined,
      updatedAt: now
    }));
  };

  const calculateOverallStatus = (
    morningStatus?: AttendanceSlot['status'],
    eveningStatus?: AttendanceSlot['status']
  ): AttendanceStatus => {
    if (!morningStatus && !eveningStatus) return 'absent';
    if (morningStatus === 'present' && eveningStatus === 'present') return 'present';
    if (morningStatus === 'present' || eveningStatus === 'present') return 'halfDay';
    return 'absent';
  };

  const handleSave = async () => {
    try {
      await dispatch(updateAttendance(currentAttendance)).unwrap();
      onClose();
    } catch (error) {
      console.error('Failed to update attendance:', error);
    }
  };

  if (!settings || !staff) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <AttendanceDialog
        open={true}
        onClose={onClose}
        staff={staff}
        existingAttendance={attendance}
      />
    </Paper>
  );
};

export default AttendanceManagement; 