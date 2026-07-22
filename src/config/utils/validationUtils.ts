import z from "zod";

export const optionalToNull = <T extends z.ZodTypeAny>(schema: T) =>
  schema.optional().transform((v) => v ?? null);

// Generic public id schema
export const ItemPublicSchema = z.object({
  publicId: z.uuidv7(),
  createdAt: z.coerce.date(),
});

export type ItemPublic = z.infer<typeof ItemPublicSchema>;

export const publicIdSchema = z.uuidv7();
export type PublicId = z.infer<typeof publicIdSchema>;
