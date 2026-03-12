import { boardColumns, clawtaskSeed as fallbackSeed, type BoardStatus, type ClawTaskSeed, type Task } from '@/data/clawtaskSeed'

function getSeed(seed?: ClawTaskSeed) {
  return seed ?? fallbackSeed
}

export function getTasksByStatus(status: BoardStatus, seed?: ClawTaskSeed): Task[] {
  return getSeed(seed).tasks.filter((task) => task.status === status)
}

export function getBoardColumns(seed?: ClawTaskSeed) {
  return boardColumns.map((status) => ({
    status,
    tasks: getTasksByStatus(status, seed),
  }))
}

export function getActiveTasks(seed?: ClawTaskSeed) {
  return getTasksByStatus('active', seed)
}

export function getBlockedTasks(seed?: ClawTaskSeed) {
  return getTasksByStatus('blocked', seed)
}

export function getReadyTasks(seed?: ClawTaskSeed) {
  return getTasksByStatus('ready', seed)
}

export function getReviewTasks(seed?: ClawTaskSeed) {
  return getTasksByStatus('review', seed)
}

export function getProductStats(seed?: ClawTaskSeed) {
  const data = getSeed(seed)
  return {
    productCount: data.products.length,
    epicCount: data.epics.length,
    milestoneCount: data.milestones.length,
    dependencyCount: data.dependencies.length,
    blockerCount: data.blockers.length,
  }
}

export function getPriorityCounts(seed?: ClawTaskSeed) {
  return getSeed(seed).tasks.reduce(
    (acc, task) => {
      acc[task.priority] += 1
      return acc
    },
    { p0: 0, p1: 0, p2: 0, p3: 0 },
  )
}
