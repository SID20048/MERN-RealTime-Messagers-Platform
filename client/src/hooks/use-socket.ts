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

    const existing = get().socket;

    if (existing?.connected) {
      return;
    }


    const socket = io(BASE_URL, {

      withCredentials: true,

      transports: [
        "polling"
      ],

      autoConnect: true,

      reconnection: true,

      reconnectionAttempts: 10,

      reconnectionDelay: 2000,
    });



    set({
      socket,
    });



    socket.on(
      "connect",
      () => {

        console.log(
          "Socket connected:",
          socket.id
        );

      }
    );



    socket.on(
      "connect_error",
      (error) => {

        console.error(
          "Socket error:",
          error.message
        );

      }
    );



    socket.on(
      "disconnect",
      (reason) => {

        console.log(
          "Socket disconnected:",
          reason
        );

      }
    );



    socket.on(
      "online:users",
      (users:string[]) => {

        set({
          onlineUsers: users
        });

      }
    );

  },



  disconnectSocket:()=>{

    const socket=get().socket;


    if(socket){

      socket.disconnect();


      set({
        socket:null,
        onlineUsers:[]
      });

    }

  }

}));