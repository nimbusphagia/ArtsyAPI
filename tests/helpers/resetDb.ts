import { prisma } from "../../src/config/prisma";

export async function resetDb() {
  await prisma.$transaction([
    prisma.refreshToken.deleteMany(),
    prisma.oAuthAccount.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}
