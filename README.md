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

### 3. 실시간 구글 검색 연동
- "오늘 코스피 지수 알려줘", "이번 주말 날씨 어때?" 같은 질문에 대해 실제 실시간 데이터를 바탕으로 답변합니다.

---

## 🛠 사전 요구사항

설치 전 아래 도구들이 설치되어 있어야 합니다:

| 항목 | 버전 | 다운로드 |
|------|------|----------|
| **Node.js** | 18.x 이상 | [공식 홈페이지](https://nodejs.org) |
| **npm** | 9.x 이상 | Node.js 설치 시 포함 |
| **DeepSeek API Key** | - | [DeepSeek Platform](https://platform.deepseek.com) |
| **Gemini API Key** | - | [Google AI Studio](https://aistudio.google.com/app/apikey) |

---

## 🚀 설치 및 실행 방법

### 1. 환경 변수 설정
`server/.env.example` 파일을 복사하여 `server/.env` 파일을 만들고 API 키를 입력하세요:
```env
DEEPSEEK_API_KEY=your_deepseek_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3001
```

### 2. 의존성 설치
```bash
# 루트 및 서버, 클라이언트 의존성 한꺼번에 설치
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
```

### 3. 실행 (Windows)
```bash
# 서버와 클라이언트를 동시에 실행하는 배치 파일
./start.bat
```
브라우저에서 **http://localhost:3001** 접속

---

## 📁 프로젝트 구조
- `server/src/routers/chat.ts`: 하이브리드 뇌 및 검색 로직 핵심 코드
- `server/src/memory.ts`: 장기 기억 요약 및 관리 모듈
- `client/src/pages/Home.tsx`: 채팅 UI 및 히스토리 렌더링 로직

## 📝 라이선스
개인 학습 및 비영리 목적으로 제작된 프로젝트입니다.
