//@ts-check

const fs = require('fs');
const os = require('os');
const path = require('path');

const RELEASE_DIR = path.join(__dirname, '../build/Release');
const BUILD_FILES = [
  path.join(RELEASE_DIR, 'conpty.node'),
  path.join(RELEASE_DIR, 'conpty.pdb'),
  path.join(RELEASE_DIR, 'conpty_console_list.node'),
  path.join(RELEASE_DIR, 'conpty_console_list.pdb'),
  path.join(RELEASE_DIR, 'pty.node'),
  path.join(RELEASE_DIR, 'pty.pdb'),
  path.join(RELEASE_DIR, 'spawn-helper')
];
const CONPTY_DIR = path.join(__dirname, '../third_party/conpty');
const CONPTY_SUPPORTED_ARCH = ['x64', 'arm64'];

console.log('\x1b[32m> Cleaning release folder...\x1b[0m');

/** @param {string} folder  */
function cleanFolderRecursive(folder) {
  var files = [];
  if (fs.existsSync(folder)) {
    files = fs.readdirSync(folder);
    files.forEach(function(file,index) {
      var curPath = path.join(folder, file);
      if (fs.lstatSync(curPath).isDirectory()) { // recurse
        cleanFolderRecursive(curPath);
        fs.rmdirSync(curPath);
      } else if (BUILD_FILES.indexOf(curPath) < 0){ // delete file
        fs.unlinkSync(curPath);
      }
    });
  }
};

try {
  cleanFolderRecursive(RELEASE_DIR);
} catch(e) {
  console.log(e);
  process.exit(1);
}

console.log(`\x1b[32m> Moving conpty.dll...\x1b[0m`);
if (os.platform() !== 'win32') {
  console.log('  SKIPPED (not Windows)');
} else {
  let windowsArch;
  if (process.env.npm_config_arch) {
    windowsArch = process.env.npm_config_arch;
    console.log(`  Using $npm_config_arch: ${windowsArch}`);
  } else {
    windowsArch = os.arch();
    console.log(`  Using os.arch(): ${windowsArch}`);
  }

  if (!CONPTY_SUPPORTED_ARCH.includes(windowsArch)) {
    console.log(`  SKIPPED (unsupported architecture ${windowsArch})`);
  } else {
    const versionFolder = fs.readdirSync(CONPTY_DIR)[0];
    console.log(`  Found version ${versionFolder}`);
    const sourceFolder = path.join(CONPTY_DIR, versionFolder, `win10-${windowsArch}`);
    const destFolder = path.join(RELEASE_DIR, 'conpty');
    fs.mkdirSync(destFolder, { recursive: true });
    for (const file of ['conpty.dll', 'OpenConsole.exe']) {
      const sourceFile = path.join(sourceFolder, file);
      const destFile = path.join(destFolder, file);
      console.log(`  Copying ${sourceFile} -> ${destFile}`);
      fs.copyFileSync(sourceFile, destFile);
    }
  }
}

process.exit(0);
