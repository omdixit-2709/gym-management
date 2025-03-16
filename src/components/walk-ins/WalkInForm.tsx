import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  TextField,
  MenuItem,
  Alert,
} from '@mui/material';
import { WalkIn, InterestLevel } from '../../types/walkIn';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { addWalkIn, updateWalkIn } from '../../store/slices/walkInSlice';
import { format } from 'date-fns';

interface WalkInFormProps {
  open: boolean;
  onClose: () => void;
  walkIn?: WalkIn;
  isEdit?: boolean;
}

const interestLevels: InterestLevel[] = ['high', 'medium', 'low'];

const WalkInForm: React.FC<WalkInFormProps> = ({
  open,
  onClose,
  walkIn,
  isEdit = false,
}) => {
  const dispatch = useAppDispatch();
  const [formData, setFormData] = useState<Partial<WalkIn>>(
    walkIn || {
      name: '',
      email: '',
      phone: '',
      address: '',
      visitDate: format(new Date(), 'yyyy-MM-dd'),
      interestLevel: 'medium',
      followUpDate: format(new Date(), 'yyyy-MM-dd'),
      followUpTime: '10:00',
      status: 'pending',
      notes: '',
    }
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setError(null);
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Validate required fields
      const requiredFields = ['name', 'phone', 'visitDate', 'followUpDate', 'followUpTime'];
      const missingFields = requiredFields.filter(field => !formData[field as keyof WalkIn]);
      
      if (missingFields.length > 0) {
        throw new Error(`Please fill in all required fields: ${missingFields.join(', ')}`);
      }

      if (isEdit && walkIn?.id) {
        await dispatch(updateWalkIn({
          id: walkIn.id,
          data: {
            ...formData,
            updatedAt: new Date().toISOString(),
          },
        }));
      } else {
        await dispatch(addWalkIn({
          ...formData as Omit<WalkIn, 'id'>,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
      }
      
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save walk-in');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Walk-in' : 'New Walk-in'}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Visit Date"
              name="visitDate"
              type="date"
              value={formData.visitDate}
              onChange={handleChange}
              required
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              multiline
              rows={2}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              select
              label="Interest Level"
              name="interestLevel"
              value={formData.interestLevel}
              onChange={handleChange}
              required
            >
              {interestLevels.map((level) => (
                <MenuItem key={level} value={level}>
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Follow-up Date"
              name="followUpDate"
              type="date"
              value={formData.followUpDate}
              onChange={handleChange}
              required
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Follow-up Time"
              name="followUpTime"
              type="time"
              value={formData.followUpTime}
              onChange={handleChange}
              required
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              multiline
              rows={4}
              placeholder="Enter conversation details, preferences, or any other relevant information..."
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : isEdit ? 'Update' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WalkInForm; 