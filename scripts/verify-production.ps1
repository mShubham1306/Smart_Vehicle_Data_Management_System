# Quick production check after Render deploy
$base = "https://smart-vehicle-data-management-system.onrender.com"

Write-Host "Health..."
$h = Invoke-RestMethod -Uri "$base/health" -TimeoutSec 90
$h | ConvertTo-Json

Write-Host "`nEmail status..."
$e = Invoke-RestMethod -Uri "$base/api/auth/email-status" -TimeoutSec 90
$e | ConvertTo-Json

Write-Host "`nForgot password (unknown email)..."
try {
  $r = Invoke-WebRequest -Uri "$base/api/auth/forgot-password" -Method POST `
    -Body '{"email":"nobody@example.com"}' -ContentType "application/json" `
    -Headers @{ Origin = "https://insuradrive.vercel.app" } -UseBasicParsing -TimeoutSec 90
  Write-Host "OK $($r.StatusCode)"
} catch {
  Write-Host "FAIL $($_.Exception.Message)"
}
