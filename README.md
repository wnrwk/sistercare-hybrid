# 누나의 케어 룸 - 로컬 실행 가이드

> 사용자를 동생처럼 아끼고 이끌어주는 따뜻한 누나 AI 페르소나와 대화하는 웹 애플리케이션입니다.
> Gemini API를 사용하여 로컬 PC에서 직접 실행할 수 있습니다.

---

## 사전 요구사항

| 항목 | 버전 | 다운로드 |
|------|------|----------|
| Node.js | 18 이상 | https://nodejs.org |
| npm | 9 이상 | Node.js 설치 시 포함 |
| Gemini API 키 | - | https://aistudio.google.com/app/apikey |

---

## 1단계: Gemini API 키 발급

1. [Google AI Studio](https://aistudio.google.com/app/apikey)에 접속합니다.
2. Google 계정으로 로그인합니다.
3. **"Create API key"** 버튼을 클릭합니다.
4. 생성된 API 키를 복사합니다.

---

## 2단계: 환경 변수 설정

`server/.env.example` 파일을 복사하여 `server/.env` 파일을 만듭니다.

**Windows:**
```cmd
copy server\.env.example server\.env
```

**macOS / Linux:**
```bash
cp server/.env.example server/.env
```

그 후 `server/.env` 파일을 텍스트 편집기로 열어 API 키를 입력합니다:

```env
GEMINI_API_KEY=여기에_발급받은_API_키_입력
PORT=3001
SESSION_SECRET=임의의_긴_문자열_입력
```

---

## 3단계: 의존성 설치

프로젝트 루트 디렉토리에서 아래 명령어를 실행합니다:

```bash
# 루트 의존성 설치
npm install

# 서버 의존성 설치
cd server && npm install && cd ..

# 클라이언트 의존성 설치
cd client && npm install && cd ..
```

---

## Windows 사용자 주의

**Windows에서 실행 시 문제가 발생하면** `WINDOWS_GUIDE.md` 파일을 참고하세요.

---

## 4단계: 실행

### 방법 A: 프로덕션 모드 (권장)

클라이언트를 빌드하고 단일 서버로 실행합니다.

**Windows:**
```cmd
start.bat
```

**macOS / Linux:**
```bash
./start.sh
```

브라우저에서 **http://localhost:3001** 을 열면 됩니다.

---

### 방법 B: 개발 모드 (코드 수정 시)

서버와 클라이언트를 각각 핫 리로드로 실행합니다.

**macOS / Linux:**
```bash
./dev.sh
```

**Windows (두 개의 터미널 창 사용):**

터미널 1 (서버):
```cmd
cd server
npx tsx watch src/index.ts
```

터미널 2 (클라이언트):
```cmd
cd client
npx vite
```

브라우저에서 **http://localhost:5173** 을 열면 됩니다.

---

## 주요 기능

| 기능 | 설명 | 사용 API |
|------|------|----------|
| AI 채팅 | 따뜻한 누나 페르소나와 대화 | Gemini 2.5 Flash |
| 이미지 생성 | 누나 캐릭터 이미지 생성 | Gemini 2.0 Flash (이미지 생성) |
| 음성 합성 | 누나의 목소리로 메시지 읽기 | Gemini 2.5 Flash TTS |

---

## 프로젝트 구조

```
sistercare-local/
├── server/                  # 백엔드 (Node.js + Express + tRPC)
│   ├── src/
│   │   ├── index.ts         # 서버 진입점
│   │   ├── context.ts       # tRPC 컨텍스트
│   │   └── routers/
│   │       ├── index.ts     # 라우터 통합
│   │       ├── chat.ts      # 채팅 API (Gemini)
│   │       ├── images.ts    # 이미지 생성 API
│   │       ├── voice.ts     # 음성 합성 API
│   │       └── auth.ts      # 세션 인증
│   ├── .env                 # 환경 변수 (직접 생성 필요)
│   └── .env.example         # 환경 변수 예제
├── client/                  # 프론트엔드 (React + TypeScript + TailwindCSS)
│   ├── src/
│   │   ├── main.tsx         # 앱 진입점
│   │   ├── App.tsx          # 라우터
│   │   ├── lib/trpc.ts      # tRPC 클라이언트
│   │   └── pages/
│   │       ├── Home.tsx     # 메인 채팅 페이지
│   │       └── NotFound.tsx # 404 페이지
│   └── dist/                # 빌드 결과물 (자동 생성)
├── start.sh                 # macOS/Linux 실행 스크립트
├── start.bat                # Windows 실행 스크립트
└── README.md                # 이 파일
```

---

## 문제 해결

**Q: `GEMINI_API_KEY가 설정되지 않았습니다` 오류가 발생합니다.**
- `server/.env` 파일이 존재하는지 확인하세요.
- `.env` 파일 내 `GEMINI_API_KEY=` 뒤에 API 키가 올바르게 입력되었는지 확인하세요.

**Q: 포트 3001이 이미 사용 중입니다.**
- `server/.env` 파일에서 `PORT=3002` 와 같이 다른 포트로 변경하세요.

**Q: 이미지 생성이 실패합니다.**
- Gemini 이미지 생성 API는 별도의 API 활성화가 필요할 수 있습니다.
- [Google AI Studio](https://aistudio.google.com)에서 이미지 생성 기능이 활성화되어 있는지 확인하세요.

**Q: 음성 합성이 실패합니다.**
- Gemini TTS API는 현재 프리뷰 단계입니다. API 키 계정에서 해당 기능이 지원되는지 확인하세요.
