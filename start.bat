@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

echo.
echo ====================================
echo  누나의 케어 룸 - 로컬 서버 시작
echo ====================================
echo.

if not exist "server\.env" (
    echo [오류] server\.env 파일이 없습니다!
    echo server\.env.example 파일을 복사하여 server\.env 를 만들고
    echo GEMINI_API_KEY 를 입력해주세요.
    echo.
    pause
    exit /b 1
)

echo [1/2] 클라이언트 빌드 중...
cd client
call npm run build
if errorlevel 1 (
    echo 클라이언트 빌드 실패!
    pause
    exit /b 1
)
cd ..

echo.
echo [2/2] 서버 시작 중...
echo.
echo 브라우저에서 http://localhost:3001 을 열어주세요
echo 종료하려면 Ctrl+C 를 누르세요
echo.
cd server
npx tsx src/index.ts
pause
