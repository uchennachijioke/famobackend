"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.riderUpdateDeliveryRouter = void 0;
const express_1 = require("express");
const async_handler_1 = require("../middleware/async-handler");
const rider_auth_1 = require("../middleware/rider-auth");
const supabase_1 = require("../supabase");
// Rider advances an accepted delivery's status. Ownership enforced by matching
// deliveries.rider_id against the token-derived rider id.
exports.riderUpdateDeliveryRouter = (0, express_1.Router)();
// Allowed forward transitions for a rider.
const NEXT = {
    accepted: ['picked_up', 'cancelled'],
    picked_up: ['delivered'],
};
exports.riderUpdateDeliveryRouter.post('/', rider_auth_1.requireRider, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const payload = (req.body ?? {});
    const { status } = payload;
    const delivery_id = payload.delivery_id ?? payload.deliveryId;
    const rider_id = req.riderId;
    if (!delivery_id || !status) {
        return res.status(400).json({ error: 'missing_fields' });
    }
    const { data: current, error: readErr } = await supabase_1.admin
        .from('deliveries')
        .select('id, rider_id, status')
        .eq('id', delivery_id)
        .maybeSingle();
    if (readErr)
        return res.status(400).json({ error: readErr.message });
    if (!current)
        return res.status(404).json({ error: 'delivery_not_found' });
    if (current.rider_id !== rider_id)
        return res.status(403).json({ error: 'forbidden' });
    const allowed = NEXT[current.status] ?? [];
    if (!allowed.includes(status)) {
        return res
            .status(409)
            .json({ error: 'invalid_transition', from: current.status, to: status });
    }
    const { data: updated, error: updErr } = await supabase_1.admin
        .from('deliveries')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', delivery_id)
        .eq('rider_id', rider_id)
        .eq('status', current.status)
        .select('id, status, rider_id, pickup_address, dropoff_address, price, updated_at')
        .maybeSingle();
    if (updErr)
        return res.status(400).json({ error: updErr.message });
    if (!updated)
        return res.status(200).json({ ok: false, reason: 'stale_status' });
    // When the job ends, free the rider so dispatch can offer new jobs again.
    if (status === 'delivered' || status === 'cancelled') {
        await supabase_1.admin
            .from('rider_locations')
            .update({ is_available: true, updated_at: new Date().toISOString() })
            .eq('rider_id', rider_id);
    }
    return res.status(200).json({ ok: true, delivery: updated });
}));
//# sourceMappingURL=rider-update-delivery.js.map