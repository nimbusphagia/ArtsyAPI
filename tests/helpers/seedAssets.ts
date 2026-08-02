import { prisma } from "../../src/config/prisma";

export async function seedDefaultAssets() {
  const picture = await prisma.asset.findFirst({
    where: { type: "DEFAULT_PROFILE_PICTURE" },
  });
  if (!picture) {
    await prisma.asset.create({ data: { type: "DEFAULT_PROFILE_PICTURE" } });
  }

  const banner = await prisma.asset.findFirst({
    where: { type: "DEFAULT_PROFILE_BANNER" },
  });
  if (!banner) {
    await prisma.asset.create({ data: { type: "DEFAULT_PROFILE_BANNER" } });
  }
}
