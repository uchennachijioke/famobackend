import { Router } from 'express';

import { asyncHandler } from '../middleware/async-handler';
import { requireRider } from '../middleware/rider-auth';
import { admin } from '../supabase';

// Rider self-service profile read/update + application submission.
export const riderProfileRouter = Router();

// Columns a rider may read about themselves (never password / verification_code).
const PUBLIC_COLUMNS =
  'id, full_name, email, phone_number, is_verified, status, created_at, vehicle_type, vehicle_brand, vehicle_model, vehicle_year, vehicle_plate, payout_bank, payout_account_number, payout_bvn, license_path, license_front_path, license_back_path, selfie_path, selfie_with_license_path';

// Fields a rider may update about themselves.
const UPDATABLE = new Set([
  'full_name',
  'phone_number',
  'vehicle_type',
  'vehicle_brand',
  'vehicle_model',
  'vehicle_year',
  'vehicle_plate',
  'payout_bank',
  'payout_account_number',
  'payout_bvn',
]);

riderProfileRouter.post(
  '/',
  requireRider,
  asyncHandler(async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const riderId = req.riderId!;
    const action = typeof body.action === 'string' ? body.action : 'get';

    if (action === 'get') {
      const { data, error } = await admin
        .from('riders')
        .select(PUBLIC_COLUMNS)
        .eq('id', riderId)
        .single();
      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json({ ok: true, rider: data });
    }

    if (action === 'update_profile') {
      const patch: Record<string, unknown> = {};
      const input = (body.profile ?? body) as Record<string, unknown>;
      for (const key of Object.keys(input)) {
        if (UPDATABLE.has(key)) patch[key] = input[key];
      }
      if (Object.keys(patch).length === 0) {
        return res.status(400).json({ error: 'no_updatable_fields' });
      }
      const { data, error } = await admin
        .from('riders')
        .update(patch)
        .eq('id', riderId)
        .select(PUBLIC_COLUMNS)
        .single();
      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json({ ok: true, rider: data });
    }

    // Mark the onboarding application as submitted for admin review.
    // 'pending_approval' is the value the rider app gates the login flow on.
    if (action === 'submit_application') {
      const { error } = await admin
        .from('riders')
        .update({ status: 'pending_approval' })
        .eq('id', riderId);
      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json({ ok: true, status: 'pending_approval' });
    }

    return res.status(400).json({ error: 'unknown_action' });
  }),
);
