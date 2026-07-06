# Tail the API debug log files (local development)
$paths = @("public/api/last_api_responses.log","out/api/last_api_responses.log")
$found = $false
foreach ($p in $paths) {
    if (Test-Path $p) {
        Write-Output "--- Showing last 200 lines of $p ---"
        Get-Content $p -Tail 200 | Write-Output
        $found = $true
    }
}
if (-not $found) {
    Write-Output "No API debug log found in 'public/api' or 'out/api'. Trigger an API request on the server to create it, then re-run this script."
}
