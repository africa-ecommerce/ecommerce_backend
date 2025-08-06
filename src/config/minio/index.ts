import {
  minioAccessKey,
  minioBaseUrl,
  minioBucketPrefix,
  minioEndpoint,
  minioImagesBucket,
  minioPort,
  minioRegion,
  minioSecretKey,
  minioStoreConfigBucket,
} from "..";
import * as Minio from "minio";

export const IMAGES_BUCKET = `${minioImagesBucket}`;
export const STORE_CONFIG_BUCKET = `${minioStoreConfigBucket}`;

// Load configuration from environment variables and set up minio config
export const getMinioConfig = () => {
  return {
    endPoint: minioEndpoint,
    port: parseInt(minioPort, 10),
    useSSL: true, // Default to true for security
    accessKey: minioAccessKey,
    secretKey: minioSecretKey,
    region: minioRegion,
  };
};

export const minioClient = new Minio.Client(getMinioConfig());


// Function to ensure buckets exist with proper configuration
export const initializeBuckets = async () => {
  try {
    await initializeImagesBucket();
    await initializeStoreConfigBucket();
    console.log("MinIO buckets initialized successfully");
  } catch (error) {
    console.error("Failed to initialize MinIO buckets:", error);
    throw error; // Propagate error up to caller
  }
};

// Initialize product images bucket
const initializeImagesBucket = async () => {
  try {
    const exists = await minioClient.bucketExists(IMAGES_BUCKET);
    if (!exists) {
      await minioClient.makeBucket(IMAGES_BUCKET, minioRegion);
      console.log(`Bucket '${IMAGES_BUCKET}' created successfully`);
    }
    // ALWAYS set bucket policy to allow public read access for product images
    // This ensures policy is applied even if bucket already exists
    const policy = {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
         "Principal": { "AWS": ["arn:aws:iam:::user/*"] },
          Action: ["s3:GetObject", "s3:PutObject"],
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
          AllowedHeaders: ["*"],
          AllowedMethods: ["GET"],
          AllowedOrigins: ["*"],
          ExposeHeaders: ["ETag", "Content-Length", "Content-Type"],
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




// Initialize static config bucket
const initializeStoreConfigBucket = async () => {
  try {
    const exists = await minioClient.bucketExists(STORE_CONFIG_BUCKET);

    if (!exists) {
      await minioClient.makeBucket(STORE_CONFIG_BUCKET, minioRegion);
      console.log(`Bucket '${STORE_CONFIG_BUCKET}' created successfully`);
    }
    // ALWAYS set bucket policy for static website serving
    // This ensures policy is applied even if bucket already exists
    const policy = {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: { AWS: ["arn:aws:iam:::user/*"] },
          Action: ["s3:GetObject", "s3:PutObject"],
          Resource: [`arn:aws:s3:::${STORE_CONFIG_BUCKET}/*`],
        },
      ],
    };

    await minioClient.setBucketPolicy(
      STORE_CONFIG_BUCKET,
      JSON.stringify(policy)
    );
    console.log(`Public read policy set for '${STORE_CONFIG_BUCKET}'`);
    // Verify the policy was applied correctly
    try {
      const policyJson = await minioClient.getBucketPolicy(STORE_CONFIG_BUCKET);
      console.log(
        `Current bucket policy for ${STORE_CONFIG_BUCKET}: ${policyJson}`
      );
    } catch (policyError) {
      console.error(`Error getting bucket policy: ${policyError}`);
    }

    // Set CORS policy for the static bucket
    const corsConfig = {
      CORSRules: [
        {
          AllowedHeaders: ["*"],
          AllowedMethods: ["GET"],
          AllowedOrigins: ["*"],
          ExposeHeaders: ["ETag", "Content-Length", "Content-Type"],
          MaxAgeSeconds: 86400,
        },
      ],
    };

    try {
      // Set CORS through console notification
      console.log(
        `CORS should be configured for '${STORE_CONFIG_BUCKET}' through MinIO Console`
      );
    } catch (corsError) {
      console.error(
        `Error setting CORS for '${STORE_CONFIG_BUCKET}':`,
        corsError
      );
    }
  } catch (error) {
    console.error(`Error initializing '${STORE_CONFIG_BUCKET}' bucket:`, error);
    throw error;
  }
};


// Generate MinIO URL based on configuration
export const getMinioUrl = (bucket: string, objectName: string): string => {
  const config = getMinioConfig();
  const protocol = config.useSSL ? "https" : "http";
  // Use custom base URL if provided, otherwise build from config
  const baseUrl = minioBaseUrl || `${protocol}://${config.endPoint}${ config.port !== 80 && config.port !== 443 ?
     `:${config.port}` : ""}`;

  // Make sure objectName doesn't have leading slash
  const cleanObjectName = objectName.startsWith("/")
    ? objectName.substring(1)
    : objectName;

  return `${baseUrl}/${bucket}/${cleanObjectName}`;
};
