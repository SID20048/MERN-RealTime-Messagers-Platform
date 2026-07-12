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

    // Render works better with websocket only
    transports: ["websocket"],

    allowEIO3: false,
  });


  io.use((socket: AuthenticatedSocket, next) => {
    try {
      const cookie = socket.handshake.headers.cookie;

      if (!cookie) {
        return next(new Error("No cookie"));
      }


      const token = cookie
        .split(";")
        .find((c) => c.trim().startsWith("token="))
        ?.split("=")[1];


      if (!token) {
        return next(new Error("No token"));
      }


      const decoded = jwt.verify(
        token,
        Env.JWT_SECRET
      ) as {
        userId: string;
      };


      socket.userId = decoded.userId;

      next();

    } catch (error) {
      console.log("Socket auth error", error);
      next(new Error("Unauthorized"));
    }
  });



  io.on("connection", (socket: AuthenticatedSocket)=>{

    const userId = socket.userId;

    if(!userId){
      socket.disconnect();
      return;
    }


    onlineUsers.set(
      userId,
      socket.id
    );


    console.log(
      "Socket connected",
      userId,
      socket.id
    );


    io?.emit(
      "online:users",
      Array.from(onlineUsers.keys())
    );


    socket.join(`user:${userId}`);



    socket.on(
      "chat:join",
      async(
        chatId:string,
        callback?:Function
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
            "Unable to join chat"
          );

        }

      }
    );



    socket.on(
      "chat:leave",
      (chatId:string)=>{

        socket.leave(
          `chat:${chatId}`
        );

      }
    );



    socket.on(
      "disconnect",
      ()=>{

        if(
          onlineUsers.get(userId)
          === socket.id
        ){

          onlineUsers.delete(userId);

        }


        io?.emit(
          "online:users",
          Array.from(
            onlineUsers.keys()
          )
        );


        console.log(
          "Socket disconnected",
          userId
        );

      }
    );

  });

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
  participantIds:string[],
  chat:any
)=>{

  const io=getIO();

  participantIds.forEach(id=>{

    io.to(
      `user:${id}`
    ).emit(
      "chat:new",
      chat
    );

  });

};



export const emitNewMessageToChatRoom = (
 senderId:string,
 chatId:string,
 message:any
)=>{

 const io=getIO();

 const senderSocket =
 onlineUsers.get(senderId);


 if(senderSocket){

  io.to(
    `chat:${chatId}`
  )
  .except(senderSocket)
  .emit(
    "message:new",
    message
  );

 }else{

  io.to(
    `chat:${chatId}`
  )
  .emit(
    "message:new",
    message
  );

 }

};



export const emitLastMessageToParticipants = (
 participantIds:string[],
 chatId:string,
 lastMessage:any
)=>{

 const io=getIO();


 participantIds.forEach(id=>{

  io.to(
    `user:${id}`
  )
  .emit(
    "chat:update",
    {
      chatId,
      lastMessage
    }
  );

 });

};