param([string]$OutputRoot)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
if (!$IsWindows -or [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture -ne 'X64') {
  throw 'Build the Office runtime on Windows x64 with PowerShell 7 and Visual Studio C++ Build Tools.'
}
$repo = Split-Path $PSScriptRoot -Parent
if (!$OutputRoot) { $OutputRoot = Join-Path $repo '.office-runtime/win32-x64' }
$OutputRoot = [IO.Path]::GetFullPath($OutputRoot)
if (Test-Path $OutputRoot) { throw 'Select a new Office runtime output directory.' }
$pending = "$OutputRoot.staging-$PID"
$scratch = Join-Path ([IO.Path]::GetTempPath()) ("dsh-office-build-" + [guid]::NewGuid().ToString('N'))
$versions = Get-Content -Raw (Join-Path $PSScriptRoot 'office-runtime-windows.json') | ConvertFrom-Json
function Fetch-Verified($entry, [string]$name) {
  $file = Join-Path $scratch $name
  Invoke-WebRequest -Uri $entry.url -OutFile $file -MaximumRetryCount 3
  if ((Get-FileHash $file -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry.sha256) { throw "Office download checksum mismatch: $name" }
  return $file
}
New-Item -ItemType Directory -Force -Path $pending,$scratch | Out-Null
try {
  $python = Join-Path $pending 'python'
  Expand-Archive -LiteralPath (Fetch-Verified $versions.python 'python.zip') -DestinationPath $python
  $site = Join-Path $python 'Lib/site-packages'
  New-Item -ItemType Directory -Force -Path $site | Out-Null
  foreach ($package in @('openpyxl','et_xmlfile')) {
    Expand-Archive -LiteralPath (Fetch-Verified $versions.$package "$package.zip") -DestinationPath $site -Force
  }
  # Embedded Python loads only its bundled stdlib and explicitly staged packages.
  "python313.zip`n.`nLib/site-packages`n" | Set-Content (Join-Path $python 'python313._pth') -Encoding ascii
  $msi = Fetch-Verified $versions.libreoffice 'libreoffice.msi'
  $extracted = Join-Path $scratch 'libreoffice'
  $installer = Start-Process msiexec.exe -ArgumentList @('/a', ('"' + $msi + '"'), '/qn', ('TARGETDIR="' + $extracted + '"'), '/l*v', ('"' + (Join-Path $scratch 'extract.log') + '"')) -Wait -PassThru
  if ($installer.ExitCode -ne 0) {
    Get-Content (Join-Path $scratch 'extract.log') -Tail 100
    throw "LibreOffice extraction failed: $($installer.ExitCode)"
  }
  $engines = @(Get-ChildItem $extracted -Filter 'soffice.com' -Recurse -File)
  if ($engines.Count -ne 1) { throw 'Expected one LibreOffice console executable.' }
  Copy-Item -LiteralPath (Split-Path (Split-Path $engines[0].FullName -Parent) -Parent) -Destination (Join-Path $pending 'libreoffice') -Recurse
  # MSI merge modules normally install the CRT in System32. Preserve the x64
  # DLLs from this same verified MSI next to soffice so a clean PC can run it.
  $crt = @(Get-ChildItem $extracted -Filter '*.dll' -Recurse -File | Where-Object {
    $_.Name -match '^(concrt140|msvcp140.*|vccorlib140|vcruntime140.*)\.dll$'
  })
  foreach ($dll in $crt) {
    $bytes = [IO.File]::ReadAllBytes($dll.FullName)
    $pe = [BitConverter]::ToInt32($bytes, 0x3c)
    if ([BitConverter]::ToUInt16($bytes, $pe + 4) -eq 0x8664) {
      Copy-Item -LiteralPath $dll.FullName -Destination (Join-Path $pending "libreoffice/program/$($dll.Name)") -Force
    }
  }
  foreach ($required in @('msvcp140.dll','vcruntime140.dll','vcruntime140_1.dll')) {
    if (!(Test-Path (Join-Path $pending "libreoffice/program/$required"))) { throw "LibreOffice MSI is missing its x64 runtime dependency: $required" }
  }
  $vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio/Installer/vswhere.exe'
  $vs = & $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
  if (!$vs) { throw 'Visual Studio C++ x64 tools are required to build the Office sandbox.' }
  Import-Module (Join-Path $vs 'Common7/Tools/Microsoft.VisualStudio.DevShell.dll')
  Enter-VsDevShell -VsInstallPath $vs -SkipAutomaticLocation -DevCmdArguments '-arch=x64 -host_arch=x64' | Out-Null
  $bin = Join-Path $pending 'bin'
  New-Item -ItemType Directory -Path $bin | Out-Null
  & cl.exe /nologo /std:c++17 /O2 /W4 /WX /MT /EHsc /guard:cf /DUNICODE /D_UNICODE (Join-Path $repo 'native/office-sandbox/main.cpp') "/Fe:$(Join-Path $bin 'office-sandbox.exe')" "/Fo:$(Join-Path $scratch 'office-sandbox.obj')" /link /DYNAMICBASE /NXCOMPAT
  if ($LASTEXITCODE -ne 0) { throw 'Office sandbox compilation failed.' }
  $converter = Join-Path $pending 'libreoffice/program/dsh-office-convert.exe'
  & cl.exe /nologo /std:c++17 /O2 /W4 /WX /MT /EHsc /guard:cf /DUNICODE /D_UNICODE "/I$(Join-Path $repo 'native/office-convert/include')" (Join-Path $repo 'native/office-convert/main.cpp') "/Fe:$converter" "/Fo:$(Join-Path $scratch 'office-convert.obj')" /link /DYNAMICBASE /NXCOMPAT
  if ($LASTEXITCODE -ne 0) { throw 'Office LibreOfficeKit worker compilation failed.' }
  # Keep the licensed engines intact, including their bundled notices and DLLs.
  $links = @(Get-ChildItem $pending -Recurse -Force | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint })
  if ($links.Count) { throw 'Office runtime staging requires regular files and directories.' }
  $probe = & (Join-Path $python 'python.exe') -B -I -c 'import json,sys,openpyxl,et_xmlfile; print(json.dumps({"roots":sys.path,"openpyxl":openpyxl.__version__,"et_xmlfile":et_xmlfile.__version__}))'
  if ($LASTEXITCODE -ne 0) { throw 'Bundled Python probe failed.' }
  $info = $probe | ConvertFrom-Json
  if ($info.openpyxl -ne $versions.openpyxl.version -or $info.et_xmlfile -ne $versions.et_xmlfile.version) { throw 'Python package version mismatch.' }
  foreach ($root in $info.roots) {
    if (!$root.StartsWith($python + '\', [StringComparison]::OrdinalIgnoreCase) -and $root -ne $python) { throw 'Python resolved a library outside its bundle.' }
  }
  $loVersion = & (Join-Path $pending 'libreoffice/program/soffice.com') --headless --version
  if ($LASTEXITCODE -ne 0) { throw 'Bundled LibreOffice probe failed.' }
  $hashes = @{}
  foreach ($relative in @('python/python.exe','libreoffice/program/soffice.com','libreoffice/program/dsh-office-convert.exe','bin/office-sandbox.exe')) {
    $hashes[$relative] = (Get-FileHash (Join-Path $pending $relative) -Algorithm SHA256).Hash.ToLowerInvariant()
  }
  @{ version = 1; platform = 'win32'; arch = 'x64'; sources = $versions; python = $info; libreOffice = "$loVersion"; hashes = $hashes; sandbox = 'windows-appcontainer'; nativeOfficeAcceptance = 'NOT_RUN' } | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $pending 'manifest.json') -Encoding utf8NoBOM
  Move-Item -LiteralPath $pending -Destination $OutputRoot
  Write-Host "Windows Office runtime: $OutputRoot"
} finally {
  if (Test-Path $pending) { Remove-Item $pending -Recurse -Force }
  Remove-Item $scratch -Recurse -Force
}
