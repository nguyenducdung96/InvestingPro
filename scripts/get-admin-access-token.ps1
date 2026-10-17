param([string]$Email)
$ErrorActionPreference = "Stop"
if (-not $Email) { $Email = Read-Host "Nhap email tai khoan Supabase" }
$taskRoot = Split-Path -Parent $PSScriptRoot
$config = ConvertFrom-StringData (Get-Content -Raw -LiteralPath (Join-Path $taskRoot "apps/web/.env.local"))
$passwordInput = Read-Host "Nhap mat khau tai khoan Supabase" -AsSecureString
try {
    $passwordText = [System.Net.NetworkCredential]::new("", $passwordInput).Password
    $body = @{ email = $Email; password = $passwordText } | ConvertTo-Json
    $session = Invoke-RestMethod -Method Post `
        -Uri "$($config.SUPABASE_URL)/auth/v1/token?grant_type=password" `
        -Headers @{ apikey = $config.SUPABASE_ANON_KEY } `
        -ContentType "application/json" -Body $body
    if (-not $session.access_token) { throw "Khong nhan duoc access token." }
    Set-Clipboard -Value $session.access_token
    Write-Host "Da copy access token. Dan vao trang quan tri staging (vi du /admin/port-calls). Khong gui token vao chat."
} finally {
    Remove-Variable passwordInput, passwordText, body, session -ErrorAction SilentlyContinue
}
