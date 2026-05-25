import { initTRPC } from '@trpc/server';
import superjson from 'superjson';
import type { Context } from '../context.js';

const t = initTRPC.context<Context>().create({ transformer: superjson });
const procedure = t.procedure;

export const voiceRouter = t.router({
  // Gemini TTS 기능 제거
  generateSpeech: procedure
    .mutation(async () => {
      throw new Error('음성 출력 기능은 현재 비활성화되어 있습니다.');
    }),
});
