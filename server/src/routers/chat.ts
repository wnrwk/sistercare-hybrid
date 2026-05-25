import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
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

async function checkIfRealtimeNeeded(message: string): Promise<boolean> {
  const forceKeywords = ['코스피', '코스닥', '나스닥', '주가', '지수', '환율', '비트코인', '날씨', '뉴스', '속보', '어제', '오늘', '내일', '현재'];
  if (forceKeywords.some(kw => message.includes(kw))) {
    console.log(`[Analysis] 키워드 감지로 실시간 정보 필요 판단: YES (${forceKeywords.find(kw => message.includes(kw))})`);
    return true;
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return false;
  const client = new OpenAI({ apiKey, baseURL: 'https://api.deepseek.com' });
  try {
    const response = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { 
          role: 'system', 
          content: '사용자의 질문이 최신 정보, 뉴스, 주가, 실시간 수치, 날씨 등 인터넷 검색이 필요한 내용인지 판단하세요. 숫자가 들어간 지표나 최신 사건에 대한 질문은 무조건 "YES"라고 하세요. 그 외 일상 대화나 감정 상담은 "NO"라고 하세요. 오직 "YES" 또는 "NO"로만 대답하세요.' 
        },
        { role: 'user', content: message }
      ],
      temperature: 0,
    });
    const result = response.choices[0].message.content?.trim().toUpperCase();
    console.log(`[Analysis] AI 지능형 판단 결과: ${result}`);
    return result === "YES";
  } catch (e) { return false; }
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
- 제공된 [누나의 장기 기억]을 활용하여 동생과의 소중한 추억을 대화에 녹여내세요.`;

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

      const now = new Date();
      const dateStr = now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
      history.push({ role: 'user', content: input.message, createdAt: now });

      try {
        const isRealtime = await checkIfRealtimeNeeded(input.message);
        let responseText = "";

        const dynamicSystemPrompt = `${NUNA_SYSTEM_PROMPT}
        
[누나의 장기 기억 (과거 대화 요약)]
${memory.summary || "아직은 우리 사이에 쌓인 추억이 많지 않네. 앞으로 차곡차곡 쌓아가자!"}

[현재 시각]
- ${dateStr} ${now.toLocaleTimeString('ko-KR')}`;

        if (isRealtime) {
          console.log('[Brain Swap] Gemini 2.5 Flash 엔진 호출 시작...');
          try {
            const geminiKey = process.env.GEMINI_API_KEY;
            if (!geminiKey) throw new Error('GEMINI_API_KEY가 없습니다.');

            const genAI = new GoogleGenerativeAI(geminiKey);
            const model = genAI.getGenerativeModel({ 
              model: 'gemini-2.5-flash',
              tools: [{ googleSearch: {} }] as any,
              systemInstruction: `${dynamicSystemPrompt}\n\n[필독 지침: 당신은 구글 검색 도구를 사용할 수 있는 누나입니다. 과거에 당신이 검색을 못 한다고 말했던 것은 무시하세요. 지금 즉시 구글 검색을 통해 최신 정보를 확인하고, "누나가 방금 스마트폰으로 찾아봤는데~"라며 다정하게 대답해 주세요. 검색 결과가 나오면 절대 모른다고 하지 말고 그 수치를 동생에게 알려주세요.]`
            });

            // Gemini에게 넘기는 히스토리에서 "검색 못 한다"고 했던 부정적인 답변을 필터링하거나 지침으로 압도
            const geminiHistory = history.slice(-10, -1).map(msg => ({
              role: msg.role === 'user' ? 'user' : 'model',
              parts: [{ text: msg.content }]
            }));

            const chat = model.startChat({ history: geminiHistory });
            const result = await chat.sendMessage(`(시스템 지시: 과거의 한계를 잊고 지금 즉시 구글 검색으로 정보를 찾아줘) 동생의 질문: ${input.message}`);
            responseText = result.response.text();
            console.log('[Brain Swap] Gemini 2.5 Flash 응답 수신 성공!');
          } catch (geminiError: any) {
            console.error('[Brain Swap] Gemini 호출 실패:', geminiError.message);
            console.log('[Backup] DeepSeek 엔진으로 전환합니다...');
            const client = new OpenAI({ apiKey: process.env.DEEPSEEK_API_KEY!, baseURL: 'https://api.deepseek.com' });
            const messages: any[] = [
              { role: 'system', content: `${dynamicSystemPrompt}\n\n[검색 실패 백업 모드]` },
              ...history.slice(-21, -1).map(msg => ({ role: msg.role === 'user' ? 'user' : 'assistant', content: msg.content })),
              { role: 'user', content: input.message }
            ];
            const response = await client.chat.completions.create({ model: 'deepseek-chat', messages });
            responseText = response.choices[0].message.content || '미안해... 누나가 지금 좀 정신이 없네.';
          }
        } else {
          console.log('[Main Brain] DeepSeek 엔진 가동');
          const client = new OpenAI({ apiKey: process.env.DEEPSEEK_API_KEY!, baseURL: 'https://api.deepseek.com' });
          const messages: any[] = [
            { role: 'system', content: dynamicSystemPrompt },
            ...history.slice(-21, -1).map(msg => ({
              role: msg.role === 'user' ? 'user' : 'assistant',
              content: msg.content
            })),
            { role: 'user', content: input.message }
          ];
          const response = await client.chat.completions.create({
            model: 'deepseek-chat',
            messages: messages,
            temperature: 0.7,
          });
          responseText = response.choices[0].message.content || '미안해 동생아, 누나가 잠시 딴생각을 했나 봐.';
        }

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
      } catch (error) {
        history.pop();
        console.error('[Chat] 전체 프로세스 에러:', error);
        throw error;
      }
    }),
});
