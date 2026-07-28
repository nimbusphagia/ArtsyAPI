import { Request, Response, NextFunction } from "express";
import { UnauthorizedError } from "../../config/errors/errors";
import {
  CollectionCreateReqSchema,
  CollectionEditReqSchema,
  ColPostsEditReqSchema,
} from "./collections.validators";
import {
  createCollection,
  deleteCollectionById,
  editCollectionInfo,
  getCollectionById,
  getCollections,
  getCollectionsByProfile,
  updateCollectionPosts,
} from "./collections.service";
import { publicIdSchema } from "../../config/utils/validationUtils";
import { ColPostReqSchema } from "./collectionPosts/collectionPosts.validators";
import {
  createCollectionPost,
  deleteCollectionPost,
} from "./collectionPosts/collectionPosts.service";
import { LikeRequestSchema } from "./likes/likes.validators";
import {
  createCollectionLike,
  deleteCollectionLike,
  getLikesByCollection,
} from "./likes/likes.service";

export async function createNewCollection(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const data = CollectionCreateReqSchema.parse({
      ...req.body,
    });
    const collection = await createCollection(data, currentUserId);
    res.status(201).json(collection);
  } catch (error) {
    next(error);
  }
}

export async function editCollection(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const data = CollectionEditReqSchema.parse({
      ...req.body,
      publicId: req.params.collectionId,
    });
    const collection = await editCollectionInfo(data, currentUserId);
    res.status(200).json(collection);
  } catch (error) {
    next(error);
  }
}

export async function listCollectionsByProfile(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const profileId = publicIdSchema.parse(req.params.profileId);
    const collections = await getCollectionsByProfile(profileId, currentUserId);
    res.status(200).json(collections);
  } catch (error) {
    next(error);
  }
}

export async function listMyCollections(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const collections = await getCollections(currentUserId);
    res.status(200).json(collections);
  } catch (error) {
    next(error);
  }
}

export async function getCollection(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const collectionId = publicIdSchema.parse(req.params.collectionId);
    const collection = await getCollectionById(collectionId, currentUserId);
    res.status(200).json(collection);
  } catch (error) {
    next(error);
  }
}

export async function deleteCollection(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const collectionId = publicIdSchema.parse(req.params.collectionId);
    await deleteCollectionById(collectionId, currentUserId);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}
export async function reorderCollection(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const data = ColPostsEditReqSchema.parse({
      ...req.body,
      publicId: req.params.collectionId,
    });
    const collection = await updateCollectionPosts(data, currentUserId);
    res.status(200).json(collection);
  } catch (error) {
    next(error);
  }
}

export async function addPostToCollection(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const data = ColPostReqSchema.parse({
      ...req.body,
      collectionId: req.params.collectionId,
    });
    const collection = await createCollectionPost(data, currentUserId);
    res.status(201).json(collection);
  } catch (error) {
    next(error);
  }
}
export async function removePostFromCollection(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const data = ColPostReqSchema.parse({
      ...req.body,
      collectionId: req.params.collectionId,
    });
    await deleteCollectionPost(data, currentUserId);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

export async function likeCollection(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const data = LikeRequestSchema.parse({ ...req.params });
    const like = await createCollectionLike(data, currentUserId);
    res.status(201).json(like);
  } catch (error) {
    next(error);
  }
}
export async function removeLikeFromCollection(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const data = LikeRequestSchema.parse({ ...req.params });
    await deleteCollectionLike(data, currentUserId);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

export async function listCollectionLikes(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const data = LikeRequestSchema.parse({ ...req.params });
    const collections = await getLikesByCollection(data, currentUserId);
    res.status(200).json(collections);
  } catch (error) {
    next(error);
  }
}
