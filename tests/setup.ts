import { config } from "dotenv";
config({ path: ".env.test" });

import { beforeAll, afterAll } from "vitest";
import { prisma } from "../src/config/prisma";
import { seedDefaultAssets } from "./helpers/seedAssets";

beforeAll(async () => {
  await prisma.$connect();
  await seedDefaultAssets();
});

afterAll(async () => {
  await prisma.$disconnect();
});
