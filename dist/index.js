"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const env_1 = require("./env");
const geo_1 = require("./routes/geo");
const rider_auth_1 = require("./routes/rider-auth");
const rider_cancel_delivery_1 = require("./routes/rider-cancel-delivery");
const rider_delete_1 = require("./routes/rider-delete");
const rider_deliveries_1 = require("./routes/rider-deliveries");
const rider_documents_1 = require("./routes/rider-documents");
const rider_location_1 = require("./routes/rider-location");
const rider_profile_1 = require("./routes/rider-profile");
const rider_respond_offer_1 = require("./routes/rider-respond-offer");
const rider_update_delivery_1 = require("./routes/rider-update-delivery");
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: env_1.env.corsOrigins.length > 0 ? env_1.env.corsOrigins : true,
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['authorization', 'x-client-info', 'apikey', 'content-type', 'x-rider-token'],
}));
app.use(express_1.default.json({ limit: '1mb' }));
// Health check (used by Render and for quick sanity tests).
app.get('/health', (_req, res) => res.json({ ok: true, service: 'famo-backend' }));
// Routes mirror the old Edge Function slugs 1:1, so clients only change the
// base URL (e.g. supabase .../functions/v1/rider-auth -> BACKEND_URL/rider-auth).
app.use('/rider-auth', rider_auth_1.riderAuthRouter);
app.use('/rider-location', rider_location_1.riderLocationRouter);
app.use('/rider-deliveries', rider_deliveries_1.riderDeliveriesRouter);
app.use('/rider-respond-offer', rider_respond_offer_1.riderRespondOfferRouter);
app.use('/rider-update-delivery', rider_update_delivery_1.riderUpdateDeliveryRouter);
app.use('/rider-cancel-delivery', rider_cancel_delivery_1.riderCancelDeliveryRouter);
app.use('/rider-profile', rider_profile_1.riderProfileRouter);
app.use('/rider-documents', rider_documents_1.riderDocumentsRouter);
app.use('/rider-delete', rider_delete_1.riderDeleteRouter);
app.use('/geo', geo_1.geoRouter);
// 404 for unknown routes.
app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
// Central error handler.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err, _req, res, _next) => {
    console.error('Unhandled error:', err);
    if (res.headersSent)
        return;
    res.status(500).json({ error: 'internal_error' });
});
app.listen(env_1.env.port, () => {
    console.log(`famo-backend listening on port ${env_1.env.port}`);
});
//# sourceMappingURL=index.js.map