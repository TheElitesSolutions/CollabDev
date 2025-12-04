# Kill ALL Node.js processes (use with caution)
Write-Host "Killing all Node.js processes..." -ForegroundColor Yellow

$nodeProcesses = Get-Process node -ErrorAction SilentlyContinue

if ($nodeProcesses) {
    $count = ($nodeProcesses | Measure-Object).Count
    Write-Host "Found $count Node.js process(es)" -ForegroundColor Cyan

    foreach ($process in $nodeProcesses) {
        Write-Host "Killing: $($process.ProcessName) (PID: $($process.Id))" -ForegroundColor Yellow
        Stop-Process -Id $process.Id -Force
    }

    Write-Host "✓ All Node.js processes killed" -ForegroundColor Green
} else {
    Write-Host "✓ No Node.js processes running" -ForegroundColor Green
}

Write-Host "`nDone!" -ForegroundColor Cyan
