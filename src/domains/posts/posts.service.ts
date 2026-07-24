import { NotFoundError, UnauthorizedError } from "../../config/errors/errors";
import { prisma } from "../../config/prisma";
import { toMediaData, uploadImage } from "../media/media.service";
import { ProfileLazySelect } from "../profiles/profiles.validators";
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

  const targetProfile = await prisma.profile.findUnique({
    where: {
      publicId: profilePublicId,
      user: { active: true },
      blocking: {
        none: {
          blockedId: currentUser.profile!.id,
        },
      },
    },
    select: { id: true },
  });
  if (!targetProfile) throw new NotFoundError("User not found.");
  const posts = await prisma.post.findMany({
    where: { authorId: targetProfile.id, private: false },
    select: { ...PostLazySelect, author: { select: ProfileLazySelect } },
  });
  const parsedPosts = PostLazyResponseSchema.array().parse(
    posts.map((p) => {
      return {
        ...p,
        thumbnails: p.media,
        stats: p._count,
      };
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

  const { description, files } = data;
  const uploadedImages = await Promise.all(
    files.map(async (m) => toMediaData(await uploadImage(m.buffer, "artsy"))),
  );

  const post = await prisma.post.create({
    data: {
      authorId: currentUser.profile!.id,
      ...(description && { description }),
      media: {
        createMany: {
          data: uploadedImages,
        },
      },
    },
    select: { ...PostLazySelect, author: { select: ProfileLazySelect } },
  });

  return PostLazyResponseSchema.parse({
    ...post,
    thumbnails: post.media,
    stats: post._count,
  });
}
