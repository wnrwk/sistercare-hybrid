#!/bin/bash

echo "===================================="
echo " 누나의 케어 룸 - 개발 모드 시작"
echo "===================================="
echo ""

# .env 파일 확인
if [ ! -f "server/.env" ]; then
    echo "[오류] server/.env 파일이 없습니다!"
    echo "server/.env.example 파일을 복사하여 server/.env 를 만들고"
    echo "GEMINI_API_KEY 를 입력해주세요."
    exit 1
fi

echo "개발 서버 시작 중..."
echo ""
echo "  - 프론트엔드: http://localhost:5173"
echo "  - 백엔드 API: http://localhost:3001"
echo ""
echo "종료하려면 Ctrl+C 를 누르세요"
echo ""

# 서버와 클라이언트 동시 실행
npx concurrently \
    --names "SERVER,CLIENT" \
    --prefix-colors "magenta,cyan" \
    "cd server && npx tsx watch src/index.ts" \
    "cd client && npx vite"
