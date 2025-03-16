import { toast, ToastOptions } from 'react-toastify';
import { WalkIn } from '../types/walkIn';
import { format, isToday, parseISO } from 'date-fns';

const defaultOptions: ToastOptions = {
  position: 'top-right',
  autoClose: 5000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
};

export const showSuccess = (message: string) => {
  toast.success(message, defaultOptions);
};

export const showError = (message: string) => {
  toast.error(message, defaultOptions);
};

export const showFollowUpNotification = (walkIn: WalkIn) => {
  const followUpTime = walkIn.followUpTime;
  const followUpDate = format(parseISO(walkIn.followUpDate), 'dd/MM/yyyy');
  
  toast.info(
    `Follow-up reminder for ${walkIn.name}
    Time: ${followUpTime}
    Phone: ${walkIn.phone}
    Interest Level: ${walkIn.interestLevel}`,
    {
      ...defaultOptions,
      autoClose: false,
      onClick: () => {
        // You can add navigation to walk-in details here
      },
    }
  );
};

export const checkFollowUps = (walkIns: WalkIn[]) => {
  const now = new Date();
  const currentTime = format(now, 'HH:mm');

  walkIns
    .filter(walkIn => 
      walkIn.status === 'pending' &&
      isToday(parseISO(walkIn.followUpDate)) &&
      walkIn.followUpTime <= currentTime
    )
    .forEach(walkIn => {
      showFollowUpNotification(walkIn);
    });
}; 