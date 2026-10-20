param(
    [Parameter(Mandatory = $true)][Guid]$CandidateId,
    [string]$BearerToken = $env:MATCHAJOB_TEST_TOKEN,
    [string]$BaseUrl = 'http://localhost:8081/api',
    [string]$ComposeFile = 'compose.yaml',
    [switch]$RecreateBackend
)

# Run against a synthetic candidate: this adds two CV versions and changes its active selection.
# Token is read from the environment and is never printed. No volume or database is deleted.
$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($BearerToken)) { throw 'Set MATCHAJOB_TEST_TOKEN to a synthetic candidate JWT.' }
Add-Type -AssemblyName System.Net.Http
$client = [System.Net.Http.HttpClient]::new()
$client.DefaultRequestHeaders.Authorization = [System.Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer', $BearerToken)
$route = "$($BaseUrl.TrimEnd('/'))/v1/candidates/$CandidateId/cv"

function Assert-Cv([bool]$Condition, [string]$Message) {
    if (-not $Condition) { throw $Message }
}

function New-SyntheticPdf([string]$Text) {
    $stream = "BT /F1 12 Tf 72 720 Td ($Text) Tj ET"
    $objects = @(
        '<< /Type /Catalog /Pages 2 0 R >>',
        '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
        "<< /Length $($stream.Length) >>`nstream`n$stream`nendstream",
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
    )
    $pdf = [System.Text.StringBuilder]::new("%PDF-1.4`n")
    $offsets = @()
    for ($i = 0; $i -lt $objects.Length; $i++) {
        $offsets += $pdf.Length
        [void]$pdf.Append("$($i + 1) 0 obj`n$($objects[$i])`nendobj`n")
    }
    $xref = $pdf.Length
    [void]$pdf.Append("xref`n0 6`n0000000000 65535 f `n")
    foreach ($offset in $offsets) { [void]$pdf.Append(('{0:D10} 00000 n ' -f $offset) + "`n") }
    [void]$pdf.Append("trailer`n<< /Size 6 /Root 1 0 R >>`nstartxref`n$xref`n%%EOF`n")
    return ,([System.Text.Encoding]::ASCII.GetBytes($pdf.ToString()))
}

function Send-Cv([byte[]]$Bytes, [string]$Filename) {
    $multipart = [System.Net.Http.MultipartFormDataContent]::new()
    try {
        $part = [System.Net.Http.ByteArrayContent]::new($Bytes)
        $part.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::new('application/pdf')
        $multipart.Add($part, 'file', $Filename)
        $response = $client.PostAsync($route, $multipart).GetAwaiter().GetResult()
        try {
            Assert-Cv ($response.StatusCode -eq 202) 'CV upload must return 202.'
            return ($response.Content.ReadAsStringAsync().GetAwaiter().GetResult() | ConvertFrom-Json)
        } finally { $response.Dispose() }
    } finally { $multipart.Dispose() }
}

function Assert-Download([Guid]$Id, [byte[]]$Expected) {
    $response = $client.GetAsync("$route/$Id/download?disposition=inline").GetAwaiter().GetResult()
    try {
        Assert-Cv ($response.StatusCode -eq 200) 'CV download must return 200.'
        $actual = $response.Content.ReadAsByteArrayAsync().GetAwaiter().GetResult()
        $digest = [System.Security.Cryptography.SHA256]::Create()
        try {
            $actualHash = [Convert]::ToBase64String($digest.ComputeHash($actual))
            $expectedHash = [Convert]::ToBase64String($digest.ComputeHash($Expected))
            Assert-Cv ($actualHash -eq $expectedHash) 'Downloaded CV checksum changed.'
        } finally { $digest.Dispose() }
        Assert-Cv ($response.Headers.CacheControl.NoStore) 'Private CV must use no-store.'
        Assert-Cv ($response.Content.Headers.ContentDisposition.DispositionType -eq 'inline') 'Inline preview header is missing.'
    } finally { $response.Dispose() }
}

try {
    $firstBytes = New-SyntheticPdf 'Synthetic MatchaJob CV version one'
    $secondBytes = New-SyntheticPdf 'Synthetic MatchaJob CV version two'
    $first = Send-Cv $firstBytes 'synthetic-v1.pdf'
    $second = Send-Cv $secondBytes 'synthetic-v2.pdf'
    Assert-Cv ($first.cv_version_id -ne $second.cv_version_id) 'Uploads must have different version IDs.'
    $headers = @{ Authorization = "Bearer $BearerToken" }
    $versions = @(Invoke-RestMethod -Uri $route -Headers $headers)
    Assert-Cv ($versions.id -contains $first.cv_version_id) 'First version is missing.'
    Assert-Cv ($versions.id -contains $second.cv_version_id) 'Second version is missing.'
    $active = Invoke-RestMethod -Uri "$route/active" -Headers $headers
    Assert-Cv ($active.id -eq $second.cv_version_id) 'Latest upload must be active.'
    $null = Invoke-RestMethod -Method Put -Uri "$route/$($first.cv_version_id)/active" -Headers $headers
    $active = Invoke-RestMethod -Uri "$route/active" -Headers $headers
    Assert-Cv ($active.id -eq $first.cv_version_id) 'Candidate could not select an earlier CV.'
    Assert-Download $first.cv_version_id $firstBytes
    Assert-Download $second.cv_version_id $secondBytes
    Write-Output 'PASS: upload, distinct versions, active selection, preview, and checksums.'

    if ($RecreateBackend) {
        Push-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
        try {
            docker compose -f $ComposeFile up -d --no-deps --force-recreate backend
            Assert-Cv ($LASTEXITCODE -eq 0) 'Backend recreation failed.'
        } finally { Pop-Location }
        $ready = $false
        for ($attempt = 0; $attempt -lt 60; $attempt++) {
            try {
                $health = Invoke-RestMethod -Uri "$BaseUrl/actuator/health/readiness"
                if ($health.status -eq 'UP') { $ready = $true; break }
            } catch { }
            Start-Sleep -Seconds 2
        }
        Assert-Cv $ready 'Backend did not become ready after recreation.'
        Assert-Download $first.cv_version_id $firstBytes
        Assert-Download $second.cv_version_id $secondBytes
        Write-Output 'PASS: both CV objects survived Backend container recreation.'
    }
} finally { $client.Dispose() }
