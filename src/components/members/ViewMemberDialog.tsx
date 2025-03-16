import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Typography,
  Box,
  Chip,
} from '@mui/material';
import { Member } from '../../types/member';
import { format } from 'date-fns';

interface ViewMemberDialogProps {
  open: boolean;
  onClose: () => void;
  member: Member | null;
}

const ViewMemberDialog: React.FC<ViewMemberDialogProps> = ({ open, onClose, member }) => {
  if (!member) return null;

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'PPP');
  };

  const getSubscriptionStatus = () => {
    const endDate = new Date(member.subscriptionEndDate);
    const now = new Date();
    const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) return { label: 'Expired', color: 'error' };
    if (daysLeft <= 7) return { label: 'Expiring Soon', color: 'warning' };
    return { label: 'Active', color: 'success' };
  };

  const subscriptionStatus = getSubscriptionStatus();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Member Details</DialogTitle>
      <DialogContent>
        <Grid container spacing={2}>
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

          <Grid item xs={12}>
            <Typography variant="h6" align="center" gutterBottom>
              {member.firstName} {member.lastName}
            </Typography>
          </Grid>

          <Grid item xs={12} display="flex" justifyContent="center" mb={2}>
            <Chip
              label={subscriptionStatus.label}
              color={subscriptionStatus.color as any}
              variant="outlined"
            />
          </Grid>

          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Email
            </Typography>
            <Typography variant="body1">{member.email}</Typography>
          </Grid>

          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Phone
            </Typography>
            <Typography variant="body1">{member.phone}</Typography>
          </Grid>

          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Join Date
            </Typography>
            <Typography variant="body1">{formatDate(member.joinDate)}</Typography>
          </Grid>

          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Subscription Type
            </Typography>
            <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
              {member.subscriptionType}
            </Typography>
          </Grid>

          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Subscription End Date
            </Typography>
            <Typography variant="body1">{formatDate(member.subscriptionEndDate)}</Typography>
          </Grid>

          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Payment Status
            </Typography>
            <Chip
              label={member.paymentStatus.toUpperCase()}
              color={member.paymentStatus === 'paid' ? 'success' : member.paymentStatus === 'pending' ? 'warning' : 'error'}
              size="small"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ViewMemberDialog; 