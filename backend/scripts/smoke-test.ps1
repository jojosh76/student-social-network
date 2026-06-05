param(
    [string]$BaseUrl = "http://localhost:3100"
)

$ErrorActionPreference = "Stop"

function Invoke-Json {
    param(
        [string]$Method,
        [string]$Url,
        [object]$Body = $null,
        [string]$Token = $null
    )

    $headers = @{ "Content-Type" = "application/json" }
    if ($Token) {
        $headers["Authorization"] = "Bearer $Token"
    }

    $params = @{
        Method = $Method
        Uri = $Url
        Headers = $headers
    }

    if ($Body) {
        $params.Body = ($Body | ConvertTo-Json -Depth 8)
    }

    Invoke-RestMethod @params
}

function Invoke-FileUpload {
    param(
        [string]$Url,
        [string]$Token,
        [string]$Path
    )

    Add-Type -AssemblyName System.Net.Http
    $client = [System.Net.Http.HttpClient]::new()
    $content = [System.Net.Http.MultipartFormDataContent]::new()

    try {
        $client.DefaultRequestHeaders.Authorization = [System.Net.Http.Headers.AuthenticationHeaderValue]::new("Bearer", $Token)
        $bytes = [System.IO.File]::ReadAllBytes($Path)
        $fileContent = [System.Net.Http.ByteArrayContent]::new($bytes)
        $fileContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse("image/png")
        $content.Add($fileContent, "file", [System.IO.Path]::GetFileName($Path))

        $response = $client.PostAsync($Url, $content).Result
        $body = $response.Content.ReadAsStringAsync().Result
        if (-not $response.IsSuccessStatusCode) {
            throw "Upload failed: $($response.StatusCode) $body"
        }
        $body | ConvertFrom-Json
    }
    finally {
        $content.Dispose()
        $client.Dispose()
    }
}

Write-Host "Testing gateway health..."
Invoke-Json -Method GET -Url "$BaseUrl/health" | Out-Null

$stamp = Get-Date -Format "yyyyMMddHHmmss"
$email = "smoke-$stamp@ictuniversity.edu.cm"
$friendEmail = "smoke-friend-$stamp@ictuniversity.edu.cm"
$password = "Password123!"

Write-Host "Registering test user $email..."
$register = Invoke-Json -Method POST -Url "$BaseUrl/api/auth/register" -Body @{
    firstName = "Smoke"
    lastName = "Tester"
    academicInfo = @{
        major = "Software Architecture"
        year = "L3"
    }
    credentials = @{
        email = $email
        password = $password
    }
}

$token = $register.token
$userId = $register.user.id
if (-not $token) {
    throw "Registration did not return a token."
}

Write-Host "Registering friend user $friendEmail..."
$friendRegister = Invoke-Json -Method POST -Url "$BaseUrl/api/auth/register" -Body @{
    firstName = "Smoke"
    lastName = "Friend"
    academicInfo = @{
        major = "ICT"
        year = "L3"
    }
    credentials = @{
        email = $friendEmail
        password = $password
    }
}
$friendId = $friendRegister.user.id

Write-Host "Checking current user..."
Invoke-Json -Method GET -Url "$BaseUrl/api/auth/me" -Token $token | Out-Null

Write-Host "Creating a post..."
$post = Invoke-Json -Method POST -Url "$BaseUrl/api/posts" -Token $token -Body @{
    content = "Smoke test post"
    type = "general"
}

Write-Host "Liking the post..."
Invoke-Json -Method POST -Url "$BaseUrl/api/posts/$($post.id)/like" -Token $token -Body @{} | Out-Null

Write-Host "Adding a comment..."
Invoke-Json -Method POST -Url "$BaseUrl/api/posts/$($post.id)/comments" -Token $token -Body @{
    content = "Smoke test comment"
} | Out-Null

Write-Host "Loading comments..."
Invoke-Json -Method GET -Url "$BaseUrl/api/posts/$($post.id)/comments" -Token $token | Out-Null

Write-Host "Adding a friend..."
Invoke-Json -Method POST -Url "$BaseUrl/api/users/$friendId/follow" -Token $token -Body @{} | Out-Null

Write-Host "Creating a group conversation..."
$conversation = Invoke-Json -Method POST -Url "$BaseUrl/api/conversations" -Token $token -Body @{
    title = "Smoke Group $stamp"
    participantIds = @($friendId)
}

$imagePath = Join-Path $env:TEMP "studnet-smoke-$stamp.png"
[System.IO.File]::WriteAllBytes($imagePath, [Convert]::FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII="))

Write-Host "Uploading an image file..."
$uploaded = Invoke-FileUpload -Url "$BaseUrl/api/upload" -Token $token -Path $imagePath

Write-Host "Sending text and uploaded image messages..."
Invoke-Json -Method POST -Url "$BaseUrl/api/conversations/$($conversation.id)/messages" -Token $token -Body @{
    text = "Smoke group message"
} | Out-Null
Invoke-Json -Method POST -Url "$BaseUrl/api/conversations/$($conversation.id)/messages" -Token $token -Body @{
    text = "Smoke image message"
    imageUrl = $uploaded.url
} | Out-Null

Write-Host "Loading conversation messages..."
Invoke-Json -Method GET -Url "$BaseUrl/api/conversations/$($conversation.id)/messages" -Token $token | Out-Null

Write-Host "Creating an event..."
$createdEvent = Invoke-Json -Method POST -Url "$BaseUrl/api/events" -Token $token -Body @{
    title = "Smoke Event $stamp"
    description = "Created by smoke test"
    category = "evenement"
    location = "Campus"
    startsAt = (Get-Date).AddDays(1).ToString("s")
}

Write-Host "Loading events..."
$events = Invoke-Json -Method GET -Url "$BaseUrl/api/events/upcoming" -Token $token
if ($events.Count -gt 0) {
    Write-Host "Joining event $($createdEvent.id)..."
    Invoke-Json -Method POST -Url "$BaseUrl/api/events/$($createdEvent.id)/join" -Token $token -Body @{} | Out-Null
}

Write-Host "Loading notifications..."
Invoke-Json -Method GET -Url "$BaseUrl/api/notifications" -Token $token | Out-Null

Write-Host "Smoke test passed."
