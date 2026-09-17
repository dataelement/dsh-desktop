import cp from 'node:child_process';
import debug from 'debug';
import fs from 'node:fs';
import path from 'node:path';
import { ELECTRON_GYP_DIR } from './constants.js';
import { fetchUrl } from './fetcher.js';
import { downloadLinuxSysroot } from './sysroot-fetcher.js';
import { spawn } from '@malept/cross-spawn-promise';
const d = debug('electron-rebuild');
const CDS_URL = 'https://commondatastorage.googleapis.com/chromium-browser-clang';
function getPlatformUrlPrefix(hostOS, hostArch) {
    const prefixMap = {
        linux: 'Linux_x64',
        darwin: 'Mac',
        win32: 'Win',
    };
    let prefix = prefixMap[hostOS];
    if (prefix === 'Mac' && hostArch === 'arm64') {
        prefix = 'Mac_arm64';
    }
    return CDS_URL + '/' + prefix + '/';
}
function getClangDownloadURL(packageFile, packageVersion, hostOS, hostArch) {
    const cdsFile = `${packageFile}-${packageVersion}.tgz`;
    return getPlatformUrlPrefix(hostOS, hostArch) + cdsFile;
}
function getSDKRoot() {
    if (process.env.SDKROOT)
        return process.env.SDKROOT;
    const output = cp.execFileSync('xcrun', ['--sdk', 'macosx', '--show-sdk-path']);
    return output.toString().trim();
}
export async function getClangEnvironmentVars(electronVersion, targetArch) {
    const clangDownloadDir = await downloadClangVersion(electronVersion);
    const clangDir = path.resolve(clangDownloadDir, 'bin');
    const clangArgs = [];
    if (process.platform === 'darwin') {
        clangArgs.push('-isysroot', getSDKRoot());
    }
    const gypArgs = [];
    if (process.platform === 'win32') {
        console.log(await fs.promises.readdir(clangDir));
        gypArgs.push(`/p:CLToolExe=clang-cl.exe`, `/p:CLToolPath=${clangDir}`);
    }
    if (process.platform === 'linux') {
        const sysrootPath = await downloadLinuxSysroot(electronVersion, targetArch);
        clangArgs.push('--sysroot', sysrootPath);
    }
    return {
        env: {
            CC: `"${path.resolve(clangDir, 'clang')}" ${clangArgs.join(' ')}`,
            CXX: `"${path.resolve(clangDir, 'clang++')}" ${clangArgs.join(' ')}`,
        },
        args: gypArgs,
    };
}
function clangVersionFromRevision(update) {
    const regex = /CLANG_REVISION = '([^']+)'\nCLANG_SUB_REVISION = (\d+)\n/g;
    const clangVersionMatch = regex.exec(update);
    if (!clangVersionMatch)
        return null;
    const [, clangVersion, clangSubRevision] = clangVersionMatch;
    return `${clangVersion}-${clangSubRevision}`;
}
function clangVersionFromSVN(update) {
    const regex = /CLANG_REVISION = '([^']+)'\nCLANG_SVN_REVISION = '([^']+)'\nCLANG_SUB_REVISION = (\d+)\n/g;
    const clangVersionMatch = regex.exec(update);
    if (!clangVersionMatch)
        return null;
    const [, clangVersion, clangSvn, clangSubRevision] = clangVersionMatch;
    return `${clangSvn}-${clangVersion.substr(0, 8)}-${clangSubRevision}`;
}
async function downloadClangVersion(electronVersion) {
    d('fetching clang for Electron:', electronVersion);
    const clangDirPath = path.resolve(ELECTRON_GYP_DIR, `${electronVersion}-clang`);
    if (fs.existsSync(path.resolve(clangDirPath, 'bin', 'clang')))
        return clangDirPath;
    await fs.promises.mkdir(ELECTRON_GYP_DIR, { recursive: true });
    const electronDeps = await fetchUrl(`https://raw.githubusercontent.com/electron/electron/v${electronVersion}/DEPS`, 'text');
    const chromiumRevisionExtractor = /'chromium_version':\n\s+'([^']+)/g;
    const chromiumRevisionMatch = chromiumRevisionExtractor.exec(electronDeps);
    if (!chromiumRevisionMatch)
        throw new Error('Failed to determine Chromium revision for given Electron version');
    const chromiumRevision = chromiumRevisionMatch[1];
    d('fetching clang for Chromium:', chromiumRevision);
    const base64ClangUpdate = await fetchUrl(`https://chromium.googlesource.com/chromium/src.git/+/${chromiumRevision}/tools/clang/scripts/update.py?format=TEXT`, 'text');
    const clangUpdate = Buffer.from(base64ClangUpdate, 'base64').toString('utf8');
    const clangVersionString = clangVersionFromRevision(clangUpdate) || clangVersionFromSVN(clangUpdate);
    if (!clangVersionString)
        throw new Error('Failed to determine Clang revision from Electron version');
    d('fetching clang:', clangVersionString);
    const clangDownloadURL = getClangDownloadURL('clang', clangVersionString, process.platform, process.arch);
    const contents = await fetchUrl(clangDownloadURL, 'buffer');
    const tarPath = path.resolve(ELECTRON_GYP_DIR, `${electronVersion}-clang.tgz`);
    if (fs.existsSync(tarPath))
        await fs.promises.rm(tarPath, { recursive: true, force: true });
    await fs.promises.writeFile(tarPath, contents);
    await fs.promises.mkdir(clangDirPath, { recursive: true });
    d('extracting clang');
    await spawn('tar', ['-xf', tarPath, '-C', clangDirPath], { stdio: 'ignore' });
    await fs.promises.rm(tarPath, { recursive: true, force: true });
    d('cleaning up clang tar file');
    return clangDirPath;
}
//# sourceMappingURL=clang-fetcher.js.map