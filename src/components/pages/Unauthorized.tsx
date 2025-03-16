import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const Unauthorized: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box
      p={3}
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="80vh"
    >
      <Typography variant="h4" color="error" gutterBottom>
        Unauthorized Access
      </Typography>
      <Typography variant="body1" paragraph>
        You don't have permission to access this page.
      </Typography>
      <Button
        variant="contained"
        color="primary"
        onClick={() => navigate('/dashboard')}
      >
        Go to Dashboard
      </Button>
    </Box>
  );
};

export default Unauthorized; 