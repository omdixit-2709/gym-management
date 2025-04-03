import React, { useEffect, useState } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
} from '@mui/material';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { calculateMonthlyAttendance } from '../../store/slices/staffSlice';
import { MonthlyAttendance } from '../../types/staff';

interface Props {
  month: number;
  year: number;
}

const MonthlyAttendanceReport: React.FC<Props> = ({ month, year }) => {
  const dispatch = useAppDispatch();
  const monthlyAttendance = useAppSelector((state) => state.staff.monthlyAttendance);

  useEffect(() => {
    dispatch(calculateMonthlyAttendance({ month, year }));
  }, [dispatch, month, year]);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Monthly Attendance Report - {month}/{year}
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Staff Name</TableCell>
              <TableCell align="right">Present Days</TableCell>
              <TableCell align="right">Half Days</TableCell>
              <TableCell align="right">Absent Days</TableCell>
              <TableCell align="right">Paid Leave</TableCell>
              <TableCell align="right">Unpaid Leave</TableCell>
              <TableCell align="right">Working Days</TableCell>
              <TableCell align="right">Attendance %</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {monthlyAttendance.map((record) => (
              <TableRow key={record.staffId}>
                <TableCell>
                  {record.firstName} {record.lastName}
                </TableCell>
                <TableCell align="right">{record.presentDays}</TableCell>
                <TableCell align="right">{record.halfDays}</TableCell>
                <TableCell align="right">{record.absentDays}</TableCell>
                <TableCell align="right">{record.paidLeaveDays}</TableCell>
                <TableCell align="right">{record.unpaidLeaveDays}</TableCell>
                <TableCell align="right">{record.totalWorkingDays}</TableCell>
                <TableCell align="right">
                  {record.attendancePercentage.toFixed(1)}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default MonthlyAttendanceReport; 