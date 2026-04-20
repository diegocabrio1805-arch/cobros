$key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbWdwbmN6bHpueW5uZmhqamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjU1NjQsImV4cCI6MjA4Nzc0MTU2NH0.AV1Z-QlltfPp8am-_ALlgopoGB8WhOrle83TNZrjqTE'
$url = 'https://samgpnczlznynnfhjjff.supabase.co/rest/v1/rpc/handle_loan_renewal_v1'
$body = @{
    p_new_loan_id = '00000000-0000-0000-0000-000000000000'
    p_client_id = '00000000-0000-0000-0000-000000000000'
    p_collector_id = '00000000-0000-0000-0000-000000000000'
    p_principal = 0
    p_interest_rate = 0
    p_total_installments = 0
    p_frequency = 'daily'
    p_total_amount = 0
    p_installment_value = 0
    p_installments = @()
    p_previous_loan_ids = @()
    p_branch_id = '00000000-0000-0000-0000-000000000000'
} | ConvertTo-Json

$headers = @{
    'apikey' = $key
    'Authorization' = "Bearer $key"
    'Content-Type' = 'application/json'
}

try {
    $resp = Invoke-WebRequest -Uri $url -Method POST -Headers $headers -Body $body -ErrorAction Stop
    Write-Host "Status: $($resp.StatusCode)"
    Write-Host "Body: $($resp.Content)"
    Write-Host ""
    Write-Host ">>> OK: La funcion handle_loan_renewal_v1 EXISTE en Supabase <<<"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    try {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $body = $reader.ReadToEnd()
    } catch { $body = $_.Exception.Message }

    Write-Host "Status: $statusCode"
    Write-Host "Body: $body"
    
    if ($statusCode -eq 404 -or $body -like '*not found*') {
        Write-Host ""
        Write-Host ">>> FALTA APLICAR: blindaje_renovacion.sql en el SQL Editor de Supabase <<<"
    } else {
        Write-Host ""
        Write-Host ">>> OK: La funcion EXISTE (error esperado con datos dummy) <<<"
    }
}
