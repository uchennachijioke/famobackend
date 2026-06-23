import { Router } from 'express';

import { asyncHandler } from '../middleware/async-handler';
import { requireRider } from '../middleware/rider-auth';
import { admin } from '../supabase';

// Rider self-service profile read/update + application submission.
export const riderProfileRouter = Router();

const AVATAR_BUCKET = 'avatars';

// Columns a rider may read about themselves (never password / verification_code).
const PUBLIC_COLUMNS =
  'id, full_name, email, phone_number, is_verified, status, created_at, vehicle_type, vehicle_brand, vehicle_model, vehicle_year, vehicle_plate, vehicle_battery_capacity, payout_bank, payout_account_number, payout_bvn, license_path, license_front_path, license_back_path, selfie_path, selfie_with_license_path, avatar_url';

// Fields a rider may update about themselves directly. Note: full_name,
// phone_number and avatar_url are intentionally NOT here — those go through the
// admin-approved request flow (request_profile_change) and the 30-day lock.
const UPDATABLE = new Set([
  'vehicle_type',
  'vehicle_brand',
  'vehicle_model',
  'vehicle_year',
  'vehicle_plate',
  'vehicle_battery_capacity',
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

    // Submit a name/phone/photo change for admin approval. These fields are
    // gated: the change is queued in rider_profile_change_requests and only
    // applied to the riders row when an admin approves. Also enforces the
    // once-every-30-days lock via riders.profile_locked_until.
    if (action === 'request_profile_change') {
      const input = (body.profile ?? body) as Record<string, unknown>;
      const asText = (v: unknown) =>
        typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
      const fullName = asText(input.full_name);
      const phone = asText(input.phone_number);
      const avatar = asText(input.avatar_url);

      if (fullName === null && phone === null && avatar === null) {
        return res.status(400).json({ error: 'no_changes' });
      }

      const { data, error } = await admin.rpc('request_rider_profile_change', {
        p_rider_id: riderId,
        p_full_name: fullName,
        p_phone_number: phone,
        p_avatar_url: avatar,
      });
      if (error) {
        const msg = error.message ?? 'request_failed';
        if (msg.includes('profile_change_pending')) {
          return res.status(200).json({ ok: false, error: 'profile_change_pending' });
        }
        const lockMatch = msg.match(/profile_edit_locked_until:(.+)$/);
        if (lockMatch) {
          return res.status(200).json({
            ok: false,
            error: 'profile_edit_locked',
            lockedUntil: lockMatch[1].trim(),
          });
        }
        return res.status(400).json({ error: msg });
      }
      return res.status(200).json({ ok: true, request: data });
    }

    // Report whether a change request is pending and/or the rider is within the
    // 30-day lock window, so the Edit Profile screen can render the right state.
    if (action === 'get_profile_change_status') {
      const { data: rider, error: rErr } = await admin
        .from('riders')
        .select('profile_locked_until')
        .eq('id', riderId)
        .single();
      if (rErr) return res.status(400).json({ error: rErr.message });

      const { data: pending, error: pErr } = await admin
        .from('rider_profile_change_requests')
        .select('id, full_name, phone_number, avatar_url, status, requested_at')
        .eq('rider_id', riderId)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (pErr) return res.status(400).json({ error: pErr.message });

      return res.status(200).json({
        ok: true,
        pending: pending ?? null,
        lockedUntil: rider?.profile_locked_until ?? null,
      });
    }

    // Issue a signed upload URL for the rider's avatar image. Uploading here
    // only writes the file to storage and returns its public URL — it does
    // not touch the riders row. The caller persists avatar_url via
    // 'update_profile' as part of the same save as name/phone/etc.
    if (action === 'sign_avatar_upload') {
      const ext =
        typeof body.ext === 'string' && /^[a-z0-9]{1,5}$/i.test(body.ext)
          ? body.ext.toLowerCase()
          : 'jpg';
      const path = `riders/${riderId}/avatar.${ext}`;
      const { data, error } = await admin.storage
        .from(AVATAR_BUCKET)
        .createSignedUploadUrl(path, { upsert: true });
      if (error) return res.status(400).json({ error: error.message });
      const { data: pub } = admin.storage.from(AVATAR_BUCKET).getPublicUrl(path);
      return res.status(200).json({
        ok: true,
        bucket: AVATAR_BUCKET,
        path,
        token: data.token,
        signedUrl: data.signedUrl,
        publicUrl: pub.publicUrl,
      });
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
