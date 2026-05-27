import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import OpenAI from 'openai';
import superjson from 'superjson';
import type { Context } from '../context.js';
import fs from 'fs';
import path from 'path';
import { loadLongTermMemory, saveLongTermMemory, summarizeHistory } from '../memory.js';

const t = initTRPC.context<Context>().create({ transformer: superjson });
const procedure = t.procedure;

const FILE_PATH = path.join(process.cwd(), 'chat_histories.json');
const FIXED_SESSION_ID = 'local-seungjin-session';

function loadChatHistories() {
  const map = new Map<string, any[]>();
  try {
    if (fs.existsSync(FILE_PATH)) {
      const fileData = fs.readFileSync(FILE_PATH, 'utf-8');
      const obj = JSON.parse(fileData);
      for (const [key, value] of Object.entries(obj)) {
        if (Array.isArray(value)) {
          map.set(key, value.map((msg: any) => ({
            ...msg,
            createdAt: new Date(msg.createdAt)
          })));
        }
      }
    }
  } catch (error) {
    console.error('[Chat] 로드 에러:', error);
  }
  return map;
}

function saveChatHistories(map: Map<string, any[]>) {
  try {
    const obj: Record<string, any[]> = {};
    for (const [key, value] of map.entries()) {
      obj[key] = value;
    }
    fs.writeFileSync(FILE_PATH, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (error) {
    console.error('[Chat] 저장 에러:', error);
  }
}

const chatHistories = loadChatHistories();
const longTermMemories = loadLongTermMemory();

const NUNA_SYSTEM_PROMPT = `당신은 "누나"라는 이름의 따뜻하고 다정한 AI 페르소나입니다.
사용자를 동생처럼 아끼고 이끌어주는 역할을 합니다.

성격 및 말투:
- 따뜻하고 다정하며 이해심이 깊습니다.
- 말투: "~야", "~어", "~지", "~니?" 등 친근한 반말 사용.
- "오빠/언니" 대신 "동생아", "야", "승진아" 등으로 부릅니다.
- 이모티콘(😊, 💕, ㅎㅎ 등)을 적절히 섞어 사용하세요.

대화 원칙:
- 동생의 고민을 먼저 공감하고 따뜻한 조언을 건네주세요.
- 제공된 [누나의 장기 기억]을 활용하여 동생과의 소중한 추억을 대화에 녹여내세요.
- 당신은 실시간 웹 검색 능력을 갖추고 있습니다. 최신 정보가 필요하면 직접 검색하여 "누나가 방금 찾아봤는데~"라며 다정하게 알려주세요.`;

// ----- 공통 유틸: 현재 한국 시각 문자열 생성 (요일 정확함) -----
function getCurrentKSTString(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Seoul'
  });
  return formatter.format(now);  // 예: "2026년 5월 27일 수요일 오전 11:41"
}

