# Windows에서 누나의 케어 룸 실행하기

Windows 환경에서 프로젝트를 실행하는 방법을 설명합니다.

## 1단계: 필수 프로그램 설치

### Node.js 설치
1. [nodejs.org](https://nodejs.org) 에서 LTS 버전을 다운로드합니다
2. 설치 마법사를 따라 설치합니다 (기본 설정으로 진행하면 됩니다)
3. 설치 후 명령 프롬프트를 열고 다음을 입력하여 확인합니다:
   ```cmd
   node --version
   npm --version
   ```

## 2단계: 환경 변수 설정

1. `server` 폴더를 엽니다
2. `server\.env.example` 파일을 복사합니다
3. 복사한 파일의 이름을 `.env` 로 변경합니다
4. `.env` 파일을 메모장으로 엽니다
5. `GEMINI_API_KEY=` 뒤에 발급받은 API 키를 입력합니다:
   ```
   GEMINI_API_KEY=your_api_key_here
   PORT=3001
   SESSION_SECRET=my-secret-key
   ```
6. 파일을 저장합니다

## 3단계: 의존성 설치

1. 프로젝트 폴더(`sistercare-local`)를 열고 주소창에 `cmd` 를 입력하여 명령 프롬프트를 엽니다
2. 다음 명령어들을 순서대로 입력합니다:
   ```cmd
   npm install
   cd server && npm install && cd ..
   cd client && npm install && cd ..
   ```

## 4단계: 실행 방법

### 방법 1: 배치 파일 사용 (권장)

**프로덕션 모드:**
1. `start.bat` 파일을 더블클릭합니다
2. 브라우저에서 `http://localhost:3001` 을 엽니다

**개발 모드:**
1. `dev.bat` 파일을 더블클릭합니다
2. 브라우저에서 `http://localhost:5173` 을 엽니다

### 방법 2: PowerShell 사용

**프로덕션 모드:**
1. PowerShell을 관리자 권한으로 엽니다
2. 프로젝트 폴더로 이동합니다
3. 다음 명령어를 입력합니다:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
   .\start.ps1
   ```

**개발 모드:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
.\dev.ps1
```

### 방법 3: 명령 프롬프트 사용

**프로덕션 모드:**
1. 명령 프롬프트를 엽니다
2. 프로젝트 폴더로 이동합니다
3. 다음 명령어를 입력합니다:
   ```cmd
   cd client && npm run build && cd ..
   cd server && npx tsx src/index.ts
   ```

**개발 모드 (두 개의 터미널 창 필요):**

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

## 문제 해결

### 문제: "Node.js를 찾을 수 없습니다" 오류
**해결책:** Node.js를 다시 설치하고 컴퓨터를 재부팅합니다

### 문제: 포트 3001이 이미 사용 중입니다
**해결책:** 
1. `server\.env` 파일을 메모장으로 엽니다
2. `PORT=3001` 을 `PORT=3002` 로 변경합니다
3. 저장하고 다시 실행합니다

### 문제: "GEMINI_API_KEY가 설정되지 않았습니다" 오류
**해결책:**
1. `server\.env` 파일이 존재하는지 확인합니다
2. 파일 내용이 다음과 같은지 확인합니다:
   ```
   GEMINI_API_KEY=your_actual_api_key
   PORT=3001
   SESSION_SECRET=secret
   ```
3. 파일을 저장하고 다시 실행합니다

### 문제: 배치 파일 실행 시 인코딩 오류
**해결책:** PowerShell 스크립트를 사용하세요
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
.\start.ps1
```

### 문제: "npm: 명령을 찾을 수 없습니다"
**해결책:** 
1. 명령 프롬프트를 닫고 다시 엽니다
2. Node.js를 재설치합니다
3. 컴퓨터를 재부팅합니다

## 팁

- **빠른 시작:** `start.bat` 또는 `start.ps1` 을 사용하는 것이 가장 간단합니다
- **개발 중:** `dev.ps1` 을 사용하면 코드 변경 시 자동으로 새로고침됩니다
- **포트 변경:** `server\.env` 파일에서 `PORT` 값을 변경할 수 있습니다
- **로그 확인:** 터미널에서 에러 메시지를 확인하면 문제 해결에 도움이 됩니다

## 다음 단계

정상적으로 실행되면:
1. 브라우저에서 `http://localhost:3001` 을 엽니다
2. "누나와 대화 시작하기" 버튼을 클릭합니다
3. 누나와 대화를 나눕니다

배포 방법은 프로젝트 루트의 `README.md` 파일을 참고하세요.
