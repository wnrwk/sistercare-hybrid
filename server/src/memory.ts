import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const MEMORY_FILE_PATH = path.join(process.cwd(), 'long_term_memory.json');

export interface LongTermMemory {
  summary: string;
  lastUpdatedAt: string;
  messageCountAtLastSummary: number;
}

export function loadLongTermMemory(): Record<string, LongTermMemory> {
  try {
    if (fs.existsSync(MEMORY_FILE_PATH)) {
      return JSON.parse(fs.readFileSync(MEMORY_FILE_PATH, 'utf-8'));
    }
  } catch (error) {
    console.error('[Memory] 로드 에러:', error);
  }
  return {};
}

export function saveLongTermMemory(memories: Record<string, LongTermMemory>) {
  try {
    fs.writeFileSync(MEMORY_FILE_PATH, JSON.stringify(memories, null, 2), 'utf-8');
  } catch (error) {
    console.error('[Memory] 저장 에러:', error);
  }
}

/**
 * 대화 기록을 바탕으로 장기 기억 요약본을 생성합니다.
 */
export async function summarizeHistory(
  sessionId: string, 
  history: any[], 
  currentSummary: string = ""
): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return currentSummary;

  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: 'https://api.deepseek.com',
  });

  // 요약 대상: 너무 많으면 최근 200개 정도로 제한하여 요약
  const relevantHistory = history.slice(-200);
  const historyText = relevantHistory.map(m => `${m.role === 'user' ? '동생' : '누나'}: ${m.content}`).join('\n');

  const prompt = `당신은 AI "누나"의 기억을 관리하는 비서입니다. 
아래는 누나와 동생(사용자)이 나눈 대화 기록입니다. 
이 내용을 바탕으로 누나가 동생에 대해 꼭 기억해야 할 핵심 정보들을 요약해 주세요.

[기존 기억]
${currentSummary || "없음"}

[새로운 대화 기록]
${historyText}

[지침]
1. 동생의 이름, 취향, 성격, 직업, 고민거리, 과거에 있었던 중요한 사건 위주로 정리하세요.
2. 누나의 입장에서 "나는 동생에 대해 이런 것들을 알고 있어"라는 식의 메모 형태로 작성하세요.
3. 아주 구체적인 사실(예: "영화를 좋아함" 보다는 "잘생긴 배우가 나오는 로맨스 영화를 보며 감동받음")을 포함하세요.
4. 불필요한 인사는 생략하고 정보 위주로 한국어로 작성하세요.`;

  try {
    const response = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    return response.choices[0].message.content || currentSummary;
  } catch (error) {
    console.error('[Memory] 요약 생성 실패:', error);
    return currentSummary;
  }
}
