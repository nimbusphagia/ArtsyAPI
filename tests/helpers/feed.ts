import request from "supertest";
import { app } from "../../src/config/server";

export async function getHomeFeed(
  accessToken: string,
  opts: { before?: string; limit?: number } = {},
) {
  return request(app)
    .get("/feed/home")
    .query(opts)
    .set("Authorization", `Bearer ${accessToken}`);
}

export async function getExploreFeed(
  accessToken: string,
  opts: { limit?: number } = {},
) {
  return request(app)
    .get("/feed/explore")
    .query(opts)
    .set("Authorization", `Bearer ${accessToken}`);
}
