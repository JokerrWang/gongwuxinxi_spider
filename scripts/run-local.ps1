param(
  [int]$Port = 3000
)

$ErrorActionPreference = "Stop"
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptRoot
$PublicRoot = Join-Path $ProjectRoot "public"
$LogRoot = Join-Path $ProjectRoot "logs"
New-Item -ItemType Directory -Force -Path $LogRoot | Out-Null
$CacheExpires = Get-Date "2000-01-01"
$CachePayload = $null
$RefreshInterval = [TimeSpan]::FromHours(1)
$RefreshTimer = $null

function U($CodePoints) {
  return -join ($CodePoints | ForEach-Object { [char]$_ })
}

$LabelCivil = U @(0x516c, 0x52a1, 0x5458)
$LabelPublic = U @(0x4e8b, 0x4e1a, 0x5355, 0x4f4d)
$LabelSelection = U @(0x9009, 0x8c03, 0x2f, 0x9074, 0x9009)
$LabelGeneral = U @(0x7efc, 0x5408, 0x8003, 0x8bd5)
$LabelLatest = U @(0x6700, 0x65b0)
$LabelRecent = U @(0x8fd1, 0x671f)
$LabelHistory = U @(0x5386, 0x53f2)
$LabelPending = U @(0x5f85, 0x786e, 0x8ba4)
$LabelApply = U @(0x53ef, 0x62a5, 0x540d, 0x5173, 0x6ce8)
$LabelWritten = U @(0x7b14, 0x8bd5, 0x9636, 0x6bb5)
$LabelProcess = U @(0x540e, 0x7eed, 0x6d41, 0x7a0b)
$LabelPublish = U @(0x516c, 0x793a)
$LabelNotice = U @(0x901a, 0x77e5)

$RxCivil = U @(0x516c, 0x52a1, 0x5458)
$RxPublic = U @(0x4e8b, 0x4e1a, 0x5355, 0x4f4d, 0x7c, 0x516c, 0x5f00, 0x62db, 0x8058, 0x7c, 0x4e8b, 0x4e1a, 0x7f16)
$RxSelection = U @(0x9009, 0x8c03, 0x7c, 0x9074, 0x9009)
$RxCivilFallback = U @(0x62db, 0x8003, 0x7c, 0x5f55, 0x7528)
$RxTopic = U @(0x516c, 0x52a1, 0x5458, 0x7c, 0x4e8b, 0x4e1a, 0x5355, 0x4f4d, 0x7c, 0x516c, 0x5f00, 0x62db, 0x8058, 0x7c, 0x62db, 0x8003, 0x7c, 0x5f55, 0x7528, 0x7c, 0x9009, 0x8c03, 0x7c, 0x9074, 0x9009, 0x7c, 0x5c97, 0x4f4d, 0x7c, 0x62a5, 0x540d, 0x7c, 0x7b14, 0x8bd5, 0x7c, 0x9762, 0x8bd5, 0x7c, 0x8d44, 0x683c, 0x590d, 0x5ba1)
$RxExcluded = U @(0x6210, 0x7ee9, 0x516c, 0x793a, 0x7c, 0x6210, 0x7ee9, 0x7c, 0x62df, 0x5f55, 0x7528, 0x7c, 0x4f53, 0x68c0, 0x7c, 0x8003, 0x5bdf, 0x7c, 0x8d44, 0x683c, 0x590d, 0x5ba1, 0x7c, 0x4e3b, 0x4efb, 0x7535, 0x8bdd, 0x7c, 0x57f9, 0x8bad, 0x4f1a, 0x7c, 0x6d3b, 0x52a8, 0x7c, 0x8bc1, 0x4e66, 0x9886, 0x53d6, 0x7c, 0x804c, 0x4e1a, 0x8d44, 0x683c, 0x7c, 0x4e13, 0x4e1a, 0x6280, 0x672f, 0x7c, 0x54a8, 0x8be2, 0x5de5, 0x7a0b, 0x5e08, 0x7c, 0x7edf, 0x8ba1, 0x8d44, 0x683c, 0x7c, 0x6d88, 0x9632, 0x5de5, 0x7a0b, 0x5e08)
$RxApply = U @(0x62a5, 0x540d, 0x7c, 0x516c, 0x544a, 0x7c, 0x65b9, 0x6848, 0x7c, 0x62db, 0x8058)
$RxWritten = U @(0x7b14, 0x8bd5, 0x7c, 0x51c6, 0x8003, 0x8bc1)
$RxProcess = U @(0x9762, 0x8bd5, 0x7c, 0x8d44, 0x683c, 0x590d, 0x5ba1, 0x7c, 0x4f53, 0x68c0, 0x7c, 0x8003, 0x5bdf)
$RxPublish = U @(0x62df, 0x5f55, 0x7528, 0x7c, 0x516c, 0x793a)

