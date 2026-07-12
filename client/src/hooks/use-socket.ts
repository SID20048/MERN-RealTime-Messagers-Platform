import { io, Socket } from "socket.io-client";
import { create } from "zustand";

const BASE_URL = import.meta.env.VITE_API_URL;

interface SocketState {
  socket: Socket | null;
  onlineUsers: string[];
  connectSocket: () => void;
  disconnectSocket: () => void;
}

export const useSocket = create<SocketState>()((set, get) => ({
  socket: null,
  onlineUsers: [],

  connectSocket: () => {
    const { socket } = get();

    if (socket?.connected) return;

    const newSocket = io(BASE_URL, {
      withCredentials: true,

      // Render stable connection
      transports: ["polling"],

      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    set({
      socket: newSocket,
    });


    newSocket.on("connect", () => {
      console.log(
        "Socket connected:",
        newSocket.id
      );
    });


    newSocket.on(
      "connect_error",
      (error) => {
        console.error(
          "Socket connection error:",
          error.message
        );
      }
    );


    newSocket.on(
      "disconnect",
      (reason) => {
        console.log(
          "Socket disconnected:",
          reason
        );
      }
    );


    newSocket.on(
      "online:users",
      (userIds: string[]) => {
        console.log(
          "Online users:",
          userIds
        );

        set({
          onlineUsers: userIds,
        });
      }
    );
  },


  disconnectSocket: () => {
    const { socket } = get();

    if (socket) {
      socket.disconnect();

      set({
        socket: null,
        onlineUsers: [],
      });
    }
  },
}));