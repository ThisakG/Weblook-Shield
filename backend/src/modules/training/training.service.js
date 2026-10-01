/**
 * training.service.js
 * ----------------------------------------------------------------------------
 * Backs the "Security Awareness Section": guided lessons, scored quizzes,
 * and progress tracking that feeds both the User Dashboard ("tracking of
 * the employee's own progress") and Admin/System Owner compliance views.
 * ----------------------------------------------------------------------------
 */
const { pool } = require('../../config/db');

async function listModulesWithProgress(userId) {
  const { rows } = await pool.query(
    `SELECT m.id, m.title, m.description, m.estimated_minutes, m.order_index, m.pass_mark_percent, m.video_url,
            COALESCE(tp.status, 'not_started') AS status, tp.completed_at
     FROM training_modules m
     LEFT JOIN training_progress tp ON tp.module_id = m.id AND tp.user_id = $1
     ORDER BY m.order_index ASC`,
    [userId]
  );
  return rows;
}

async function getModuleWithQuiz(moduleId) {
  const moduleRes = await pool.query(`SELECT * FROM training_modules WHERE id = $1`, [moduleId]);
  const trainingModule = moduleRes.rows[0];
  if (!trainingModule) return null;

  // Quiz questions are returned WITHOUT the `correct_option` field — that
  // must never reach the client before submission, or a curious employee
  // could read it directly from the network tab and defeat the quiz's
  // purpose ("genuine understanding, not merely a completed status" —
  // Application AUP §3.3).
  const questionsRes = await pool.query(
    `SELECT id, prompt, options, order_index FROM quiz_questions WHERE module_id = $1 ORDER BY order_index`,
    [moduleId]
  );
  trainingModule.questions = questionsRes.rows;
  return trainingModule;
}

async function markInProgress(userId, moduleId) {
  await pool.query(
    `INSERT INTO training_progress (user_id, module_id, status)
     VALUES ($1, $2, 'in_progress')
     ON CONFLICT (user_id, module_id) DO UPDATE SET status = CASE WHEN training_progress.status = 'completed' THEN 'completed' ELSE 'in_progress' END`,
    [userId, moduleId]
  );
}

// Grades a quiz submission SERVER-SIDE against the stored correct_option —
// the client only ever sends its selected answers, never the score, so a
// tampered client request cannot forge a passing grade.
async function submitQuiz(userId, moduleId, answers) {
  const moduleRes = await pool.query(`SELECT pass_mark_percent FROM training_modules WHERE id = $1`, [moduleId]);
  const trainingModule = moduleRes.rows[0];
  if (!trainingModule) {
    const err = new Error('Training module not found.');
    err.statusCode = 404;
    throw err;
  }

  const questionsRes = await pool.query(`SELECT id, correct_option FROM quiz_questions WHERE module_id = $1`, [moduleId]);
  const questions = questionsRes.rows;
  if (!questions.length) {
    const err = new Error('This module has no quiz questions configured.');
    err.statusCode = 400;
    throw err;
  }

  let correctCount = 0;
  for (const q of questions) {
    const submitted = answers[q.id];
    if (submitted && submitted === q.correct_option) correctCount += 1;
  }
  const scorePercent = Math.round((correctCount / questions.length) * 100);
  const passed = scorePercent >= trainingModule.pass_mark_percent;

  await pool.query(
    `INSERT INTO quiz_attempts (user_id, module_id, score_percent, passed) VALUES ($1, $2, $3, $4)`,
    [userId, moduleId, scorePercent, passed]
  );

  if (passed) {
    await pool.query(
      `INSERT INTO training_progress (user_id, module_id, status, completed_at)
       VALUES ($1, $2, 'completed', now())
       ON CONFLICT (user_id, module_id) DO UPDATE SET status = 'completed', completed_at = now()`,
      [userId, moduleId]
    );
  }

  return { scorePercent, passed, correctCount, totalQuestions: questions.length, passMark: trainingModule.pass_mark_percent };
}

// Feeds the "automated reminder notifications for employees with ...
// incomplete modules" requirement, and the Admin/System Owner dashboards.
async function listIncompleteTraining() {
  const { rows } = await pool.query(
    `SELECT u.id AS user_id, u.full_name, u.email, m.title AS module_title
     FROM users u
     CROSS JOIN training_modules m
     LEFT JOIN training_progress tp ON tp.module_id = m.id AND tp.user_id = u.id AND tp.status = 'completed'
     WHERE u.status = 'active' AND tp.id IS NULL
     ORDER BY u.full_name, m.order_index`
  );
  return rows;
}

// Aggregate KPI used by the Admin/System Owner analytics dashboard: overall
// training-completion rate across the organisation.
async function getOrgCompletionRate() {
  const { rows } = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM users WHERE status = 'active') AS active_users,
      (SELECT COUNT(*) FROM training_modules) AS total_modules,
      (SELECT COUNT(*) FROM training_progress WHERE status = 'completed') AS completed_count
  `);
  const row = rows[0];
  const possible = Number(row.active_users) * Number(row.total_modules);
  const rate = possible > 0 ? Math.round((Number(row.completed_count) / possible) * 100) : 0;
  return { activeUsers: Number(row.active_users), totalModules: Number(row.total_modules), completedCount: Number(row.completed_count), completionRatePercent: rate };
}

module.exports = { listModulesWithProgress, getModuleWithQuiz, markInProgress, submitQuiz, listIncompleteTraining, getOrgCompletionRate };
