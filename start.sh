#!/bin/bash

echo "===================================="
echo " 누나의 케어 룸 - 로컬 서버 시작"
echo "===================================="
echo ""

# .env 파일 확인
if [ ! -f "server/.env" ]; then
    echo "[오류] server/.env 파일이 없습니다!"
    echo "server/.env.example 파일을 복사하여 server/.env 를 만들고"
    echo "GEMINI_API_KEY 를 입력해주세요."
    echo ""
    echo "  cp server/.env.example server/.env"
    echo "  # 그 후 server/.env 파일을 열어 GEMINI_API_KEY 값을 입력하세요"
    exit 1
fi

echo "[1/2] 클라이언트 빌드 중..."
cd client && npm run build
if [ $? -ne 0 ]; then
    echo "클라이언트 빌드 실패!"
    exit 1
fi
cd ..

echo ""
echo "[2/2] 서버 시작 중..."
echo ""
echo "브라우저에서 http://localhost:3001 을 열어주세요"
echo "종료하려면 Ctrl+C 를 누르세요"
echo ""
cd server && npx tsx src/index.ts
