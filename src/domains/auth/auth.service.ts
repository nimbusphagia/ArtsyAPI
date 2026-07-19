import crypto from "crypto";
import { prisma } from "../../config/prisma";
import { compare, hash } from "bcrypt";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "../../config/errors/errors";
import { addDays } from "date-fns";
import {
  LoginReq,
  omitUserPassword,
  PublicId,
  RegisterReq,
  TokenRotateReturn,
  UserEditReq,
  UserRes,
} from "./auth.validators";
import { JWTPayload, SignJWT, jwtVerify } from "jose";

// Register with JWT
export async function createUser(data: RegisterReq): Promise<UserRes> {
  const emailNotUnique = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (emailNotUnique) throw new ConflictError("Invalid email.");
  const { password, confirmPassword, ...createData } = data;
  return prisma.user.create({
    data: { ...createData, password: await hash(password, 12) },
    omit: omitUserPassword,
  });
}

// Login with JWT
export async function authorizeUser(data: LoginReq): Promise<PublicId> {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
    select: { publicId: true, password: true },
  });
  if (!user) throw new NotFoundError("User not found.");
  const validated = await compare(data.password, user?.password!);
  if (!validated) throw new UnauthorizedError("Invalid credentials");
  return user.publicId;
}

// Edit User Centralized
export async function editUserInfo(
  data: UserEditReq,
  currentUserId: string,
): Promise<UserRes> {
  const {
    password,
    newPassword,
    confirmNewPassword,
    firstName,
    lastName,
    email,
  } = data;

  if (password || email) {
    await blockOauthUser(currentUserId);
    if (password && newPassword) {
      return editUserPassword(
        { password, newPassword, confirmNewPassword },
        currentUserId,
      );
    }
    if (email) {
      return editUserEmail({ email }, currentUserId);
    }
  }

  return editUserNames({ firstName, lastName }, currentUserId);
}

// Edit Password
async function editUserPassword(
  { password, newPassword, confirmNewPassword }: UserEditReq,
  currentUserId: string,
): Promise<UserRes> {
  if (!password || !newPassword || !confirmNewPassword) {
    throw new ValidationError("Invalid data");
  }

  await blockOauthUser(currentUserId);
  const user = await prisma.user.findUnique({
    where: { publicId: currentUserId },
    select: { password: true },
  });
  const validated = await compare(password, user?.password!);
  if (!validated) throw new UnauthorizedError("Invalid credentials");
  const newHashedPassword = await hash(newPassword, 12);

  return prisma.user.update({
    where: { publicId: currentUserId },
    data: { password: newHashedPassword },
    omit: omitUserPassword,
  });
}

// Edit Email
async function editUserEmail(
  { email }: UserEditReq,
  currentUserId: string,
): Promise<UserRes> {
  if (!email) throw new ValidationError("Invalid data");

  const isEmailUnique = await prisma.user.findUnique({
    where: {
      email,
      publicId: currentUserId,
    },
    select: { id: true },
  });
  if (!isEmailUnique) throw new ConflictError("Invalid data");
  return prisma.user.update({
    where: { id: isEmailUnique.id },
    data: { email },
  });
}

// Edit Names
async function editUserNames(
  { firstName, lastName }: UserEditReq,
  currentUserId: string,
): Promise<UserRes> {
  if (!firstName && !lastName) throw new ValidationError("Invalid data.");
  return prisma.user.update({
    where: { publicId: currentUserId },
    data: {
      ...(firstName !== undefined && { firstName }),
      ...(lastName !== undefined && { lastName }),
    },
  });
}

// Throw if User has OAuth account
async function blockOauthUser(currentUserId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { publicId: currentUserId },
    include: { accounts: { where: { provider: "google" } } },
  });
  if (!user) throw new NotFoundError("User not found.");
  if (user.accounts.length) throw new ForbiddenError("Action not allowed.");
}

// Sign short access token
export async function signToken(publicId: string): Promise<string> {
  return new SignJWT({ sub: publicId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .setAudience(process.env.CLIENT_URL!)
    .sign(secret);
}

// Verify token
export async function verifyAccessToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, secret, {
    audience: process.env.CLIENT_URL!,
    algorithms: ["HS256"],
  });
  return payload;
}
// Create refresh token
export async function issueRefreshToken(userId: string): Promise<string> {
  const rawToken = crypto.randomBytes(64).toString("hex");
  const familyId = crypto.randomUUID();
  const user = await prisma.user.findUnique({
    where: { publicId: userId },
    select: { id: true },
  });
  if (!user) throw new NotFoundError("User not found");

  await prisma.refreshToken.create({
    data: {
      familyId,
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt: addDays(new Date(), 30),
    },
  });
  return rawToken;
}

// Handle refresh token validation
export async function rotateRefreshToken(
  rawToken: string,
): Promise<TokenRotateReturn> {
  const tokenHash = hashToken(rawToken);

  return prisma.$transaction(async (tx) => {
    const record = await tx.refreshToken.findFirst({ where: { tokenHash } });
    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedError();
    }

    if (record.used) {
      await tx.refreshToken.updateMany({
        where: { familyId: record.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedError("Refresh token reuse detected");
    }

    await tx.refreshToken.update({
      where: { id: record.id },
      data: { used: true },
    });

    const newRawToken = crypto.randomBytes(64).toString("hex");
    await tx.refreshToken.create({
      data: {
        familyId: record.familyId,
        userId: record.userId,
        tokenHash: hashToken(newRawToken),
        expiresAt: addDays(new Date(), 30),
      },
    });

    return { userId: record.userId, rawToken: newRawToken };
  });
}
// OAuth
export async function findOrCreateUser(
  provider: string,
  providerUserId: string,
  email: string,
  emailVerified: boolean,
  firstName: string,
  lastName: string,
): Promise<UserRes> {
  const existingAccount = await prisma.oAuthAccount.findUnique({
    where: { provider_providerUserId: { provider, providerUserId } },
    include: { user: true },
  });
  if (existingAccount) return existingAccount.user;

  let user = await prisma.user.findUnique({
    where: { email },
    omit: omitUserPassword,
  });

  if (user) {
    if (!emailVerified) {
      throw new UnauthorizedError("An account with this email already exists.");
    }
  } else {
    user = await prisma.user.create({
      data: { email, firstName, lastName },
      omit: omitUserPassword,
    });
  }

  await prisma.oAuthAccount.create({
    data: { provider, providerUserId, userId: user.id },
  });

  return user;
}

// Helper functions
function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}
// Public Id as utils
export async function getUserPublicId(userId: number): Promise<PublicId> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { publicId: true },
  });
  if (!user) throw new NotFoundError();
  return user.publicId;
}

// Encoded JWT Secret
export const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
