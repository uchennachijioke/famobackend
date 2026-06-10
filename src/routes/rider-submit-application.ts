import { Router } from 'express';

import { asyncHandler } from '../middleware/async-handler';
import { requireRider } from '../middleware/rider-auth';
import { admin } from '../supabase';

// Marks a rider's onboarding application as submitted by moving their status
// to 'pending_approval' (the value the rider app gates the login flow on).
export const riderSubmitApplicationRouter = Router();

riderSubmitApplicationRouter.post(
  '/',
  requireRider,
  asyncHandler(async (req, res) => {
    const { error } = await admin
      .from('riders')
      .update({ status: 'pending_approval' })
      .eq('id', req.riderId!);
    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ ok: true, status: 'pending_approval' });
  }),
);
