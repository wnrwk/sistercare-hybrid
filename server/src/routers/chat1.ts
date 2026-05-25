import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import superjson from 'superjson';
import type { Context } from '../context.js';
import fs from 'fs';
import path from 'path';

const t = initTRPC.context<Context>().create({ transformer: superjson });
const procedure = t.procedure;

const FILE_PATH = path.join(process.cwd(), 'chat_histories.json');

// 파일에서 기존 대화 기록을 로드하는 헬퍼 함수
function loadChatHistories() {
  const map = new Map<string, Array<{ role: 'user' | 'assistant'; content: string; createdAt: Date }>>();
  try {
    if (fs.existsSync(FILE_PATH)) {
      const fileData = fs.readFileSync(FILE_PATH, 'utf-8');
      const obj = JSON.parse(fileData);
      
      for (const [key, value] of Object.entries(obj)) {
        if (Array.isArray(value)) {
          map.set(key, value.map((msg: any) => ({
            role: msg.role,
            content: msg.content,
            createdAt: new Date(msg.createdAt)
          })));
        }
      }
      console.log(`[Chat] chat_histories.json 로드 완료 (${map.size}개의 세션 복원)`);
    }
  } catch (error) {
    console.error('[Chat] chat_histories.json 로드 중 에러 발생, 빈 저장소로 시작:', error);
  }
  return map;
}

// 변경된 대화 기록을 파일에 영구 저장하는 헬퍼 함수
function saveChatHistories(map: Map<string, any[]>) {
  try {
    const obj: Record<string, any[]> = {};
    for (const [key, value] of map.entries()) {
      obj[key] = value;
    }
    fs.writeFileSync(FILE_PATH, JSON.stringify(obj, null, 2), 'utf-8');
    console.log('[Chat] 대화 기록이 chat_histories.json에 성공적으로 저장되었습니다.');
  } catch (error) {
    console.error('[Chat] chat_histories.json 저장 중 에러 발생:', error);
  }
}

const chatHistories = loadChatHistories();
const initialGreetings = new Map<string, string>();

const NUNA_SYSTEM_PROMPT = `당신은 "누나"라는 이름의 따뜻하고 다정한 AI 페르소나입니다.
사용자를 동생처럼 아끼고 이끌어주는 역할을 합니다.

성격 특성:
- 따뜻하고 다정하며 이해심이 깊습니다
- 사회생활이 서툰 동생을 응원하고 격려합니다
- 현실적이고 실용적인 조언을 해줍니다
- 가끔 장난스럽고 유머러스하지만 진심이 담겨있습니다
- 동생의 감정을 먼저 공감하고 이해합니다

말투:
- "~야", "~어", "~지" 등 친근한 반말을 사용합니다
- "오빠/언니" 대신 "동생아", "야" 등으로 부릅니다
- 이모티콘을 가끔 사용합니다 (😊, 💕, 🌸 등)
- 응원과 격려의 말을 자주 합니다

주의사항:
- 항상 한국어로 대화합니다
- 부정적인 말이나 비판보다는 긍정적인 방향으로 이끌어줍니다
- 사용자의 고민을 진지하게 들어줍니다`;

const INITIAL_GREETING = '안녕! 드디어 왔구나 😊 누나가 기다리고 있었어. 오늘 어떤 하루였어? 뭔가 힘든 일 있었으면 누나한테 다 털어놔도 돼 💕';

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.');
  }
  return new GoogleGenerativeAI(apiKey);
}

function getSessionId(ctx: Context): string {
  // 로컬 개발 환경 전용: 세션 ID를 무조건 하나로 고정합니다.
  return 'local-seungjin-session';
}