$Sources = @(
  @{
    id = "rsksw"
    name = U @(0x5929, 0x6d25, 0x4eba, 0x4e8b, 0x8003, 0x8bd5, 0x7f51, 0x901a, 0x77e5, 0x516c, 0x544a)
    type = $LabelGeneral
    url = "https://hrss.tj.gov.cn/jsdw/rsksw/tzgg4/"
    baseUrl = "https://hrss.tj.gov.cn/jsdw/rsksw/tzgg4/"
  },
  @{
    id = "sydw"
    name = U @(0x5929, 0x6d25, 0x5e02, 0x4e8b, 0x4e1a, 0x5355, 0x4f4d, 0x516c, 0x5f00, 0x62db, 0x8058)
    type = $LabelPublic
    url = "https://hrss.tj.gov.cn/ztzl/ztzl1/sydwgkzp/"
    baseUrl = "https://hrss.tj.gov.cn/ztzl/ztzl1/sydwgkzp/"
    forcedCategory = $LabelPublic
  }
)

function New-HttpResponse($Status, $ContentType, [byte[]]$Bytes, $CacheControl = "no-store") {
  $Reason = switch ($Status) {
    200 { "OK" }
    403 { "Forbidden" }
    404 { "Not Found" }
    500 { "Internal Server Error" }
    default { "OK" }
  }
  $Header = "HTTP/1.1 $Status $Reason`r`nContent-Type: $ContentType`r`nContent-Length: $($Bytes.Length)`r`nCache-Control: $CacheControl`r`nConnection: close`r`n`r`n"
  $HeaderBytes = [System.Text.Encoding]::ASCII.GetBytes($Header)
  $Output = New-Object byte[] ($HeaderBytes.Length + $Bytes.Length)
  [Array]::Copy($HeaderBytes, 0, $Output, 0, $HeaderBytes.Length)
  [Array]::Copy($Bytes, 0, $Output, $HeaderBytes.Length, $Bytes.Length)
  return ,$Output
}

function New-JsonResponse($Data, $Status = 200) {
  $Body = $Data | ConvertTo-Json -Depth 8 -Compress
  $Bytes = [System.Text.Encoding]::UTF8.GetBytes($Body)
  return New-HttpResponse $Status "application/json; charset=utf-8" $Bytes
}

function New-TextResponse($Text, $Status = 200, $ContentType = "text/plain; charset=utf-8") {
  $Bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
  return New-HttpResponse $Status $ContentType $Bytes
}

function Decode-Html($Value) {
  return [System.Net.WebUtility]::HtmlDecode($Value)
}

function Normalize-Text($Value) {
  $Text = Decode-Html($Value -replace "<[^>]+>", " ")
  return (($Text -replace "\s+", " ") -replace "[\u00b7\u2022]", "").Trim()
}

function Normalize-Date($Value) {
  $Match = [regex]::Match($Value, "(20\d{2})[-\u5e74./](\d{1,2})[-\u6708./](\d{1,2})")
  if (-not $Match.Success) { return "" }
  return "{0}-{1:D2}-{2:D2}" -f [int]$Match.Groups[1].Value, [int]$Match.Groups[2].Value, [int]$Match.Groups[3].Value
}

function Find-Date($Text) {
  $Full = [regex]::Match($Text, "20\d{2}[-\u5e74./]\d{1,2}[-\u6708./]\d{1,2}")
  if ($Full.Success) { return Normalize-Date $Full.Value }

  $Short = [regex]::Match($Text, "\[(\d{1,2})-(\d{1,2})\]")
  if ($Short.Success) {
    return "{0}-{1:D2}-{2:D2}" -f (Get-Date).Year, [int]$Short.Groups[1].Value, [int]$Short.Groups[2].Value
  }

  return ""
}

function Get-Category($Title, $Source) {
  if ($Source.forcedCategory) { return $Source.forcedCategory }
  if ($Title -match $RxCivil) { return $LabelCivil }
  if ($Title -match $RxPublic) { return $LabelPublic }
  if ($Title -match $RxSelection) { return $LabelSelection }
  if ($Title -match $RxCivilFallback) { return $LabelCivil }
  return $Source.type
}

