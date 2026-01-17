import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class R2Service {
  private s3Client: S3Client;
  private bucketName: string;
  private publicUrl: string;

  constructor() {
    // Initialize R2 client (S3-compatible)
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
      },
    });

    this.bucketName = process.env.R2_BUCKET_NAME || 'srm-lesson';
    this.publicUrl = process.env.R2_PUBLIC_URL || '';
  }

  /**
   * Upload file to R2
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'lessons',
  ): Promise<{ url: string; key: string }> {
    const timestamp = Date.now();
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `${folder}/${timestamp}-${sanitizedFilename}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      // Make file publicly accessible if you have public bucket
      // ACL: 'public-read', // Not supported in R2, use bucket policy instead
    });

    await this.s3Client.send(command);

    // Return public URL
    const url = this.publicUrl
      ? `${this.publicUrl}/${key}`
      : `https://${this.bucketName}.${process.env.R2_ACCOUNT_ID}.r2.dev/${key}`;

    return { url, key };
  }

  /**
   * Upload multiple files
   */
  async uploadFiles(
    files: Express.Multer.File[],
    folder: string = 'lessons',
  ): Promise<Array<{ url: string; key: string; name: string; size: number; mime: string }>> {
    const uploadPromises = files.map(async (file) => {
      const { url, key } = await this.uploadFile(file, folder);
      return {
        url,
        key,
        name: file.originalname,
        size: file.size,
        mime: file.mimetype,
      };
    });

    return Promise.all(uploadPromises);
  }

  /**
   * Delete file from R2
   */
  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  /**
   * Delete multiple files
   */
  async deleteFiles(keys: string[]): Promise<void> {
    const deletePromises = keys.map((key) => this.deleteFile(key));
    await Promise.all(deletePromises);
  }

  /**
   * Generate presigned URL for temporary access (for private files)
   */
  async getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  /**
   * Extract key from URL
   */
  extractKeyFromUrl(url: string): string {
    const urlObj = new URL(url);
    return urlObj.pathname.substring(1); // Remove leading slash
  }
}
