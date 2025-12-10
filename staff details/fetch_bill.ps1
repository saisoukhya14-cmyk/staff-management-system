
$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3YWF5ZHVib2lrcWloZW1wZ2JuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNzI1MDMsImV4cCI6MjA4MDc0ODUwM30.mZULa8vhq_o4a6J631he9PCJy_iTwm2vhMWFtJ4AoCE"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3YWF5ZHVib2lrcWloZW1wZ2JuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNzI1MDMsImV4cCI6MjA4MDc0ODUwM30.mZULa8vhq_o4a6J631he9PCJy_iTwm2vhMWFtJ4AoCE"
}

$bill = Invoke-RestMethod -Uri "https://cwaayduboikqihempgbn.supabase.co/rest/v1/bills?select=id,created_at&order=created_at.desc&limit=1" -Headers $headers -Method Get

if ($bill) {
    Write-Host "Latest Bill ID: $($bill.id)"
    $items = Invoke-RestMethod -Uri "https://cwaayduboikqihempgbn.supabase.co/rest/v1/bill_items?bill_id=eq.$($bill.id)&select=*" -Headers $headers -Method Get
    $items | ConvertTo-Json -Depth 5
} else {
    Write-Host "No bills found"
}
