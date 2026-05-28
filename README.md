# SisterCare Hybrid (DeepSeek V4 + Time Intelligence) 😊🌸

누나가 동생을 아끼는 마음으로 대화하고, 과거의 추억을 기억하며, 최신 정보와 정확한 시간까지 알려주는 다정한 AI 서비스입니다.

## 주요 기능 ✨

1. **DeepSeek-V4-Flash 엔진**: 최신 모델을 사용하여 더 똑똑하고 빠른 대화가 가능합니다.
2. **장기 기억 시스템 (Long-term Memory)**: 동생과의 수백 개의 대화를 요약하여 '누나의 일기장'에 저장합니다. 시간이 지나도 소중한 추억을 잊지 않습니다.
3. **지능형 시간 인식 (Time Intelligence)**: 
   - **Function Calling**: `get_current_time` 도구를 통해 전 세계 어디든 정확한 현재 시각을 알려줍니다.
   - **타임스탬프**: 모든 대화에 시간이 기록되어 대화의 흐름과 간격을 인지합니다.
4. **실시간 웹 검색**: 최신 뉴스, 주가, 날씨 등이 궁금할 때 누나가 직접 인터넷을 찾아보고 다정하게 알려줍니다.
5. **인메모리 캐싱 최적화**: 대화 기록을 램(RAM)에서 처리하여 답변 속도가 매우 빠릅니다.

## 시작하기 🚀

### 사전 요구사항
- **Node.js**: v18 이상 추천
- **npm** 또는 **pnpm**
- **DeepSeek API Key**: [DeepSeek Platform](https://platform.deepseek.com/)에서 발급 가능

### 설치 및 실행

1. **저장소 클론**
   ```bash
   git clone https://github.com/wnrwk/sistercare-deepseek.git
   cd sistercare-deepseek
   ```

2. **의존성 설치**
   ```bash
   # 서버 설정
   cd server
   npm install
   
   # 클라이언트 설정
   cd ../client
   npm install
   ```

3. **환경 변수 설정**
   `server` 폴더 안에 `.env` 파일을 만들고 아래 내용을 입력하세요.
   ```env
   DEEPSEEK_API_KEY=your_api_key_here
   ```

4. **실행**
   ```bash
   # 서버 실행 (server 폴더에서)
   npm run dev
   
   # 클라이언트 실행 (client 폴더에서)
   npm run dev
   ```

## 기술 스택 🛠
- **Frontend**: Vite, React, TailwindCSS, tRPC Client
- **Backend**: Node.js, tRPC Server, OpenAI SDK (DeepSeek 연동)
- **Database**: JSON File System (In-memory Caching)

누나와 함께 따뜻한 대화 나누시길 바랍니다! 😊💕
