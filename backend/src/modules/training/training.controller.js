const service = require('./training.service');
const { recordAudit } = require('../../middleware/auditLogger');

async function list(req, res, next) {
  try { res.json({ modules: await service.listModulesWithProgress(req.user.id) }); }
  catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const trainingModule = await service.getModuleWithQuiz(req.params.id);
    if (!trainingModule) return res.status(404).json({ error: 'Module not found.' });
    await service.markInProgress(req.user.id, req.params.id);
    res.json({ module: trainingModule });
  } catch (err) { next(err); }
}

async function submit(req, res, next) {
  try {
    const result = await service.submitQuiz(req.user.id, req.params.id, req.body.answers);
    await recordAudit({
      actorId: req.user.id, action: result.passed ? 'QUIZ_PASSED' : 'QUIZ_FAILED',
      targetType: 'training_module', targetId: req.params.id,
      details: { scorePercent: result.scorePercent }, ipAddress: req.ip,
    });
    res.json(result);
  } catch (err) { next(err); }
}

async function incomplete(req, res, next) {
  try { res.json({ incomplete: await service.listIncompleteTraining() }); }
  catch (err) { next(err); }
}

async function completionRate(req, res, next) {
  try { res.json(await service.getOrgCompletionRate()); }
  catch (err) { next(err); }
}

module.exports = { list, getOne, submit, incomplete, completionRate };
