/**
 * routes/learnings.js
 * 
 * API routes for operational learnings review + user resolution workflow
 */

const express = require('express');
const router = express.Router();
const store = require('../learnings-store');

// GET /api/learnings/stats
router.get('/stats', (req, res) => {
  res.json(store.getStats());
});

// GET /api/learnings?q=&status=candidate&resolutionStatus=unresolved
router.get('/', (req, res) => {
  const { q, status, resolutionStatus, limit } = req.query;
  const results = store.searchLearnings(q || '', {
    status,
    resolutionStatus,
    limit: limit ? parseInt(limit) : 50
  });
  res.json({ results, count: results.length });
});

// GET /api/learnings/:id
router.get('/:id', (req, res) => {
  const learning = store.getLearning(req.params.id);
  if (!learning) return res.status(404).json({ error: 'Learning not found' });
  res.json(learning);
});

// POST /api/learnings/:id/resolve
// Body: { resolution: "what actually fixed it", readyToPromote: true }
router.post('/:id/resolve', (req, res) => {
  const { resolution, readyToPromote } = req.body;
  if (!resolution || !resolution.trim()) {
    return res.status(400).json({ error: 'resolution is required' });
  }
  const result = store.addUserResolution(req.params.id, resolution, { readyToPromote });
  res.json(result);
});

// PATCH /api/learnings/:id/status
// Body: { status: "promoted" | "dismissed" | "resolved" }
router.patch('/:id/status', (req, res) => {
  const { status } = req.body;
  const allowed = ['promoted', 'dismissed', 'resolved', 'unresolved'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
  }
  const result = store.updateResolutionStatus(req.params.id, status);
  res.json(result);
});

// GET /api/learnings/export/promote-ready
// Returns learnings ready to promote to guidance — for agent consumption
router.get('/export/promote-ready', (req, res) => {
  const all = store.getAllLearnings(true);
  const ready = all.filter(l => {
    return l.resolutionStatus === 'resolved' &&
      l.userResolution &&
      !l.promotedTo;
  });
  
  // Return formatted for agent to use as promotion candidates
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

module.exports = router;
