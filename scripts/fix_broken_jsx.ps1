$brokenFiles = @(
  "e:\dev\projects\NFL_Dashboard\src\components\dev-lab\DevLab.jsx",
  "e:\dev\projects\NFL_Dashboard\src\components\modals\AudioUploadModal.jsx",
  "e:\dev\projects\NFL_Dashboard\src\components\modals\BetImportModal.jsx",
  "e:\dev\projects\NFL_Dashboard\src\components\modals\EditBetModal.jsx",
  "e:\dev\projects\NFL_Dashboard\src\components\modals\PendingBetsModal.jsx"
)
foreach ($f in $brokenFiles) {
  $lines = Get-Content $f
  if ($lines[1] -eq "}" -and $lines[2] -match "import logger" -and $lines[3] -match "^import React") {
    $rel = $f.Replace("e:\dev\projects\NFL_Dashboard\src\", "")
    $depth = ($rel -split "\\").Count - 1
    $ups = "../" * $depth
    $importLine = "import logger from '${ups}lib/logger';"
    $newLines = @($lines[0], $importLine) + $lines[4..($lines.Count - 1)]
    [System.IO.File]::WriteAllText($f, ($newLines -join "`n"))
    Write-Host "Fixed: $([System.IO.Path]::GetFileName($f))"
  } else {
    Write-Host "Pattern mismatch: $([System.IO.Path]::GetFileName($f)) line1='$($lines[1])'"
  }
}
Write-Host "Complete."