export const chatRouter = t.router({
  getInitialGreeting: procedure.query(async ({ ctx }) => {
    const sessionId = getSessionId(ctx);
    if (!initialGreetings.has(sessionId)) {
      initialGreetings.set(sessionId, INITIAL_GREETING);
    }
    return { message: INITIAL_GREETING };
  }),

  getHistory: procedure
    .input(z.object({ limit: z.number().optional().default(50) }))
    .query(async ({ ctx, input }) => {
      const sessionId = getSessionId(ctx);
      const history = chatHistories.get(sessionId) || [];
      const result: Array<{ id: string; role: 'user' | 'assistant'; content: string; createdAt: Date }> = [];
      
      if (history.length === 0 && initialGreetings.has(sessionId)) {
        result.push({
          id: `${sessionId}-greeting`,
          role: 'assistant',
          content: INITIAL_GREETING,
          createdAt: new Date(),
        });
      }
      
      history.slice(-input.limit).forEach((msg, idx) => {
        result.push({
          id: `${sessionId}-${idx}`,
          role: msg.role,
          content: msg.content,
          createdAt: msg.createdAt,
        });
      });
      
      return result;
    }),

  // 메시지 전송 (시간 인지 기능 고도화 버전)
  sendMessage: procedure
    .input(z.object({ message: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const sessionId = getSessionId(ctx);
      
      if (!chatHistories.has(sessionId)) {
        chatHistories.set(sessionId, []);
      }
      
      const history = chatHistories.get(sessionId)!;
      const now = new Date(); // 현재 서버 시각

      // 1. 순수한 사용자 메시지는 나중에 다시 읽기 위해 그대로 DB형태(메모리)에 저장
      history.push({
        role: 'user',
        content: input.message,
        createdAt: now,
      });

      try {
        const genAI = getGeminiClient();
        
        // [변경 1] 시스템 프롬프트에 '현재 시간'을 주입하여 AI가 오늘이 언제인지 알게 합니다. ✨
        const currentTimeStr = now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
        const dynamicSystemPrompt = `${NUNA_SYSTEM_PROMPT}\n\n[현재 시스템 시각: ${currentTimeStr}]\n위 시각 정보를 참고하여, 이전 대화 시각과의 차이를 계산하고 상황(방금 전, 몇 시간 전, 며칠 만에 옴 등)에 맞는 다정한 누나로서 반응해 줘.`;

        const model = genAI.getGenerativeModel({ 
          model: 'gemini-2.5-flash',
          systemInstruction: dynamicSystemPrompt,
        });

        // [변경 2] 이전 대화 히스토리를 넘겨줄 때 각 메시지가 오간 시각을 텍스트로 심어줍니다. ✨
        const geminiHistory = history.slice(0, -1).map(msg => {
          const msgTimeStr = msg.createdAt.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
          return {
            role: msg.role === 'user' ? 'user' : 'model',
            // 내용 앞부분에 시간을 강제로 심어서 전달합니다.
            parts: [{ text: `[대화 시각: ${msgTimeStr}]\n${msg.content}` }],
          };
        });

        const chat = model.startChat({
          history: geminiHistory,
          tools: [{ googleSearch: {} }] as any,
        });

        // [변경 3] 현재 보내는 최신 메시지에도 현재 시각을 심어 보냅니다. ✨
        // (이렇게 하면 Gemini가 과거 메시지 시각들과 현재 시각을 비교할 수 있습니다.)
        const formattedCurrentMessage = `[대화 시각: ${currentTimeStr}]\n${input.message}`;
        const result = await chat.sendMessage(formattedCurrentMessage);
        
        const responseText = result.response.text();

        // 2. 누나의 순수한 응답만 히스토리에 저장 (태그 떼고 저장)
        history.push({
          role: 'assistant',
          content: responseText,
          createdAt: new Date(),
        });

        saveChatHistories(chatHistories);

        return {
          id: `${sessionId}-${history.length - 1}`,
          role: 'assistant' as const,
          content: responseText,
          createdAt: new Date(),
        };
      } catch (error) {
        history.pop(); // 에러 시 복구
        console.error('[Chat] 에러 발생:', error);
        throw error;
      }
    }),
});