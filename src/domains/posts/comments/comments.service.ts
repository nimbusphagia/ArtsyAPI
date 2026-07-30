import {
  NotFoundError,
  UnauthorizedError,
} from "../../../config/errors/errors";
import { prisma } from "../../../config/prisma";
import { ProfileIsNotBlocked } from "../../profiles/profiles.validators";
import {
  CommentLazySelect,
  CommentReq,
  CommentRes,
  CommentResponseSchema,
} from "./comments.validators";

// Comment on a post
export async function createComment(
  data: CommentReq,
  currentUserId: string,
): Promise<CommentRes> {
  const currentUser = await prisma.user.findFirst({
    where: { publicId: currentUserId, active: true, profile: { isNot: null } },
    select: { profile: { select: { id: true } } },
  });
  if (!currentUser) throw new UnauthorizedError("Unauthorized action");
  const post = await prisma.post.findUnique({
    where: {
      publicId: data.postId,
      author: ProfileIsNotBlocked(currentUser.profile!.id),
    },
    select: { id: true },
  });
  if (!post) throw new NotFoundError("Post not found.");

  const rawComment = await prisma.comment.create({
    data: {
      postId: post.id,
      authorId: currentUser.profile!.id,
      text: data.text,
    },
    select: CommentLazySelect,
  });
  const parsedComment = CommentResponseSchema.parse({
    ...rawComment,
    likes: rawComment!._count.likes,
  });

  return parsedComment;
}

// Delete comment
export async function deleteComment(
  commentId: string,
  currentUserId: string,
): Promise<void> {
  const currentUser = await prisma.user.findFirst({
    where: { publicId: currentUserId, active: true, profile: { isNot: null } },
    select: { profile: { select: { id: true } } },
  });
  if (!currentUser) throw new UnauthorizedError("Unauthorized action");
  await prisma.comment.delete({
    where: {
      publicId: commentId,
      authorId: currentUser.profile!.id,
    },
  });
}

// Get comments by post
export async function getCommentsByPost(
  postId: string,
  currentUserId: string,
): Promise<CommentRes[]> {
  const currentUser = await prisma.user.findFirst({
    where: { publicId: currentUserId, active: true, profile: { isNot: null } },
    select: { profile: { select: { id: true } } },
  });
  if (!currentUser) throw new UnauthorizedError("Unauthorized action");
  const post = await prisma.post.findUnique({
    where: {
      publicId: postId,
      author: ProfileIsNotBlocked(currentUser.profile!.id),
    },
    select: {
      comments: { select: CommentLazySelect, orderBy: { createdAt: "desc" } },
    },
  });
  if (!post) throw new NotFoundError("Post not found.");

  const rawComments = post.comments;
  const parsedComment = CommentResponseSchema.array().parse(
    rawComments.map((c) => {
      return { ...c, likes: c._count.likes };
    }),
  );
  return parsedComment;
}

// Like a comment
export async function likeCommentById(
  commentId: string,
  currentUserId: string,
): Promise<void> {
  const currentUser = await prisma.user.findFirst({
    where: { publicId: currentUserId, active: true, profile: { isNot: null } },
    select: { profile: { select: { id: true } } },
  });
  if (!currentUser) throw new UnauthorizedError("Unauthorized action");
  await prisma.comment.update({
    where: {
      publicId: commentId,
      author: ProfileIsNotBlocked(currentUser.profile!.id),
    },
    data: {
      likes: {
        create: {
          ownerId: currentUser.profile!.id,
        },
      },
    },
  });
}

// Disike a comment
export async function dislikeCommentById(
  commentId: string,
  currentUserId: string,
): Promise<void> {
  const currentUser = await prisma.user.findFirst({
    where: { publicId: currentUserId, active: true, profile: { isNot: null } },
    select: { profile: { select: { id: true } } },
  });
  if (!currentUser) throw new UnauthorizedError("Unauthorized action");

  const comment = await prisma.comment.findUnique({
    where: {
      publicId: commentId,
      author: ProfileIsNotBlocked(currentUser.profile!.id),
    },
    select: { id: true },
  });
  if (!comment) throw new NotFoundError("Comment not found");

  await prisma.commentLike.delete({
    where: {
      ownerId_commentId: {
        ownerId: currentUser.profile!.id,
        commentId: comment.id,
      },
    },
  });
}
