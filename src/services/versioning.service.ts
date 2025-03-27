import fs from 'fs-extra';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class VersionControl {
  private readonly maxVersions = 5;

  async createSnapshot(merchantId: string) {
    const source = path.join(HUGO_BASE_PATH, merchantId);
    const versionDir = path.join(source, 'versions', Date.now().toString());
    
    await fs.copy(source, versionDir);
    await this.pruneOldVersions(merchantId);
  }

  async restoreVersion(merchantId: string, timestamp: string) {
    const versionPath = path.join(HUGO_BASE_PATH, merchantId, 'versions', timestamp);
    const currentPath = path.join(HUGO_BASE_PATH, merchantId);
    
    await fs.emptyDir(currentPath);
    await fs.copy(versionPath, currentPath);
    await HugoService.regenerateSite(merchantId);
  }

  private async pruneOldVersions(merchantId: string) {
    const versions = await fs.readdir(path.join(HUGO_BASE_PATH, merchantId, 'versions'));
    if (versions.length > this.maxVersions) {
      const toDelete = versions
        .sort()
        .slice(0, versions.length - this.maxVersions);
      
      await Promise.all(
        toDelete.map(v => 
          fs.remove(path.join(HUGO_BASE_PATH, merchantId, 'versions', v))
      );
    }
  }
}