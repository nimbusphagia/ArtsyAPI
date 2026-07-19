import { Request, Response, NextFunction } from "express";
import {
  getUserPublicId,
  rotateRefreshToken,
  issueRefreshToken,
  createUser,
  signToken,
  authorizeUser,
  editUserInfo,
} from "./auth.service";
import { UnauthorizedError } from "../../config/errors/errors";
import {
  LoginRequestSchema,
  RegisterRequestSchema,
  UserEditRequestSchema,
} from "./auth.validators";

const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure: true,
  maxAge: 30 * 24 * 60 * 60 * 1000,
  path: "/auth/refresh",
};

// OAuth
export async function oauthCallback(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = req.user;
    if (!user) throw new UnauthorizedError("Invalid credentials");

    const newRawToken = await issueRefreshToken(user.publicId);
    const accessToken = await signToken(user.publicId);

    res.cookie("refreshToken", newRawToken, {
      ...REFRESH_COOKIE_OPTS,
      sameSite: "lax",
    });
    res.redirect(
      `${process.env.CLIENT_URL}/oauth-callback?token=${accessToken}`,
    );
  } catch (err) {
    next(err);
  }
}

// Register
export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = RegisterRequestSchema.parse(req.body);
    const user = await createUser(data);

    const newRawToken = await issueRefreshToken(user.publicId);
    res.cookie("refreshToken", newRawToken, {
      ...REFRESH_COOKIE_OPTS,
      sameSite: "lax",
    });

    const accessToken = await signToken(user.publicId);
    res.status(201).json({ accessToken });
  } catch (err) {
    next(err);
  }
}
// Login
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const data = LoginRequestSchema.parse(req.body);
    const userPublicId = await authorizeUser(data);

    const newRawToken = await issueRefreshToken(userPublicId);
    res.cookie("refreshToken", newRawToken, {
      ...REFRESH_COOKIE_OPTS,
      sameSite: "lax",
    });

    const accessToken = await signToken(userPublicId);
    res.status(200).json({ accessToken });
  } catch (err) {
    next(err);
  }
}
// Refresh token
export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken) throw new UnauthorizedError();

    const { userId, rawToken } = await rotateRefreshToken(refreshToken);
    const userPublicId = await getUserPublicId(userId);
    const accessToken = await signToken(userPublicId);

    res.cookie("refreshToken", rawToken, {
      ...REFRESH_COOKIE_OPTS,
      sameSite: "strict",
    });
    res.json({ accessToken });
  } catch (err) {
    next(err);
  }
}

// Edit Local Account
export async function editAccount(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError("Unauthorized request.");
    const data = UserEditRequestSchema.parse(req.body);
    const user = await editUserInfo(data, currentUserId);
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
}
