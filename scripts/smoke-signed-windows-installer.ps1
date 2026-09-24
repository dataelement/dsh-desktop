param(
  [Parameter(Mandatory = $true)][string]$Installer,
  [Parameter(Mandatory = $true)][string]$PublisherName
)

$ErrorActionPreference = 'Stop'
$installer = (Resolve-Path $Installer).Path
$root = Join-Path $env:RUNNER_TEMP ('dsh-signed-smoke-' + [guid]::NewGuid().ToString('N'))
$env:APPDATA = Join-Path $root 'appdata'
$env:LOCALAPPDATA = Join-Path $root 'localappdata'
New-Item -ItemType Directory -Path $env:APPDATA, $env:LOCALAPPDATA -Force | Out-Null

function Assert-Signature([string]$path) {
  $signature = Get-AuthenticodeSignature -FilePath $path
  if ($signature.Status -ne 'Valid') { throw "Invalid signature on ${path}: $($signature.Status)" }
  $subject = $signature.SignerCertificate.Subject
  if ($subject -notlike "*CN=$PublisherName*") {
    throw "Unexpected signer on ${path}: $subject"
  }
}

function Install-At([string]$directory) {
  # NSIS requires /D to be the last argument. Each target is a fresh directory
  # on the runner's local volume, so this also exercises custom directory input.
  $process = Start-Process -FilePath $installer -ArgumentList @('/S', "/D=$directory") -Wait -PassThru
  if ($process.ExitCode -ne 0) { throw "Installer exited with $($process.ExitCode) at $directory" }
  $executable = Join-Path $directory 'DSH Desktop.exe'
  if (-not (Test-Path $executable)) { throw "Installed executable missing: $executable" }
  Assert-Signature $executable
  return $executable
}

function Assert-InstalledPeSignatures([string]$directory) {
  $count = 0
  foreach ($file in Get-ChildItem -LiteralPath $directory -File -Recurse -Force) {
    $stream = [System.IO.File]::OpenRead($file.FullName)
    try {
      if ($stream.Length -lt 2 -or $stream.ReadByte() -ne 0x4d -or $stream.ReadByte() -ne 0x5a) { continue }
    } finally {
      $stream.Dispose()
    }
    Assert-Signature $file.FullName
    $count++
  }
  if ($count -lt 2) { throw "Only $count signed PE files found under $directory" }
  Write-Host "Verified $count installed PE signatures."
}

function Assert-Starts([string]$executable) {
  $logPath = Join-Path $env:APPDATA 'dsh-desktop\logs\harness.log'
  if (Test-Path $logPath) { Remove-Item -LiteralPath $logPath -Force }
  $desktop = Start-Process -FilePath $executable -WorkingDirectory (Split-Path $executable) -PassThru
  try {
    $deadline = (Get-Date).AddMinutes(3)
    while ((Get-Date) -lt $deadline) {
      if ($desktop.HasExited) { throw "Installed app exited early: $($desktop.ExitCode)" }
      if (Test-Path $logPath) {
        $log = Get-Content -LiteralPath $logPath -Raw
        $match = [regex]::Match($log, 'dsh web: (http://127\.0\.0\.1:\d+/\?token=[^\s]+)')
        if ($match.Success) {
          try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri $match.Groups[1].Value -TimeoutSec 3
            if ($response.StatusCode -eq 200) { return }
          } catch { Start-Sleep -Milliseconds 500 }
        }
      }
      Start-Sleep -Milliseconds 500
    }
    throw 'Installed Harness did not serve authenticated HTML within three minutes.'
  } finally {
    $children = @(Get-CimInstance Win32_Process -Filter "ParentProcessId = $($desktop.Id)" |
      ForEach-Object { $_.ProcessId })
    if (-not $desktop.HasExited) { Stop-Process -Id $desktop.Id -Force }
    foreach ($childId in $children) {
      Stop-Process -Id $childId -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path $logPath) {
      Get-Content -LiteralPath $logPath -Tail 50 |
        ForEach-Object { $_ -replace 'token=[^\s]+', 'token=[redacted]' }
    }
  }
}

Assert-Signature $installer
$firstDirectory = Join-Path $root 'install-one'
$secondDirectory = Join-Path $root 'install-two'

$firstExecutable = Install-At $firstDirectory
Assert-InstalledPeSignatures $firstDirectory
Assert-Starts $firstExecutable

$profileMarker = Join-Path $env:APPDATA 'dsh-desktop\harness\signed-smoke-marker'
New-Item -ItemType Directory -Path (Split-Path $profileMarker) -Force | Out-Null
Set-Content -LiteralPath $profileMarker -Value 'keep-user-data'

# Holding the executable without FILE_SHARE_DELETE must make promotion fail.
# The old installation and user data must remain available afterward.
$lock = [System.IO.File]::Open($firstExecutable, 'Open', 'Read', 'Read')
try {
  $blocked = Start-Process -FilePath $installer -ArgumentList @('/S', "/D=$firstDirectory") -Wait -PassThru
  if ($blocked.ExitCode -eq 0) { throw 'Locked same-path upgrade reported success.' }
  if (-not (Test-Path $firstExecutable)) { throw 'Locked upgrade removed the previous application.' }
  Assert-Signature $firstExecutable
  if (@(Get-ChildItem -Path "$firstDirectory.new-*" -ErrorAction SilentlyContinue).Count -ne 0) {
    throw 'Locked upgrade left a staging directory.'
  }
} finally {
  $lock.Dispose()
}
Assert-Starts $firstExecutable

$firstExecutable = Install-At $firstDirectory
if ((Get-Content -LiteralPath $profileMarker -Raw).Trim() -ne 'keep-user-data') {
  throw 'Same-path upgrade removed user profile data.'
}
if (@(Get-ChildItem -Path "$firstDirectory.old-*" -ErrorAction SilentlyContinue).Count -ne 0) {
  throw 'Successful upgrade left an old application backup directory.'
}
Assert-Starts $firstExecutable

$secondExecutable = Install-At $secondDirectory
Assert-InstalledPeSignatures $secondDirectory
Assert-Starts $secondExecutable
Write-Host 'Final signed installer passed first install, same-path upgrade, custom directory, signature and startup checks.'
