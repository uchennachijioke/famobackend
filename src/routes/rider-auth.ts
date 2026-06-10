import { Router } from 'express';

import { asyncHandler } from '../middleware/async-handler';
import { admin } from '../supabase';

// Secure rider auth: signup + login. Passwords are bcrypt-hashed server-side
// via pgcrypto (public.rider_signup / public.rider_login). On login a session
// token is issued; the rider app stores it and sends it to other rider-* routes.
export const riderAuthRouter = Router();

riderAuthRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = (req.body ?? {}) as {
      action?: string;
      email?: string;
      password?: string;
      full_name?: string;
      phone?: string;
    };

    const action = body.action;
    const email = body.email?.trim().toLowerCase();
    const password = body.password;

    if (!email || !password) {
      return res.status(400).json({ error: 'missing_credentials' });
    }

    if (action === 'signup') {
      const { data, error } = await admin.rpc('rider_signup', {
        p_full_name: body.full_name ?? null,
        p_email: email,
        p_phone: body.phone ?? null,
        p_password: password,
      });
      if (error) {
        const msg = error.message.includes('email_taken')
          ? 'email_taken'
          : error.message.includes('weak_password')
            ? 'weak_password'
            : 'signup_failed';
        return res.status(400).json({ error: msg });
      }
      return res.status(200).json({ ok: true, rider_id: data });
    }

    if (action === 'login') {
      const { data, error } = await admin.rpc('rider_login', {
        p_email: email,
        p_password: password,
      });
      if (error) return res.status(400).json({ error: 'login_failed' });
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return res.status(401).json({ error: 'invalid_credentials' });
      return res.status(200).json({
        ok: true,
        token: row.token,
        rider_id: row.rider_id,
        expires_at: row.expires_at,
      });
    }

    return res.status(400).json({ error: 'unknown_action' });
  }),
);