function Test-ExamNotice($Title, $Category) {
  $TopicMatched = $Title -match $RxTopic
  $Excluded = $Title -match $RxExcluded
  return $TopicMatched -and (-not $Excluded) -and $Category -ne $LabelGeneral
}

function Get-Highlight($Title) {
  if ($Title -match $RxApply) { return $LabelApply }
  if ($Title -match $RxWritten) { return $LabelWritten }
  if ($Title -match $RxProcess) { return $LabelProcess }
  if ($Title -match $RxPublish) { return $LabelPublish }
  return $LabelNotice
}

function Get-Status($DateText) {
  if (-not $DateText) { return $LabelPending }
  $Date = [datetime]::Parse($DateText)
  $Days = ((Get-Date) - $Date).TotalDays
  if ($Days -le 14) { return $LabelLatest }
  if ($Days -le 45) { return $LabelRecent }
  return $LabelHistory
}

function Resolve-Url($Href, $BaseUrl) {
  try {
    return ([System.Uri]::new([System.Uri]::new($BaseUrl), $Href)).AbsoluteUri
  } catch {
    return $Href
  }
}

function Get-NoticeId($Value) {
  $Sha = [System.Security.Cryptography.SHA256]::Create()
  $Bytes = [System.Text.Encoding]::UTF8.GetBytes($Value)
  $Hash = $Sha.ComputeHash($Bytes)
  return (($Hash[0..5] | ForEach-Object { $_.ToString("x2") }) -join "")
}

