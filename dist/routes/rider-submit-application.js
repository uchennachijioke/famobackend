"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.riderSubmitApplicationRouter = void 0;
const express_1 = require("express");
const async_handler_1 = require("../middleware/async-handler");
const rider_auth_1 = require("../middleware/rider-auth");
const supabase_1 = require("../supabase");
// Marks a rider's onboarding application as submitted by moving their status
// to 'pending_approval' (the value the rider app gates the login flow on).
exports.riderSubmitApplicationRouter = (0, express_1.Router)();
exports.riderSubmitApplicationRouter.post('/', rider_auth_1.requireRider, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { error } = await supabase_1.admin
        .from('riders')
        .update({ status: 'pending_approval' })
        .eq('id', req.riderId);
    if (error)
        return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true, status: 'pending_approval' });
}));
//# sourceMappingURL=rider-submit-application.js.map