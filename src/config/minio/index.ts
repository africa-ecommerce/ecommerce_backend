// import * as Minio from "minio";
// import dotenv from 'dotenv';

// // Load environment variables
// dotenv.config();

// // Define unique bucket names with a prefix to avoid conflicts in play.min.io
// const BUCKET_PREFIX = process.env.MINIO_BUCKET_PREFIX || 'pluggn';
// export const IMAGES_BUCKET = `${BUCKET_PREFIX}${
//   process.env.MINIO_IMAGES_BUCKET || "images"
// }`;
// export const STATIC_SITE_BUCKET = `${BUCKET_PREFIX}${
//   process.env.MINIO_STATIC_SITE_BUCKET || "static-site"
// }`;


// // Configuration interface
// interface MinioConfig {
//   endPoint: string;
//   port: number;
//   useSSL: boolean;
//   accessKey: string;
//   secretKey: string;
//   region: string;
// }

// // Load configuration from environment variables with play.minio defaults
// const getMinioConfig = (): MinioConfig => {
//   return {
//     endPoint: process.env.MINIO_ENDPOINT || "play.min.io",
//     port: parseInt(process.env.MINIO_PORT || "443", 10),
//     useSSL: true, // Default to true for security
//     accessKey: process.env.MINIO_ACCESS_KEY || "Q3AM3UQ867SPQQA43P2F",
//     secretKey: process.env.MINIO_SECRET_KEY || "zuf+tfteSlswRu7BJ86wekitnifILbZam1KYY3TG",
//     region: process.env.MINIO_REGION || "us-east-1",
//   };
// };

// // Create MinIO client instance
// export const minioClient = new Minio.Client(getMinioConfig());

// // Function to ensure buckets exist with proper configuration
// export const initializeBuckets = async () => {
//   try {
//     await initializeImagesBucket();
//     await initializeStaticSiteBucket();
//     // console.log('MinIO bucket initialized successfully');
//   } catch (error) {
//     console.error('Failed to initialize MinIO buckets:', error);
//   }
// };

// // Initialize product images bucket
// const initializeImagesBucket = async () => {
//   try {
//     const exists = await minioClient.bucketExists(IMAGES_BUCKET);
    
//     if (!exists) {
//       await minioClient.makeBucket(IMAGES_BUCKET, process.env.MINIO_REGION || 'us-east-1');
//       console.log(`Bucket '${IMAGES_BUCKET}' created successfully`);
      
//       // Set bucket policy to allow public read access for product images
//       const policy = {
//         Version: '2012-10-17',
//         Statement: [
//           {
//             Effect: 'Allow',
//             Principal: { AWS: ['*'] },
//             Action: ['s3:GetObject'],
//             Resource: [`arn:aws:s3:::${IMAGES_BUCKET}/*`],
//           },
//         ],
//       };
      
//       await minioClient.setBucketPolicy(IMAGES_BUCKET, JSON.stringify(policy));
//       console.log(`Public read policy set for '${IMAGES_BUCKET}'`);
//     }
    
//     // // Set CORS policy for the product bucket
//     // const corsConfig = {
//     //   CORSRules: [
//     //     {
//     //       AllowedHeaders: ['*'],
//     //       AllowedMethods: ['GET'],
//     //       AllowedOrigins: ['*'],
//     //       ExposeHeaders: ['ETag', 'Content-Length', 'Content-Type'],
//     //       MaxAgeSeconds: 86400,
//     //     },
//     //   ],
//     // };
    
//     // try {
//     //   // Note: MinIO's JavaScript SDK might not support setBucketCors directly
//     //   // This is usually done through MinIO's admin console or mc client
//     //   console.log(`CORS should be configured for '${IMAGES_BUCKET}' through MinIO Console`);
//     // } catch (corsError) {
//     //   console.error(`Error setting CORS for '${IMAGES_BUCKET}':`, corsError);
//     // }
//   } catch (error) {
//     console.error(`Error initializing '${IMAGES_BUCKET}' bucket:`, error);
//     throw error;
//   }
// };



// // Initialize static website bucket
// const initializeStaticSiteBucket = async () => {
//   try {
//     const exists = await minioClient.bucketExists(STATIC_SITE_BUCKET);
    
//     if (!exists) {
//       await minioClient.makeBucket(STATIC_SITE_BUCKET, process.env.MINIO_REGION || 'us-east-1');
//       console.log(`Bucket '${STATIC_SITE_BUCKET}' created successfully`);
      
