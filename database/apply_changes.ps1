# PostgreSQL Database Change Application Script
# This script applies SQL changes directly to the Supabase remote database

param(
    [Parameter(Mandatory=$true)]
    [string]$SqlFile
)

# Check if SQL file exists
if (-not (Test-Path $SqlFile)) {
    Write-Error "SQL file '$SqlFile' not found!"
    exit 1
}

Write-Host "🔄 Applying database changes from: $SqlFile" -ForegroundColor Yellow

# Get Supabase project details from environment or config
$supabaseUrl = $env:VITE_SUPABASE_URL
if (-not $supabaseUrl) {
    Write-Error "VITE_SUPABASE_URL environment variable not found!"
    exit 1
}

# Extract database host from Supabase URL
$dbHost = $supabaseUrl -replace "https://", "" -replace "\.supabase\.co.*", ".supabase.co"
$projectRef = $supabaseUrl -replace "https://", "" -replace "\.supabase\.co.*", ""

Write-Host "📡 Connecting to database: $dbHost" -ForegroundColor Cyan
Write-Host "📄 SQL file: $SqlFile" -ForegroundColor Cyan

# Apply the SQL file using psql (you'll be prompted for password)
$env:PGPASSWORD = $null  # Clear any existing password
psql -h "db.$dbHost" -p 5432 -d postgres -U postgres -f $SqlFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database changes applied successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to apply database changes!" -ForegroundColor Red
    exit 1
}
