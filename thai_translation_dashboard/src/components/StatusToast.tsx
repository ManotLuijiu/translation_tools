import { toast } from 'sonner';
import { useEffect } from 'react';

type Props = {
  message: string;
  type: 'success' | 'error' | 'info';
  //   show: boolean;
};

export function StatusToast({ message, type }: Props) {
  useEffect(() => {
    if (message) {
      switch (type) {
        case 'success':
          toast.success(message);
          break;
        case 'error':
          toast.error(message);
          break;
        default:
          toast.info(message);
      }
    }
  }, [message, type]);

  return null; // Sonner handles the UI
}