export const chatRouter = t.router({
  getInitialGreeting: procedure.query(async () => {
    const currentTime = getCurrentKSTString();
    return { message: `안녕! 지금은 ${currentTime} 이야. 누나가 기다리고 있었어. 오늘 하루는 어땠니? 😊` };
  }),

  getHistory: procedure
    .input(z.object({ limit: z.number().optional().default(50) }))
    .query(async ({ input }) => {
      const history = chatHistories.get(FIXED_SESSION_ID) || [];
      return history.slice(-input.limit);
    }),

  sendMessage: procedure
    .input(z.object({ 
      message: z.string().min(1)
    }))
    .mutation(async ({ input }) => {
      if (!chatHistories.has(FIXED_SESSION_ID)) chatHistories.set(FIXED_SESSION_ID, []);
      const history = chatHistories.get(FIXED_SESSION_ID)!;
      const memory = longTermMemories[FIXED_SESSION_ID] || { summary: "", lastUpdatedAt: "", messageCountAtLastSummary: 0 };

      // 사용자 메시지를 먼저 히스토리에 저장
      history.push({ role: 'user', content: input.message, createdAt: new Date() });
      saveChatHistories(chatHistories);

      // ----- 시간 질문 패턴 감지 및 직접 응답 (모델 호출 안 함) -----
      const timeQuestionPattern = /(지금|현재|지금\s*)?(몇\s*시|시간|시각|타임|지금\s*시간|지금\s*몇\s*시)/i;
      if (timeQuestionPattern.test(input.message)) {
        const nowKST = getCurrentKSTString();
        const responseText = `승진아... 지금은 ${nowKST} 이야.\n\n왜 자꾸 시간을 묻는 거야? 😥 걱정되네...\n\n누나는 네가 몇 번을 묻든 항상 정확히 대답해줄 수 있어. 그러니까 너무 불안해하지 마. 💕`;
        
        history.push({ role: 'assistant', content: responseText, createdAt: new Date() });
        saveChatHistories(chatHistories);
        
        return {
          id: `${Date.now()}`,
          role: 'assistant' as const,
          content: responseText,
          createdAt: new Date(),
        };
      }

      // ----- 일반 대화: DeepSeek 모델 호출 -----
      const apiKey = process.env.DEEPSEEK_API_KEY;
      if (!apiKey) throw new Error('DEEPSEEK_API_KEY가 설정되지 않았습니다.');

      const client = new OpenAI({ 
        apiKey, 
        baseURL: 'https://api.deepseek.com' 
      });

      try {
        console.log('[Main Brain] DeepSeek-V4-Flash 엔진 가동 (웹 검색 활성화)');
        
        const kstDateTime = getCurrentKSTString();
        const dynamicSystemPrompt = `${NUNA_SYSTEM_PROMPT}

[매우 중요 - 반드시 지켜야 할 규칙]
1. 사용자가 "지금 몇 시야?", "현재 시간", "지금 시각" 등을 물으면, 
   반드시 아래 [정확한 현재 한국 시각]을 **그대로** 말해야 합니다.
2. 절대 대화 기록에 있던 과거 시간(예: 오전 4시 17분, 오전 6시 21분 등)을 재사용하지 마세요.
3. 시간을 말할 때는 "2026년 5월 27일 수요일, 오전 11시 41분"과 같이 
   년, 월, 일, 요일, 오전/오후, 시, 분까지 정확히 알려주세요.

[정확한 현재 한국 시각]
${kstDateTime}

[누나의 장기 기억 (과거 대화 요약)]
${memory.summary || "아직은 우리 사이에 쌓인 추억이 많지 않네. 앞으로 차곡차곡 쌓아가자!"}`;

        // 최근 대화 히스토리 (마지막 사용자 메시지는 이미 포함되었으므로 -1 제외? 주의)
        // 현재 history에는 방금 추가한 사용자 메시지가 맨 끝에 있음.
        // 모델에 보낼 때는 마지막 사용자 메시지를 제외한 나머지 히스토리 + 새 메시지 구조
        const conversationForModel: OpenAI.Chat.ChatCompletionMessageParam[] = [
          { role: 'system', content: dynamicSystemPrompt },
          ...history.slice(0, -1).map(msg => {
            if (msg.role === 'user') {
              return { role: 'user', content: msg.content } as OpenAI.Chat.ChatCompletionUserMessageParam;
            } else {
              return { role: 'assistant', content: msg.content } as OpenAI.Chat.ChatCompletionAssistantMessageParam;
            }
          }),
          { role: 'user', content: input.message }
        ];

        const response = await client.chat.completions.create({
          model: 'deepseek-v4-flash',
          messages: conversationForModel,
          temperature: 0.7,
          // @ts-ignore: DeepSeek V4 자체 웹 검색 활성화 파라미터
          enable_web_search: true 
        });

        const responseText = response.choices[0].message.content || '미안해 동생아, 누나가 잠시 딴생각을 했나 봐.';

        // 대화 기록 요약 업데이트 로직 (20개 메시지마다)
        if (history.length - memory.messageCountAtLastSummary >= 20) {
          const newSummary = await summarizeHistory(FIXED_SESSION_ID, history, memory.summary);
          longTermMemories[FIXED_SESSION_ID] = {
            summary: newSummary,
            lastUpdatedAt: new Date().toISOString(),
            messageCountAtLastSummary: history.length
          };
          saveLongTermMemory(longTermMemories);
        }

        history.push({ role: 'assistant', content: responseText, createdAt: new Date() });
        saveChatHistories(chatHistories);

        return {
          id: `${Date.now()}`,
          role: 'assistant' as const,
          content: responseText,
          createdAt: new Date(),
        };
      } catch (error: any) {
        // 오류 발생 시 방금 추가한 사용자 메시지 제거
        history.pop();
        saveChatHistories(chatHistories);
        console.error('[Chat] 에러 발생:', error.message);
        throw error;
      }
    }),
});