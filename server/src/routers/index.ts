import { initTRPC } from '@trpc/server';
import superjson from 'superjson';
import type { Context } from '../context.js';
import { chatRouter } from './chat.js';
import { imagesRouter } from './images.js';
import { voiceRouter } from './voice.js';
import { authRouter } from './auth.js';

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const appRouter = router({
  chat: chatRouter,
  images: imagesRouter,
  voice: voiceRouter,
  auth: authRouter,
});

export type AppRouter = typeof appRouter;
