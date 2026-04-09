$target = (Get-Date).Date.AddHours(21)
if ((Get-Date) -gt $target) {
    $target = $target.AddDays(1)
}
$secondsToWait = ($target - (Get-Date)).TotalSeconds
Start-Sleep -Seconds $secondsToWait

cd C:\Users\HP\.gemini\antigravity\scratch\cobros
node push_fix.js
