import request from "supertest";
import { app } from "../../src/config/server";

export const validRegisterPayload = (overrides = {}) => ({
  email: `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
  password: "Password123!",
  confirmPassword: "Password123!",
  firstName: "Test",
  lastName: "User",
  ...overrides,
});

export async function registerUser(overrides = {}) {
  const payload = validRegisterPayload(overrides);
  const res = await request(app).post("/auth/register").send(payload);
  return { res, payload };
}

export async function getAuthenticatedUser(overrides = {}) {
  const { res, payload } = await registerUser(overrides);
  if (res.status !== 201) {
    throw new Error(
      `Setup failed: register returned ${res.status} — ${JSON.stringify(res.body)}`,
    );
  }
  const setCookie = res.headers["set-cookie"] as unknown as string[];
  const refreshCookie = setCookie?.find((c) => c.startsWith("refreshToken="));

  return {
    accessToken: res.body.accessToken as string,
    refreshCookie,
    email: payload.email,
    password: payload.password,
  };
}
