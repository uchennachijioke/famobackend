import { Router } from 'express';

import { asyncHandler } from '../middleware/async-handler';
import { requireRider } from '../middleware/rider-auth';
import { admin } from '../supabase';

// Saves a rider's Expo push token so the notify_rider_of_offer trigger can
// reach their device while the app is backgrounded/closed.
export const riderPushTokenRouter = Router();

riderPushTokenRouter.post(
  '/',
  requireRider,
  asyncHandler(async (req, res) => {
    const body = (req.body ?? {}) as { expo_push_token?: string; expoPushToken?: string };
    const token = (body.expo_push_token ?? body.expoPushToken ?? '').trim();
    if (!token) return res.status(400).json({ error: 'missing_token' });

    const { error } = await admin
      .from('riders')
      .update({ expo_push_token: token, push_token_updated_at: new Date().toISOString() })
      .eq('id', req.riderId!);
    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ ok: true });
  }),
);
