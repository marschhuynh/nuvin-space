import { execSync, spawn } from 'node:child_process';
import type { UpdateCheckOptions } from './UpdateChecker.js';

export interface UpdateResult {
  success: boolean;
  message: string;
  error?: string;
}

const PACKAGE_NAME = '@nuvin/nuvin-cli';

export namespace AutoUpdater {
  function detectPackageManager(): 'npm' | 'pnpm' | 'yarn' {
    try {
      const executablePath = execSync('which nuvin', { encoding: 'utf8', timeout: 3000 }).trim();

      if (executablePath) {
        try {
          const realPath = execSync(`readlink "${executablePath}"`, {
            encoding: 'utf8',
            timeout: 3000,
          }).trim();

          if (realPath.includes('/pnpm/') || realPath.includes('/.pnpm/')) {
            return 'pnpm';
          }
          if (realPath.includes('/yarn/') || realPath.includes('/.yarn/')) {
            return 'yarn';
          }
          if (realPath.includes('/npm/') || realPath.includes('node_modules')) {
            return 'npm';
          }
        } catch {
          if (executablePath.includes('/pnpm/') || executablePath.includes('/.pnpm/')) {
            return 'pnpm';
          }
          if (executablePath.includes('/yarn/') || executablePath.includes('/.yarn/')) {
            return 'yarn';
          }
        }
      }
    } catch {}

    try {
      const npmList = execSync('npm list -g @nuvin/nuvin-cli --depth=0 2>/dev/null', {
        encoding: 'utf8',
        timeout: 5000,
      });
      if (npmList.includes('@nuvin/nuvin-cli')) {
        return 'npm';
      }
    } catch {}

    try {
      const pnpmList = execSync('pnpm list -g @nuvin/nuvin-cli --depth=0 2>/dev/null', {
        encoding: 'utf8',
        timeout: 5000,
      });
      if (pnpmList.includes('@nuvin/nuvin-cli')) {
        return 'pnpm';
      }
    } catch {}

    try {
      const yarnList = execSync('yarn global list --pattern @nuvin/nuvin-cli 2>/dev/null', {
        encoding: 'utf8',
        timeout: 5000,
      });
      if (yarnList.includes('@nuvin/nuvin-cli')) {
        return 'yarn';
      }
    } catch {}

    return 'npm';
  }

  function getInstallCommand(packageManager: 'npm' | 'pnpm' | 'yarn', version?: string): string {
    const packageSpec = version ? `${PACKAGE_NAME}@${version}` : `${PACKAGE_NAME}@latest`;

    switch (packageManager) {
      case 'pnpm':
        return `pnpm add -g ${packageSpec}`;
      case 'yarn':
        return `yarn global add ${packageSpec}`;
      default:
        return `npm install -g ${packageSpec}`;
    }
  }

  export async function checkAndUpdate(options?: UpdateCheckOptions): Promise<boolean> {
    const { UpdateChecker } = await import('./UpdateChecker.js');

    try {
      const versionInfo = await UpdateChecker.checkForUpdate({
        onUpdateAvailable: options?.onUpdateAvailable,
        onError: options?.onError,
      });

      if (!versionInfo.hasUpdate) {
        return false;
      }

      if (options?.onUpdateStarted) {
        options.onUpdateStarted();
      }

      const packageManager = detectPackageManager();
      const installCommand = getInstallCommand(packageManager, versionInfo.latest);

      const child = spawn('sh', ['-c', installCommand], {
        detached: true,
        stdio: 'ignore',
      });

      child.on('exit', (code) => {
        if (options?.onUpdateCompleted) {
          const success = code === 0;
          const message = success
            ? `Update to v${versionInfo.latest} completed successfully!`
            : 'Update failed. Please try manually.';
          options.onUpdateCompleted(success, message);
        }
      });

      child.on('error', (error) => {
        if (options?.onUpdateCompleted) {
          options.onUpdateCompleted(false, `Update failed: ${error.message}`);
        }
      });

      child.unref();

      return true;
    } catch (error) {
      if (options?.onError) {
        options.onError(error instanceof Error ? error : new Error(String(error)));
      }
      return false;
    }
  }
}
