import "dotenv/config";
import mongoose from "mongoose";
import UserModel from "../src/models/user.model";

async function createAIUser() {
  try {
    await mongoose.connect(process.env.MONGO_URI!);

    const existingUser = await UserModel.findOne({
      name: "AI Assistant",
    });

    if (existingUser) {
      console.log("AI user already exists:");
      console.log(existingUser._id);
      process.exit(0);
    }

    const aiUser = await UserModel.create({
      name: "AI Assistant",
      email: "ai@assistant.com",
      password: "ai-password-123",
      avatar: "",
    });

    console.log("AI user created:");
    console.log(aiUser._id);

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error("Error creating AI user:", error);
    process.exit(1);
  }
}

createAIUser();