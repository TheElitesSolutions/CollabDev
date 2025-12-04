# Kill any process using port 3001
Write-Host "Checking for processes on port 3001..." -ForegroundColor Cyan

$port = 3001
$processIds = @()

# Get all processes listening on port 3001
$connections = netstat -ano | Select-String ":$port\s" | Select-String "LISTENING"

if ($connections) {
    foreach ($connection in $connections) {
        $processId = ($connection -split '\s+')[-1]
        if ($processId -and $processIds -notcontains $processId) {
            $processIds += $processId
        }
    }

    foreach ($pid in $processIds) {
        try {
            $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($process) {
                Write-Host "Found: $($process.ProcessName) (PID: $pid)" -ForegroundColor Yellow
                Stop-Process -Id $pid -Force
                Write-Host "✓ Killed process $pid" -ForegroundColor Green
            }
        }
        catch {
            Write-Host "✗ Could not kill process $pid" -ForegroundColor Red
        }
    }
} else {
    Write-Host "✓ Port $port is already free" -ForegroundColor Green
}

Write-Host "`nDone!" -ForegroundColor Cyan
