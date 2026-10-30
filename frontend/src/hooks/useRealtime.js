import { useEffect, useRef, useState } from 'react';
import { websocketUrl } from '../api.js';

export function useRealtime(onMessage) {
  const handler = useRef(onMessage);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    handler.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    let socket;
    let retryTimer;
    let retryDelay = 1000;
    let stopped = false;

    const connect = () => {
      if (stopped) return;
      socket = new WebSocket(websocketUrl());
      socket.onopen = () => {
        retryDelay = 1000;
        setConnected(true);
      };
      socket.onmessage = (event) => {
        try {
          handler.current(JSON.parse(event.data));
        } catch (error) {
          console.error('Não foi possível processar uma mensagem WebSocket.', error);
        }
      };
      socket.onclose = () => {
        setConnected(false);
        if (stopped) return;
        retryTimer = window.setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 30000);
      };
      socket.onerror = () => socket.close();
    };

    connect();
    return () => {
      stopped = true;
      window.clearTimeout(retryTimer);
      socket?.close();
    };
  }, []);

  return connected;
}
