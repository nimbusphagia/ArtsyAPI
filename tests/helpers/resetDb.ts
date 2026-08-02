import { prisma } from "../../src/config/prisma";

export async function resetDb() {
  await prisma.$transaction([
    prisma.refreshToken.deleteMany(),
    prisma.oAuthAccount.deleteMany(),
    prisma.user.deleteMany(),
    prisma.asset.deleteMany({
      where: { type: { in: ["PROFILE_PICTURE", "PROFILE_BANNER"] } },
    }),
    prisma.media.deleteMany(),
  ]);
}
