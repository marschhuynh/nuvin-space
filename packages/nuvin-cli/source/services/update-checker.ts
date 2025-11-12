/** biome-ignore-all lint/complexity/noStaticOnlyClass: <explanation> */
import https from 'node:https';
import { getVersion } from '../utils/version.js';

export interface VersionInfo {
  current: string;
  latest: string;
  hasUpdate: boolean;
}

export class UpdateChecker {
  private static readonly NPM_REGISTRY = 'registry.npmjs.org';
  private static readonly PACKAGE_NAME = '@nuvin/nuvin-cli';
  private static readonly TIMEOUT_MS = 5000;

  static async checkForUpdate(): Promise<VersionInfo> {
    const currentVersion = getVersion();

    try {
      const latestVersion = await UpdateChecker.fetchLatestVersion();
      const hasUpdate = UpdateChecker.compareVersions(currentVersion, latestVersion) <= 0;

      return {
        current: currentVersion,
        latest: latestVersion,
        hasUpdate,
      };
    } catch (_error) {
      return {
        current: currentVersion,
        latest: currentVersion,
        hasUpdate: false,
      };
    }
  }

  private static fetchLatestVersion(): Promise<string> {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: UpdateChecker.NPM_REGISTRY,
        path: `/${encodeURIComponent(UpdateChecker.PACKAGE_NAME)}/latest`,
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        timeout: UpdateChecker.TIMEOUT_MS,
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              const json = JSON.parse(data);
              resolve(json.version);
            } else {
              reject(new Error(`HTTP ${res.statusCode}`));
            }
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  private static compareVersions(v1: string, v2: string): number {
    const cleanVersion = (v: string) => v.replace(/^v/, '').split('-')[0];

    const parts1 = cleanVersion(v1).split('.').map(Number);
    const parts2 = cleanVersion(v2).split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const num1 = parts1[i] || 0;
      const num2 = parts2[i] || 0;

      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
    }

    return 0;
  }
}
