import request from "supertest";
import { app } from "../../src/config/server";
import { getAuthenticatedUser } from "./auth";

export async function getUserWithProfile(overrides = {}) {
  const auth = await getAuthenticatedUser(overrides);

  const res = await request(app)
    .post("/profiles")
    .set("Authorization", `Bearer ${auth.accessToken}`)
    .send({});

  if (res.status !== 201) {
    throw new Error(
      `Setup failed: profile creation returned ${res.status} — ${JSON.stringify(res.body)}`,
    );
  }

  return { ...auth, profile: res.body };
}
