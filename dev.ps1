# Windows PowerShell 개발 모드 실행 스크립트
# 사용법: PowerShell -ExecutionPolicy Bypass -File dev.ps1

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host " 누나의 케어 룸 - 개발 모드 시작" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# .env 파일 확인
if (-not (Test-Path "server\.env")) {
    Write-Host "[오류] server\.env 파일이 없습니다!" -ForegroundColor Red
    Write-Host "server\.env.example 파일을 복사하여 server\.env 를 만들고" -ForegroundColor Yellow
    Write-Host "GEMINI_API_KEY 를 입력해주세요." -ForegroundColor Yellow
    exit 1
}

Write-Host "개발 서버 시작 중..." -ForegroundColor Green
Write-Host ""
Write-Host "  - 프론트엔드: http://localhost:5173" -ForegroundColor Cyan
Write-Host "  - 백엔드 API: http://localhost:3001" -ForegroundColor Cyan
Write-Host ""
Write-Host "종료하려면 Ctrl+C 를 누르세요" -ForegroundColor Yellow
Write-Host ""

# 두 개의 프로세스를 병렬로 실행
$server = Start-Process -NoNewWindow -PassThru -FilePath "npx" -ArgumentList "tsx", "watch", "src/index.ts" -WorkingDirectory "server"
$client = Start-Process -NoNewWindow -PassThru -FilePath "npx" -ArgumentList "vite" -WorkingDirectory "client"

# Ctrl+C 처리
try {
    Wait-Process -Id $server.Id, $client.Id
} finally {
    Stop-Process -Id $server.Id -ErrorAction SilentlyContinue
    Stop-Process -Id $client.Id -ErrorAction SilentlyContinue
}
