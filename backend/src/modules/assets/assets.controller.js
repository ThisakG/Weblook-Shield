const service = require('./assets.service');
const { recordAudit } = require('../../middleware/auditLogger');

async function inventory(req, res, next) {
  try { res.json({ assets: await service.listInventory() }); } catch (err) { next(err); }
}

async function myAssets(req, res, next) {
  try { res.json({ assets: await service.listMyAssets(req.user.id) }); } catch (err) { next(err); }
}

async function createRequest(req, res, next) {
  try {
    const request = await service.createRequest(req.user.id, req.body);
    await recordAudit({ actorId: req.user.id, action: 'ASSET_REQUESTED', targetType: 'asset_request', targetId: request.id, details: { assetType: req.body.assetType }, ipAddress: req.ip });
    res.status(201).json({ request });
  } catch (err) { next(err); }
}

async function myRequests(req, res, next) {
  try { res.json({ requests: await service.listMyRequests(req.user.id) }); } catch (err) { next(err); }
}

async function allRequests(req, res, next) {
  try { res.json({ requests: await service.listAllRequests(req.query.status) }); } catch (err) { next(err); }
}

async function resolve(req, res, next) {
  try {
    const result = await service.resolveRequest(req.params.id, { ...req.body, resolvedBy: req.user.id });
    await recordAudit({ actorId: req.user.id, action: 'ASSET_REQUEST_RESOLVED', targetType: 'asset_request', targetId: req.params.id, details: { status: req.body.status }, ipAddress: req.ip });
    res.json({ result });
  } catch (err) { next(err); }
}

async function createAsset(req, res, next) {
  try {
    const assetId = await service.createAsset(req.body);
    await recordAudit({ actorId: req.user.id, action: 'ASSET_ADDED', targetType: 'asset', targetId: assetId, ipAddress: req.ip });
    res.status(201).json({ assetId });
  } catch (err) { next(err); }
}

module.exports = { inventory, myAssets, createRequest, myRequests, allRequests, resolve, createAsset };
