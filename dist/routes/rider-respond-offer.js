"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.riderRespondOfferRouter = void 0;
const express_1 = require("express");
const async_handler_1 = require("../middleware/async-handler");
const rider_auth_1 = require("../middleware/rider-auth");
const supabase_1 = require("../supabase");
// Rider accepts or declines a pending offer. rider_id is derived server-side so
// a caller can never accept/decline on another rider's behalf.
exports.riderRespondOfferRouter = (0, express_1.Router)();
exports.riderRespondOfferRouter.post('/', rider_auth_1.requireRider, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const payload = (req.body ?? {});
    const { action } = payload;
    const offer_id = payload.offer_id ?? payload.offerId;
    if (!offer_id)
        return res.status(400).json({ error: 'missing_offer_id' });
    if (action !== 'accept' && action !== 'decline') {
        return res.status(400).json({ error: 'unknown_action' });
    }
    const rpc = action === 'accept' ? 'accept_offer' : 'decline_offer';
    const { data, error } = await supabase_1.admin.rpc(rpc, {
        p_offer_id: offer_id,
        p_rider_id: req.riderId,
    });
    if (error)
        return res.status(400).json({ error: error.message });
    // accept_offer/decline_offer return a boolean: false means too-late/not-theirs.
    const success = data === true;
    return res.status(success ? 200 : 409).json({ ok: success, action });
}));
//# sourceMappingURL=rider-respond-offer.js.map