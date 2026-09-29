const service = require('./audit.service');

async function list(req, res, next) {
  try { res.json({ entries: await service.listAuditLog(req.query) }); } catch (err) { next(err); }
}

async function failedLoginKpi(req, res, next) {
  try { res.json(await service.getFailedLoginKpi(req.query.hours)); } catch (err) { next(err); }
}

async function activitySummary(req, res, next) {
  try { res.json({ summary: await service.getRecentActivitySummary() }); } catch (err) { next(err); }
}

// CSV export — "records that can be exported for internal review,
// reporting, and audit purposes" (Proposal Section 5).
async function exportCsv(req, res, next) {
  try {
    const entries = await service.listAuditLog({ ...req.query, limit: 1000 });
    const header = 'id,actor_email,action,target_type,target_id,ip_address,created_at\n';
    const rows = entries.map((e) =>
      [e.id, e.actor_email, e.action, e.target_type || '', e.target_id || '', e.ip_address || '', e.created_at.toISOString()]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="audit-log-export.csv"');
    res.send(header + rows);
  } catch (err) { next(err); }
}

module.exports = { list, failedLoginKpi, activitySummary, exportCsv };
