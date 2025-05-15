
     import { minioClient, getMinioUrl, SITE_CONFIG_BUCKET } from '../../config/minio';
  
  
 
  
  // Generate config object name using domain as identifier
  const generateConfigKey = (subdomain: string): string => {
    return `config/${subdomain}.json`;
  };
  
  // Save site configuration to MinIO
  export const saveSiteConfigToMinio = async (
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
        // 'X-Amz-Meta-Subdomain': subdomain,
        'X-Amz-Meta-Last-Updated': new Date().toISOString(),
      };
  
      // Upload to MinIO
      await minioClient.putObject(
        SITE_CONFIG_BUCKET,
        objectKey,
        configBuffer,
        configBuffer.length,
        metaData
      );
  
      // Return public URL to the config
      return getMinioUrl(SITE_CONFIG_BUCKET, objectKey);
    } catch (error) {
      console.error(`Failed to save site config for ${subdomain}:`, error);
      throw error;
    }
  };
  
  // Get site configuration from MinIO
  export const getSiteConfigFromMinio = async (
    subdomain: string
  ) => {
    try {
      const objectKey = generateConfigKey(subdomain);
      
      // Get the object from MinIO
      const dataStream = await minioClient.getObject(SITE_CONFIG_BUCKET, objectKey);
      
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
      console.error(`Failed to get site config for ${subdomain}:`, error);
      throw error;
    }
  };
  
  // Delete site configuration from MinIO
  export const deleteSiteConfigFromMinio = async (subdomain: string): Promise<void> => {
    try {
      const objectKey = generateConfigKey(subdomain);
      await minioClient.removeObject(SITE_CONFIG_BUCKET, objectKey);
    } catch (error) {
      console.error(`Failed to delete site config for ${subdomain}:`, error);
      throw error;
    }
  };
  
  // Check if a subdomain is available
  // export const isSubdomainAvailable = async (subdomain: string): Promise<boolean> => {
  //   try {
  //     // Check if subdomain exists in the database (connected to a plug)
  //     const plugWithSubdomain = await prisma.plug.findFirst({
  //       where: {
  //         subdomain: subdomain,
  //       },
  //     });
  
  //     return !plugWithSubdomain;
  //   } catch (error) {
  //     console.error(`Failed to check subdomain availability for ${subdomain}:`, error);
  //     throw error;
  //   }
  // };
  
  // // Update the database with site config reference
  // export const updatePlugWithSiteConfig = async (
  //   userId: string,
  //   subdomain: string,
  //   configUrl: string
  // ): Promise<void> => {
  //   try {
  //     // First check if the plug exists
  //     const plug = await prisma.plug.findUnique({
  //       where: {
  //         userId: userId
  //       }
  //     });
  
  //     if (!plug) {
  //       throw new Error('Plug not found for this user');
  //     }
      
  //     // Update the plug with the site URL (or any other reference you want to store)
  //     // Note: You might need to add a siteUrl field to your Plug model
  //     await prisma.plug.update({
  //       where: {
  //         id: plug.id
  //       },
  //       data: {
  //         // This is just a placeholder - you would need to add this field to your schema
  //         // siteUrl: configUrl
  //         // For now, you could store it in the aboutBusiness field or extend your schema
  //         aboutBusiness: `${plug.aboutBusiness || ''}\nSite URL: ${configUrl}`
  //       }
  //     });
  //   } catch (error) {
  //     console.error(`Failed to update plug with site config: ${error}`);
  //     throw error;
  //   }
  // };
  
  
  