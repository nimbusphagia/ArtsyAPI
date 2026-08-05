import multer from "multer";
import {
  IMAGE_MIMETYPES,
  VIDEO_MAX_BYTES,
  VIDEO_MIMETYPES,
} from "../domains/media/media.constants";

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: VIDEO_MAX_BYTES,
  },

  fileFilter: (_req, file, cb) => {
    const allowed: readonly string[] = [...IMAGE_MIMETYPES, ...VIDEO_MIMETYPES];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Invalid file type"));
    }

    cb(null, true);
  },
});

export default upload;
