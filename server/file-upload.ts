import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

// Ensure upload directories exist
const uploadDir = path.join(process.cwd(), 'uploads');
const journalUploadsDir = path.join(uploadDir, 'journal');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(journalUploadsDir)) {
  fs.mkdirSync(journalUploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, journalUploadsDir);
  },
  filename: (req: Request, file, cb) => {
    // Get user ID from authenticated session
    const userId = req.user?.id;
    if (!userId) {
      return cb(new Error('User ID not found'), '');
    }
    
    // Create a unique filename with user ID prefix
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `user_${userId}_${uniqueSuffix}${ext}`);
  }
});

// File filter
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept images only
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
    return cb(new Error('Only image files are allowed!'));
  }
  cb(null, true);
};

// Create multer upload middleware
export const journalImageUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  }
});

// Function to get public URL for a file
export function getFileUrl(req: Request, filename: string): string {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}/uploads/journal/${filename}`;
}

// Function to delete a file
export function deleteFile(filename: string): void {
  const filePath = path.join(journalUploadsDir, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}