import { Router } from 'express';

import { asyncHandler } from '../middleware/async-handler';
import { requireRider } from '../middleware/rider-auth';
import { admin } from '../supabase';

// Rider cancels a just-accepted delivery within the 1-minute grace period. The
// rider id is derived server-side; the DB function enforces ownership, the
// accepted state, and the grace window, then re-dispatches to the next riders.
export const riderCancelDeliveryRouter = Router();

riderCancelDeliveryRouter.post(
  '/',
  requireRider,
  asyncHandler(async (req, res) => {
    const payload = (req.body ?? {}) as { delivery_id?: string; deliveryId?: string };
    const delivery_id = payload.delivery_id ?? payload.deliveryId;

    if (!delivery_id) return res.status(400).json({ error: 'missing_delivery_id' });

    const { data, error } = await admin.rpc('cancel_accepted_delivery', {
      p_delivery_id: delivery_id,
      p_rider_id: req.riderId,
    });
    if (error) return res.status(400).json({ error: error.message });

    // false => not theirs / not accepted / grace period elapsed.
    const success = data === true;
    return res.status(success ? 200 : 409).json({ ok: success });
  }),
);
