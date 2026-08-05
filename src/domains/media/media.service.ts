import cloudinary from "../../config/cloudinary";
import { UploadApiResponse, UploadApiErrorResponse } from "cloudinary";
import { ProfileImageFile } from "./media.validators";
import { AssetType, AssetTypeSchema } from "./assets/assets.validators";
import { prisma } from "../../config/prisma";
import { isVideoMimetype } from "./media.constants";

const THUMBNAIL_TRANSFORM = {
  width: 200,
  height: 200,
  crop: "thumb",
};

// VIDEO & IMAGE UPLOAD
export async function uploadMedia(
  fileBuffer: Buffer,
  mimetype: string,
  folder = "uploads",
): Promise<UploadApiResponse> {
  const resourceType: "image" | "video" = isVideoMimetype(mimetype)
    ? "video"
    : "image";

  return new Promise((resolve, reject) => {
    const callback = (
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
    };

    if (resourceType === "video") {
      const stream = cloudinary.uploader.upload_large_stream(
        {
          folder,
          resource_type: "video",
          eager: [
            {
              ...THUMBNAIL_TRANSFORM,
              format: "jpg",
              start_offset: "0",
            },
          ],
        },
        callback,
      );
      stream.end(fileBuffer);
    } else {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: "image",
        },
        callback,
      );
      stream.end(fileBuffer);
    }
  });
}

// Parse Cloudinary upload to Media
export function toMediaData(result: UploadApiResponse) {
  const isVideo = result.resource_type === "video";

  const thumbnail = isVideo
    ? (result.eager?.[0]?.secure_url ?? null)
    : cloudinary.url(result.public_id, THUMBNAIL_TRANSFORM);

  return {
    cloudinaryId: result.public_id,
    cloudinaryAssetId: result.asset_id,
    resourceType: result.resource_type,
    format: result.format,
    url: result.secure_url,
    thumbnail,
    width: result.width,
    height: result.height,
    bytes: result.bytes,
    duration: result.duration ?? null,
  };
}

// Create Profile Asset from imageFile
export async function uploadProfileAsset(
  assetType: AssetType,
  imageFile?: ProfileImageFile,
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

  const uploadedImage = await uploadMedia(
    imageFile.buffer,
    imageFile.mimetype,
    "artsy",
  );

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
