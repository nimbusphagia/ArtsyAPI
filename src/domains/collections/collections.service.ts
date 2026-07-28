import {
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "../../config/errors/errors";
import { prisma } from "../../config/prisma";
import { ProfileIsNotBlocked } from "../profiles/profiles.validators";
import {
  CollectionCreateReq,
  CollectionEditReq,
  CollectionLazyRes,
  CollectionLazySelect,
  CollectionRes,
  CollectionSelect,
  ColPostsEditReq,
  parseCollectionLazyRes,
  parseCollectionRes,
} from "./collections.validators";

// List by user
export async function getCollectionsByProfile(
  profileId: string,
  currentUserId: string,
): Promise<CollectionLazyRes[]> {
  const currentUser = await prisma.user.findFirst({
    where: {
      publicId: currentUserId,
      active: true,
      profile: {
        isNot: null,
      },
    },
    select: { profile: { select: { id: true } } },
  });
  if (!currentUser) throw new UnauthorizedError("Unauthorized action");
  const author = await prisma.profile.findFirst({
    where: {
      publicId: profileId,
      blocking: {
        none: {
          blockedId: currentUser.profile!.id,
        },
      },
    },
    select: {
      collections: { where: { private: false }, select: CollectionLazySelect },
    },
  });
  if (!author) throw new NotFoundError("Collection author not found");
  const parsed = author.collections.map((col) => parseCollectionLazyRes(col));
  return parsed;
}

// Create
export async function createCollection(
  data: CollectionCreateReq,
  currentUserId: string,
): Promise<CollectionRes> {
  const currentUser = await prisma.user.findFirst({
    where: { publicId: currentUserId, active: true, profile: { isNot: null } },
    select: { profile: { select: { id: true } } },
  });
  if (!currentUser) throw new UnauthorizedError("Unauthorized action");

  const { name, description, posts, isPrivate } = data;

  const foundPosts = await prisma.post.findMany({
    where: {
      private: false,
      author: ProfileIsNotBlocked(currentUser.profile!.id),
      publicId: {
        in: posts.map((p) => p.publicId),
      },
    },
    select: { id: true, publicId: true },
  });

  const idByPublicId = new Map(foundPosts.map((p) => [p.publicId, p.id]));

  const missing = posts.filter((p) => !idByPublicId.has(p.publicId));
  if (missing.length > 0) {
    throw new NotFoundError(
      `Post(s) not found: ${missing.map((p) => p.publicId).join(", ")}`,
    );
  }
  const collectionPostsData = posts.map((p) => ({
    postId: idByPublicId.get(p.publicId)!,
    position: p.position,
  }));

  const collection = await prisma.collection.create({
    data: {
      name,
      ...(description?.trim() && { description }),
      ...(isPrivate !== undefined && { private: isPrivate }),
      ownerId: currentUser.profile!.id,
      posts: {
        createMany: {
          data: collectionPostsData,
        },
      },
    },
    select: CollectionSelect,
  });

  return parseCollectionRes(collection);
}

// List current user's collections
export async function getCollections(
  currentUserId: string,
): Promise<CollectionLazyRes[]> {
  const currentUser = await prisma.user.findFirst({
    where: {
      publicId: currentUserId,
      active: true,
      profile: {
        isNot: null,
      },
    },
    select: { profile: { select: { id: true } } },
  });
  if (!currentUser) throw new UnauthorizedError("Unauthorized action");
  const collections = await prisma.collection.findMany({
    where: {
      ownerId: currentUser.profile!.id,
    },
    select: CollectionLazySelect,
  });
  const parsed = collections.map((col) => parseCollectionLazyRes(col));
  return parsed;
}

// Get By Id
export async function getCollectionById(
  collectionId: string,
  currentUserId: string,
): Promise<CollectionRes> {
  const currentUser = await prisma.user.findFirst({
    where: { publicId: currentUserId, active: true, profile: { isNot: null } },
    select: { profile: { select: { id: true } } },
  });
  if (!currentUser) throw new UnauthorizedError("Unauthorized action");

  const collection = await prisma.collection.findFirst({
    where: {
      publicId: collectionId,
      owner: ProfileIsNotBlocked(currentUser.profile!.id),
      OR: [{ private: false }, { ownerId: currentUser.profile!.id }],
    },
    select: CollectionSelect,
  });
  if (!collection) throw new NotFoundError("Collection not found");

  return parseCollectionRes(collection);
}

// Edit
export async function editCollectionInfo(
  data: CollectionEditReq,
  currentUserId: string,
): Promise<CollectionRes> {
  const currentUser = await prisma.user.findFirst({
    where: { publicId: currentUserId, active: true, profile: { isNot: null } },
    select: { profile: { select: { id: true } } },
  });
  if (!currentUser) throw new UnauthorizedError("Unauthorized action");

  const { publicId, name, description, isPrivate } = data;

  const collection = await prisma.collection.update({
    where: {
      publicId,
    },
    data: {
      ...(name && { name }),
      ...(description && { description }),
      ...(isPrivate !== undefined && { private: isPrivate }),
    },
    select: CollectionSelect,
  });

  return parseCollectionRes(collection);
}

// Delete
export async function deleteCollectionById(
  collectionId: string,
  currentUserId: string,
): Promise<void> {
  const currentUser = await prisma.user.findFirst({
    where: { publicId: currentUserId, active: true, profile: { isNot: null } },
    select: { profile: { select: { id: true } } },
  });
  if (!currentUser) throw new UnauthorizedError("Unauthorized action");

  await prisma.collection.delete({
    where: { ownerId: currentUser.profile!.id, publicId: collectionId },
  });
}

// Update posts positions
export async function updateCollectionPosts(
  { publicId, posts }: ColPostsEditReq,
  currentUserId: string,
): Promise<CollectionRes> {
  const currentUser = await prisma.user.findFirst({
    where: { publicId: currentUserId, active: true, profile: { isNot: null } },
    select: { profile: { select: { id: true } } },
  });
  if (!currentUser) throw new UnauthorizedError("Unauthorized action");

  const collection = await prisma.collection.findUnique({
    where: { publicId, ownerId: currentUser.profile!.id },
    select: { posts: { select: { id: true, publicId: true, position: true } } },
  });
  if (!collection) throw new NotFoundError("Collection not found");

  const existingByPublicId = new Map(
    collection.posts.map((p) => [p.publicId, p]),
  );

  const missing = posts.filter((p) => !existingByPublicId.has(p.publicId));
  if (missing.length > 0) {
    throw new ValidationError(
      `Post(s) not in collection: ${missing.map((p) => p.publicId).join(", ")}`,
    );
  }
  if (posts.length !== collection.posts.length) {
    throw new ValidationError(
      "Request must include every post currently in the collection",
    );
  }

  const changed = posts.filter(
    (p) => existingByPublicId.get(p.publicId)!.position !== p.position,
  );

  if (changed.length > 0) {
    await prisma.$transaction([
      ...changed.map((p) =>
        prisma.collectionPost.update({
          where: { id: existingByPublicId.get(p.publicId)!.id },
          data: { position: -p.position },
        }),
      ),
      ...changed.map((p) =>
        prisma.collectionPost.update({
          where: { id: existingByPublicId.get(p.publicId)!.id },
          data: { position: p.position },
        }),
      ),
    ]);
  }

  const updatedCollection = await prisma.collection.findUnique({
    where: { publicId, ownerId: currentUser.profile!.id },
    select: CollectionSelect,
  });
  if (!updatedCollection) throw new NotFoundError("Collection not found");

  return parseCollectionRes(updatedCollection);
}
