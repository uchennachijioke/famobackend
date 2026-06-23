import { Router } from 'express';

import { asyncHandler } from '../middleware/async-handler';
import { requireRider } from '../middleware/rider-auth';
import { admin } from '../supabase';

// Read delivery details for a rider without exposing the deliveries table to the
// public. Validates that the rider was actually offered / assigned the job
// before returning customer PII (addresses, phone).
export const riderDeliveriesRouter = Router();

const DELIVERY_SELECT =
  'id, user_id, rider_id, status, accepted_at, pickup_address, pickup_lat, pickup_lng, dropoff_address, dropoff_lat, dropoff_lng, weight, price, created_at, package_category, package_description, package_size, sender_name, sender_phone, recipient_name, recipient_phone, pickup_notes, dropoff_notes, special_instructions, payment_method, payment_screenshot_url, users:user_id ( full_name, phone_number )';

riderDeliveriesRouter.post(
  '/',
  requireRider,
  asyncHandler(async (req, res) => {
    const payload = (req.body ?? {}) as { action?: string; offer_id?: string; offerId?: string };
    const { action } = payload;
    const offer_id = payload.offer_id ?? payload.offerId;
    const rider_id = req.riderId!;

    if (action === 'offer_delivery') {
      if (!offer_id) return res.status(400).json({ error: 'missing_offer_id' });
      // The offer must belong to this rider.
      const { data: offer } = await admin
        .from('delivery_offers')
        .select('delivery_id, rider_id')
        .eq('id', offer_id)
        .maybeSingle();
      if (!offer || offer.rider_id !== rider_id) {
        return res.status(403).json({ error: 'forbidden' });
      }
      const { data: delivery, error } = await admin
        .from('deliveries')
        .select(DELIVERY_SELECT)
        .eq('id', offer.delivery_id)
        .maybeSingle();
      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json({ ok: true, delivery });
    }

    if (action === 'active_delivery') {
      const { data: delivery, error } = await admin
        .from('deliveries')
        .select(DELIVERY_SELECT)
        .eq('rider_id', rider_id)
        .in('status', ['accepted', 'picked_up'])
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json({ ok: true, delivery: delivery ?? null });
    }

    // Live count of every order currently assigned to this rider (accepted or
    // picked_up). The dashboard polls this so the rider sees how many active
    // jobs they hold, even though they are worked one at a time.
    if (action === 'active_deliveries') {
      const { data, error } = await admin
        .from('deliveries')
        .select('id, status')
        .eq('rider_id', rider_id)
        .in('status', ['accepted', 'picked_up']);
      if (error) return res.status(400).json({ error: error.message });
      const rows = data ?? [];
      return res.status(200).json({
        ok: true,
        count: rows.length,
        ids: rows.map((row) => row.id),
      });
    }

    return res.status(400).json({ error: 'unknown_action' });
  }),
);
