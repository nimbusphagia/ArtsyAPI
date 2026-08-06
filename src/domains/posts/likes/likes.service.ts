import {
  NotFoundError,
  UnauthorizedError,
} from "../../../config/errors/errors";
import { prisma } from "../../../config/prisma";
import { createNotification } from "../../notifications/notifications.service";
import {
  ProfileIsNotBlocked,
  ProfileLazySelect,
} from "../../profiles/profiles.validators";
import { LikeRes, LikeResponseSchema } from "./likes.validators";

// Like a post
export async function likePostById(
  postId: string,
  currentUserId: string,
): Promise<void> {
  const currentUser = await prisma.user.findFirst({
    where: { publicId: currentUserId, active: true, profile: { isNot: null } },
    select: { profile: { select: { id: true } } },
  });
  if (!currentUser) throw new UnauthorizedError("Unauthorized action");

  const currentProfileId = currentUser.profile!.id;

  const post = await prisma.post.findUnique({
    where: {
      publicId: postId,
      private: false,
      author: ProfileIsNotBlocked(currentProfileId),
    },
    select: { id: true, authorId: true },
  });
  if (!post) throw new NotFoundError("Post not found");
  await prisma.postLike.create({
    data: { ownerId: currentProfileId, postId: post.id },
  });
  await createNotification({
    recipientId: post.authorId,
    actorId: currentProfileId,
    type: "LIKE_POST",
    postId: post.id,
  });
}

// Dislike a post
export async function deleteLikeByPostId(
  postId: string,
  currentUserId: string,
): Promise<void> {
  const currentUser = await prisma.user.findFirst({
    where: { publicId: currentUserId, active: true, profile: { isNot: null } },
    select: { profile: { select: { id: true } } },
  });
  if (!currentUser) throw new UnauthorizedError("Unauthorized action");

  const post = await prisma.post.findUnique({
    where: {
      publicId: postId,
      private: false,
      author: ProfileIsNotBlocked(currentUser.profile!.id),
    },
    select: {
      id: true,
      likes: {
        where: { ownerId: currentUser.profile!.id },
        select: { publicId: true },
      },
    },
  });
  if (!post) throw new NotFoundError("Post not found");
  const like = post.likes[0];
  if (!like) throw new NotFoundError("PostLike not found");

  await prisma.postLike.delete({
    where: { publicId: like.publicId },
  });
}

// Get likes by post
export async function getLikesByPost(
  postId: string,
  currentUserId: string,
): Promise<LikeRes[]> {
  const currentUser = await prisma.user.findFirst({
    where: { publicId: currentUserId, active: true, profile: { isNot: null } },
    select: { profile: { select: { id: true } } },
  });
  if (!currentUser) throw new UnauthorizedError("Unauthorized action");

  const post = await prisma.post.findUnique({
    where: {
      publicId: postId,
      private: false,
      author: ProfileIsNotBlocked(currentUser.profile!.id),
    },
    select: {
      id: true,
      likes: {
        select: { owner: { select: ProfileLazySelect }, createdAt: true },
      },
    },
  });
  if (!post) throw new NotFoundError("Post not found");

  return LikeResponseSchema.array().parse(post.likes);
}
