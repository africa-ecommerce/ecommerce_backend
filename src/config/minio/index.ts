import * as Minio from 'minio';

// Configure MinIO client
export const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
});

// Initialize bucket if it doesn't exist
export const BUCKET_NAME = process.env.MINIO_BUCKET_NAME || 'product-images';

// export const initializeBucket = async () => {
//   try {
//     const bucketExists = await minioClient.bucketExists(BUCKET_NAME);
//     if (!bucketExists) {
//       await minioClient.makeBucket(BUCKET_NAME, process.env.MINIO_REGION || 'us-east-1');
//       console.log(`Bucket '${BUCKET_NAME}' created successfully`);
      
//       // Set bucket policy to public (for product images)
//       const policy = {
//         Version: '2012-10-17',
//         Statement: [
//           {
//             Effect: 'Allow',
//             Principal: { AWS: ['*'] },
//             Action: ['s3:GetObject'],
//             Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`]
//           }
//         ]
//       };
      
//       await minioClient.setBucketPolicy(BUCKET_NAME, JSON.stringify(policy));
//     }
//   } catch (error) {
//     console.error('Error initializing MinIO bucket:', error);
//   }
// };

