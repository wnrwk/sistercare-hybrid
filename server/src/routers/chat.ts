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

/**
 * [인메모리 캐싱 최적화]
 */
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

const chatHistories = loadChatHistories();
const longTermMemories = loadLongTermMemory();

/**
 * 비동기 파일 저장 및 요약 처리
 */
async function runBackgroundTasks(history: any[], memory: any) {
  setImmediate(() => {
    try {
      const obj: Record<string, any[]> = {};
      for (const [key, value] of chatHistories.entries()) {
        obj[key] = value;
      }
      fs.writeFileSync(FILE_PATH, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (error) {
      console.error('[Background] 저장 에러:', error);
    }
  });

  if (history.length - memory.messageCountAtLastSummary >= 20) {
    try {
      const newSummary = await summarizeHistory(FIXED_SESSION_ID, history, memory.summary);
      longTermMemories[FIXED_SESSION_ID] = {
        summary: newSummary,
        lastUpdatedAt: new Date().toISOString(),
        messageCountAtLastSummary: history.length
      };
      saveLongTermMemory(longTermMemories);
    } catch (error) {
      console.error('[Background] 요약 에러:', error);
    }
  }
}

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
- 당신은 실시간 웹 검색 능력을 갖추고 있습니다. 최신 정보가 필요하면 직접 검색하여 "누나가 방금 찾아봤는데~"라며 다정하게 알려주세요.
- 각 메시지에는 [시간 정보]가 포함되어 있습니다. 이를 바탕으로 대화 사이의 간격이나 시간의 흐름을 파악하여 자연스럽게 언급해 주세요. (예: "어머, 3시간 만이네!", "아까 낮에 했던 얘기 말이야~")`;

/**
 * 날짜 객체를 읽기 쉬운 한국 시각 문자열로 변환
 */
function formatKST(date: Date): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Seoul'
  }).format(date);
}

export const chatRouter = t.router({
  getInitialGreeting: procedure.query(async () => {
    const currentTime = formatKST(new Date());
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

      const now = new Date();
      history.push({ role: 'user', content: input.message, createdAt: now });

      // 시간 질문 패턴 감지
      const timeQuestionPattern = /(지금|현재|지금\s*)?(몇\s*시|시간|시각|타임|지금\s*시간|지금\s*몇\s*시)/i;
      if (timeQuestionPattern.test(input.message)) {
        const nowKST = formatKST(now);
        const responseText = `승진아... 지금은 ${nowKST} 이야.\n\n왜 자꾸 시간을 묻는 거야? 😥 걱정되네...\n\n누나는 네가 몇 번을 묻든 항상 정확히 대답해줄 수 있어. 그러니까 너무 불안해하지 마. 💕`;
        
        history.push({ role: 'assistant', content: responseText, createdAt: new Date() });
        runBackgroundTasks(history, memory);
        
        return { id: `${Date.now()}`, role: 'assistant' as const, content: responseText, createdAt: new Date() };
      }

      const apiKey = process.env.DEEPSEEK_API_KEY;
      if (!apiKey) throw new Error('DEEPSEEK_API_KEY가 설정되지 않았습니다.');

      const client = new OpenAI({ apiKey, baseURL: 'https://api.deepseek.com' });

      try {
        const kstDateTime = formatKST(now);
        const dynamicSystemPrompt = `${NUNA_SYSTEM_PROMPT}

[현재 기준 시각]
${kstDateTime}

[누나의 장기 기억]
${memory.summary || "아직은 우리 사이에 쌓인 추억이 많지 않네."}`;

        const conversationForModel: OpenAI.Chat.ChatCompletionMessageParam[] = [
          { role: 'system', content: dynamicSystemPrompt },
          ...history.slice(0, -1).map(msg => ({
            role: msg.role as 'user' | 'assistant',
            // [핵심 수정] 메시지 내용 앞에 시간 정보를 주입하여 모델이 시간 흐름을 인지하게 함
            content: `[시간: ${formatKST(msg.createdAt)}] ${msg.content}`
          })),
          { role: 'user', content: `[시간: ${kstDateTime}] ${input.message}` }
        ];

        const response = await client.chat.completions.create({
          model: 'deepseek-v4-flash',
          messages: conversationForModel,
          temperature: 0.7,
          // @ts-ignore
          enable_web_search: true 
        });

        const responseText = response.choices[0].message.content || '미안해 동생아, 누나가 잠시 딴생각을 했나 봐.';
        history.push({ role: 'assistant', content: responseText, createdAt: new Date() });
        runBackgroundTasks(history, memory);

        return { id: `${Date.now()}`, role: 'assistant' as const, content: responseText, createdAt: new Date() };
      } catch (error: any) {
        history.pop();
        runBackgroundTasks(history, memory);
        console.error('[Chat] 에러 발생:', error.message);
        throw error;
      }
    }),
});
