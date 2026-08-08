import { Server } from "socket.io";
import { verifyAccessToken } from "../domains/auth/auth.service";
import { prisma } from "./prisma";
import { ForbiddenError } from "./errors/errors";
import { ProfileIsNotBlocked } from "../domains/profiles/profiles.validators";

const io = new Server({
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
});

// Authorization and profile attach
io.use(async (socket, next) => {
  try {
    const authHeader = socket.handshake.auth?.token;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(new ForbiddenError());
    }
    const token = authHeader.substring(7);
    const payload = await verifyAccessToken(token);
    if (!payload.sub) {
      return next(new ForbiddenError());
    }
    const user = await prisma.user.findFirst({
      where: {
        publicId: payload.sub,
        active: true,
        profile: { isNot: null },
      },
      select: { profile: { select: { id: true, publicId: true } } },
    });
    if (!user) {
      return next(new ForbiddenError());
    }
    socket.data.profile = user.profile!;
    next();
  } catch (err) {
    return next(new ForbiddenError());
  }
});

// Main
io.on("connection", async (socket) => {
  const profile = socket.data.profile as { id: number; publicId: string };
  console.log(`Connected: ${socket.id} (Profile: ${profile.publicId})`);

  // Profile room
  socket.join(`profile:${profile.id}`);

  try {
    const chats = await prisma.chat.findMany({
      where: {
        AND: [
          { members: { some: { profileId: profile.id } } },
          {
            members: {
              every: {
                OR: [
                  { profileId: profile.id },
                  { profile: ProfileIsNotBlocked(profile.id) },
                ],
              },
            },
          },
        ],
      },
      select: { id: true },
    });

    for (const chat of chats) {
      socket.join(`chat:${chat.id}`);
    }
  } catch (err) {
    console.error(`Failed to join chat rooms for profile ${profile.id}:`, err);
  }
  socket.emit("ready");
  socket.on("disconnect", () => {
    console.log(`Disconnected: ${socket.id}`);
  });
});

export default io;
