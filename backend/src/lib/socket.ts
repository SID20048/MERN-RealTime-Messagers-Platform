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

// 1. ADDED: Whitelist of allowed origins for development and production environments
const allowedOrigins = [
  "https://onrender.com",     // Prod Frontend
  "https://onrender.com",  // Prod Backend
  "http://localhost:5173",                                       // Local Frontend (Vite)
  "http://localhost:3000",                                       // Local Backend/Alternate
];

export const initializeSocket = (httpServer: HTTPServer) => {

  io = new Server(httpServer, {
    cors: {
      // 2. FIXED: Replaced static single-string property with dynamic validator function
      origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, Postman, or local tests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
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

        const cookieHeader = socket.handshake.headers.cookie;

        if (!cookieHeader) {
          return next(new Error("Unauthorized"));
        }

        const tokenCookie = cookieHeader
          .split(";")
          .find((c) => c.trim().startsWith("accessToken="));

        if (!tokenCookie) {
          return next(new Error("Unauthorized"));
        }

        let rawToken = tokenCookie.split("=").slice(1).join("=");
        let token = decodeURIComponent(rawToken);

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
