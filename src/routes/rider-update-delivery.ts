import { Router } from 'express';

import { asyncHandler } from '../middleware/async-handler';
import { requireRider } from '../middleware/rider-auth';
import { admin } from '../supabase';

// Rider advances an accepted delivery's status. Ownership enforced by matching
// deliveries.rider_id against the token-derived rider id.
export const riderUpdateDeliveryRouter = Router();

// Allowed forward transitions for a rider.
const NEXT: Record<string, string[]> = {
  accepted: ['picked_up', 'cancelled'],
  picked_up: ['delivered'],
};

riderUpdateDeliveryRouter.post(
  '/',
  requireRider,
  asyncHandler(async (req, res) => {
    const payload = (req.body ?? {}) as { delivery_id?: string; deliveryId?: string; status?: string };
    const { status } = payload;
    const delivery_id = payload.delivery_id ?? payload.deliveryId;
    const rider_id = req.riderId!;

    if (!delivery_id || !status) {
      return res.status(400).json({ error: 'missing_fields' });
    }

    const { data: current, error: readErr } = await admin
      .from('deliveries')
      .select('id, rider_id, status')
      .eq('id', delivery_id)
      .maybeSingle();

    if (readErr) return res.status(400).json({ error: readErr.message });
    if (!current) return res.status(404).json({ error: 'delivery_not_found' });
    if (current.rider_id !== rider_id) return res.status(403).json({ error: 'forbidden' });

    const allowed = NEXT[current.status] ?? [];
    if (!allowed.includes(status)) {
      return res
        .status(409)
        .json({ error: 'invalid_transition', from: current.status, to: status });
    }

    const { data: updated, error: updErr } = await admin
      .from('deliveries')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', delivery_id)
      .eq('rider_id', rider_id)
      .eq('status', current.status)
      .select('id, status, rider_id, pickup_address, dropoff_address, price, updated_at')
      .maybeSingle();

    if (updErr) return res.status(400).json({ error: updErr.message });
    if (!updated) return res.status(200).json({ ok: false, reason: 'stale_status' });

    // When the job ends, free the rider so dispatch can offer new jobs again.
    if (status === 'delivered' || status === 'cancelled') {
      await admin
        .from('rider_locations')
        .update({ is_available: true, updated_at: new Date().toISOString() })
        .eq('rider_id', rider_id);
    }

    return res.status(200).json({ ok: true, delivery: updated });
  }),
);
