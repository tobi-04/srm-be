# Cloudflare R2 Setup Guide

## Overview
This application uses Cloudflare R2 for storing lesson files (PDFs, documents, videos, etc.). R2 is S3-compatible object storage with zero egress fees.

## Setup Instructions

### 1. Create a Cloudflare Account
- Go to https://cloudflare.com
- Sign up or log in to your account

### 2. Create an R2 Bucket
1. Navigate to R2 in the Cloudflare dashboard
2. Click "Create bucket"
3. Name your bucket (e.g., `srm-lesson`)
4. Choose a region close to your users
5. Click "Create bucket"

### 3. Configure Public Access (Optional)
If you want files to be publicly accessible:
1. Go to your bucket settings
2. Enable "Public Access"
3. Note the public URL (e.g., `https://srm-lesson.r2.dev`)

For custom domain:
1. Go to R2 → Custom Domains
2. Add your domain (e.g., `files.yourdomain.com`)
3. Follow DNS configuration instructions

### 4. Create API Tokens
1. Go to R2 → Manage R2 API Tokens
2. Click "Create API Token"
3. Choose permissions:
   - Object Read & Write
   - Bucket Read (optional)
4. Select your bucket or all buckets
5. Click "Create API Token"
6. Save the credentials:
   - **Access Key ID**
   - **Secret Access Key**
   - **Account ID** (found in R2 overview)

### 5. Configure Environment Variables
Copy `.env.example` to `.env` and update:

```env
# Cloudflare R2 Storage
R2_ACCOUNT_ID=your-account-id-from-r2-dashboard
R2_ACCESS_KEY_ID=your-access-key-id-from-api-token
R2_SECRET_ACCESS_KEY=your-secret-access-key-from-api-token
R2_BUCKET_NAME=srm-lesson
R2_PUBLIC_URL=https://srm-lesson.r2.dev
# Or use custom domain: https://files.yourdomain.com
```

### 6. Test the Setup
1. Start the backend server:
   ```bash
   pnpm run start:dev
   ```

2. Upload a test file via the API:
   ```bash
   curl -X POST http://localhost:3000/lesson-files/upload/YOUR_LESSON_ID \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     -F "files=@/path/to/test.pdf"
   ```

3. Check the response - you should see the file URL

## API Endpoints

### Upload Files
```
POST /lesson-files/upload/:lessonId
Headers: Authorization: Bearer {admin_token}
Body: multipart/form-data with "files" field (max 10 files)
```

### Get Lesson Files
```
GET /lesson-files/lesson/:lessonId
No authentication required for published lessons
```

### Delete File (Soft Delete)
```
DELETE /lesson-files/:fileId
Headers: Authorization: Bearer {admin_token}
```

### Hard Delete File
```
DELETE /lesson-files/:fileId/hard
Headers: Authorization: Bearer {admin_token}
```

## File Storage Structure
Files are organized by lesson:
```
lessons/
  ├── {lessonId}/
  │   ├── {timestamp}-{filename1}.pdf
  │   ├── {timestamp}-{filename2}.docx
  │   └── {timestamp}-{filename3}.mp4
```

## Security Notes
- **Never commit** your `.env` file to version control
- API tokens have full access to your bucket - keep them secure
- Consider using separate buckets for development and production
- Enable CORS if accessing files from a different domain
- Use presigned URLs for temporary access to private files

## Cost Optimization
- R2 has no egress fees (unlike AWS S3)
- Free tier: 10GB storage per month
- Paid: $0.015/GB/month for storage
- Class A operations (writes): $4.50 per million
- Class B operations (reads): $0.36 per million

## Troubleshooting

### "Access Denied" errors
- Verify your API token has the correct permissions
- Check that R2_ACCOUNT_ID matches your Cloudflare account
- Ensure the bucket name is correct

### Files not accessible
- Check if public access is enabled on the bucket
- Verify R2_PUBLIC_URL is correct
- Check CORS settings if accessing from browser

### Upload fails
- Check file size limits (default: 100MB per file in Multer)
- Verify the lesson exists in the database
- Check backend logs for detailed error messages

## Additional Resources
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [Multer Documentation](https://github.com/expressjs/multer)
