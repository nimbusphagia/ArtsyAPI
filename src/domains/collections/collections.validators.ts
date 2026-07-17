import z from "zod";

export const CollectionResponseSchema = z.object({
  publicId: z.uuidv7(),
  name: z.string(),
  description: z.string(),
  active: z.boolean().default(false),
  createdAt: z.coerce.date(),
});
export type CollectionRes = z.infer<typeof CollectionResponseSchema>;
