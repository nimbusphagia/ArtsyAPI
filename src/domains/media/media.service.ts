import cloudinary from "../../config/cloudinary";
import { UploadApiResponse, UploadApiErrorResponse } from "cloudinary";

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
