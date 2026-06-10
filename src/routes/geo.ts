import { Router } from 'express';

import { env } from '../env';
import { gmaps } from '../google';
import { asyncHandler } from '../middleware/async-handler';
import { requireUser } from '../middleware/user-auth';

// Server-side proxy for Google Maps web-service APIs (Places Autocomplete,
// Place Details, Directions). requireUser ensures only signed-in app users can
// spend the Google quota. The API key never reaches the client.
export const geoRouter = Router();

geoRouter.post(
  '/',
  requireUser,
  asyncHandler(async (req, res) => {
    if (!env.googleMapsApiKey) {
      return res.status(503).json({ error: 'maps_not_configured' });
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const action = typeof body.action === 'string' ? body.action : '';

    try {
      if (action === 'autocomplete') {
        const input = typeof body.input === 'string' ? body.input.trim() : '';
        if (input.length < 2) return res.status(200).json({ ok: true, predictions: [] });
        const params: Record<string, string> = { input };
        if (typeof body.session === 'string') params.sessiontoken = body.session;
        if (typeof body.country === 'string') params.components = `country:${body.country}`;
        const data = await gmaps('place/autocomplete/json', params);
        if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
          return res.status(400).json({ error: 'places_error', status: data.status });
        }
        const predictions = (data.predictions ?? []).map((p: any) => ({
          place_id: p.place_id,
          description: p.description,
          main_text: p.structured_formatting?.main_text ?? p.description,
          secondary_text: p.structured_formatting?.secondary_text ?? '',
        }));
        return res.status(200).json({ ok: true, predictions });
      }

      if (action === 'details') {
        const placeId = typeof body.place_id === 'string' ? body.place_id : '';
        if (!placeId) return res.status(400).json({ error: 'missing_place_id' });
        const params: Record<string, string> = {
          place_id: placeId,
          fields: 'geometry,formatted_address,name',
        };
        if (typeof body.session === 'string') params.sessiontoken = body.session;
        const data = await gmaps('place/details/json', params);
        if (data.status !== 'OK') {
          return res.status(400).json({ error: 'details_error', status: data.status });
        }
        const loc = data.result?.geometry?.location;
        if (!loc) return res.status(400).json({ error: 'no_location' });
        return res.status(200).json({
          ok: true,
          place: {
            address: data.result.formatted_address ?? data.result.name ?? '',
            lat: loc.lat,
            lng: loc.lng,
          },
        });
      }

      if (action === 'directions') {
        const o = body.origin as { lat?: number; lng?: number } | undefined;
        const d = body.destination as { lat?: number; lng?: number } | undefined;
        if (
          !o ||
          !d ||
          typeof o.lat !== 'number' ||
          typeof o.lng !== 'number' ||
          typeof d.lat !== 'number' ||
          typeof d.lng !== 'number'
        ) {
          return res.status(400).json({ error: 'invalid_coordinates' });
        }
        const data = await gmaps('directions/json', {
          origin: `${o.lat},${o.lng}`,
          destination: `${d.lat},${d.lng}`,
          mode: 'driving',
        });
        if (data.status !== 'OK') {
          return res.status(400).json({ error: 'directions_error', status: data.status });
        }
        const leg = data.routes?.[0]?.legs?.[0];
        if (!leg) return res.status(400).json({ error: 'no_route' });
        return res.status(200).json({
          ok: true,
          route: {
            distance_meters: leg.distance?.value ?? 0,
            duration_seconds: leg.duration?.value ?? 0,
            polyline: data.routes[0].overview_polyline?.points ?? null,
          },
        });
      }

      return res.status(400).json({ error: 'unknown_action' });
    } catch (e) {
      return res.status(502).json({ error: 'upstream_error', detail: String(e) });
    }
  }),
);
