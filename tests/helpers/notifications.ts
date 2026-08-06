import request from "supertest";
import { app } from "../../src/config/server";

export async function getNotifications(
  accessToken: string,
  opts: { cursor?: string; limit?: number } = {},
) {
  return request(app)
    .get("/notifications")
    .query(opts)
    .set("Authorization", `Bearer ${accessToken}`);
}

export async function markNotificationRead(
  accessToken: string,
  notificationId: string,
) {
  return request(app)
    .patch(`/notifications/${notificationId}/read`)
    .set("Authorization", `Bearer ${accessToken}`);
}
