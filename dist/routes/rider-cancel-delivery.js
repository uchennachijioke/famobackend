"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.riderCancelDeliveryRouter = void 0;
const express_1 = require("express");
const async_handler_1 = require("../middleware/async-handler");
const rider_auth_1 = require("../middleware/rider-auth");
const supabase_1 = require("../supabase");
// Rider cancels a just-accepted delivery within the 1-minute grace period. The
// rider id is derived server-side; the DB function enforces ownership, the
// accepted state, and the grace window, then re-dispatches to the next riders.
exports.riderCancelDeliveryRouter = (0, express_1.Router)();
exports.riderCancelDeliveryRouter.post('/', rider_auth_1.requireRider, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const payload = (req.body ?? {});
    const delivery_id = payload.delivery_id ?? payload.deliveryId;
    if (!delivery_id)
        return res.status(400).json({ error: 'missing_delivery_id' });
    const { data, error } = await supabase_1.admin.rpc('cancel_accepted_delivery', {
        p_delivery_id: delivery_id,
        p_rider_id: req.riderId,
    });
    if (error)
        return res.status(400).json({ error: error.message });
    // false => not theirs / not accepted / grace period elapsed.
    const success = data === true;
    return res.status(success ? 200 : 409).json({ ok: success });
}));
//# sourceMappingURL=rider-cancel-delivery.js.map