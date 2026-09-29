const service = require('./dashboard.service');

async function overview(req, res, next) {
  try { res.json(await service.getOverview()); } catch (err) { next(err); }
}

module.exports = { overview };
