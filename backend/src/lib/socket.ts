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
      methods: ["GET", "POST"],
      credentials: true,
    },

    // Render stable mode
    transports: ["polling"],
    allowUpgrades: false,
  });


  io.use(
    (socket: AuthenticatedSocket, next) => {
      try {
        const cookie =
          socket.handshake.headers.cookie;


        if (!cookie) {
          return next(
            new Error("Unauthorized")
          );
        }


        const token =
          cookie.split("=")[1]?.trim();


        if (!token) {
          return next(
            new Error("Unauthorized")
          );
        }


        const decoded =
          jwt.verify(
            token,
            Env.JWT_SECRET
          ) as {
            userId: string;
          };


        socket.userId =
          decoded.userId;


        next();

      } catch (error) {

        next(
          new Error("Unauthorized")
        );

      }
    }
  );



  io.on(
    "connection",
    (socket: AuthenticatedSocket) => {

      const userId =
        socket.userId;


      if (!userId) {
        socket.disconnect(true);
        return;
      }


      const socketId =
        socket.id;


      onlineUsers.set(
        userId,
        socketId
      );


      console.log(
        "Socket connected",
        {
          userId,
          socketId,
        }
      );



      io?.emit(
        "online:users",
        Array.from(
          onlineUsers.keys()
        )
      );



      socket.join(
        `user:${userId}`
      );



      socket.on(
        "chat:join",
        async (
          chatId: string,
          callback?: (
            error?: string
          ) => void
        ) => {

          try {

            await validateChatParticipant(
              chatId,
              userId
            );


            socket.join(
              `chat:${chatId}`
            );


            console.log(
              `User ${userId} joined chat:${chatId}`
            );


            callback?.();


          } catch (error) {

            callback?.(
              "Error joining chat"
            );

          }

        }
      );



      socket.on(
        "chat:leave",
        (chatId: string) => {

          if (chatId) {

            socket.leave(
              `chat:${chatId}`
            );

          }

        }
      );



      socket.on(
        "disconnect",
        () => {

          if (
            onlineUsers.get(userId) === socketId
          ) {

            onlineUsers.delete(
              userId
            );


            io?.emit(
              "online:users",
              Array.from(
                onlineUsers.keys()
              )
            );

          }


          console.log(
            "Socket disconnected",
            {
              userId,
              socketId,
            }
          );

        }
      );

    }
  );
};



const getIO = () => {

  if (!io) {

    throw new Error(
      "Socket.IO not initialized"
    );

  }

  return io;

};



export const emitNewChatToParticpants = (
  participantIds: string[] = [],
  chat: any
) => {

  const io =
    getIO();


  participantIds.forEach(
    (participantId) => {

      io
        .to(
          `user:${participantId}`
        )
        .emit(
          "chat:new",
          chat
        );

    }
  );

};



export const emitNewMessageToChatRoom = (
  senderId: string,
  chatId: string,
  message: any
) => {

  const io =
    getIO();


  const senderSocketId =
    onlineUsers.get(
      senderId.toString()
    );



  if (senderSocketId) {

    io
      .to(
        `chat:${chatId}`
      )
      .except(senderSocketId)
      .emit(
        "message:new",
        message
      );


  } else {

    io
      .to(
        `chat:${chatId}`
      )
      .emit(
        "message:new",
        message
      );

  }

};



export const emitLastMessageToParticipants = (
  participantIds: string[],
  chatId: string,
  lastMessage: any
) => {

  const io =
    getIO();


  participantIds.forEach(
    (participantId) => {

      io
        .to(
          `user:${participantId}`
        )
        .emit(
          "chat:update",
          {
            chatId,
            lastMessage,
          }
        );

    }
  );

};