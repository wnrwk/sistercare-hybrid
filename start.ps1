# Windows PowerShell 실행 스크립트
# 사용법: PowerShell -ExecutionPolicy Bypass -File start.ps1

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host " 누나의 케어 룸 - 로컬 서버 시작" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# .env 파일 확인
if (-not (Test-Path "server\.env")) {
    Write-Host "[오류] server\.env 파일이 없습니다!" -ForegroundColor Red
    Write-Host "server\.env.example 파일을 복사하여 server\.env 를 만들고" -ForegroundColor Yellow
    Write-Host "GEMINI_API_KEY 를 입력해주세요." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "계속하려면 Enter를 누르세요"
    exit 1
}

Write-Host "[1/2] 클라이언트 빌드 중..." -ForegroundColor Green
Set-Location client
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "클라이언트 빌드 실패!" -ForegroundColor Red
    Read-Host "계속하려면 Enter를 누르세요"
    exit 1
}
Set-Location ..

Write-Host ""
Write-Host "[2/2] 서버 시작 중..." -ForegroundColor Green
Write-Host ""
Write-Host "브라우저에서 http://localhost:3001 을 열어주세요" -ForegroundColor Cyan
Write-Host "종료하려면 Ctrl+C 를 누르세요" -ForegroundColor Yellow
Write-Host ""

Set-Location server
npx tsx src/index.ts
