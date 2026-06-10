"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.riderLocationRouter = void 0;
const express_1 = require("express");
const async_handler_1 = require("../middleware/async-handler");
const rider_auth_1 = require("../middleware/rider-auth");
const supabase_1 = require("../supabase");
// Secure rider GPS write. requireRider resolves the session token to a rider id
// server-side, so a caller can never upsert another rider's row.
exports.riderLocationRouter = (0, express_1.Router)();
exports.riderLocationRouter.post('/', rider_auth_1.requireRider, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const body = (req.body ?? {});
    const { lat, lng, is_available } = body;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
        return res.status(400).json({ error: 'invalid_coordinates' });
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({ error: 'coordinates_out_of_range' });
    }
    const row = {
        rider_id: req.riderId,
        lat,
        lng,
        updated_at: new Date().toISOString(),
    };
    if (typeof is_available === 'boolean')
        row.is_available = is_available;
    const { error } = await supabase_1.admin
        .from('rider_locations')
        .upsert(row, { onConflict: 'rider_id' });
    if (error)
        return res.status(400).json({ error: error.message });
    return res.status(200).json({ ok: true });
}));
//# sourceMappingURL=rider-location.js.map