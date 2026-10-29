const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');

const isVercel = Boolean(process.env.VERCEL);
const baseUploadDir = isVercel
  ? path.join(os.tmpdir(), 'uploads')
  : path.resolve(__dirname, '..', '..', 'uploads');

// Ensure upload subdirectories exist safely
const subDirs = ['submissions', 'chat', 'general'];
try {
  subDirs.forEach(sub => {
    const fullPath = path.join(baseUploadDir, sub);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  });
} catch (e) {
  console.warn('[UPLOADER] Notice on directory init:', e.message);
}

function getStorage(subFolder = 'general') {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const dest = path.join(baseUploadDir, subFolder);
      try {
        if (!fs.existsSync(dest)) {
          fs.mkdirSync(dest, { recursive: true });
        }
      } catch (e) {
        // Fallback to tmpdir if needed
      }
      cb(null, dest);
    },
    filename: (req, file, cb) => {
      // Generate clean unique filename with original extension preserved
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      const safeBaseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
      cb(null, `${safeBaseName}-${uniqueSuffix}${ext}`);
    }
  });
}

const fileFilter = (req, file, cb) => {
  // Allow all general documents, images, videos, audio, pdfs, zips, code files
  // Only block dangerous executables (.exe, .bat, .cmd, .sh, .vbs)
  const ext = path.extname(file.originalname).toLowerCase();
  const dangerousExts = ['.exe', '.bat', '.cmd', '.sh', '.vbs', '.com', '.msi'];
  if (dangerousExts.includes(ext)) {
    return cb(new Error('Executable files are not allowed for security reasons.'));
  }
  cb(null, true);
};

const submissionUpload = multer({
  storage: getStorage('submissions'),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter
});

const chatUpload = multer({
  storage: getStorage('chat'),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter
});

const generalUpload = multer({
  storage: getStorage('general'),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter
});

const profileAvatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }
});

function categorizeMime(mimeType, ext) {
  if (!mimeType) return 'general';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('pdf') || mimeType.includes('word') || mimeType.includes('excel') || mimeType.includes('text') || mimeType.includes('presentation')) return 'document';
  if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('rar') || mimeType.includes('7z')) return 'archive';
  return 'general';
}

module.exports = {
  baseUploadDir,
  submissionUpload,
  chatUpload,
  generalUpload,
  profileAvatarUpload,
  categorizeMime
};
