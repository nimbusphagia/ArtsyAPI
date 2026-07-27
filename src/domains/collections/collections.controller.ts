import { Request, Response, NextFunction } from "express";
import { UnauthorizedError } from "../../config/errors/errors";
import { CollectionCreateReqSchema } from "./collections.validators";
import { createCollection } from "./collections.service";

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
