import { useEffect } from 'react';

export function useNotifications(onNotification) {
  useEffect(() => {
    // WebSocket connection for real-time notifications
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (!token) return;

    const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    const protocol = backendUrl.startsWith('https') ? 'wss:' : 'ws:';
    const host = backendUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const wsUrl = `${protocol}//${host}/ws/notifications/?token=${token}`;

    try {
      const ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'notification' && onNotification) {
            onNotification(data.notification);
          }
        } catch (e) {
          console.error('Failed to parse notification:', e);
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
