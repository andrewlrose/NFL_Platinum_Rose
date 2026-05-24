$allFiles = Get-ChildItem "e:\dev\projects\NFL_Dashboard\src" -Recurse -Include "*.js","*.jsx" |
  Where-Object { $_.Name -ne "logger.js" -and $_.FullName -notmatch "workers" }

Write-Host "Scanning $($allFiles.Count) files..."

$patched = 0
foreach ($f in $allFiles) {
  $content = [System.IO.File]::ReadAllText($f.FullName)
  if ($content -notmatch "console\.") { continue }
  if ($content -match "import logger from") { continue }

  $rel = $f.FullName.Replace("e:\dev\projects\NFL_Dashboard\src\", "")
  $depth = ($rel -split "\\").Count - 1
  $ups = ("../" * $depth)
  if ($depth -eq 0) {
    $importLine = "import logger from './lib/logger';"
  } else {
    $importLine = "import logger from '${ups}lib/logger';"
  }

  $content = $content -replace 'console\.log\(', 'logger.log('
  $content = $content -replace 'console\.warn\(', 'logger.warn('
  $content = $content -replace 'console\.error\(', 'logger.error('
  $content = $content -replace 'console\.table\(', 'logger.log('

  $lines = $content -split "`n"
  $insertAt = 0
  for ($i = 0; $i -lt [Math]::Min(15, $lines.Length); $i++) {
    $l = $lines[$i].Trim()
    if ($l -match "^import ") { $insertAt = $i; break }
    if ($l -match "^//" -or $l -eq "" -or $l -match "^\s*\*" -or $l -match "^/\*") { $insertAt = $i + 1 }
  }
  $newLines = $lines[0..($insertAt-1)] + @($importLine) + $lines[$insertAt..($lines.Length-1)]
  [System.IO.File]::WriteAllText($f.FullName, ($newLines -join "`n"))
  $patched++
  Write-Host "  Patched: $($f.Name)"
}
Write-Host "Done. Patched $patched files."
