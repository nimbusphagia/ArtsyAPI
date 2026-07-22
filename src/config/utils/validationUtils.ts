import z from "zod";

export const optionalToNull = <T extends z.ZodTypeAny>(schema: T) =>
  schema.optional().transform((v) => v ?? null);
