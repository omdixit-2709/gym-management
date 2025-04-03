import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box, Container } from '@mui/material';
import AttendanceNav from '../components/staff/AttendanceNav';
import AttendanceManagement from '../components/staff/AttendanceManagement';
import AttendanceSettings from '../components/staff/AttendanceSettings';
import MonthlyAttendanceReport from '../components/staff/MonthlyAttendanceReport';
import AttendanceDialog from '../components/staff/AttendanceDialog';
import { DailyAttendance } from '../types/staff';

const AttendanceRoutes: React.FC = () => {
  const [currentDate] = useState(new Date());
  const [selectedAttendance, setSelectedAttendance] = useState<DailyAttendance | null>(null);

  return (
    <Box>
      <AttendanceNav />
      <Routes>
        <Route path="/" element={
          selectedAttendance ? (
            <AttendanceManagement
              attendance={selectedAttendance}
              onClose={() => setSelectedAttendance(null)}
            />
          ) : null
        } />
        <Route path="/settings" element={<AttendanceSettings />} />
        <Route path="/reports" element={
          <MonthlyAttendanceReport
            month={currentDate.getMonth() + 1}
            year={currentDate.getFullYear()}
          />
        } />
      </Routes>
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <AttendanceDialog
            open={!!selectedAttendance}
            onClose={() => setSelectedAttendance(null)}
            staff={null}
            existingAttendance={selectedAttendance || undefined}
          />
          <MonthlyAttendanceReport
            month={currentDate.getMonth() + 1}
            year={currentDate.getFullYear()}
          />
        </Box>
      </Container>
    </Box>
  );
};

export default AttendanceRoutes; 