import { Request, Response, NextFunction } from "express";
import { NotFoundError, UnauthorizedError } from "../../config/errors/errors";
import {
  createPost,
  deletePostById,
  editPost,
  getPostById,
  getMyPosts,
  getPostsByProfile,
} from "./posts.service";
import { publicIdSchema } from "../../config/utils/validationUtils";
import {
  PostCreateRequestSchema,
  PostEditRequestSchema,
} from "./posts.validators";

export async function listMyPosts(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const posts = await getMyPosts(currentUserId);
    res.status(200).json(posts);
  } catch (err) {
    next(err);
  }
}
export async function listPublicPosts(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const profileId = publicIdSchema.parse(req.params.profileId);
    if (!profileId) throw new NotFoundError("No profile id was provided");
    const posts = await getPostsByProfile(profileId, currentUserId);
    res.status(200).json(posts);
  } catch (err) {
    next(err);
  }
}
export async function getPublicPost(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const postId = publicIdSchema.parse(req.params.postId);
    if (!postId) throw new NotFoundError("No post id was provided");
    const post = await getPostById(postId, currentUserId);
    res.status(200).json(post);
  } catch (error) {
    next(error);
  }
}
export async function createNewPost(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();

    const data = PostCreateRequestSchema.parse({
      description: req.body.description,
      files: req.files,
    });

    const post = await createPost(data, currentUserId);
    res.status(201).json(post);
  } catch (error) {
    next(error);
  }
}

export async function editPostInfo(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const data = PostEditRequestSchema.parse({
      ...req.body,
      postPublicId: req.params.postId,
    });
    const post = await editPost(data, currentUserId);
    res.status(200).json(post);
  } catch (error) {
    next(error);
  }
}
export async function deletePost(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const postId = publicIdSchema.parse(req.params.postId);
    if (!postId) throw new NotFoundError("No post id was provided");
    await deletePostById(postId, currentUserId);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}
