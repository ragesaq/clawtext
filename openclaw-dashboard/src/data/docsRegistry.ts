import clawdashHandoff from '../../../docs/CLAWDASH_HANDOFF_2026-03-10.md?raw'
import clawdashHandoffSummary from '../../../docs/CLAWDASH_HANDOFF_SUMMARY_2026-03-10.md?raw'
import clawtaskBoardDraft from '../../../docs/CLAWTASK_BOARD_DRAFT_2026-03-10.md?raw'
import clawtaskFirstMilestonePlan from '../../../docs/CLAWTASK_FIRST_MILESTONE_PLAN_2026-03-10.md?raw'
import clawtaskDomainModel from '../../../docs/CLAWTASK_DOMAIN_MODEL_V0.md?raw'
import clawdashIa from '../../../docs/CLAWDASH_IA_V0.md?raw'
import clawtaskMilestoneLock from '../../../docs/CLAWTASK_MILESTONE1_SCOPE_LOCK_V0.md?raw'
import clawtaskStatusWorkflow from '../../../docs/CLAWTASK_STATUS_WORKFLOW_V0.md?raw'
import clawtaskDependencyNotation from '../../../docs/CLAWTASK_DEPENDENCY_NOTATION_V0.md?raw'
import lanePostDrafts from '../../../docs/CLAWDASH_LANE_POST_DRAFTS_V0.md?raw'

export interface DashboardDoc {
  id: string
  title: string
  category: 'handoff' | 'milestone' | 'model' | 'workflow' | 'lane'
  path: string
  content: string
}

export const dashboardDocs: DashboardDoc[] = [
  {
    id: 'clawdash-handoff',
    title: 'ClawDash Handoff — 2026-03-10',
    category: 'handoff',
    path: 'docs/CLAWDASH_HANDOFF_2026-03-10.md',
    content: clawdashHandoff,
  },
  {
    id: 'clawdash-handoff-summary',
    title: 'ClawDash Handoff Summary — 2026-03-10',
    category: 'handoff',
    path: 'docs/CLAWDASH_HANDOFF_SUMMARY_2026-03-10.md',
    content: clawdashHandoffSummary,
  },
  {
    id: 'clawtask-board-draft',
    title: 'ClawTask Board Draft — 2026-03-10',
    category: 'handoff',
    path: 'docs/CLAWTASK_BOARD_DRAFT_2026-03-10.md',
    content: clawtaskBoardDraft,
  },
  {
    id: 'clawtask-first-milestone-plan',
    title: 'ClawTask First Milestone Plan — 2026-03-10',
    category: 'milestone',
    path: 'docs/CLAWTASK_FIRST_MILESTONE_PLAN_2026-03-10.md',
    content: clawtaskFirstMilestonePlan,
  },
  {
    id: 'clawtask-domain-model-v0',
    title: 'ClawTask Domain Model v0',
    category: 'model',
    path: 'docs/CLAWTASK_DOMAIN_MODEL_V0.md',
    content: clawtaskDomainModel,
  },
  {
    id: 'clawdash-ia-v0',
    title: 'ClawDash Information Architecture v0',
    category: 'model',
    path: 'docs/CLAWDASH_IA_V0.md',
    content: clawdashIa,
  },
  {
    id: 'clawtask-m1-scope-lock',
    title: 'ClawTask Milestone 1 Scope Lock v0',
    category: 'milestone',
    path: 'docs/CLAWTASK_MILESTONE1_SCOPE_LOCK_V0.md',
    content: clawtaskMilestoneLock,
  },
  {
    id: 'clawtask-status-workflow',
    title: 'ClawTask Status Workflow v0',
    category: 'workflow',
    path: 'docs/CLAWTASK_STATUS_WORKFLOW_V0.md',
    content: clawtaskStatusWorkflow,
  },
  {
    id: 'clawtask-dependency-notation',
    title: 'ClawTask Dependency Notation v0',
    category: 'workflow',
    path: 'docs/CLAWTASK_DEPENDENCY_NOTATION_V0.md',
    content: clawtaskDependencyNotation,
  },
  {
    id: 'clawdash-lane-post-drafts',
    title: 'ClawDash Lane Post Drafts v0',
    category: 'lane',
    path: 'docs/CLAWDASH_LANE_POST_DRAFTS_V0.md',
    content: lanePostDrafts,
  },
]
