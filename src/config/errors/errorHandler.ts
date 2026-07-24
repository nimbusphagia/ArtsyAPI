import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "./errors";
import { Prisma } from "../../generated/prisma/client";

export function ErrorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      message: "Validation failed",
      errors: err.issues.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2025":
        res.status(404).json({ message: "Resource not found" });
        return;
      case "P2002":
        res.status(409).json({
          message: "A record with this value already exists",
          fields: err.meta?.target,
        });
        return;
      case "P2003":
        res.status(409).json({ message: "Related resource does not exist" });
        return;
      default:
        console.error("Unhandled Prisma error:", err.code, err.meta);
        res.status(500).json({ message: "Database error" });
        return;
    }
  }

  console.error(err);
  res.status(500).json({ message: "Internal server error" });
}
