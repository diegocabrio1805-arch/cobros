$url = "https://samgpnczlznynnfhjjff.supabase.co/rest/v1/payments"
$apikey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE"
$headers = @{
    "apikey" = $apikey
    "Authorization" = "Bearer $apikey"
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}
$body = @{
    id = "test-payment-script-1"
    loan_id = "test-loan"
    client_id = "test-client"
    collector_id = "test-coll"
    branch_id = "test-branch"
    amount = 50
    date = "2026-03-14T10:00:00Z"
    installment_number = 1
    location = $null
    is_virtual = $false
    is_renewal = $false
    deleted_at = $null
    updated_at = "2026-03-14T10:00:00Z"
} | ConvertTo-Json

try {
    $result = Invoke-RestMethod -Uri $url -Headers $headers -Method Post -Body $body
    Write-Host "SUCCESS:"
    Write-Host ($result | ConvertTo-Json)
} catch {
    Write-Host "ERROR:"
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $responseStream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($responseStream)
        Write-Host "BODY:"
        Write-Host $reader.ReadToEnd()
    }
}
