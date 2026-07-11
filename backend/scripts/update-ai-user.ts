import "dotenv/config";
import mongoose from "mongoose";
import UserModel from "../src/models/user.model";

async function updateAIUser() {
  try {
    await mongoose.connect(process.env.MONGO_URI!);

    const user = await UserModel.findOneAndUpdate(
      {
        email: "ai@assistant.com",
      },
      {
        name: "AI Assistant",
        isAI: true,
      },
      {
        new: true,
      }
    );

    console.log("Updated AI User:");
    console.log(user);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Error updating AI user:", error);
    process.exit(1);
  }
}

updateAIUser();