import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import { randomBytes } from 'crypto';

export const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || 'local';

// S3 Client (for AWS S3 or compatible storage)
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: process.env.AWS_ACCESS_KEY_ID ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  } : undefined,
  endpoint: process.env.S3_ENDPOINT,
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'secureexam-snapshots';

export interface UploadOptions {
  buffer: Buffer;
  filename: string;
  contentType: string;
  metadata?: Record<string, string>;
}

export interface UploadResult {
  url: string;
  key: string;
  size: number;
}

// Generate unique filename
function generateFilename(originalFilename: string): string {
  const timestamp = Date.now();
  const random = randomBytes(8).toString('hex');
  const ext = originalFilename.split('.').pop() || 'jpg';
  return `${timestamp}-${random}.${ext}`;
}

// Upload to S3
export async function uploadToS3(options: UploadOptions): Promise<UploadResult> {
  const filename = generateFilename(options.filename);
  const key = `snapshots/${filename}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: options.buffer,
    ContentType: options.contentType,
    Metadata: options.metadata,
  });

  await s3Client.send(command);

  const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

  return {
    url,
    key,
    size: options.buffer.length,
  };
}

// Get signed URL for S3 object
export async function getSignedUrlForS3(key: string, expiresIn = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

// Upload to local storage
export async function uploadToLocal(options: UploadOptions): Promise<UploadResult> {
  const uploadsDir = join(process.cwd(), 'uploads', 'snapshots');
  
  // Ensure directory exists
  await mkdir(uploadsDir, { recursive: true });

  const filename = generateFilename(options.filename);
  const filepath = join(uploadsDir, filename);

  await writeFile(filepath, options.buffer);

  const relativePath = `snapshots/${filename}`;
  const url = `/uploads/${relativePath}`;

  return {
    url,
    key: relativePath,
    size: options.buffer.length,
  };
}

// Main upload function that delegates based on provider
export async function uploadFile(options: UploadOptions): Promise<UploadResult> {
  switch (STORAGE_PROVIDER) {
    case 's3':
      return uploadToS3(options);
    case 'local':
    default:
      return uploadToLocal(options);
  }
}

// Get file URL (signed if S3, direct if local)
export async function getFileUrl(key: string): Promise<string> {
  switch (STORAGE_PROVIDER) {
    case 's3':
      return getSignedUrlForS3(key);
    case 'local':
    default:
      return `/uploads/${key.replace(/^\/+/, '')}`;
  }
}

export async function getLocalFileBuffer(key: string): Promise<Buffer | null> {
  if (STORAGE_PROVIDER !== 'local') {
    return null;
  }
  try {
    const filePath = join(process.cwd(), 'uploads', key);
    return await readFile(filePath);
  } catch {
    return null;
  }
}

// Convert base64 to buffer
export function base64ToBuffer(base64: string): Buffer {
  // Remove data URL prefix if present
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

// Validate file size
export function validateFileSize(size: number, maxSizeMB = 5): boolean {
  const maxSize = maxSizeMB * 1024 * 1024; // Convert MB to bytes
  return size <= maxSize;
}

// Validate image type
export function validateImageType(contentType: string): boolean {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  return allowedTypes.includes(contentType);
}
