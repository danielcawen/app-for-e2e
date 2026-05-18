import { Request, Response } from "express";
import userService from "../services/userService";
import emailService from "../services/emailService";
import { AppError } from "../middleware/errorHandler";
import { generateToken } from "../utils/auth";
import { AuthRequest } from "../middleware/authMiddleware";

class AuthController {
  async signup(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password || !firstName || !lastName) {
        throw new AppError(
          "Email, password, first name and last name are required",
          400,
          "MISSING_FIELDS",
        );
      }

      const { user, verificationToken } = await userService.signup(
        email,
        password,
        firstName,
        lastName,
      );

      const frontendUrl =
        process.env.FRONTEND_URL || `${req.protocol}://${req.get("host")}`;
      const verificationLink = `${frontendUrl}/auth/verify?token=${verificationToken}`;
      const mobileDeepLinkBase =
        process.env.MOBILE_DEEP_LINK_BASE || "e2epractice://auth";
      const mobileVerificationLink = `${mobileDeepLinkBase}/verify?token=${verificationToken}`;
      await emailService.sendVerificationEmail(
        email,
        verificationLink,
        mobileVerificationLink,
      );

      res.status(201).json({
        success: true,
        message:
          "Account created. Please check your email to verify your account.",
      });
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError(error.message || "Signup failed", 500, "SIGNUP_ERROR");
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new AppError(
          "Email and password are required",
          400,
          "MISSING_FIELDS",
        );
      }

      const { user, token } = await userService.login(email, password);

      res.status(200).json({
        success: true,
        message: "Login successful",
        data: { user, token },
      });
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError(error.message || "Login failed", 500, "LOGIN_ERROR");
    }
  }

  async getMe(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = await userService.getUserById(req.user.userId);

      res.status(200).json({
        success: true,
        data: { user },
      });
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        error.message || "Failed to get user",
        500,
        "GET_ME_ERROR",
      );
    }
  }

  async sendMagicLink(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        throw new AppError("Email is required", 400, "MISSING_FIELD");
      }

      const magicToken = await userService.sendMagicLink(email);

      const mobileDeepLinkBase =
        process.env.MOBILE_DEEP_LINK_BASE || "e2epractice://auth";
      const magicLink = `${mobileDeepLinkBase}/verify?token=${magicToken}`;

      await emailService.sendMagicLinkEmail(email, magicLink);

      res.status(200).json({
        success: true,
        message: "Magic link sent to your email",
      });
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        error.message || "Failed to send magic link",
        500,
        "MAGIC_LINK_ERROR",
      );
    }
  }

  async verifyMagicLink(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.query;

      if (!token || typeof token !== "string") {
        throw new AppError("Valid token is required", 400, "INVALID_TOKEN");
      }

      const user = await userService.verifyMagicLink(token);
      const jwtToken = generateToken({ userId: user.id, email: user.email });

      res.status(200).json({
        success: true,
        message: "Email verified successfully",
        data: { user, token: jwtToken },
      });
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        error.message || "Token verification failed",
        500,
        "VERIFY_ERROR",
      );
    }
  }
}

export default new AuthController();
