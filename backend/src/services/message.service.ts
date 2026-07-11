import mongoose from "mongoose";
import cloudinary from "../config/cloudinary.config";
import ChatModel from "../models/chat.model";
import MessageModel from "../models/message.model";
import { BadRequestException, NotFoundException } from "../utils/app-error";
import {
  emitLastMessageToParticipants,
  emitNewMessageToChatRoom,
} from "../lib/socket";
import UserModel from "../models/user.model";
import { askAI } from "./ai.service";

export const sendMessageService = async (
  userId: string,
  body: {
    chatId: string;
    content?: string;
    image?: string;
    replyToId?: string;
  }
) => {
  const { chatId, content, image, replyToId } = body;

  const chat = await ChatModel.findOne({
    _id: chatId,
    participants: {
      $in: [userId],
    },
  });

  if (!chat) {
    throw new BadRequestException(
      "Chat not found or unauthorized"
    );
  }

  if (replyToId) {
    const replyMessage = await MessageModel.findOne({
      _id: replyToId,
      chatId,
    });

    if (!replyMessage) {
      throw new NotFoundException(
        "Reply message not found"
      );
    }
  }

  let imageUrl;

  if (image) {
    const uploadRes =
      await cloudinary.uploader.upload(image);

    imageUrl = uploadRes.secure_url;
  }


  // Create user message
  const newMessage =
    await MessageModel.create({
      chatId,
      sender: userId,
      content,
      image: imageUrl,
      replyTo: replyToId || null,
    });


  await newMessage.populate([
    {
      path: "sender",
      select: "name avatar isAI",
    },
    {
      path: "replyTo",
      select: "content image sender",
      populate: {
        path: "sender",
        select: "name avatar",
      },
    },
  ]);


  chat.lastMessage =
    newMessage._id as mongoose.Types.ObjectId;

  await chat.save();


  emitNewMessageToChatRoom(
    userId,
    chatId,
    newMessage
  );


  const allParticipantIds =
    chat.participants.map((id) =>
      id.toString()
    );


  emitLastMessageToParticipants(
    allParticipantIds,
    chatId,
    newMessage
  );


  // ================= AI RESPONSE =================

  if (content?.trim()) {
    try {

      console.log(
        "Calling AI with:",
        content
      );


      const aiReply =
        await askAI(content);


      console.log(
        "AI Reply:",
        aiReply
      );


      if (!aiReply) {
        console.log(
          "AI returned empty response"
        );

        return {
          userMessage: newMessage,
          chat,
        };
      }


      const aiUser =
        await UserModel.findOne({
          email: "ai@assistant.com",
        });


      if (!aiUser) {
        console.log(
          "AI user not found"
        );

        return {
          userMessage: newMessage,
          chat,
        };
      }


      const aiMessage =
        await MessageModel.create({
          chatId,
          sender: aiUser._id,
          content: aiReply,
          image: null,
          replyTo: null,
        });


      await aiMessage.populate({
        path: "sender",
        select: "name avatar isAI",
      });


      chat.lastMessage =
        aiMessage._id as mongoose.Types.ObjectId;

      await chat.save();


      emitNewMessageToChatRoom(
        String(aiUser._id),
        chatId,
        aiMessage
      );


      emitLastMessageToParticipants(
        allParticipantIds,
        chatId,
        aiMessage
      );


      console.log(
        "AI message sent successfully"
      );


    } catch (error) {

      console.error(
        "AI ERROR:",
        error
      );

    }
  }


  return {
    userMessage: newMessage,
    chat,
  };
};