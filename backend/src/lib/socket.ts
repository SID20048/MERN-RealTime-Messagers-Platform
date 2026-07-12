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

export const initializeSocket = (httpServer: HTTPServer) => {

  io = new Server(httpServer, {
    cors: {
      origin: Env.FRONTEND_ORIGIN,
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


        const cookieHeader =
          socket.handshake.headers.cookie;


        if (!cookieHeader) {
          return next(
            new Error("Unauthorized")
          );
        }


        const tokenCookie =
          cookieHeader
            .split(";")
            .find(
              (c) =>
                c.trim()
                .startsWith("accessToken=")
            );


        if (!tokenCookie) {
          return next(
            new Error("Unauthorized")
          );
        }


        const token =
          tokenCookie
          .split("=")
          .slice(1)
          .join("=");


        const decoded =
          jwt.verify(
            token,
            Env.JWT_SECRET
          ) as {
            userId:string;
          };


        socket.userId =
          decoded.userId;


        next();


      } catch(error){

        console.log(
          "SOCKET AUTH ERROR",
          error
        );


        next(
          new Error("Unauthorized")
        );

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