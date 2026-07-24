import {
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "../../config/errors/errors";
import { prisma } from "../../config/prisma";
import { Prisma } from "../../generated/prisma/client";
import { toMediaData, uploadImage } from "../media/media.service";
import {
  ProfileIsNotBlocked,
  ProfileLazySelect,
} from "../profiles/profiles.validators";
import {
  type PostLazyRes,
  PostLazySelect,
  PostLazyResponseSchema,
  PostCreateReq,
  PostEditReq,
  PostRes,
  PostSelect,
  PostResponseSchema,
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
  if (!targetProfile) throw new NotFoundError("Profile not found.");
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
export async function createPost(data: PostCreateReq, currentUserId: string) {
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

// Edit post as the user
export async function editPost(data: PostEditReq, currentUserId: string) {
  const currentUser = await prisma.user.findFirst({
    where: { publicId: currentUserId, active: true, profile: { isNot: null } },
    select: { profile: { select: { id: true } } },
  });
  if (!currentUser) throw new UnauthorizedError("Unauthorized action");

  const { postPublicId, description, isPrivate } = data;

  if (!description?.trim() && isPrivate === undefined)
    throw new ValidationError("Empty body.");
  const post = await prisma.post.update({
    where: { publicId: postPublicId },
    data: {
      ...(description?.trim() && { description: description.trim() }),
      ...(isPrivate !== undefined && { private: isPrivate }),
    },
    select: { ...PostLazySelect, author: { select: ProfileLazySelect } },
  });

  return PostLazyResponseSchema.parse({
    ...post,
    thumbnails: post.media,
    stats: post._count,
  });
}

// List private posts
export async function listMyPosts(
  currentUserId: string,
): Promise<PostLazyRes[]> {
  const currentUser = await prisma.user.findFirst({
    where: { publicId: currentUserId, active: true, profile: { isNot: null } },
    select: { profile: { select: { id: true } } },
  });
  if (!currentUser) throw new UnauthorizedError("Unauthorized action");

  const targetProfile = await prisma.profile.findUnique({
    where: {
      id: currentUser.profile!.id,
    },
    select: { id: true },
  });
  if (!targetProfile) throw new NotFoundError("Profile not found.");
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

// Get a public post
export async function getPostById(
  postId: string,
  currentUserId: string,
): Promise<PostRes> {
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
    select: PostSelect,
  });
  if (!post) throw new NotFoundError("Post not found");
  console.log(post.comments);
  const parsedPosts = PostResponseSchema.parse({
    ...post,
    comments: post.comments,
    likes: post._count.likes,
  });
  return parsedPosts;
}

// Delete post
export async function deletePostById(
  postId: string,
  currentUserId: string,
): Promise<void> {
  const currentUser = await prisma.user.findFirst({
    where: { publicId: currentUserId, active: true, profile: { isNot: null } },
    select: { profile: { select: { id: true } } },
  });
  if (!currentUser) throw new UnauthorizedError("Unauthorized action");

  try {
    await prisma.post.delete({
      where: {
        publicId: postId,
        authorId: currentUser.profile!.id,
      },
      select: { id: true },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      throw new NotFoundError("Post not found");
    }
    throw err;
  }
}

// Likes and comments
