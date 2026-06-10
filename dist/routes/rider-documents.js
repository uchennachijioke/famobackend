"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.riderDocumentsRouter = void 0;
const express_1 = require("express");
const async_handler_1 = require("../middleware/async-handler");
const rider_auth_1 = require("../middleware/rider-auth");
const supabase_1 = require("../supabase");
// Issues signed upload/download URLs for a rider's verification documents,
// always scoped under the rider's own id folder in the private bucket.
exports.riderDocumentsRouter = (0, express_1.Router)();
const BUCKET = 'rider-documents';
// doc_type -> riders column that stores the object path.
const DOC_COLUMN = {
    license: 'license_path',
    license_front: 'license_front_path',
    license_back: 'license_back_path',
    selfie: 'selfie_path',
    selfie_with_license: 'selfie_with_license_path',
};
exports.riderDocumentsRouter.post('/', rider_auth_1.requireRider, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const body = (req.body ?? {});
    const riderId = req.riderId;
    const action = typeof body.action === 'string' ? body.action : 'sign_upload';
    const docType = typeof body.doc_type === 'string' ? body.doc_type : '';
    const column = DOC_COLUMN[docType];
    if (!column)
        return res.status(400).json({ error: 'invalid_doc_type' });
    // Path is always scoped under the rider's own id folder.
    const ext = typeof body.ext === 'string' && /^[a-z0-9]{1,5}$/i.test(body.ext) ? body.ext : 'jpg';
    const path = `${riderId}/${docType}.${ext}`;
    if (action === 'sign_upload') {
        const { data, error } = await supabase_1.admin.storage
            .from(BUCKET)
            .createSignedUploadUrl(path, { upsert: true });
        if (error)
            return res.status(400).json({ error: error.message });
        // Record the path on the rider row now (path is deterministic).
        const { error: updErr } = await supabase_1.admin
            .from('riders')
            .update({ [column]: path })
            .eq('id', riderId);
        if (updErr)
            return res.status(400).json({ error: updErr.message });
        return res.status(200).json({
            ok: true,
            bucket: BUCKET,
            path,
            token: data.token,
            signedUrl: data.signedUrl,
        });
    }
    // Issue a short-lived signed URL to view an already-uploaded document.
    if (action === 'sign_download') {
        const { data, error } = await supabase_1.admin.storage.from(BUCKET).createSignedUrl(path, 300);
        if (error)
            return res.status(400).json({ error: error.message });
        return res.status(200).json({ ok: true, signedUrl: data.signedUrl });
    }
    return res.status(400).json({ error: 'unknown_action' });
}));
//# sourceMappingURL=rider-documents.js.map