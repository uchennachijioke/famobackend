"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractRiderToken = extractRiderToken;
exports.requireRider = requireRider;
const supabase_1 = require("../supabase");
/**
 * Pull the rider session token from (in priority order):
 *  1. Authorization: Bearer <token>  (ignored if it looks like a JWT — has a '.')
 *  2. x-rider-token header
 *  3. body.token
 * This mirrors the old Edge Function behaviour so the rider app only needs a
 * base-URL change.
 */
function extractRiderToken(req) {
    const auth = req.headers.authorization ?? '';
    const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
    if (bearer && !bearer.includes('.'))
        return bearer;
    const header = req.headers['x-rider-token'];
    if (typeof header === 'string' && header)
        return header;
    const bodyToken = req.body?.token;
    return typeof bodyToken === 'string' ? bodyToken : null;
}
/**
 * Express middleware: resolves the rider session token to a rider id via the
 * `rider_verify_token` DB function and attaches it to req.riderId.
 * Responds 401 if the token is missing or invalid.
 */
async function requireRider(req, res, next) {
    const token = extractRiderToken(req);
    if (!token) {
        res.status(401).json({ error: 'missing_token' });
        return;
    }
    const { data, error } = await supabase_1.admin.rpc('rider_verify_token', { p_token: token });
    if (error || !data) {
        res.status(401).json({ error: 'unauthorized' });
        return;
    }
    req.riderId = data;
    next();
}
//# sourceMappingURL=rider-auth.js.map