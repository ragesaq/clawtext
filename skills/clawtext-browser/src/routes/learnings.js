/**
 * routes/learnings.js — ESM version
 */

import express from 'express';
import {
  getAllLearnings,
  searchLearnings,
  getLearning,
  addUserResolution,
  updateResolutionStatus,
  getStats
} from '../learnings-store.js';

const router = express.Router();

router.get('/stats', (req, res) => {
  res.json(getStats());
});

// Export must come before /:id to avoid route conflict
router.get('/export/promote-ready', (req, res) => {
  const all = getAllLearnings(true);
  const ready = all.filter(l => l.resolutionStatus === 'resolved' && l.userResolution && !l.promotedTo);
  const formatted = ready.map(l => ({
    id: l.id,
    problem: l.problem,
    context: l.context,
    agentAnalysis: l.agentAnalysis,
    userResolution: l.userResolution,
    resolvedAt: l.userResolutionAt,
    tags: l.tags,
    severity: l.severity
  }));
  res.json({ count: formatted.length, items: formatted });
});

router.get('/', (req, res) => {
  const { q, status, resolutionStatus, limit } = req.query;
  const results = searchLearnings(q || '', {
    status,
    resolutionStatus,
    limit: limit ? parseInt(limit) : 50
  });
  res.json({ results, count: results.length });
});

router.get('/:id', (req, res) => {
  const learning = getLearning(req.params.id);
  if (!learning) return res.status(404).json({ error: 'Learning not found' });
  res.json(learning);
});

router.post('/:id/resolve', (req, res) => {
  const { resolution, readyToPromote } = req.body;
  if (!resolution || !resolution.trim()) {
    return res.status(400).json({ error: 'resolution is required' });
  }
  const result = addUserResolution(req.params.id, resolution, { readyToPromote });
  res.json(result);
});

router.patch('/:id/status', (req, res) => {
  const { status } = req.body;
  const allowed = ['promoted', 'dismissed', 'resolved', 'unresolved'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
  }
  const result = updateResolutionStatus(req.params.id, status);
  res.json(result);
});

export default router;
