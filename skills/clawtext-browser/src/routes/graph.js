/**
 * Graph API — /api/graph
 * Returns nodes + edges for the relationship visualization.
 */
import { Router } from 'express';

const router = Router();

export default function graphRoutes(memoryStore, antiPatternStore) {

  /**
   * GET /api/graph
   * Full graph: all clusters as nodes, relationships as edges.
   * Anti-pattern edges shown as red/orange depending on type.
   */
  router.get('/', (req, res) => {
    const graph = memoryStore.buildGraph(antiPatternStore);
    res.json(graph);
  });

  /**
   * GET /api/graph/node/:clusterId
   * Detail for a single node: cluster info + its memories.
   */
  router.get('/node/:clusterId', (req, res) => {
    const cluster = memoryStore.getClusterById(req.params.clusterId);
    if (!cluster) return res.status(404).json({ error: 'Cluster not found' });
    res.json(cluster);
  });

  return router;
}
