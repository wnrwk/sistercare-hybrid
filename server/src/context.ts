import type { Request, Response } from 'express';
import type { Session } from 'express-session';

// express-session 타입 확장
interface AppSession extends Session {
  userId?: string;
  nickname?: string;
}

export function createContext({ req, res }: { req: Request; res: Response }) {
  return { req, res, session: req.session as AppSession };
}

export type Context = ReturnType<typeof createContext>;
