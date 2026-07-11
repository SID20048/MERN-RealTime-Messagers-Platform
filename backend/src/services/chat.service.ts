import { emitNewChatToParticpants } from "../lib/socket";
import ChatModel from "../models/chat.model";
import MessageModel from "../models/message.model";
import UserModel from "../models/user.model";
import { BadRequestException, NotFoundException } from "../utils/app-error";

export const createChatService = async (
  userId: string,
  body: {
    participantId?: string;
    isGroup?: boolean;
    participants?: string[];
    groupName?: string;
  }
) => {
  const { participantId, isGroup, participants, groupName } = body;

  let chat;
  let allParticipantIds: string[] = [];

  if (isGroup && participants?.length && groupName) {
    allParticipantIds = [userId, ...participants];

    chat = await ChatModel.create({
      participants: allParticipantIds,
      isGroup: true,
      groupName,
      createdBy: userId,
    });

  } else if (participantId) {
    const otherUser = await UserModel.findById(participantId);

    if (!otherUser) {
      throw new NotFoundException("User not found");
    }

    allParticipantIds = [userId, participantId];

    const existingChat = await ChatModel.findOne({
      participants: {
        $all: allParticipantIds,
        $size: 2,
      },
    }).populate("participants", "name avatar isAI");

    if (existingChat) return existingChat;


    chat = await ChatModel.create({
      participants: allParticipantIds,
      isGroup: false,
      createdBy: userId,
    });
  }


  const populatedChat = await chat?.populate(
    "participants",
    "name avatar isAI"
  );


  const participantIds = populatedChat?.participants?.map((p) =>
    p._id.toString()
  );


  emitNewChatToParticpants(
    participantIds,
    populatedChat
  );


  return populatedChat;
};



// ================= CREATE AI CHAT =================

export const createAIChatService = async (
  userId: string
) => {

  const aiUser = await UserModel.findOne({
    isAI: true,
  });


  if (!aiUser) {
    throw new NotFoundException(
      "AI user not found"
    );
  }


  const existingChat = await ChatModel.findOne({
    participants: {
      $all: [
        userId,
        aiUser._id,
      ],
      $size: 2,
    },
  });


  if (existingChat) {
    return existingChat;
  }


  const chat = await ChatModel.create({
    participants: [
      userId,
      aiUser._id,
    ],
    isGroup: false,
    createdBy: userId,
  });


  const populatedChat = await chat.populate(
    "participants",
    "name avatar isAI"
  );


  emitNewChatToParticpants(
    [userId],
    populatedChat
  );


  return populatedChat;
};



// ================= GET USER CHATS =================

export const getUserChatsService = async (
  userId: string
) => {

  const chats = await ChatModel.find({
    participants: {
      $in: [userId],
    },
  })
    .populate(
      "participants",
      "name avatar isAI"
    )
    .populate({
      path: "lastMessage",
      populate: {
        path: "sender",
        select: "name avatar",
      },
    })
    .sort({
      updatedAt: -1,
    });


  return chats;
};



// ================= GET SINGLE CHAT =================

export const getSingleChatService = async (
  chatId: string,
  userId: string
) => {

  const chat = await ChatModel.findOne({
    _id: chatId,
    participants: {
      $in: [userId],
    },
  }).populate(
    "participants",
    "name avatar isAI"
  );


  if (!chat) {
    throw new BadRequestException(
      "Chat not found or you are not authorized to view this chat"
    );
  }


  const messages = await MessageModel.find({
    chatId,
  })
    .populate(
      "sender",
      "name avatar"
    )
    .populate({
      path: "replyTo",
      select: "content image sender",
      populate: {
        path: "sender",
        select: "name avatar",
      },
    })
    .sort({
      createdAt: 1,
    });


  return {
    chat,
    messages,
  };
};



// ================= VALIDATE PARTICIPANT =================

export const validateChatParticipant = async (
  chatId: string,
  userId: string
) => {

  const chat = await ChatModel.findOne({
    _id: chatId,
    participants: {
      $in: [userId],
    },
  });


  if (!chat) {
    throw new BadRequestException(
      "User not a participant in chat"
    );
  }


  return chat;
};