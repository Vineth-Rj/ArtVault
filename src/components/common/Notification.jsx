// Notification.jsx — ArtVault Global Toast System
import { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';

export function Notification() {
  const { notification } = useApp();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [notification]);

  if (!notification) return null;

  return (
    <div
      className={`toast toast-${notification.type || 'success'} ${visible ? 'toast-visible' : ''}`}
      role="alert"
      aria-live="polite"
    >
      <span className="toast-icon" aria-hidden>
        {notification.type === 'error' ? '✕' : '✓'}
      </span>
      <span className="toast-message">{notification.message}</span>
    </div>
  );
}

export default Notification;
