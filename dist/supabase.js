"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.admin = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const env_1 = require("./env");
// Admin client — uses the service-role key, bypasses RLS. Server-only.
// Every route uses this to run the same queries / RPCs the Edge Functions did.
exports.admin = (0, supabase_js_1.createClient)(env_1.env.supabaseUrl, env_1.env.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
});
//# sourceMappingURL=supabase.js.map