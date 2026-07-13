import { Server as HTTPServer } from "http";
import jwt from "jsonwebtoken";
import { Server, type Socket } from "socket.io";
import { Env } from "../config/env.config";
import { validateChatParticipant } from "../services/chat.service";

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

let io: Server | null = null;

const onlineUsers = new Map<string, string>();

// 1. FIXED: Set the EXACT, FULL URLs of your deployed applications
const allowedOrigins = [
  "https://mern-realtime-messagers-platform-1.onrender.com",    // Your exact frontend URL
  "https://mern-realtime-messagers-platform-fo30.onrender.com", // Your exact backend URL
  "http://localhost:5173",                                      // Local Frontend (Vite)
  "http://localhost:3000",                                      // Local Backend/Alternate
];

export const initializeSocket = (httpServer: HTTPServer) => {

  io = new Server(httpServer, {
    cors: {
      // 2. FIXED: Fallback to false instead of throwing a hard engine Error instance
      origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          callback(null, false); // Triggers clean fallback instead of crashing the process
        }
      },
      credentials: true,
      methods: ["GET", "POST"],
    },

    transports: [
      "polling",
      "websocket",
    ],

  });


  io.use(
    (
      socket: AuthenticatedSocket,
      next
    ) => {
      try {
        console.log(
          "SOCKET COOKIE:",
          socket.handshake.headers.cookie
        );

        let token: string | null = null;
        const cookieHeader = socket.handshake.headers.cookie;

        // Pipeline Route A: Attempt parsing token from cookie header
        if (cookieHeader) {
          const tokenCookie = cookieHeader
            .split(";")
            .find((c) => c.trim().startsWith("accessToken="));

          if (tokenCookie) {
            let rawToken = tokenCookie.split("=").slice(1).join("=");
            token = decodeURIComponent(rawToken);
          }
        }

        // Pipeline Route B: DUAL-FALLBACK - Read from handshake auth block if browser blocks cookies
        if (!token && socket.handshake.auth?.token) {
          const authHeader = socket.handshake.auth.token;
          if (authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7); // Strip off 'Bearer ' prefix wrapper
          } else {
            token = authHeader;
          }
        }

        // Drop out immediately if both strategies return an empty query parameter
        if (!token) {
          console.log("SOCKET AUTH ERROR: No cookie or auth block token found.");
          return next(new Error("Unauthorized"));
        }

        if (token.startsWith("j:")) {
          token = token.replace(/^j:/, "");
        }
        if (token.startsWith('"') && token.endsWith('"')) {
          token = token.slice(1, -1);
        }

        const decoded = jwt.verify(token, Env.JWT_SECRET) as { id: string };

        socket.userId = decoded.id;

        next();
      } catch (error) {
        console.log("SOCKET AUTH ERROR", error);
        next(new Error("Unauthorized"));
      }
    }
  );



  io.on(
    "connection",
    (
      socket:AuthenticatedSocket
    )=>{


      const userId =
        socket.userId;


      if(!userId){

        socket.disconnect(true);
        return;

      }


      onlineUsers.set(
        userId,
        socket.id
      );


      console.log(
        "SOCKET CONNECTED",
        userId
      );


      socket.join(
        `user:${userId}`
      );


      io?.emit(
        "online:users",
        Array.from(
          onlineUsers.keys()
        )
      );



      socket.on(
        "chat:join",
        async(
          chatId:string,
          callback?
          :(error?:string)=>void
        )=>{


          try{


            await validateChatParticipant(
              chatId,
              userId
            );


            socket.join(
              `chat:${chatId}`
            );


            callback?.();


          }catch(error){

            callback?.(
              "Cannot join chat"
            );

          }

        }
      );



      socket.on(
        "disconnect",
        ()=>{


          if(
            onlineUsers.get(userId)
            === socket.id
          ){

            onlineUsers.delete(
              userId
            );

          }


          io?.emit(
            "online:users",
            Array.from(
              onlineUsers.keys()
            )
          );


          console.log(
            "SOCKET DISCONNECTED",
            userId
          );

        }
      );


    }
  );

};



const getIO = ()=>{

  if(!io){

    throw new Error(
      "Socket not initialized"
    );

  }


  return io;

};



export const emitNewChatToParticpants = (
  participantIds:string[]=[],
  chat:any
)=>{

  const server =
    getIO();


  participantIds.forEach(
    id=>{

      server
      .to(
        `user:${id}`
      )
      .emit(
        "chat:new",
        chat
      );

    }
  );

};



export const emitNewMessageToChatRoom = (
  senderId:string,
  chatId:string,
  message:any
)=>{

  const server =
    getIO();


  server
  .to(
    `chat:${chatId}`
  )
  .emit(
    "message:new",
    message
  );

};



export const emitLastMessageToParticipants = (
  participantIds:string[],
  chatId:string,
  lastMessage:any
)=>{

  const server =
    getIO();


  participantIds.forEach(
    id=>{

      server
      .to(
        `user:${id}`
      )
      .emit(
        "chat:update",
        {
          chatId,
          lastMessage
        }
      );

    }
  );

};
