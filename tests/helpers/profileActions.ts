import request from "supertest";
import { app } from "../../src/config/server";

export async function followProfile(
  accessToken: string,
  profilePublicId: string,
) {
  return request(app)
    .post(`/profiles/${profilePublicId}/follow`)
    .set("Authorization", `Bearer ${accessToken}`);
}

export async function unfollowProfile(
  accessToken: string,
  profilePublicId: string,
) {
  return request(app)
    .delete(`/profiles/${profilePublicId}/follow`)
    .set("Authorization", `Bearer ${accessToken}`);
}

export async function getFollowers(
  accessToken: string,
  profilePublicId: string,
) {
  return request(app)
    .get(`/profiles/${profilePublicId}/followers`)
    .set("Authorization", `Bearer ${accessToken}`);
}

export async function getFollowed(
  accessToken: string,
  profilePublicId: string,
) {
  return request(app)
    .get(`/profiles/${profilePublicId}/followed`)
    .set("Authorization", `Bearer ${accessToken}`);
}

export async function blockProfile(
  accessToken: string,
  profilePublicId: string,
) {
  return request(app)
    .post(`/profiles/${profilePublicId}/block`)
    .set("Authorization", `Bearer ${accessToken}`);
}

export async function unblockProfile(
  accessToken: string,
  profilePublicId: string,
) {
  return request(app)
    .delete(`/profiles/${profilePublicId}/block`)
    .set("Authorization", `Bearer ${accessToken}`);
}

export async function getBlockedProfiles(accessToken: string) {
  return request(app)
    .get("/profiles/blocked")
    .set("Authorization", `Bearer ${accessToken}`);
}
