import React from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';

const AttendanceNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleChange = (_event: React.SyntheticEvent, newValue: string) => {
    navigate(newValue);
  };

  const value = location.pathname.startsWith('/attendance')
    ? location.pathname.replace('/attendance', '')
    : '/';

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Tabs value={value} onChange={handleChange}>
        <Tab label="Daily Attendance" value="/" />
        <Tab label="Monthly Report" value="/reports" />
        <Tab label="Settings" value="/settings" />
      </Tabs>
    </Box>
  );
};

export default AttendanceNav; 
 