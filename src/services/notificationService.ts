import { toast, ToastOptions } from 'react-toastify';
import { WalkIn } from '../types/walkIn';
import { format, isToday, parseISO, isSameMinute, subMinutes, addMinutes } from 'date-fns';

const defaultOptions: ToastOptions = {
  position: 'top-right',
  autoClose: 5000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
};

// Keep track of notifications we've already shown
const shownNotifications = new Set<string>();

export const showSuccess = (message: string) => {
  toast.success(message, defaultOptions);
};

export const showError = (message: string) => {
  toast.error(message, defaultOptions);
};

export const showFollowUpNotification = (walkIn: WalkIn) => {
  // Create a unique ID for this notification
  const notificationId = `${walkIn.id}-${walkIn.followUpDate}-${walkIn.followUpTime}`;
  
  // If we've already shown this notification, don't show it again
  if (shownNotifications.has(notificationId)) {
    return;
  }

  const followUpTime = walkIn.followUpTime;
  const followUpDate = format(parseISO(walkIn.followUpDate), 'dd/MM/yyyy');
  
  toast.info(`
    Follow-up Reminder
    
    Name: ${walkIn.name}
    Time: ${followUpTime}
    Phone: ${walkIn.phone}
    Interest Level: ${walkIn.interestLevel}
    ${walkIn.notes ? `Notes: ${walkIn.notes}` : ''}
  `, {
    ...defaultOptions,
    autoClose: false,
    onClick: () => {
      // Mark notification as acknowledged
      shownNotifications.add(notificationId);
    },
  });

  // Add to shown notifications
  shownNotifications.add(notificationId);
};

export const checkFollowUps = (walkIns: WalkIn[]) => {
  const now = new Date();
  const currentTime = format(now, 'HH:mm');

  walkIns
    .filter(walkIn => {
      if (walkIn.status !== 'pending') return false;
      if (!isToday(parseISO(walkIn.followUpDate))) return false;

      // Parse the follow-up time
      const [hours, minutes] = walkIn.followUpTime.split(':').map(Number);
      const followUpDateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
      
      // Check if the follow-up time is within the last minute
      // This prevents multiple notifications for the same follow-up
      const isWithinTimeWindow = isSameMinute(now, followUpDateTime) ||
        isSameMinute(now, subMinutes(followUpDateTime, 1)) ||
        isSameMinute(now, addMinutes(followUpDateTime, 1));

      return isWithinTimeWindow;
    })
    .forEach(walkIn => {
      showFollowUpNotification(walkIn);
    });
}; 