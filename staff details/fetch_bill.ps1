
$headers = @{
    "apikey" = "sb_secret_AdHTy_CVyS4HJiYTOnk9QQ_PL8Q0y-O"
    "Authorization" = "sb_secret_AdHTy_CVyS4HJiYTOnk9QQ_PL8Q0y-O"
}


$bill = Invoke-RestMethod -Uri "https://cwaayduboikqihempgbn.supabase.co/rest/v1/bills?select=id,created_at&order=created_at.desc&limit=1" -Headers $headers -Method Get

if ($bill) {
    Write-Host "Latest Bill ID: $($bill.id)"
    $items = Invoke-RestMethod -Uri "https://cwaayduboikqihempgbn.supabase.co/rest/v1/bill_items?bill_id=eq.$($bill.id)&select=*" -Headers $headers -Method Get
    $items | ConvertTo-Json -Depth 5
} else {
    Write-Host "No bills found"
}
