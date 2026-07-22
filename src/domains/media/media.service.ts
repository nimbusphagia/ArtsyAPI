import cloudinary from "../../config/cloudinary";
import { UploadApiResponse, UploadApiErrorResponse } from "cloudinary";
import { AssetType, AssetTypeSchema, MulterFile } from "./media.validators";
import { prisma } from "../../config/prisma";

// Upload file to cloudinary
export async function uploadImage(
  fileBuffer: Buffer,
  folder = "uploads",
): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
      },
      (
        error: UploadApiErrorResponse | undefined,
        result: UploadApiResponse | undefined,
      ) => {
        if (error) {
          return reject(error);
        }
        if (!result) {
          return reject(new Error("Cloudinary upload returned no result"));
        }
        resolve(result);
      },
    );
    stream.end(fileBuffer);
  });
}

// Parse Cloudinary upload to Media
export function toMediaData(result: UploadApiResponse) {
  return {
    cloudinaryId: result.public_id,
    cloudinaryAssetId: result.asset_id,
    resourceType: result.resource_type,
    format: result.format,
    url: result.secure_url,
    thumbnail: cloudinary.url(result.public_id, {
      width: 200,
      height: 200,
      crop: "thumb",
    }),
    width: result.width,
    height: result.height,
    bytes: result.bytes,
    duration: result.duration ?? null,
  };
}

// Create Profile Asset from imageFile
export async function uploadProfileAsset(
  assetType: AssetType,
  imageFile?: MulterFile,
): Promise<number> {
  if (!imageFile) {
    const defaultType = AssetTypeSchema.parse("DEFAULT_" + assetType);
    if (!defaultType) throw new Error("Invalid asset type");

    const defaultAsset = await prisma.asset.findFirst({
      where: { type: defaultType },
      select: { id: true },
    });
    if (!defaultAsset) {
      throw new Error("Default profile picture asset not found");
    }
    return defaultAsset.id;
  }

  const uploadedImage = await uploadImage(imageFile.buffer, "artsy");

  const profilePicture = await prisma.asset.create({
    data: {
      type: assetType,
      media: {
        create: toMediaData(uploadedImage),
      },
    },
    select: { id: true },
  });

  return profilePicture.id;
}
