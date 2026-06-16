"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.riderPushTokenRouter = void 0;
const express_1 = require("express");
const async_handler_1 = require("../middleware/async-handler");
const rider_auth_1 = require("../middleware/rider-auth");
const supabase_1 = require("../supabase");
// Saves a rider's Expo push token so the notify_rider_of_offer trigger can
// reach their device while the app is backgrounded/closed.
exports.riderPushTokenRouter = (0, express_1.Router)();
exports.riderPushTokenRouter.post('/', rider_auth_1.requireRider, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const body = (req.body ?? {});
    const token = (body.expo_push_token ?? body.expoPushToken ?? '').trim();
    if (!token)
        return res.status(400).json({ error: 'missing_token' });
    const { error } = await supabase_1.admin
        .from('riders')
        .update({ expo_push_token: token, push_token_updated_at: new Date().toISOString() })
        .eq('id', req.riderId);
    if (error)
        return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
}));
//# sourceMappingURL=rider-push-token.js.map