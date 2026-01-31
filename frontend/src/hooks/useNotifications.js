import { useEffect } from 'react';

export function useNotifications(onNotification) {
  useEffect(() => {
    // WebSocket connection for real-time notifications
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/notifications/`;

    try {
      const ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'notification' && onNotification) {
          onNotification(data.notification);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      return () => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      };
    } catch (error) {
      console.error('Failed to connect to notifications:', error);
    }
  }, [onNotification]);
}
