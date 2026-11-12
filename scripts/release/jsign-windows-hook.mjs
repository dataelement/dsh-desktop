import { signWindowsPeWithJsign } from './windows-directory-installer.mjs'

// electron-builder creates the NSIS uninstaller after the unpacked app is signed.
// Its sign hook runs before embedding that uninstaller in the final installer.
export async function sign({ path }) {
  await signWindowsPeWithJsign(path)
}
