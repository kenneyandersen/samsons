# Local static file server for testing. Only used in development; not part of the hosted site.
# Runs on the PowerShell built into Windows, so no install is needed.
# Keep this file ASCII-only: Windows PowerShell misreads UTF-8 files without a BOM.

param(
    [int]$Port = 8080,
    [string]$Root = (Join-Path $PSScriptRoot '..\docs')
)

$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path $Root).Path.TrimEnd('\')

$contentTypes = @{
    '.html' = 'text/html; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.js'   = 'text/javascript; charset=utf-8'
    '.mjs'  = 'text/javascript; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.txt'  = 'text/plain; charset=utf-8'
    '.svg'  = 'image/svg+xml'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.jpeg' = 'image/jpeg'
    '.gif'  = 'image/gif'
    '.webp' = 'image/webp'
    '.ico'  = 'image/x-icon'
    '.mp3'  = 'audio/mpeg'
    '.ogg'  = 'audio/ogg'
    '.wav'  = 'audio/wav'
    '.mp4'  = 'video/mp4'
    '.woff' = 'font/woff'
    '.woff2' = 'font/woff2'
    '.wasm' = 'application/wasm'
}

function Send-Text($response, [int]$status, [string]$text) {
    $bytes = [Text.Encoding]::UTF8.GetBytes($text)
    $response.StatusCode = $status
    $response.ContentType = 'text/plain; charset=utf-8'
    $response.ContentLength64 = $bytes.Length
    $response.OutputStream.Write($bytes, 0, $bytes.Length)
}

function Send-File($context) {
    $response = $context.Response
    $relative = [Uri]::UnescapeDataString($context.Request.Url.AbsolutePath).TrimStart('/')
    $path = [IO.Path]::GetFullPath([IO.Path]::Combine($Root, $relative))

    # Refuse anything that resolves outside the docs folder.
    $insideRoot = $path.Equals($Root, [StringComparison]::OrdinalIgnoreCase) -or
        $path.StartsWith("$Root\", [StringComparison]::OrdinalIgnoreCase)
    if (-not $insideRoot) {
        Send-Text $response 403 'Forbidden'
        return
    }

    if ([IO.Directory]::Exists($path)) {
        $path = [IO.Path]::Combine($path, 'index.html')
    }
    if (-not [IO.File]::Exists($path)) {
        Send-Text $response 404 'Not found'
        return
    }

    $bytes = [IO.File]::ReadAllBytes($path)
    $contentType = $contentTypes[[IO.Path]::GetExtension($path).ToLowerInvariant()]
    if (-not $contentType) {
        $contentType = 'application/octet-stream'
    }

    $response.StatusCode = 200
    $response.ContentType = $contentType
    $response.ContentLength64 = $bytes.Length
    # Always serve fresh files, so a browser refresh shows the latest edits.
    $response.Headers['Cache-Control'] = 'no-store'
    $response.OutputStream.Write($bytes, 0, $bytes.Length)
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")

Write-Host 'Starting server...'
try {
    $listener.Start()
}
catch {
    Write-Host "Could not start on port $Port - is the server already running? $($_.Exception.Message)"
    exit 1
}
Write-Host "Serving $Root at http://localhost:$Port/"

try {
    while ($listener.IsListening) {
        # Wait in short steps, because a blocking wait would ignore Ctrl+C.
        $pending = $listener.GetContextAsync()
        while (-not $pending.AsyncWaitHandle.WaitOne(200)) { }
        $context = $pending.GetAwaiter().GetResult()

        try {
            Send-File $context
        }
        catch {
            # Typically the browser cancelling a request; the server should keep running.
            Write-Host "Request failed: $($context.Request.Url) - $($_.Exception.Message)"
            $context.Response.StatusCode = 500
        }
        finally {
            try { $context.Response.Close() } catch { }
        }
    }
}
finally {
    $listener.Close()
}
