import { NotFoundError, UnauthorizedError } from "../../config/errors/errors";
import { prisma } from "../../config/prisma";
import { toMediaData, uploadImage } from "../media/media.service";
import { ProfileIsNotBlocked } from "../profiles/profiles.validators";
import {
  type PostLazyRes,
  PostLazySelect,
  PostLazyResponseSchema,
  PostReq,
} from "./posts.validators";

// List public posts
export async function listPostsByProfile(
  profilePublicId: string,
  currentUserId: string,
): Promise<PostLazyRes[]> {
  const currentUser = await prisma.user.findFirst({
    where: { publicId: currentUserId, active: true, profile: { isNot: null } },
    select: { profile: { select: { id: true } } },
  });
  if (!currentUser) throw new UnauthorizedError("Unauthorized action");

  const targetUser = await prisma.user.findFirst({
    where: {
      publicId: profilePublicId,
      active: true,
      profile: ProfileIsNotBlocked(currentUser.profile!.id),
    },
    select: { profile: { select: { id: true } } },
  });
  if (!targetUser) throw new NotFoundError("User not found.");
  const posts = await prisma.post.findMany({
    where: { authorId: targetUser.profile!.id, private: false },
    select: PostLazySelect,
  });
  const parsedPosts = PostLazyResponseSchema.array().parse(
    posts.map((p) => {
      return { ...p, stats: p._count };
    }),
  );
  return parsedPosts;
}

// Create a post as the current user
export async function createPost(data: PostReq, currentUserId: string) {
  const currentUser = await prisma.user.findFirst({
    where: { publicId: currentUserId, active: true, profile: { isNot: null } },
    select: { profile: { select: { id: true } } },
  });
  if (!currentUser) throw new UnauthorizedError("Unauthorized action");

  const uploadedImages = await Promise.all(
    data.files.map(async (m) =>
      toMediaData(await uploadImage(m.buffer, "artsy")),
    ),
  );

  const post = await prisma.post.create({
    data: {
      authorId: currentUser.profile!.id,
      media: {
        createMany: {
          data: uploadedImages,
        },
      },
    },
    select: PostLazySelect,
  });

  return PostLazyResponseSchema.parse({ ...post, stats: post._count });
}
