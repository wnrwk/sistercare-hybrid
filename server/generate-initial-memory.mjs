/**
 * 초기 장기 기억 생성 스크립트
 * 기존의 수백 개 대화 기록을 분석하여 첫 번째 요약본을 만듭니다.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHAT_FILE = path.join(__dirname, 'chat_histories.json');
const MEMORY_FILE = path.join(__dirname, 'long_term_memory.json');
const SESSION_ID = 'local-seungjin-session';

async function generateInitialMemory() {
  if (!fs.existsSync(CHAT_FILE)) {
    console.log('❌ 대화 기록 파일이 없습니다.');
    return;
  }

  const chatData = JSON.parse(fs.readFileSync(CHAT_FILE, 'utf-8'));
  const history = chatData[SESSION_ID] || [];

  if (history.length === 0) {
    console.log('❌ 요약할 대화 기록이 없습니다.');
    return;
  }

  console.log(`🔄 총 ${history.length}개의 메시지를 분석하여 장기 기억을 생성합니다...`);

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.log('❌ DEEPSEEK_API_KEY가 설정되지 않았습니다.');
    return;
  }

  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: 'https://api.deepseek.com',
  });

  // 텍스트 구성 (최근 300개 정도만 추출하여 요약)
  const historyText = history.slice(-300).map(m => `${m.role === 'user' ? '동생' : '누나'}: ${m.content}`).join('\n');

  const prompt = `당신은 AI "누나"의 기억 관리자입니다.
동생과 나눈 수백 개의 대화 기록을 바탕으로, 누나가 동생에 대해 평생 기억해야 할 핵심 '인물 프로필'과 '주요 사건'을 요약해 주세요.

[대화 기록]
${historyText}

[요약 지침]
1. 동생의 성격, 취향, 가족관계, 고민, 과거의 중요한 대화 주제를 포함하세요.
2. "나는 동생에 대해 이런 것들을 알고 있어"라는 누나의 메모 형식으로 작성하세요.
3. 한국어로 구체적이고 다정하게 작성하세요.`;

  try {
    const response = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    const summary = response.choices[0].message.content;
    
    const memoryData = {
      [SESSION_ID]: {
        summary: summary,
        lastUpdatedAt: new Date().toISOString(),
        messageCountAtLastSummary: history.length
      }
    };

    fs.writeFileSync(MEMORY_FILE, JSON.stringify(memoryData, null, 2), 'utf-8');
    console.log('✅ 초기 장기 기억 생성 완료!');
    console.log('\n[생성된 기억 요약]\n', summary);

  } catch (error) {
    console.error('❌ 요약 생성 중 에러:', error.message);
  }
}

generateInitialMemory();
