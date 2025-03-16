import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  TextField,
  MenuItem,
  Box,
  Alert,
} from '@mui/material';
import { Member, SubscriptionType, PaymentStatus } from '../../types/member';
import { updateMember } from '../../store/slices/memberSlice';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { format, isAfter, parseISO } from 'date-fns';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';

interface EditMemberDialogProps {
  open: boolean;
  onClose: () => void;
  member: Member | null;
}

const subscriptionTypes: SubscriptionType[] = ['monthly', 'quarterly', 'semi-annual', 'annual'];
const paymentStatuses: PaymentStatus[] = ['paid', 'pending', 'overdue'];

const EditMemberDialog: React.FC<EditMemberDialogProps> = ({ open, onClose, member }) => {
  const dispatch = useAppDispatch();
  const [formData, setFormData] = useState<Partial<Member>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (member) {
      setFormData({
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        phone: member.phone,
        subscriptionType: member.subscriptionType,
        joinDate: format(new Date(member.joinDate), 'yyyy-MM-dd'),
        subscriptionEndDate: format(new Date(member.subscriptionEndDate), 'yyyy-MM-dd'),
        paymentStatus: member.paymentStatus,
      });
      setError(null);
    }
  }, [member]);

  if (!member) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const validateDates = () => {
    if (!formData.joinDate || !formData.subscriptionEndDate) {
      setError('Both join date and end date are required');
      return false;
    }

    const joinDate = parseISO(formData.joinDate);
    const endDate = parseISO(formData.subscriptionEndDate);

    if (isAfter(joinDate, endDate)) {
      setError('Join date must be before subscription end date');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    try {
      if (!member?.id) {
        throw new Error('Member ID is required for editing');
      }

      const memberRef = doc(db, 'members', member.id);
      await updateDoc(memberRef, {
        ...formData,
        updatedAt: new Date().toISOString(),
      });

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update member');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Member</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} display="flex" justifyContent="center" mb={2}>
            <Box
              component="img"
              src={member.photoUrl || '/default-avatar.png'}
              alt={`${member.firstName} ${member.lastName}`}
              sx={{
                width: 120,
                height: 120,
                borderRadius: '50%',
                objectFit: 'cover',
              }}
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              fullWidth
              label="First Name"
              name="firstName"
              value={formData.firstName || ''}
              onChange={handleChange}
              required
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Last Name"
              name="lastName"
              value={formData.lastName || ''}
              onChange={handleChange}
              required
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={formData.email || ''}
              onChange={handleChange}
              required
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Phone"
              name="phone"
              value={formData.phone || ''}
              onChange={handleChange}
              required
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Join Date"
              name="joinDate"
              type="date"
              value={formData.joinDate || ''}
              onChange={handleChange}
              required
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              fullWidth
              select
              label="Subscription Type"
              name="subscriptionType"
              value={formData.subscriptionType || ''}
              onChange={handleChange}
              required
            >
              {subscriptionTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Subscription End Date"
              name="subscriptionEndDate"
              type="date"
              value={formData.subscriptionEndDate || ''}
              onChange={handleChange}
              required
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              fullWidth
              select
              label="Payment Status"
              name="paymentStatus"
              value={formData.paymentStatus || ''}
              onChange={handleChange}
              required
            >
              {paymentStatuses.map((status) => (
                <MenuItem key={status} value={status}>
                  {status.toUpperCase()}
                </MenuItem>
              ))}
            </TextField>
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
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditMemberDialog; 