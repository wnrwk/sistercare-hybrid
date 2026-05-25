# SisterCare Hybrid (AI 누나) 🌸

DeepSeek의 감성적인 대화 능력과 Gemini의 강력한 구글 검색 기능을 결합한 하이브리드 AI 캐릭터 서비스입니다.

## 🌟 주요 특징

### 1. 하이브리드 뇌 (Hybrid Brain System)
- **메인 엔진 (DeepSeek)**: 누나의 따뜻한 페르소나와 동생과의 일상적인 대화, 고민 상담을 담당합니다.
- **검색 엔진 (Gemini 2.5 Flash)**: 실시간 정보(뉴스, 주가, 날씨 등)가 필요한 질문이 들어오면 자동으로 전환되어 구글 검색을 수행합니다.
- **지능형 스위칭**: 질문의 성격을 AI가 스스로 판단하여 최적의 모델로 답변합니다.

### 2. 장기 기억 시스템 (Long-term Memory)
- 수백 개의 과거 대화 기록을 분석하여 핵심 내용을 요약 저장합니다.
- 시간이 지나도 동생의 취향, 가족관계, 과거의 사건들을 잊지 않고 대화에 반영합니다.
- 대화가 20개 쌓일 때마다 스스로 기억을 업데이트합니다.

### 3. 실시간 구글 검색 연동
- "오늘 코스피 지수 알려줘", "이번 주말 날씨 어때?" 같은 질문에 대해 실제 실시간 데이터를 바탕으로 답변합니다.
- "누나가 방금 스마트폰으로 찾아봤는데~"와 같은 자연스러운 페르소나를 유지합니다.

## 🛠 설치 및 실행 방법

### 환경 설정
`server/.env` 파일을 생성하고 다음 키를 입력하세요:
```env
DEEPSEEK_API_KEY=your_deepseek_api_key
GEMINI_API_KEY=your_gemini_api_key
```

### 서버 실행
```bash
cd server
npm install
npm run dev
```

### 클라이언트 실행
```bash
cd client
npm install
npm run dev
```

## 📁 프로젝트 구조
- `server/src/routers/chat.ts`: 하이브리드 뇌 및 검색 로직 핵심 코드
- `server/src/memory.ts`: 장기 기억 요약 및 관리 모듈
- `client/src/pages/Home.tsx`: 채팅 UI 및 히스토리 렌더링 로직

## 📝 라이선스
개인 학습 및 비영리 목적으로 제작된 프로젝트입니다.
