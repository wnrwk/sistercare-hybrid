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

const chatHistories = loadChatHistories();
const longTermMemories = loadLongTermMemory();

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

// 시스템 프롬프트 (시간 관련 규칙 최소화 – 모델이 도구를 사용하도록 안내)
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

[도구 사용 가이드]
- 사용자가 "지금 몇 시야?", "LA 시간", "뉴욕 시각", "도쿄 지금 시간" 등 특정 시간대의 현재 시각을 물어보면 반드시 get_current_time 도구를 호출하세요.
- timezone 파라미터에는 IANA 시간대 이름(예: Asia/Seoul, America/Los_Angeles)을 전달하세요.`;

// Function Calling 도구 정의 (타입 오류 수정됨)
const tools: Array<OpenAI.ChatCompletionTool> = [
  {
    type: 'function' as const,
    function: {
      name: 'get_current_time',
      description: '특정 시간대의 현재 날짜와 시간을 가져옵니다. 사용자가 시간대를 물으면 이 함수를 호출하세요.',
      parameters: {
        type: 'object',
        properties: {
          timezone: {
            type: 'string',
            description: "IANA 시간대 이름 (예: 'Asia/Seoul', 'America/Los_Angeles', 'America/New_York', 'Europe/London', 'Asia/Tokyo')",
          },
        },
        required: ['timezone'],
      },
    },
  },
];

// 로컬 시간 계산 함수 (MCP 없음)
function getCurrentTimeInTimezone(timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('ko-KR', {
      timeZone: timezone,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return formatter.format(new Date());
  } catch (e) {
    console.error('[Timezone] 오류:', e);
    return `알 수 없는 시간대: ${timezone}`;
  }
}

// 기본 한국 시간 포맷 (초기 인사용)
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
    .input(z.object({ message: z.string().min(1) }))
    .mutation(async ({ input }) => {
      if (!chatHistories.has(FIXED_SESSION_ID)) chatHistories.set(FIXED_SESSION_ID, []);
      const history = chatHistories.get(FIXED_SESSION_ID)!;
      const memory = longTermMemories[FIXED_SESSION_ID] || { summary: "", lastUpdatedAt: "", messageCountAtLastSummary: 0 };

      const now = new Date();
      history.push({ role: 'user', content: input.message, createdAt: now });

      const apiKey = process.env.DEEPSEEK_API_KEY;
      if (!apiKey) throw new Error('DEEPSEEK_API_KEY가 설정되지 않았습니다.');

      const client = new OpenAI({ apiKey, baseURL: 'https://api.deepseek.com' });

      try {
        const dynamicSystemPrompt = `${NUNA_SYSTEM_PROMPT}

[누나의 장기 기억]
${memory.summary || "아직은 우리 사이에 쌓인 추억이 많지 않네."}`;

        const conversationMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
          { role: 'system', content: dynamicSystemPrompt },
          ...history.slice(0, -1).map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content
          })),
          { role: 'user', content: `[현재 시각: ${formatKST(now)}] ${input.message}` }
        ];

        // 첫 번째 API 호출 (Function Calling 포함)
        const response = await client.chat.completions.create({
          model: 'deepseek-v4-flash',        // function calling 지원 모델
          messages: conversationMessages,
          tools: tools,
          tool_choice: 'auto',
          temperature: 0.7,
          // @ts-ignore
          enable_web_search: true,       // 필요 시 유지
        });

        const responseMessage = response.choices[0].message;
        let finalAssistantContent: string;

        // tool_calls 처리
        if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
          const toolMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

          for (const toolCall of responseMessage.tool_calls) {
            // TypeScript 우회 (function 속성 접근)
            const func = (toolCall as any).function;
            if (func && func.name === 'get_current_time') {
              const args = JSON.parse(func.arguments);
              const timezone = args.timezone;
              const currentTimeStr = getCurrentTimeInTimezone(timezone);  // 로컬 계산
              toolMessages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: currentTimeStr,
              } as OpenAI.Chat.ChatCompletionMessageParam);
            }
          }

          // 두 번째 API 호출 (tool 결과 포함)
          const secondMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
            ...conversationMessages,
            responseMessage,
            ...toolMessages,
          ];

          const secondResponse = await client.chat.completions.create({
            model: 'deepseek-v4-flash',
            messages: secondMessages,
            temperature: 0.7,
          });

          finalAssistantContent = secondResponse.choices[0].message.content || '시간 정보를 가져오지 못했어.';
        } else {
          finalAssistantContent = responseMessage.content || '미안해 동생아, 누나가 잠시 딴생각을 했나 봐.';
        }

        history.push({ role: 'assistant', content: finalAssistantContent, createdAt: new Date() });
        runBackgroundTasks(history, memory);

        return {
          id: `${Date.now()}`,
          role: 'assistant' as const,
          content: finalAssistantContent,
          createdAt: new Date(),
        };
      } catch (error: any) {
        history.pop();
        runBackgroundTasks(history, memory);
        console.error('[Chat] 에러 발생:', error.message);
        throw error;
      }
    }),
});
