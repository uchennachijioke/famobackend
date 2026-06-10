"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.riderDeleteRouter = void 0;
const express_1 = require("express");
const async_handler_1 = require("../middleware/async-handler");
const rider_auth_1 = require("../middleware/rider-auth");
const supabase_1 = require("../supabase");
// Permanently deletes the calling rider (after the token is verified), unless
// they have an in-progress delivery. Cleans up their uploaded documents first.
exports.riderDeleteRouter = (0, express_1.Router)();
const BUCKET = 'rider-documents';
exports.riderDeleteRouter.post('/', rider_auth_1.requireRider, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const riderId = req.riderId;
    // Refuse to delete while the rider has an active (in-progress) delivery.
    const { data: active, error: activeErr } = await supabase_1.admin
        .from('deliveries')
        .select('id')
        .eq('rider_id', riderId)
        .in('status', ['accepted', 'picked_up'])
        .limit(1);
    if (activeErr)
        return res.status(400).json({ error: activeErr.message });
    if (active && active.length > 0)
        return res.status(409).json({ error: 'active_delivery' });
    // Remove the rider's uploaded documents (best effort).
    const { data: files } = await supabase_1.admin.storage.from(BUCKET).list(riderId);
    if (files && files.length > 0) {
        const paths = files.map((f) => `${riderId}/${f.name}`);
        await supabase_1.admin.storage.from(BUCKET).remove(paths);
    }
    // Deleting the rider cascades to rider_locations, delivery_offers,
    // rider_sessions and sets deliveries.rider_id to NULL.
    const { error: delErr } = await supabase_1.admin.from('riders').delete().eq('id', riderId);
    if (delErr)
        return res.status(400).json({ error: delErr.message });
    return res.status(200).json({ ok: true, deleted: true });
}));
//# sourceMappingURL=rider-delete.js.map