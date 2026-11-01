<#
  Cleans old logs.
#>
param([int]$Days = 30)

$limit = (Get-Date).AddDays(-$Days)
Get-ChildItem -Path "C:\logs" -Recurse |
  Where-Object { $_.LastWriteTime -lt $limit } |
  Remove-Item -Force
Write-Host "Removed logs older than $Days days" # done
