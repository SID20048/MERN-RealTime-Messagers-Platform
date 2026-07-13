import { Request, Response } from "express";
import jwt from "jsonwebtoken"; // 1. Added missing JWT library import
import { Env } from "../config/env.config"; // 2. Added Env configuration import
import { asyncHandler } from "../middlewares/asyncHandler.middleware";
import { loginSchema, registerSchema } from "../validators/auth.validator";
import { loginService, registerService } from "../services/auth.service";
import { clearJwtAuthCookie, setCookie } from "../utils/cookie"; // 3. Imported setCookie utility
import { HTTPSTATUS } from "../config/http.config";

export const registerController = asyncHandler(
  async (req: Request, res: Response) => {
    const body = registerSchema.parse(req.body);

    const user = await registerService(body);
    const userId = user._id as string;

    if (!userId) {
      return res.status(HTTPSTATUS.BAD_REQUEST).json({
        message: "User registration failed",
      });
    }

    // 4. Generate the signed JWT token explicitly for the response
    const token = jwt.sign(
      { id: userId }, 
      Env.JWT_SECRET || "your_fallback_secret_key", 
      { expiresIn: "7d" }
    );

    // 5. Append cookie to request header
    setCookie(res, token);

    // 6. FIXED: Added the raw token string parameter into the JSON response layout
    return res.status(HTTPSTATUS.CREATED).json({
      message: "User created & login successfully",
      user,
      token, 
    });
  }
);

export const loginController = asyncHandler(
  async (req: Request, res: Response) => {
    const body = loginSchema.parse(req.body);

    const user = await loginService(body);
    const userId = user._id as string;

    if (!userId) {
      return res.status(HTTPSTATUS.BAD_REQUEST).json({
        message: "User login failed",
      });
    }

    // 4. Generate the signed JWT token explicitly for the response
    const token = jwt.sign(
      { id: userId }, 
      Env.JWT_SECRET || "your_fallback_secret_key", 
      { expiresIn: "7d" }
    );

    // 5. Append cookie to request header
    setCookie(res, token);

    // 6. FIXED: Added the raw token string parameter into the JSON response layout
    return res.status(HTTPSTATUS.OK).json({
      message: "User login successfully",
      user,
      token, 
    });
  }
);

export const logoutController = asyncHandler(
  async (req: Request, res: Response) => {
    console.log("logoutController called");
    return clearJwtAuthCookie(res).status(HTTPSTATUS.OK).json({
      message: "User logout successfully",
    });
  }
);

export const authStatusController = asyncHandler(
  async (req: Request, res: Response) => {
    console.log("authStatusController called");
    const user = req.user;
    return res.status(HTTPSTATUS.OK).json({
      message: "Authenticated User",
      user,
    });
  }
);
