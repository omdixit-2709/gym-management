import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Button,
  Alert,
  Divider,
  Card,
  CardContent,
  CardHeader,
} from '@mui/material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { format, parse } from 'date-fns';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { AttendanceSettings } from '../../types/staff';

const DEFAULT_SETTINGS: AttendanceSettings = {
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
  workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
};

const Settings: React.FC = () => {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [settings, setSettings] = useState<AttendanceSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const settingsDoc = await getDoc(doc(db, 'settings', 'attendance'));
        if (settingsDoc.exists()) {
          setSettings(settingsDoc.data() as AttendanceSettings);
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
        setError('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleTimeChange = (slot: 'morningSlot' | 'eveningSlot', field: 'start' | 'end') => (date: Date | null) => {
    if (date) {
      setSettings(prev => ({
        ...prev,
        [slot]: {
          ...prev[slot],
          [field]: format(date, 'HH:mm'),
        },
      }));
    }
  };

  const handleBufferChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value);
    if (!isNaN(value) && value >= 0) {
      setSettings(prev => ({
        ...prev,
        allowedBuffer: value,
      }));
    }
  };

  const handleWorkingDayChange = (day: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setSettings(prev => ({
      ...prev,
      workingDays: checked
        ? [...prev.workingDays, day as any]
        : prev.workingDays.filter(d => d !== day),
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      await setDoc(doc(db, 'settings', 'attendance'), settings);
      setSuccess(true);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const parseTime = (timeString: string) => {
    return parse(timeString, 'HH:mm', new Date());
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>Settings</Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>Settings saved successfully!</Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Morning Slot Configuration" />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TimePicker
                    label="Start Time"
                    value={parseTime(settings.morningSlot.start)}
                    onChange={handleTimeChange('morningSlot', 'start')}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TimePicker
                    label="End Time"
                    value={parseTime(settings.morningSlot.end)}
                    onChange={handleTimeChange('morningSlot', 'end')}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Evening Slot Configuration" />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TimePicker
                    label="Start Time"
                    value={parseTime(settings.eveningSlot.start)}
                    onChange={handleTimeChange('eveningSlot', 'start')}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TimePicker
                    label="End Time"
                    value={parseTime(settings.eveningSlot.end)}
                    onChange={handleTimeChange('eveningSlot', 'end')}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardHeader title="General Settings" />
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Allowed Buffer Time (minutes)"
                    value={settings.allowedBuffer}
                    onChange={handleBufferChange}
                    inputProps={{ min: 0 }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <FormControl component="fieldset">
                    <FormLabel component="legend">Working Days</FormLabel>
                    <FormGroup row>
                      {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                        <FormControlLabel
                          key={day}
                          control={
                            <Checkbox
                              checked={settings.workingDays.includes(day as any)}
                              onChange={handleWorkingDayChange(day)}
                            />
                          }
                          label={day.charAt(0).toUpperCase() + day.slice(1)}
                        />
                      ))}
                    </FormGroup>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box mt={3} display="flex" justifyContent="flex-end">
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </Button>
      </Box>
    </Box>
  );
};

export default Settings; 