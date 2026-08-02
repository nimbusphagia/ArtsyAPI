import { config } from "dotenv";
config({ path: ".env.test" });

import { beforeAll, afterAll } from "vitest";
import { prisma } from "../src/config/prisma";

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});
