import { Router } from 'express';

import { asyncHandler } from '../middleware/async-handler';
import { requireRider } from '../middleware/rider-auth';
import { admin } from '../supabase';

// Rider accepts or declines a pending offer. rider_id is derived server-side so
// a caller can never accept/decline on another rider's behalf.
export const riderRespondOfferRouter = Router();

riderRespondOfferRouter.post(
  '/',
  requireRider,
  asyncHandler(async (req, res) => {
    const payload = (req.body ?? {}) as { action?: string; offer_id?: string; offerId?: string };
    const { action } = payload;
    const offer_id = payload.offer_id ?? payload.offerId;

    if (!offer_id) return res.status(400).json({ error: 'missing_offer_id' });
    if (action !== 'accept' && action !== 'decline') {
      return res.status(400).json({ error: 'unknown_action' });
    }

    const rpc = action === 'accept' ? 'accept_offer' : 'decline_offer';
    const { data, error } = await admin.rpc(rpc, {
      p_offer_id: offer_id,
      p_rider_id: req.riderId,
    });
    if (error) return res.status(400).json({ error: error.message });

    // accept_offer/decline_offer return a boolean: false means too-late/not-theirs.
    const success = data === true;
    return res.status(success ? 200 : 409).json({ ok: success, action });
  }),
);