function Parse-Notices($Html, $Source) {
  $Items = New-Object System.Collections.Generic.List[object]
  $Pattern = [regex]::new("<a\b([^>]*)>([\s\S]*?)</a>", [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
  $Matches = $Pattern.Matches($Html)

  foreach ($Match in $Matches) {
    $Attrs = $Match.Groups[1].Value
    $HrefMatch = [regex]::Match($Attrs, "href\s*=\s*[""']([^""']+)[""']", [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    if (-not $HrefMatch.Success) { continue }
    $Href = $HrefMatch.Groups[1].Value
    if ($Href -match "^(javascript:|#)") { continue }

    $Title = Normalize-Text $Match.Groups[2].Value
    if (-not $Title) { continue }

    $Start = [Math]::Max(0, $Match.Index - 80)
    $Length = [Math]::Min($Html.Length - $Start, $Match.Length + 160)
    $Nearby = $Html.Substring($Start, $Length)
    $DateText = Find-Date "$Title $Nearby"
    $CleanTitle = ($Title -replace "\s*\d{4}-\d{2}-\d{2}\s*$", "").Trim()
    $Category = Get-Category $CleanTitle $Source
    if ((-not (Test-ExamNotice $CleanTitle $Category)) -or $CleanTitle -eq $Category) { continue }
    $Items.Add([ordered]@{
      id = Get-NoticeId "$($Source.id)-$CleanTitle-$Href"
      title = $CleanTitle
      category = $Category
      date = $DateText
      source = $Source.name
      sourceType = $Source.type
      url = Resolve-Url $Href $Source.baseUrl
      highlight = Get-Highlight $CleanTitle
      status = Get-Status $DateText
    })
  }

  return $Items | Select-Object -First 60
}

function Get-Exams($Refresh) {
  if ((-not $Refresh) -and $script:CachePayload -and $script:CacheExpires -gt (Get-Date)) {
    $Copy = $script:CachePayload.PSObject.Copy()
    $Copy | Add-Member -NotePropertyName cached -NotePropertyValue $true -Force
    return $Copy
  }

  $All = New-Object System.Collections.Generic.List[object]
  $Errors = New-Object System.Collections.Generic.List[object]

  foreach ($Source in $Sources) {
    try {
      $Client = [System.Net.WebClient]::new()
      $Client.Headers.Add("User-Agent", "Mozilla/5.0 TianjinExamRadar/1.0")
      $Bytes = $Client.DownloadData($Source.url)
      $Html = [System.Text.Encoding]::UTF8.GetString($Bytes)
      foreach ($Notice in (Parse-Notices $Html $Source)) {
        $All.Add($Notice)
      }
    } catch {
      $Errors.Add([ordered]@{ source = $Source.name; message = $_.Exception.Message })
    }
  }

  $Seen = @{}
  $Unique = $All | Where-Object {
    $Key = "$($_.title)|$($_.url)"
    if ($Seen.ContainsKey($Key)) { return $false }
    $Seen[$Key] = $true
    return $true
  } | Sort-Object @{ Expression = { if ($_.date) { [datetime]::Parse($_.date) } else { [datetime]"1900-01-01" } }; Descending = $true }

  $Payload = [ordered]@{
    updatedAt = (Get-Date).ToUniversalTime().ToString("o")
    nextRefreshAt = (Get-Date).Add($script:RefreshInterval).ToUniversalTime().ToString("o")
    refreshIntervalMinutes = [int]$script:RefreshInterval.TotalMinutes
    sources = $Sources | ForEach-Object { [ordered]@{ name = $_.name; url = $_.url; type = $_.type } }
    errors = $Errors
    exams = @($Unique)
  }

  $script:CachePayload = [pscustomobject]$Payload
  $script:CacheExpires = (Get-Date).Add($script:RefreshInterval)
  $Payload["cached"] = $false
  return [pscustomobject]$Payload
}

function Start-AutoRefresh {
  Get-Exams $true | Out-Null
  $Callback = {
    try {
      Get-Exams $true | Out-Null
    } catch {
      Add-Content -Path (Join-Path $script:LogRoot "run-local.error.log") -Value $_.Exception.ToString()
    }
  }
  $IntervalMs = [int]$script:RefreshInterval.TotalMilliseconds
  $script:RefreshTimer = [System.Threading.Timer]::new($Callback, $null, $IntervalMs, $IntervalMs)
}

function Serve-Static($Path) {
  $Path = [System.Web.HttpUtility]::UrlDecode($Path)
  if ($Path -eq "/") { $Path = "/index.html" }
  $Path = $Path.TrimStart("/")
  $FilePath = Join-Path $PublicRoot $Path
  $ResolvedRoot = [System.IO.Path]::GetFullPath($PublicRoot)
  $ResolvedFile = [System.IO.Path]::GetFullPath($FilePath)

  if (-not $ResolvedFile.StartsWith($ResolvedRoot)) {
    return New-TextResponse "Forbidden" 403
  }

  if (-not (Test-Path -LiteralPath $ResolvedFile -PathType Leaf)) {
    return New-TextResponse "Not found" 404
  }

  $ContentTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css" = "text/css; charset=utf-8"
    ".js" = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
  }
  $Ext = [System.IO.Path]::GetExtension($ResolvedFile)
  $ContentType = if ($ContentTypes.ContainsKey($Ext)) { $ContentTypes[$Ext] } else { "application/octet-stream" }
  $Bytes = [System.IO.File]::ReadAllBytes($ResolvedFile)
  return New-HttpResponse 200 $ContentType $Bytes "public, max-age=300"
}

Add-Type -AssemblyName System.Web
$Listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Parse("127.0.0.1"), $Port)
$Listener.Start()
Write-Host "Tianjin exam radar is running at http://localhost:$Port"
Write-Host "Auto refresh interval: $([int]$RefreshInterval.TotalMinutes) minutes"
Start-AutoRefresh

try {
  while ($true) {
    $Client = $Listener.AcceptTcpClient()
    try {
      $Stream = $Client.GetStream()
      $Buffer = New-Object byte[] 8192
      $Count = $Stream.Read($Buffer, 0, $Buffer.Length)
      $RequestText = [System.Text.Encoding]::ASCII.GetString($Buffer, 0, $Count)
      $RequestLine = ($RequestText -split "`r`n")[0]
      $Parts = $RequestLine -split " "
      $RawPath = if ($Parts.Length -ge 2) { $Parts[1] } else { "/" }
      $Uri = [System.Uri]::new("http://localhost:$Port$RawPath")

      if ($Uri.AbsolutePath -eq "/api/exams") {
        $Refresh = [System.Web.HttpUtility]::ParseQueryString($Uri.Query)["refresh"] -eq "1"
        $ResponseBytes = New-JsonResponse (Get-Exams $Refresh)
      } else {
        $ResponseBytes = Serve-Static $Uri.AbsolutePath
      }
      $Stream.Write($ResponseBytes, 0, $ResponseBytes.Length)
    } catch {
      $ResponseBytes = New-JsonResponse @{ error = $_.Exception.Message } 500
      if ($Stream) { $Stream.Write($ResponseBytes, 0, $ResponseBytes.Length) }
    } finally {
      $Client.Close()
    }
  }
} catch {
  Add-Content -Path (Join-Path $LogRoot "run-local.error.log") -Value $_.Exception.ToString()
} finally {
  if ($RefreshTimer) { $RefreshTimer.Dispose() }
  $Listener.Stop()
}
