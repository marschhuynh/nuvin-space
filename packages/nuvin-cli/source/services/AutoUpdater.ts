import { execSync, spawn } from 'node:child_process';

export interface UpdateResult {
  success: boolean;
  message: string;
  error?: string;
}

const PACKAGE_NAME = '@nuvin/nuvin-cli';

export namespace AutoUpdater {
  export async function update(targetVersion?: string): Promise<UpdateResult> {
    try {
      const packageManager = detectPackageManager();
      const installCommand = getInstallCommand(packageManager, targetVersion);

      console.log(`🔄 Updating ${PACKAGE_NAME}...`);
      console.log(`📦 Using: ${installCommand}\n`);

      execSync(installCommand, {
        stdio: 'inherit',
        timeout: 120000,
      });

      return {
        success: true,
        message: `✅ Successfully updated to ${targetVersion || 'latest'}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: '❌ Update failed',
        error: errorMessage,
      };
    }
  }

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

  export async function checkAndUpdate(): Promise<boolean> {
    const { UpdateChecker } = await import('./UpdateChecker.js');

    try {
      const versionInfo = await UpdateChecker.checkForUpdate();

      if (!versionInfo.hasUpdate) {
        return false;
      }

      const packageManager = detectPackageManager();
      const installCommand = getInstallCommand(packageManager, versionInfo.latest);

      const child = spawn('sh', ['-c', installCommand], {
        detached: true,
        stdio: 'ignore',
      });

      child.unref();

      console.log('✅ Update started in background. New version will be available on next run.\n');

      return true;
    } catch (_error) {
      return false;
    }
  }
}
