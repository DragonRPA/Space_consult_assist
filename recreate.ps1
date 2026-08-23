$path = 'C:\Users\이정용\.gemini\antigravity\brain\d6b9a579-81fe-46cd-96d5-753dc6f1290d\scratch\init_project.ps1'
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
Invoke-Expression $content
