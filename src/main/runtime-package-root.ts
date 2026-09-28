export function runtimePackageRoot(appPath: string, isPackaged: boolean): string {
  // External Node processes and OS executable lookup require physical paths.
  return isPackaged && appPath.endsWith('.asar') ? `${appPath}.unpacked` : appPath
}
