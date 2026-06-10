"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gmaps = gmaps;
const env_1 = require("./env");
// Thin wrapper around the Google Maps web-service APIs. The key is held in
// env (server-only) and never reaches the client.
async function gmaps(path, params) {
    const url = new URL(`https://maps.googleapis.com/maps/api/${path}`);
    for (const [k, v] of Object.entries(params))
        url.searchParams.set(k, v);
    url.searchParams.set('key', env_1.env.googleMapsApiKey);
    const res = await fetch(url.toString());
    return res.json();
}
//# sourceMappingURL=google.js.map