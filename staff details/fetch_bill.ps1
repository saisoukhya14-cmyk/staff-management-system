
$headers = @{
    "apikey" = $env:SUPABASE_ANON_KEY
    "Authorization" = "Bearer $($env:SUPABASE_SERVICE_ROLE_KEY)"
}


$bill = Invoke-RestMethod -Uri "https://cwaayduboikqihempgbn.supabase.co/rest/v1/bills?select=id,created_at&order=created_at.desc&limit=1" -Headers $headers -Method Get

if ($bill) {
    Write-Host "Latest Bill ID: $($bill.id)"
    $items = Invoke-RestMethod -Uri "https://cwaayduboikqihempgbn.supabase.co/rest/v1/bill_items?bill_id=eq.$($bill.id)&select=*" -Headers $headers -Method Get
    $items | ConvertTo-Json -Depth 5
} else {
    Write-Host "No bills found"
}