//       // Set bucket policy for static website serving
//       const policy = {
//         Version: '2012-10-17',
//         Statement: [
//           {
//             Effect: 'Allow',
//             Principal: { AWS: ['*'] },
//             Action: ['s3:GetObject'],
//             Resource: [`arn:aws:s3:::${STATIC_SITE_BUCKET}/*`],
//           },
//         ],
//       };
      
//       await minioClient.setBucketPolicy(STATIC_SITE_BUCKET, JSON.stringify(policy));
//       console.log(`Public read policy set for '${STATIC_SITE_BUCKET}'`);
      
//       // // Set up static website hosting configuration
//       // // Note: This would typically be done via the MinIO console for production
//       // console.log(`Static website hosting should be enabled for '${STATIC_WEBSITE_BUCKET}' through MinIO Console`);
//     }
    
//     // // Set CORS policy for the static bucket
//     // const corsConfig = {
//     //   CORSRules: [
//     //     {
//     //       AllowedHeaders: ['*'],
//     //       AllowedMethods: ['GET'],
//     //       AllowedOrigins: ['*'],
//     //       ExposeHeaders: ['ETag', 'Content-Length', 'Content-Type'],
//     //       MaxAgeSeconds: 86400,
//     //     },
//     //   ],
//     // };
    
//     // try {
//     //   // Set CORS through console notification
//     //   console.log(`CORS should be configured for '${STATIC_WEBSITE_BUCKET}' through MinIO Console`);
//     // } catch (corsError) {
//     //   console.error(`Error setting CORS for '${STATIC_WEBSITE_BUCKET}':`, corsError);
//     // }
//   } catch (error) {
//     console.error(`Error initializing '${STATIC_SITE_BUCKET}' bucket:`, error);
//     throw error;
//   }
// };

// // Generate MinIO URL based on configuration
// export const getMinioUrl = (bucket: string, objectName: string | undefined): string => {
//   const config = getMinioConfig();
//   const protocol = config.useSSL ? 'https' : 'http';
  
//   // Use custom base URL if provided, otherwise build from config
//   const baseUrl = process.env.MINIO_BASE_URL || 
//     `${protocol}://${config.endPoint}${config.port !== 80 && config.port !== 443 ? `:${config.port}` : ''}`;
  
//   return `${baseUrl}/${bucket}/${objectName}`;
// };







import * as Minio from "minio";
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Define unique bucket names with a prefix to avoid conflicts in play.min.io
const BUCKET_PREFIX = process.env.MINIO_BUCKET_PREFIX || 'pluggn';
export const IMAGES_BUCKET = `${BUCKET_PREFIX}${
  process.env.MINIO_IMAGES_BUCKET || "images"
}`;
export const STATIC_SITE_BUCKET = `${BUCKET_PREFIX}${
  process.env.MINIO_STATIC_SITE_BUCKET || "static-site"
}`;

// Configuration interface
interface MinioConfig {
  endPoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  region: string;
}

// Load configuration from environment variables with play.minio defaults
const getMinioConfig = (): MinioConfig => {
  return {
    endPoint: process.env.MINIO_ENDPOINT || "play.min.io",
    port: parseInt(process.env.MINIO_PORT || "443", 10),
    useSSL: process.env.MINIO_USE_SSL !== 'false', // Default to true for security
    accessKey: process.env.MINIO_ACCESS_KEY || "Q3AM3UQ867SPQQA43P2F",
    secretKey: process.env.MINIO_SECRET_KEY || "zuf+tfteSlswRu7BJ86wekitnifILbZam1KYY3TG",
    region: process.env.MINIO_REGION || "us-east-1",
  };
};

// Create MinIO client instance
export const minioClient = new Minio.Client(getMinioConfig());

// Function to ensure buckets exist with proper configuration
export const initializeBuckets = async () => {
  try {
    await initializeImagesBucket();
    await initializeStaticSiteBucket();
    console.log('MinIO buckets initialized successfully');
  } catch (error) {
    console.error('Failed to initialize MinIO buckets:', error);
    throw error; // Propagate error up to caller
  }
};

