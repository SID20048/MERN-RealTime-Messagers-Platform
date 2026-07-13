import { io, Socket } from "socket.io-client";
import { create } from "zustand";

const BASE_URL = import.meta.env.VITE_API_URL;

interface SocketState {
  socket: Socket | null;
  onlineUsers: string[];
  connectSocket: (token?: string) => void;
  disconnectSocket: () => void;
}

export const useSocket = create<SocketState>()((set, get) => ({
  socket: null,
  onlineUsers: [],

  connectSocket: (token) => {
    const existing = get().socket;

    // Prevent duplicate connection attempts if already active
    if (existing?.connected) {
      return;
    }

    // 1. DUAL FALLBACK EXTRACTION: Prioritizes explicit argument string,
    // falls back to localStorage checks under standard naming keys
    const authToken = 
      token || 
      localStorage.getItem("token") || 
      localStorage.getItem("accessToken");

    // 2. TOKEN CLEANUP: Formats token correctly before appending Bearer prefix
    let cleanToken = authToken?.trim() || "";
    if (cleanToken.startsWith("Bearer ")) {
      cleanToken = cleanToken.substring(7);
    }
    
    // Remove outer string quotes sometimes added by JSON stringify/storage mechanisms
    if (cleanToken.startsWith('"') && cleanToken.endsWith('"')) {
      cleanToken = cleanToken.slice(1, -1);
    }

    const socket = io(BASE_URL, {
      withCredentials: true,
      // 3. SECURE AUTH BLOCK HANDOFF: Bypasses browser cross-site cookie blocking rules over web sockets
      auth: {
        token: cleanToken ? `Bearer ${cleanToken}` : undefined
      },
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
