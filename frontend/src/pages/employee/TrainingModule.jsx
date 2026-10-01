/**
 * TrainingModule.jsx
 * ----------------------------------------------------------------------------
 * Displays a lesson followed by its quiz. The quiz is graded on the SERVER
 * (backend/src/modules/training/training.service.js submitQuiz) — this
 * component only collects the employee's selected option per question and
 * shows the result the server returns. It never has access to the correct
 * answers before submission, matching the Application AUP's requirement
 * that quizzes assess "genuine understanding, not merely a completed
 * status."
 * ----------------------------------------------------------------------------
 */
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import YouTubeCard from '../../components/YouTubeCard';

export default function TrainingModule() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trainingModule, setModule] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { api.get(`/training/${id}`).then((r) => setModule(r.data.module)); }, [id]);

  function selectAnswer(questionId, optionKey) {
    setAnswers((a) => ({ ...a, [questionId]: optionKey }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await api.post(`/training/${id}/submit`, { answers });
      setResult(data);
    } finally {
      setSubmitting(false);
    }
  }

  if (!trainingModule) return <p className="text-sm text-slate-500">Loading module…</p>;

  const allAnswered = trainingModule.questions.every((q) => answers[q.id]);

  return (
    <div className="space-y-4">
      <div className="card">
        <h1 className="text-2xl font-bold text-slate-900">{trainingModule.title}</h1>

        {/* Companion video, placed immediately under the topic heading as requested.
            Renders nothing automatically if this module has no video_url set. */}
        <YouTubeCard url={trainingModule.video_url} title={trainingModule.title} />

        <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{trainingModule.lesson_content}</p>
      </div>

      <div className="card">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Quiz ({trainingModule.questions.length} questions — pass mark {trainingModule.pass_mark_percent}%)
        </h2>

        {result ? (
          <div className={`rounded-md p-4 ${result.passed ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'bg-brand-50 ring-1 ring-brand-200'}`}>
            <p className={`font-semibold ${result.passed ? 'text-emerald-700' : 'text-brand-700'}`}>
              You scored {result.scorePercent}% ({result.correctCount}/{result.totalQuestions} correct) — {result.passed ? 'Passed!' : 'Not yet passed'}
            </p>
            {!result.passed && (
              <button className="btn-secondary mt-3" onClick={() => { setResult(null); setAnswers({}); }}>Try again</button>
            )}
            {result.passed && <button className="btn-primary mt-3" onClick={() => navigate('/training')}>Back to Training</button>}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {trainingModule.questions.map((q, idx) => (
              <fieldset key={q.id}>
                <legend className="text-sm font-medium text-slate-800">{idx + 1}. {q.prompt}</legend>
                <div className="mt-2 space-y-1">
                  {q.options.map((opt) => (
                    <label key={opt.key} className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-slate-50">
                      <input
                        type="radio" name={q.id} value={opt.key}
                        checked={answers[q.id] === opt.key}
                        onChange={() => selectAnswer(q.id, opt.key)}
                        className="text-brand-500 focus:ring-brand-500"
                      />
                      {opt.key}) {opt.text}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
            <button type="submit" disabled={!allAnswered || submitting} className="btn-primary">
              {submitting ? 'Submitting…' : 'Submit quiz'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
