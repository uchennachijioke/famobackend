import type { NextFunction, Request, Response } from 'express';

import { admin } from '../supabase';

/**
 * Express middleware: verifies a Supabase user access token (JWT) from the
 * Authorization header and attaches req.userId. This gives the geo proxy the
 * same protection the Edge Function had via verify_jwt — only signed-in app
 * users can spend the Google Maps quota.
 */
export async function requireUser(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization ?? '';
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  if (!token) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  req.userId = data.user.id;
  next();
}
