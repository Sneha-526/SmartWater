import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  const registerUser = () => {
    if (!socketRef.current || !user) return;
    if (user.role === 'user') {
      socketRef.current.emit('user:register', user.id);
    } else if (user.role === 'vendor') {
      socketRef.current.emit('vendor:register', user.id);
    }
  };

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // Create socket connection
    const socket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      // Re-register on reconnect (multi-tab safe)
      registerUser();
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.id]);

  // Re-register when user changes
  useEffect(() => {
    if (socketRef.current?.connected) {
      registerUser();
    }
  }, [user?.id]);

  const on = (event, handler) => {
    socketRef.current?.on(event, handler);
  };

  const off = (event, handler) => {
    socketRef.current?.off(event, handler);
  };

  const emit = (event, data) => {
    socketRef.current?.emit(event, data);
  };

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, isConnected, on, off, emit }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
};
