import { useEffect, useRef } from 'react';
import { getApiBaseUrl } from '../utils/apiBase';

export function useNotifications(onNotification) {
  const retryCount = useRef(0);
  const callbackRef = useRef(onNotification);
  const maxRetries = 10;

  useEffect(() => {
    callbackRef.current = onNotification;
  }, [onNotification]);

  useEffect(() => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (!token) return;

    const backendUrl = getApiBaseUrl();
    const protocol = backendUrl.startsWith('https') ? 'wss:' : 'ws:';
    const host = backendUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const wsUrl = `${protocol}//${host}/ws/notifications/?token=${encodeURIComponent(token)}`;

    let ws;
    let reconnectTimeout;

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          retryCount.current = 0;
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'notification' && callbackRef.current) {
              callbackRef.current(data.notification);
            }
          } catch (e) {
            console.warn('Failed to parse notification:', e);
          }
        };

        ws.onerror = () => {
          console.warn('Notifications websocket error; retrying connection');
        };

        ws.onclose = () => {
          if (retryCount.current < maxRetries) {
            retryCount.current++;
            reconnectTimeout = setTimeout(connect, Math.min(10000, 1000 * retryCount.current));
          }
        };
      } catch (error) {
        console.warn('WebSocket connection failed, retrying shortly');
        if (retryCount.current < maxRetries) {
          retryCount.current++;
          reconnectTimeout = setTimeout(connect, Math.min(10000, 1000 * retryCount.current));
        }
      }
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      if (ws?.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);
}
