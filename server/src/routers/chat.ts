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

export const chatRouter = t.router({
  getInitialGreeting: procedure.query(async () => {
    return { message: '안녕! 누나가 기다리고 있었어. 오늘 하루는 어땠니? 😊' };
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

      // 한국 표준시(KST, GMT+9)로 시간 설정
      const now = new Date();
      const kstOffset = 9 * 60 * 60 * 1000;
      const kstDate = new Date(now.getTime() + kstOffset);
      
      const dateStr = kstDate.toLocaleDateString('ko-KR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric', 
        weekday: 'long',
        timeZone: 'UTC' // 위에서 오프셋을 더했으므로 UTC로 출력하면 KST가 됨
      });
      const timeStr = kstDate.toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true,
        timeZone: 'UTC'
      });

      history.push({ role: 'user', content: input.message, createdAt: now });

      const apiKey = process.env.DEEPSEEK_API_KEY;
      if (!apiKey) throw new Error('DEEPSEEK_API_KEY가 설정되지 않았습니다.');

      const client = new OpenAI({ 
        apiKey, 
        baseURL: 'https://api.deepseek.com' 
      });

      try {
        console.log('[Main Brain] DeepSeek-V4-Flash 엔진 가동 (웹 검색 활성화)');
        
        const dynamicSystemPrompt = `${NUNA_SYSTEM_PROMPT}
        
[누나의 장기 기억 (과거 대화 요약)]
${memory.summary || "아직은 우리 사이에 쌓인 추억이 많지 않네. 앞으로 차곡차곡 쌓아가자!"}

[현재 한국 시각]
- ${dateStr} ${timeStr}`;

        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
          { role: 'system', content: dynamicSystemPrompt },
          ...history.slice(-21, -1).map(msg => {
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
          messages: messages,
          temperature: 0.7,
          // @ts-ignore: DeepSeek V4 자체 웹 검색 활성화 파라미터
          enable_web_search: true 
        });

        const responseText = response.choices[0].message.content || '미안해 동생아, 누나가 잠시 딴생각을 했나 봐.';

        // 대화 기록 요약 업데이트 로직
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
        history.pop();
        console.error('[Chat] 에러 발생:', error.message);
        throw error;
      }
    }),
});
