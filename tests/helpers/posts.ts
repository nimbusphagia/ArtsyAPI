import request from "supertest";
import { app } from "../../src/config/server";

export async function createPostAsUser(
  accessToken: string,
  overrides: { description?: string } = {},
) {
  const req = request(app)
    .post("/posts")
    .set("Authorization", `Bearer ${accessToken}`)
    .attach("slide", Buffer.from("fake-image-data"), {
      filename: "slide1.jpg",
      contentType: "image/jpeg",
    });

  if (overrides.description !== undefined) {
    req.field("description", overrides.description);
  }

  const res = await req;
  if (res.status !== 201) {
    throw new Error(
      `Setup failed: post creation returned ${res.status} — ${JSON.stringify(res.body)}`,
    );
  }
  return res.body;
}
