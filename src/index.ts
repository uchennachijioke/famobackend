import cors from 'cors';
import type { NextFunction, Request, Response } from 'express';
import express from 'express';

import { env } from './env';
import { geoRouter } from './routes/geo';
import { riderAuthRouter } from './routes/rider-auth';
import { riderCancelDeliveryRouter } from './routes/rider-cancel-delivery';
import { riderDeleteRouter } from './routes/rider-delete';
import { riderDeliveriesRouter } from './routes/rider-deliveries';
import { riderDocumentsRouter } from './routes/rider-documents';
import { riderLocationRouter } from './routes/rider-location';
import { riderProfileRouter } from './routes/rider-profile';
import { riderPushTokenRouter } from './routes/rider-push-token';
import { riderRespondOfferRouter } from './routes/rider-respond-offer';
import { riderSubmitApplicationRouter } from './routes/rider-submit-application';
import { riderUpdateDeliveryRouter } from './routes/rider-update-delivery';

const app = express();

app.use(
  cors({
    origin: env.corsOrigins.length > 0 ? env.corsOrigins : true,
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['authorization', 'x-client-info', 'apikey', 'content-type', 'x-rider-token'],
  }),
);
app.use(express.json({ limit: '1mb' }));

// Health check (used by Render and for quick sanity tests).
app.get('/health', (_req, res) => res.json({ ok: true, service: 'famo-backend' }));

// Routes mirror the old Edge Function slugs 1:1, so clients only change the
// base URL (e.g. supabase .../functions/v1/rider-auth -> BACKEND_URL/rider-auth).
app.use('/rider-auth', riderAuthRouter);
app.use('/rider-location', riderLocationRouter);
app.use('/rider-deliveries', riderDeliveriesRouter);
app.use('/rider-respond-offer', riderRespondOfferRouter);
app.use('/rider-update-delivery', riderUpdateDeliveryRouter);
app.use('/rider-cancel-delivery', riderCancelDeliveryRouter);
app.use('/rider-profile', riderProfileRouter);
app.use('/rider-push-token', riderPushTokenRouter);
app.use('/rider-submit-application', riderSubmitApplicationRouter);
app.use('/rider-documents', riderDocumentsRouter);
app.use('/rider-delete', riderDeleteRouter);
app.use('/geo', geoRouter);

// 404 for unknown routes.
app.use((_req, res) => res.status(404).json({ error: 'not_found' }));

// Central error handler.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  if (res.headersSent) return;
  res.status(500).json({ error: 'internal_error' });
});

app.listen(env.port, () => {
  console.log(`famo-backend listening on port ${env.port}`);
});
