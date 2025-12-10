
$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3YWF5ZHVib2lrcWloZW1wZ2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTE3MjUwMywiZXhwIjoyMDgwNzQ4NTAzfQ.iaPdMFa-zDSnL-uXhTWProXYgRtABgWy7jOGlxye-lE"
    "Authorization" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3YWF5ZHVib2lrcWloZW1wZ2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTE3MjUwMywiZXhwIjoyMDgwNzQ4NTAzfQ.iaPdMFa-zDSnL-uXhTWProXYgRtABgWy7jOGlxye-lE"
}


$bill = Invoke-RestMethod -Uri "https://cwaayduboikqihempgbn.supabase.co/rest/v1/bills?select=id,created_at&order=created_at.desc&limit=1" -Headers $headers -Method Get

if ($bill) {
    Write-Host "Latest Bill ID: $($bill.id)"
    $items = Invoke-RestMethod -Uri "https://cwaayduboikqihempgbn.supabase.co/rest/v1/bill_items?bill_id=eq.$($bill.id)&select=*" -Headers $headers -Method Get
    $items | ConvertTo-Json -Depth 5
} else {
    Write-Host "No bills found"
}
