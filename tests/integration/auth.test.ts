import { prisma } from "../../src/config/prisma";
import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/config/server";
import { resetDb } from "../helpers/resetDb";
import {
  registerUser,
  validRegisterPayload,
  getAuthenticatedUser,
} from "../helpers/auth";

beforeEach(async () => {
  await resetDb();
});

describe("POST /auth/register", () => {
  it("creates a user and returns an access token", async () => {
    const { res } = await registerUser();

    expect(res.status).toBe(201);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.password).toBeUndefined();
  });

  it("sets a refreshToken cookie scoped to /auth/refresh", async () => {
    const { res } = await registerUser();
    const setCookie = res.headers["set-cookie"] as unknown as string[];
    const cookie = setCookie?.find((c) => c.startsWith("refreshToken="));

    expect(cookie).toBeDefined();
    expect(cookie).toMatch(/Path=\/auth\/refresh/i);
  });

  it("rejects duplicate email with a conflict", async () => {
    const { payload } = await registerUser();
    const res2 = await request(app)
      .post("/auth/register")
      .send(validRegisterPayload({ email: payload.email }));

    expect(res2.status).toBe(409);
  });

  it("rejects mismatched passwords via zod", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send(validRegisterPayload({ confirmPassword: "Different123!" }));

    expect(res.status).toBe(400);
  });

  it("rejects a password missing a special character", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send(
        validRegisterPayload({
          password: "Password123",
          confirmPassword: "Password123",
        }),
      );

    expect(res.status).toBe(400);
  });

  it("rejects firstName shorter than 2 characters", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send(validRegisterPayload({ firstName: "A" }));

    expect(res.status).toBe(400);
  });

  it("rejects malformed email", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send(validRegisterPayload({ email: "not-an-email" }));

    expect(res.status).toBe(400);
  });
});

describe("POST /auth/login", () => {
  it("logs in with correct credentials", async () => {
    const { payload } = await registerUser();
    const res = await request(app)
      .post("/auth/login")
      .send({ email: payload.email, password: payload.password });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
  });

  it("rejects wrong password with 401", async () => {
    const { payload } = await registerUser();
    const res = await request(app)
      .post("/auth/login")
      .send({ email: payload.email, password: "WrongPass123!" });

    expect(res.status).toBe(401);
  });

  it("rejects unknown email with 404", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "nobody@example.com", password: "WhateverPass1!" });

    expect(res.status).toBe(404);
  });
});

describe("POST /auth/refresh", () => {
  it("issues a new access token given a valid refresh cookie", async () => {
    const { refreshCookie } = await getAuthenticatedUser();
    expect(refreshCookie).toBeDefined();

    const res = await request(app)
      .post("/auth/refresh")
      .set("Cookie", refreshCookie!);

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
  });

  it("rejects when no refresh cookie is present", async () => {
    const res = await request(app).post("/auth/refresh");
    expect(res.status).toBe(401);
  });

  it("detects reuse of an already-rotated refresh token", async () => {
    const { refreshCookie } = await getAuthenticatedUser();

    await request(app).post("/auth/refresh").set("Cookie", refreshCookie!);
    const res = await request(app)
      .post("/auth/refresh")
      .set("Cookie", refreshCookie!);

    expect(res.status).toBe(401);
  });
});

describe("PATCH /auth/account", () => {
  it("rejects unauthenticated requests", async () => {
    const res = await request(app)
      .patch("/auth/account")
      .send({ firstName: "New" });
    expect(res.status).toBe(401);
  });

  it("updates first name when authenticated", async () => {
    const { accessToken } = await getAuthenticatedUser();

    const res = await request(app)
      .patch("/auth/account")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ firstName: "Updated" });

    expect(res.status).toBe(200);
    expect(res.body.firstName).toBe("Updated");
  });

  it("rejects password change without newPassword (validation refine)", async () => {
    const { accessToken } = await getAuthenticatedUser();

    const res = await request(app)
      .patch("/auth/account")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ password: "Password123!" });

    expect(res.status).toBe(400);
  });

  it("rejects email change for an OAuth-linked account", async () => {
    const { accessToken, email } = await getAuthenticatedUser();

    // Simulate this user having a linked Google account
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    await prisma.oAuthAccount.create({
      data: {
        provider: "google",
        providerUserId: "fake-google-id-123",
        userId: user.id,
      },
    });

    const res = await request(app)
      .patch("/auth/account")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ email: "newemail@example.com", password: "Password123!" });

    expect(res.status).toBe(403);
  });
});
