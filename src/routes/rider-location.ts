import { Router } from 'express';

import { asyncHandler } from '../middleware/async-handler';
import { requireRider } from '../middleware/rider-auth';
import { admin } from '../supabase';

// Secure rider GPS write. requireRider resolves the session token to a rider id
// server-side, so a caller can never upsert another rider's row.
export const riderLocationRouter = Router();

riderLocationRouter.post(
  '/',
  requireRider,
  asyncHandler(async (req, res) => {
    const body = (req.body ?? {}) as {
      lat?: number;
      lng?: number;
      is_available?: boolean;
    };

    const { lat, lng, is_available } = body;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ error: 'invalid_coordinates' });
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ error: 'coordinates_out_of_range' });
    }

    const row: Record<string, unknown> = {
      rider_id: req.riderId,
      lat,
      lng,
      updated_at: new Date().toISOString(),
    };
    if (typeof is_available === 'boolean') row.is_available = is_available;

    const { error } = await admin
      .from('rider_locations')
      .upsert(row, { onConflict: 'rider_id' });
    if (error) return res.status(400).json({ error: error.message });

    return res.status(200).json({ ok: true });
  }),
);
