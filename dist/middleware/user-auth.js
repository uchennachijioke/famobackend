"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireUser = requireUser;
const supabase_1 = require("../supabase");
/**
 * Express middleware: verifies a Supabase user access token (JWT) from the
 * Authorization header and attaches req.userId. This gives the geo proxy the
 * same protection the Edge Function had via verify_jwt — only signed-in app
 * users can spend the Google Maps quota.
 */
async function requireUser(req, res, next) {
    const auth = req.headers.authorization ?? '';
    const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
    if (!token) {
        res.status(401).json({ error: 'unauthorized' });
        return;
    }
    const { data, error } = await supabase_1.admin.auth.getUser(token);
    if (error || !data?.user) {
        res.status(401).json({ error: 'unauthorized' });
        return;
    }
    req.userId = data.user.id;
    next();
}
//# sourceMappingURL=user-auth.js.map