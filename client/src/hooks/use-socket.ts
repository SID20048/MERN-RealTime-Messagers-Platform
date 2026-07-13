import { io, Socket } from "socket.io-client";
import { create } from "zustand";

const BASE_URL = import.meta.env.VITE_API_URL;

interface SocketState {
  socket: Socket | null;
  onlineUsers: string[];
  connectSocket: (token?: string) => void; // 1. Added optional token parameter
  disconnectSocket: () => void;
}

export const useSocket = create<SocketState>()((set, get) => ({
  socket: null,
  onlineUsers: [],

  connectSocket: (token) => { // 2. Accept the token here
    const existing = get().socket;

    if (existing?.connected) {
      return;
    }

    // 3. Fallback to localStorage if token isn't passed via argument
    const authToken = token || localStorage.getItem("token");

    const socket = io(BASE_URL, {
      withCredentials: true,
      // 4. Pass token inside the auth object
      auth: {
        token: authToken ? `Bearer ${authToken}` : undefined
      },
      // 5. Explicitly allow WebSocket upgrade if server supports it
      transports: ["polling", "websocket"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    set({ socket });

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
    });

    socket.on("connect_error", (error) => {
      console.error("Socket error:", error.message);
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });

    socket.on("online:users", (users: string[]) => {
      set({ onlineUsers: users });
    });
  },

  disconnectSocket: () => {
    const socket = get().socket;
    if (socket) {
      socket.disconnect();
      set({
        socket: null,
        onlineUsers: []
      });
    }
  }
}));
