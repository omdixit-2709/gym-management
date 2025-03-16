import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { WalkIn } from '../../types/walkIn';
import { format, isToday, parseISO, isFuture } from 'date-fns';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { updateWalkIn } from '../../store/slices/walkInSlice';

interface FollowUpManagerProps {
  walkIns: WalkIn[];
}

interface FollowUpNote {
  note: string;
  status: 'converted' | 'not_interested' | 'pending';
}

const FollowUpManager: React.FC<FollowUpManagerProps> = ({ walkIns }) => {
  const dispatch = useAppDispatch();
  const [selectedWalkIn, setSelectedWalkIn] = useState<WalkIn | null>(null);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [followUpNote, setFollowUpNote] = useState<FollowUpNote>({
    note: '',
    status: 'pending',
  });

  const todayFollowUps = walkIns.filter(
    (walkIn) =>
      walkIn.status === 'pending' && isToday(parseISO(walkIn.followUpDate))
  );

  const upcomingFollowUps = walkIns.filter(
    (walkIn) =>
      walkIn.status === 'pending' &&
      isFuture(parseISO(walkIn.followUpDate)) &&
      !isToday(parseISO(walkIn.followUpDate))
  );

  const handleStatusUpdate = async (walkIn: WalkIn, status: 'converted' | 'not_interested') => {
    setSelectedWalkIn(walkIn);
    setFollowUpNote({
      note: '',
      status,
    });
    setNoteDialogOpen(true);
  };

  const handleNoteSubmit = async () => {
    if (!selectedWalkIn) return;

    try {
      await dispatch(
        updateWalkIn({
          id: selectedWalkIn.id!,
          data: {
            status: followUpNote.status,
            notes: selectedWalkIn.notes
              ? `${selectedWalkIn.notes}\n\nFollow-up (${format(
                  new Date(),
                  'dd/MM/yyyy HH:mm'
                )}): ${followUpNote.note}`
              : `Follow-up (${format(new Date(), 'dd/MM/yyyy HH:mm')}): ${
                  followUpNote.note
                }`,
            updatedAt: new Date().toISOString(),
          },
        })
      );
      setNoteDialogOpen(false);
      setSelectedWalkIn(null);
      setFollowUpNote({ note: '', status: 'pending' });
    } catch (error) {
      console.error('Error updating follow-up:', error);
    }
  };

  const renderFollowUpList = (followUps: WalkIn[], title: string) => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title} ({followUps.length})
        </Typography>
        <List>
          {followUps.map((walkIn) => (
            <ListItem
              key={walkIn.id}
              divider
              sx={{
                backgroundColor: isToday(parseISO(walkIn.followUpDate))
                  ? 'warning.light'
                  : 'inherit',
              }}
            >
              <ListItemText
                primary={walkIn.name}
                secondary={
                  <React.Fragment>
                    <Typography component="span" variant="body2" color="text.primary">
                      {walkIn.phone}
                    </Typography>
                    <br />
                    Follow-up at: {walkIn.followUpTime}
                    <br />
                    Interest Level:{' '}
                    <Chip
                      label={walkIn.interestLevel}
                      size="small"
                      color={
                        walkIn.interestLevel === 'high'
                          ? 'success'
                          : walkIn.interestLevel === 'medium'
                          ? 'warning'
                          : 'error'
                      }
                    />
                  </React.Fragment>
                }
              />
              <ListItemSecondaryAction>
                <Tooltip title="Mark as Converted">
                  <IconButton
                    edge="end"
                    color="success"
                    onClick={() => handleStatusUpdate(walkIn, 'converted')}
                  >
                    <CheckCircleIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Mark as Not Interested">
                  <IconButton
                    edge="end"
                    color="error"
                    onClick={() => handleStatusUpdate(walkIn, 'not_interested')}
                  >
                    <CancelIcon />
                  </IconButton>
                </Tooltip>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      {renderFollowUpList(todayFollowUps, "Today's Follow-ups")}
      {renderFollowUpList(upcomingFollowUps, 'Upcoming Follow-ups')}

      <Dialog open={noteDialogOpen} onClose={() => setNoteDialogOpen(false)}>
        <DialogTitle>Add Follow-up Note</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Note"
            fullWidth
            multiline
            rows={4}
            value={followUpNote.note}
            onChange={(e) =>
              setFollowUpNote((prev) => ({ ...prev, note: e.target.value }))
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleNoteSubmit} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FollowUpManager; 