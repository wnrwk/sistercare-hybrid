import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import superjson from 'superjson';
import type { Context } from '../context.js';
import { v4 as uuidv4 } from 'uuid';

const t = initTRPC.context<Context>().create({ transformer: superjson });
const procedure = t.procedure;

export const authRouter = t.router({
  // 현재 사용자 정보
  me: procedure.query(async ({ ctx }) => {
    if (!ctx.session.userId) {
      return null;
    }
    return {
      id: ctx.session.userId,
      nickname: ctx.session.nickname || '동생',
    };
  }),

  // 로컬 로그인 (닉네임 설정)
  login: procedure
    .input(z.object({ nickname: z.string().min(1).max(20).optional() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.userId) {
        ctx.session.userId = uuidv4();
      }
      ctx.session.nickname = input.nickname || '동생';
      return {
        id: ctx.session.userId,
        nickname: ctx.session.nickname,
      };
    }),

  // 로그아웃
  logout: procedure.mutation(async ({ ctx }) => {
    ctx.session.destroy((err: Error | undefined) => {
      if (err) console.error('세션 삭제 오류:', err);
    });
    return { success: true };
  }),
});
