/**
 * Search API — /api/search
 */
import { Router } from 'express';

const router = Router();

export default function searchRoutes(memoryStore) {
  /**
   * GET /api/search?q=RGCS&limit=20&project=rgcs
   */
  router.get('/', (req, res) => {
    const { q = '', limit = 20, project } = req.query;

    if (!q.trim()) {
      return res.json({ results: [], query: q, total: 0 });
    }

    const results = memoryStore.search(q, {
      limit: Math.min(parseInt(limit), 100),
      projectFilter: project || null,
    });

    res.json({
      query: q,
      total: results.length,
      results: results.map(r => ({
        id: r.id || r._id,
        content: r.content,
        title: r.title,
        project: r.project,
        type: r.type,
        date: r.date,
        clusterId: r.clusterId,
        clusterTopic: r.clusterTopic,
        entities: r.entities || [],
        keywords: r.keywords || [],
        score: r._score,
      })),
    });
  });

  /**
   * GET /api/search/suggest?q=RG — typeahead suggestions
   */
  router.get('/suggest', (req, res) => {
    const { q = '' } = req.query;
    const entities = memoryStore.getAllEntities();
    const suggestions = entities
      .filter(e => e.toLowerCase().startsWith(q.toLowerCase()))
      .slice(0, 10);
    res.json({ suggestions });
  });

  return router;
}
