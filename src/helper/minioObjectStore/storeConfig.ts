import {
  minioClient,
  getMinioUrl,
  STORE_CONFIG_BUCKET,
} from "../../config/minio";
  
// Generate config object name using domain as identifier
  const generateConfigKey = (subdomain: string): string => {
    return `config/${subdomain}.json`;
  };
  
  // Save store configuration to MinIO
  export const saveStoreConfigToMinio = async (
    subdomain: string,
    config: any
  ): Promise<string> => {
    try {
      const objectKey = generateConfigKey(subdomain);
      const configBuffer = Buffer.from(JSON.stringify(config), 'utf8');
      
      // Set metadata
      const metaData = {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Amz-Meta-Last-Updated': new Date().toISOString(),
      };
  
      // Upload to MinIO
      await minioClient.putObject(
        STORE_CONFIG_BUCKET,
        objectKey,
        configBuffer,
        configBuffer.length,
        metaData
      );
  
      // Return public URL to the config
      return getMinioUrl(STORE_CONFIG_BUCKET, objectKey);
    } catch (error) {
      console.error(`Failed to save store config for ${subdomain}:`, error);
      throw error;
    }
  };
  
  // Get store configuration from MinIO
  export const getStoreConfigFromMinio = async (
    subdomain: string
  ) => {
    try {
      const objectKey = generateConfigKey(subdomain);
      
      // Get the object from MinIO
      const dataStream = await minioClient.getObject(
        STORE_CONFIG_BUCKET,
        objectKey
      );
      
      // Read the stream and parse JSON
      return new Promise((resolve, reject) => {
        let configData = '';
        
        dataStream.on('data', (chunk) => {
          configData += chunk.toString();
        });
        
        dataStream.on('end', () => {
          try {
            resolve(JSON.parse(configData));
          } catch (error:any) {
            reject(new Error(`Failed to parse config data: ${error.message}`));
          }
        });
        
        dataStream.on('error', (error) => {
          reject(error);
        });
      });
    } catch (error:any) {
      // If the error is a NoSuchKey error, return null instead of throwing
      if (error.code === 'NoSuchKey') {
        return null;
      }
      console.error(`Failed to get store config for ${subdomain}:`, error);
      throw error;
    }
  };
  
  // Delete store configuration from MinIO
  export const deleteStoreConfigFromMinio = async (subdomain: string): Promise<void> => {
    try {
      const objectKey = generateConfigKey(subdomain);
      await minioClient.removeObject(STORE_CONFIG_BUCKET, objectKey);
    } catch (err: any) {
      if (err.code === 'NoSuchKey') {
      console.error(`Store config for ${subdomain} not found, already deleted,:`, err);
      
    }
    else {
      console.error(`Error deleting store config for ${subdomain}:`, err);
      // bubble up only on unexpected errors
      throw err;
    }
  };
  }  


  // Update store configuration in MinIO
export const updateStoreConfigInMinio = async (
  
  subdomain: string,
  config: any
): Promise<string> => {
  // We can reuse the save function since MinIO will overwrite existing objects
  return saveStoreConfigToMinio(subdomain, config);
};


export const renameStoreConfigInMinio = async (
  oldSubdomain: string,
  newSubdomain: string
): Promise<string> => {
  try {
    const oldKey = generateConfigKey(oldSubdomain);
    const newKey = generateConfigKey(newSubdomain);

    console.log("oldkey", oldKey);
    console.log("newKey", newKey);
    // Copy to new key (creates it if not existing)
    await minioClient.copyObject(
      STORE_CONFIG_BUCKET,
      newKey,
      `/${STORE_CONFIG_BUCKET}/${oldKey}`
    );

    // Delete old key
    await minioClient.removeObject(STORE_CONFIG_BUCKET, oldKey);
    console.log("done")

    return getMinioUrl(STORE_CONFIG_BUCKET, newKey);
  } catch (error) {
    console.error(
      `Failed to rename store config from ${oldSubdomain} to ${newSubdomain}:`,
      error
    );
    throw error;
  }
};