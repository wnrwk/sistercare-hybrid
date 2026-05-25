import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import superjson from 'superjson';
import type { Context } from '../context.js';

const t = initTRPC.context<Context>().create({ transformer: superjson });
const procedure = t.procedure;

// 세션별 최신 이미지 저장
const latestImages = new Map<string, string>();

function getSessionId(ctx: Context): string {
  if (!ctx.session.userId) {
    ctx.session.userId = `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  return ctx.session.userId;
}

export const imagesRouter = t.router({
  // 이미지 생성
  generate: procedure
    .input(z.object({ prompt: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sessionId = getSessionId(ctx);

      try {
        // Gemini Imagen API 사용 (gemini-2.0-flash-preview-image-generation)
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.');
        }

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: `${input.prompt}. 귀엽고 따뜻한 파스텔 톤 애니메이션 스타일. 한국 웹툰 스타일의 누나 캐릭터.` }]
              }],
              generationConfig: {
                responseModalities: ['TEXT', 'IMAGE'],
              },
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Imagen API 오류:', errorText);
          throw new Error(`이미지 생성 API 오류: ${response.status}`);
        }

        const data = await response.json() as {
          candidates?: Array<{
            content?: {
              parts?: Array<{
                inlineData?: { mimeType: string; data: string };
                text?: string;
              }>;
            };
          }>;
        };

        // 이미지 데이터 추출
        const parts = data.candidates?.[0]?.content?.parts || [];
        const imagePart = parts.find(p => p.inlineData);
        
        if (imagePart?.inlineData) {
          const imageUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
          latestImages.set(sessionId, imageUrl);
          return { imageUrl };
        }

        throw new Error('이미지 생성에 실패했습니다.');
      } catch (error) {
        console.error('이미지 생성 오류:', error);
        throw error;
      }
    }),

  // 최신 이미지 가져오기
  getLatest: procedure.query(async ({ ctx }) => {
    const sessionId = getSessionId(ctx);
    const imageUrl = latestImages.get(sessionId) || null;
    return { imageUrl };
  }),
});