// Initialize product images bucket
const initializeImagesBucket = async () => {
  try {
    const exists = await minioClient.bucketExists(IMAGES_BUCKET);

    if (!exists) {
      await minioClient.makeBucket(IMAGES_BUCKET, process.env.MINIO_REGION || 'us-east-1');
      console.log(`Bucket '${IMAGES_BUCKET}' created successfully`);
    }
    
    // ALWAYS set bucket policy to allow public read access for product images
    // This ensures policy is applied even if bucket already exists
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${IMAGES_BUCKET}/*`],
        },
      ],
    };
    
    await minioClient.setBucketPolicy(IMAGES_BUCKET, JSON.stringify(policy));
    console.log(`Public read policy set for '${IMAGES_BUCKET}'`);
    
    // Verify the policy was applied correctly
    try {
      const policyJson = await minioClient.getBucketPolicy(IMAGES_BUCKET);
      console.log(`Current bucket policy for ${IMAGES_BUCKET}: ${policyJson}`);
    } catch (policyError) {
      console.error(`Error getting bucket policy: ${policyError}`);
    }
    
    // Set CORS policy for the product bucket if needed
    const corsConfig = {
      CORSRules: [
        {
          AllowedHeaders: ['*'],
          AllowedMethods: ['GET'],
          AllowedOrigins: ['*'],
          ExposeHeaders: ['ETag', 'Content-Length', 'Content-Type'],
          MaxAgeSeconds: 86400,
        },
      ],
    };

    try {
      // Note: MinIO's JavaScript SDK might not support setBucketCors directly
      // For MinIO this can be handled via the console or mc client
      console.log(`CORS should be configured for '${IMAGES_BUCKET}' through MinIO Console`);
    } catch (corsError) {
      console.error(`Error setting CORS for '${IMAGES_BUCKET}':`, corsError);
    }
  } catch (error) {
    console.error(`Error initializing '${IMAGES_BUCKET}' bucket:`, error);
    throw error;
  }
};

// Initialize static website bucket
const initializeStaticSiteBucket = async () => {
  try {
    const exists = await minioClient.bucketExists(STATIC_SITE_BUCKET);

    if (!exists) {
      await minioClient.makeBucket(STATIC_SITE_BUCKET, process.env.MINIO_REGION || 'us-east-1');
      console.log(`Bucket '${STATIC_SITE_BUCKET}' created successfully`);
    }
    
    // ALWAYS set bucket policy for static website serving
    // This ensures policy is applied even if bucket already exists
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${STATIC_SITE_BUCKET}/*`],
        },
      ],
    };
    
    await minioClient.setBucketPolicy(STATIC_SITE_BUCKET, JSON.stringify(policy));
    console.log(`Public read policy set for '${STATIC_SITE_BUCKET}'`);
    
    // Verify the policy was applied correctly
    try {
      const policyJson = await minioClient.getBucketPolicy(STATIC_SITE_BUCKET);
      console.log(`Current bucket policy for ${STATIC_SITE_BUCKET}: ${policyJson}`);
    } catch (policyError) {
      console.error(`Error getting bucket policy: ${policyError}`);
    }
    
    // Set CORS policy for the static bucket
    const corsConfig = {
      CORSRules: [
        {
          AllowedHeaders: ['*'],
          AllowedMethods: ['GET'],
          AllowedOrigins: ['*'],
          ExposeHeaders: ['ETag', 'Content-Length', 'Content-Type'],
          MaxAgeSeconds: 86400,
        },
      ],
    };

    try {
      // Set CORS through console notification
      console.log(`CORS should be configured for '${STATIC_SITE_BUCKET}' through MinIO Console`);
    } catch (corsError) {
      console.error(`Error setting CORS for '${STATIC_SITE_BUCKET}':`, corsError);
    }
  } catch (error) {
    console.error(`Error initializing '${STATIC_SITE_BUCKET}' bucket:`, error);
    throw error;
  }
};

// Generate MinIO URL based on configuration
export const getMinioUrl = (bucket: string, objectName: string): string => {
  const config = getMinioConfig();
  const protocol = config.useSSL ? 'https' : 'http';

  // Use custom base URL if provided, otherwise build from config
  const baseUrl = process.env.MINIO_BASE_URL ||
    `${protocol}://${config.endPoint}${config.port !== 80 && config.port !== 443 ? `:${config.port}` : ''}`;

  // Make sure objectName doesn't have leading slash
  const cleanObjectName = objectName.startsWith('/') ? objectName.substring(1) : objectName;
  
  return `${baseUrl}/${bucket}/${cleanObjectName}`;
};
