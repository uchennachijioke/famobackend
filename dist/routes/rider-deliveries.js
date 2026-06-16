"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.riderDeliveriesRouter = void 0;
const express_1 = require("express");
const async_handler_1 = require("../middleware/async-handler");
const rider_auth_1 = require("../middleware/rider-auth");
const supabase_1 = require("../supabase");
// Read delivery details for a rider without exposing the deliveries table to the
// public. Validates that the rider was actually offered / assigned the job
// before returning customer PII (addresses, phone).
exports.riderDeliveriesRouter = (0, express_1.Router)();
const DELIVERY_SELECT = 'id, user_id, rider_id, status, accepted_at, pickup_address, pickup_lat, pickup_lng, dropoff_address, dropoff_lat, dropoff_lng, weight, price, created_at, package_category, package_description, package_size, sender_name, sender_phone, recipient_name, recipient_phone, pickup_notes, dropoff_notes, special_instructions, payment_method, payment_screenshot_url, users:user_id ( full_name, phone_number )';
exports.riderDeliveriesRouter.post('/', rider_auth_1.requireRider, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const payload = (req.body ?? {});
    const { action } = payload;
    const offer_id = payload.offer_id ?? payload.offerId;
    const rider_id = req.riderId;
    if (action === 'offer_delivery') {
        if (!offer_id)
            return res.status(400).json({ error: 'missing_offer_id' });
        // The offer must belong to this rider.
        const { data: offer } = await supabase_1.admin
            .from('delivery_offers')
            .select('delivery_id, rider_id')
            .eq('id', offer_id)
            .maybeSingle();
        if (!offer || offer.rider_id !== rider_id) {
            return res.status(403).json({ error: 'forbidden' });
        }
        const { data: delivery, error } = await supabase_1.admin
            .from('deliveries')
            .select(DELIVERY_SELECT)
            .eq('id', offer.delivery_id)
            .maybeSingle();
        if (error)
            return res.status(400).json({ error: error.message });
        return res.status(200).json({ ok: true, delivery });
    }
    if (action === 'active_delivery') {
        const { data: delivery, error } = await supabase_1.admin
            .from('deliveries')
            .select(DELIVERY_SELECT)
            .eq('rider_id', rider_id)
            .in('status', ['accepted', 'picked_up'])
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (error)
            return res.status(400).json({ error: error.message });
        return res.status(200).json({ ok: true, delivery: delivery ?? null });
    }
    return res.status(400).json({ error: 'unknown_action' });
}));
//# sourceMappingURL=rider-deliveries.js.map