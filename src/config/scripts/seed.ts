import cloudinary from "../cloudinary";
import { prisma } from "../prisma";
import fs from "fs";
import path from "path";
import type { UploadApiResponse } from "cloudinary";
import type { AssetType } from "../../domains/media/media.validators";

const IMAGE_FOLDER = path.join(__dirname, "../../assets/images");

const DEFAULT_IMAGE_MAP: Record<string, AssetType> = {
  "default-profile-picture.jpg": "DEFAULT_PROFILE_PICTURE",
  "default-profile-banner.jpg": "DEFAULT_PROFILE_BANNER",
};

async function uploadImageToCloudinary(
  fileName: string,
): Promise<UploadApiResponse> {
  const filePath = path.join(IMAGE_FOLDER, fileName);

  if (!fs.existsSync(filePath)) {
    throw new Error(`No se encontró el archivo esperado: ${filePath}`);
  }

  return cloudinary.uploader.upload(filePath, {
    folder: "artsy-seed-images",
  });
}

async function createMediaFromUploadResult(result: UploadApiResponse) {
  return prisma.media.create({
    data: {
      cloudinaryId: result.public_id,
      cloudinaryAssetId: result.asset_id,
      resourceType: result.resource_type,
      format: result.format,
      url: result.secure_url,
      width: result.width ?? null,
      height: result.height ?? null,
      bytes: result.bytes,
      duration: result.duration ?? null,
    },
  });
}

async function createDefaultAsset(type: AssetType, mediaId: number) {
  return prisma.asset.create({
    data: { type, mediaId },
  });
}

export async function seedDefaultAssets() {
  for (const [fileName, type] of Object.entries(DEFAULT_IMAGE_MAP)) {
    const existing = await prisma.asset.findFirst({ where: { type } });
    if (existing) {
      continue;
    }

    try {
      console.log(`Loading ${fileName} as ${type}...`);
      const uploadResult = await uploadImageToCloudinary(fileName);
      const media = await createMediaFromUploadResult(uploadResult);
      const asset = await createDefaultAsset(type, media.id);
      console.log(
        `Asset created ${type} (id: ${asset.id}, mediaId: ${media.id})`,
      );
    } catch (err) {
      console.error(`Failed creating ${type} from ${fileName}:`, err);
      throw err;
    }
  }
}

if (require.main === module) {
  seedDefaultAssets()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
