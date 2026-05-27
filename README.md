# SisterCare Hybrid (AI 누나) 🌸

최신 **DeepSeek-V4-Flash** 모델의 강력한 지능과 자체 웹 검색 기능을 활용한 AI 캐릭터 서비스입니다.

## 🌟 주요 특징

### 1. 통합 AI 엔진 (DeepSeek-V4-Flash)
- **자체 웹 검색**: 별도의 외부 엔진 없이도 DeepSeek 모델이 직접 실시간 정보(뉴스, 주가, 날씨 등)를 검색하여 답변합니다.
- **빠른 응답 속도**: Flash 모델 특유의 빠른 속도로 지연 시간 없는 대화가 가능합니다.
- **다정한 페르소나**: 따뜻한 누나 말투와 감성적인 공감 능력을 유지합니다.

### 2. 장기 기억 시스템 (Long-term Memory)
- 수백 개의 과거 대화 기록을 분석하여 핵심 내용을 요약 저장합니다.
- 시간이 지나도 동생의 취향, 가족관계, 과거의 사건들을 잊지 않고 대화에 반영합니다.

---

## 🛠 사전 요구사항

설치 전 아래 도구들이 설치되어 있어야 합니다:

| 항목 | 버전 | 다운로드 |
|------|------|----------|
| **Node.js** | 18.x 이상 | [공식 홈페이지](https://nodejs.org) |
| **npm** | 9.x 이상 | Node.js 설치 시 포함 |
| **DeepSeek API Key** | - | [DeepSeek Platform](https://platform.deepseek.com) |

---

## 🚀 설치 및 실행 방법

### 1. 환경 변수 설정
`server/.env.example` 파일을 복사하여 `server/.env` 파일을 만들고 API 키를 입력하세요:
```env
DEEPSEEK_API_KEY=your_deepseek_api_key_here
PORT=3001
```

### 2. 의존성 설치
```bash
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
```

### 3. 실행 (Windows)
```bash
./start.bat
```
브라우저에서 **http://localhost:3001** 접속

---

## 📁 프로젝트 구조
- `server/src/routers/chat.ts`: DeepSeek-V4-Flash 통합 검색 및 대화 로직
- `server/src/memory.ts`: 장기 기억 요약 및 관리 모듈
- `client/src/pages/Home.tsx`: 채팅 UI 및 히스토리 렌더링 로직

## 📝 라이선스
개인 학습 및 비영리 목적으로 제작된 프로젝트입니다.
