export type Priority = 'p0' | 'p1' | 'p2' | 'p3'
export type ProductStatus = 'active' | 'proposed' | 'paused' | 'archived'
export type LaneStatus = 'planned' | 'active' | 'ready' | 'blocked' | 'dormant' | 'done'
export type BoardStatus = 'backlog' | 'ready' | 'active' | 'blocked' | 'review' | 'done' | 'watching'
export type HandoffPreference = 'new_forum_post' | 'existing_thread'
export type HandoffMode = 'research' | 'implement' | 'review'

export interface Product {
  id: string
  slug: string
  name: string
  description: string
  status: ProductStatus
  priority: Priority
}

export interface Lane {
  id: string
  productId: string
  name: string
  status: LaneStatus
}

export interface Milestone {
  id: string
  productId: string
  title: string
  status: 'planned' | 'active' | 'done'
}

export interface Epic {
  id: string
  productId: string
  laneId: string
  title: string
  status: BoardStatus
  priority: Priority
  milestoneId?: string
}

export interface TaskSubtask {
  id: string
  title: string
  status: 'pending' | 'done'
}

export interface Task {
  id: string
  epicId: string
  productId: string
  laneId: string
  title: string
  status: BoardStatus
  type: 'design' | 'code' | 'infra' | 'docs'
  priority: Priority
  summary?: string
  notes?: string
  findings?: string[]
  subtasks?: TaskSubtask[]
  discordForumId?: string
  discordThreadId?: string
  discordLastMessageId?: string
  handoffPreference?: HandoffPreference
  lastHandoffAt?: string
  lastHandoffMode?: HandoffMode
}

export interface Dependency {
  id: string
  fromRef: string
  toRef: string
  kind: 'requires' | 'blocks' | 'feeds' | 'related_to'
}

export interface Blocker {
  id: string
  ref: string
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'mitigated' | 'resolved'
}

export interface Artifact {
  id: string
  title: string
  type: 'doc' | 'thread' | 'dashboard' | 'config'
  pathOrUrl: string
  linkedRefs: string[]
}

export interface MilestoneFocus {
  id: string
  name: string
  inScope: string[]
  outOfScope: string[]
}

export interface ClawTaskSeed {
  version: string
  generatedAt: string
  milestoneFocus: MilestoneFocus
  products: Product[]
  lanes: Lane[]
  milestones: Milestone[]
  epics: Epic[]
  tasks: Task[]
  dependencies: Dependency[]
  blockers: Blocker[]
  artifacts: Artifact[]
}

export const clawtaskSeed: ClawTaskSeed = {
  version: '0.1.1',
  generatedAt: '2026-03-11T04:20:00Z',
  milestoneFocus: {
    id: 'm1_coordination_layer',
    name: 'Milestone 1 — Coordination Layer First',
    inScope: [
      'ClawDash top-level surfaces',
      'ClawTask core model',
      'Board workflow/status semantics',
      'Initial board population with real work',
      'Dependency and blocker visibility',
      'Now / Projects / Tasks / Review surfaces',
      'Integration hooks defined for memory / incidents / telemetry',
    ],
    outOfScope: [
      'Full live Prometheus/Grafana rollout',
      'Full incident automation',
      'Live event bus runtime',
      'Full E-Shadow implementation',
      'Complete grand vision delivery',
    ],
  },
  products: [
    { id: 'prod_clawdash', slug: 'clawdash', name: 'ClawDash', description: 'Top-level control surface and operator cockpit for the OpenClaw ecosystem.', status: 'active', priority: 'p0' },
    { id: 'prod_clawtext', slug: 'clawtext', name: 'ClawText', description: 'Memory, ingest, learning, anti-patterns, and operational knowledge substrate.', status: 'active', priority: 'p0' },
    { id: 'prod_clawtask', slug: 'clawtask', name: 'ClawTask', description: 'Project, task, artifact, blocker, and dependency coordination layer inside ClawDash.', status: 'active', priority: 'p0' },
    { id: 'prod_clawmon', slug: 'clawmon', name: 'ClawMon', description: 'Telemetry, performance, cost, utilization, and historical operational monitoring.', status: 'active', priority: 'p1' },
    { id: 'prod_clawops', slug: 'clawops', name: 'ClawOps', description: 'Incident capture, triage, retry, fallback, escalation, and rewrite system.', status: 'active', priority: 'p1' },
    { id: 'prod_clawhandler', slug: 'clawhandler', name: 'ClawHandler', description: 'Reminder, re-entry, obligation, and executive support layer.', status: 'proposed', priority: 'p2' },
    { id: 'prod_clawworks', slug: 'clawworks', name: 'ClawWorks', description: 'Workshop/skunkworks layer for coding, physical builds, products, and scratchpad ideas.', status: 'proposed', priority: 'p2' },
  ],
  lanes: [
    { id: 'lane_platform_foundations', productId: 'prod_clawdash', name: 'Platform Foundations', status: 'active' },
    { id: 'lane_clawtext_core', productId: 'prod_clawtext', name: 'ClawText Core', status: 'active' },
    { id: 'lane_incident_triage', productId: 'prod_clawops', name: 'Incident / Triage / Provider Health', status: 'ready' },
    { id: 'lane_telemetry', productId: 'prod_clawmon', name: 'Telemetry / ClawMon', status: 'ready' },
    { id: 'lane_clawdash_shell', productId: 'prod_clawdash', name: 'ClawDash', status: 'active' },
    { id: 'lane_clawtask', productId: 'prod_clawtask', name: 'ClawTask', status: 'active' },
    { id: 'lane_clawhandler', productId: 'prod_clawhandler', name: 'ClawHandler', status: 'planned' },
    { id: 'lane_clawworks', productId: 'prod_clawworks', name: 'ClawWorks', status: 'planned' },
  ],
  milestones: [
    { id: 'ms_coordination_layer_m1', productId: 'prod_clawdash', title: 'Milestone 1 — Coordination Layer', status: 'active' },
    { id: 'ms_clawdash_shell_v0', productId: 'prod_clawdash', title: 'ClawDash Shell v0', status: 'active' },
    { id: 'ms_clawtask_board_v0', productId: 'prod_clawtask', title: 'ClawTask Board v0', status: 'active' },
    { id: 'ms_clawmon_metrics_v0', productId: 'prod_clawmon', title: 'ClawMon Metrics v0', status: 'planned' },
    { id: 'ms_incident_triage_v0', productId: 'prod_clawops', title: 'Incident Triage v0', status: 'planned' },
  ],
  epics: [
    { id: 'epic_event_backbone_v0', productId: 'prod_clawdash', laneId: 'lane_platform_foundations', title: 'Shared Event Backbone', status: 'ready', priority: 'p0', milestoneId: 'ms_coordination_layer_m1' },
    { id: 'epic_incident_triage_v0', productId: 'prod_clawops', laneId: 'lane_incident_triage', title: 'Incident & Triage Engine', status: 'ready', priority: 'p0', milestoneId: 'ms_incident_triage_v0' },
    { id: 'epic_telemetry_v0', productId: 'prod_clawmon', laneId: 'lane_telemetry', title: 'Telemetry / ClawMon', status: 'ready', priority: 'p0', milestoneId: 'ms_clawmon_metrics_v0' },
    { id: 'epic_clawtext_operational_health', productId: 'prod_clawtext', laneId: 'lane_clawtext_core', title: 'ClawText Operational Health Lane', status: 'backlog', priority: 'p1' },
    { id: 'epic_clawdash_ia_v0', productId: 'prod_clawdash', laneId: 'lane_clawdash_shell', title: 'ClawDash Information Architecture', status: 'review', priority: 'p0', milestoneId: 'ms_coordination_layer_m1' },
    { id: 'epic_clawtask_model_v0', productId: 'prod_clawtask', laneId: 'lane_clawtask', title: 'ClawTask Core Model', status: 'review', priority: 'p0', milestoneId: 'ms_coordination_layer_m1' },
    { id: 'epic_routing_preferences_v0', productId: 'prod_clawdash', laneId: 'lane_platform_foundations', title: 'Policy / Preference / Routing', status: 'backlog', priority: 'p1' },
    { id: 'epic_clawhandler_v0', productId: 'prod_clawhandler', laneId: 'lane_clawhandler', title: 'ClawHandler Attention Layer', status: 'backlog', priority: 'p2' },
    { id: 'epic_clawworks_v0', productId: 'prod_clawworks', laneId: 'lane_clawworks', title: 'ClawWorks Layer', status: 'watching', priority: 'p2' },
  ],
  tasks: [
    { id: 'task_define_event_schema_v0', epicId: 'epic_event_backbone_v0', productId: 'prod_clawdash', laneId: 'lane_platform_foundations', title: 'Define shared event schema v0', status: 'review', type: 'design', priority: 'p0', summary: 'Lock the event contract that other systems can build on.', findings: ['Schema draft exists in docs; ready for acceptance review.'], discordForumId: '1475021817168134144', handoffPreference: 'new_forum_post' },
    { id: 'task_define_incident_taxonomy_v0', epicId: 'epic_incident_triage_v0', productId: 'prod_clawops', laneId: 'lane_incident_triage', title: 'Define incident classification taxonomy v0', status: 'review', type: 'design', priority: 'p0', discordForumId: '1475021817168134144', handoffPreference: 'new_forum_post' },
    { id: 'task_define_telemetry_model_v0', epicId: 'epic_telemetry_v0', productId: 'prod_clawmon', laneId: 'lane_telemetry', title: 'Define telemetry entities for providers, models, server, and queue', status: 'review', type: 'design', priority: 'p0', discordForumId: '1475021817168134144', handoffPreference: 'new_forum_post' },
    { id: 'task_define_clawtask_model_v0', epicId: 'epic_clawtask_model_v0', productId: 'prod_clawtask', laneId: 'lane_clawtask', title: 'Define ClawTask domain model v0', status: 'review', type: 'design', priority: 'p0', summary: 'Establish the board/task/artifact/blocker/dependency structure for ClawDash.', findings: ['Current board is now editable through /api/board.'], discordForumId: '1475021817168134144', discordThreadId: '1481011906901704704', handoffPreference: 'existing_thread' },
    { id: 'task_draft_clawdash_nav_v0', epicId: 'epic_clawdash_ia_v0', productId: 'prod_clawdash', laneId: 'lane_clawdash_shell', title: 'Draft ClawDash top-level navigation', status: 'active', type: 'design', priority: 'p0', discordForumId: '1475021817168134144', handoffPreference: 'new_forum_post' },
    { id: 'task_build_now_page_shell', epicId: 'epic_clawdash_ia_v0', productId: 'prod_clawdash', laneId: 'lane_clawdash_shell', title: 'Build Now page shell', status: 'active', type: 'code', priority: 'p0', discordForumId: '1475021817168134144', handoffPreference: 'new_forum_post' },
    { id: 'task_build_projects_page_shell', epicId: 'epic_clawtask_model_v0', productId: 'prod_clawtask', laneId: 'lane_clawtask', title: 'Build Projects view shell', status: 'blocked', type: 'code', priority: 'p1', discordForumId: '1475021817168134144', handoffPreference: 'new_forum_post' },
    { id: 'task_build_tasks_page_shell', epicId: 'epic_clawtask_model_v0', productId: 'prod_clawtask', laneId: 'lane_clawtask', title: 'Build Tasks board shell', status: 'blocked', type: 'code', priority: 'p1', discordForumId: '1475021817168134144', handoffPreference: 'new_forum_post' },
    { id: 'task_add_prometheus_metrics_endpoint', epicId: 'epic_telemetry_v0', productId: 'prod_clawmon', laneId: 'lane_telemetry', title: 'Add Prometheus metrics endpoint to gateway', status: 'ready', type: 'infra', priority: 'p1', discordForumId: '1475021817168134144', handoffPreference: 'new_forum_post' },
    { id: 'task_grafana_embed_health_costs', epicId: 'epic_telemetry_v0', productId: 'prod_clawmon', laneId: 'lane_telemetry', title: 'Embed Grafana views for Health and Costs', status: 'blocked', type: 'code', priority: 'p1', discordForumId: '1475021817168134144', handoffPreference: 'new_forum_post' },
    { id: 'task_provider_health_memory_lane', epicId: 'epic_clawtext_operational_health', productId: 'prod_clawtext', laneId: 'lane_clawtext_core', title: 'Add provider-health operational memory lane', status: 'backlog', type: 'design', priority: 'p1', discordForumId: '1475021817168134144', handoffPreference: 'new_forum_post' },
    { id: 'task_define_routing_preference_registry', epicId: 'epic_routing_preferences_v0', productId: 'prod_clawdash', laneId: 'lane_platform_foundations', title: 'Define model preference registry', status: 'backlog', type: 'design', priority: 'p2', discordForumId: '1475021817168134144', handoffPreference: 'new_forum_post' },
    { id: 'task_add_theme_mode_controls', epicId: 'epic_clawdash_ia_v0', productId: 'prod_clawdash', laneId: 'lane_clawdash_shell', title: 'Add theme mode controls (light / dark / system)', status: 'backlog', type: 'code', priority: 'p2', discordForumId: '1475021817168134144', handoffPreference: 'new_forum_post' },
    { id: 'task_add_theme_pack_support', epicId: 'epic_clawdash_ia_v0', productId: 'prod_clawdash', laneId: 'lane_clawdash_shell', title: 'Add theme pack / color scheme support', status: 'backlog', type: 'design', priority: 'p3', discordForumId: '1475021817168134144', handoffPreference: 'new_forum_post' },
    { id: 'task_add_docs_drag_drop_ingest', epicId: 'epic_clawdash_ia_v0', productId: 'prod_clawdash', laneId: 'lane_clawdash_shell', title: 'Add drag & drop document ingest into document store', status: 'backlog', type: 'design', priority: 'p2', discordForumId: '1475021817168134144', handoffPreference: 'new_forum_post' },
    { id: 'task_add_inline_doc_editing', epicId: 'epic_clawdash_ia_v0', productId: 'prod_clawdash', laneId: 'lane_clawdash_shell', title: 'Add inline document editing in the dashboard', status: 'done', type: 'code', priority: 'p1', findings: ['Docs are editable and save back through the local API server.'], discordForumId: '1475021817168134144', handoffPreference: 'new_forum_post' },
  ],
  dependencies: [
    { id: 'dep_event_to_incident', fromRef: 'epic_incident_triage_v0', toRef: 'epic_event_backbone_v0', kind: 'requires' },
    { id: 'dep_event_to_telemetry', fromRef: 'epic_telemetry_v0', toRef: 'epic_event_backbone_v0', kind: 'requires' },
    { id: 'dep_telemetry_to_health_views', fromRef: 'task_grafana_embed_health_costs', toRef: 'task_add_prometheus_metrics_endpoint', kind: 'blocks' },
    { id: 'dep_clawtask_to_projects_shell', fromRef: 'task_build_projects_page_shell', toRef: 'task_define_clawtask_model_v0', kind: 'blocks' },
    { id: 'dep_clawtask_to_tasks_shell', fromRef: 'task_build_tasks_page_shell', toRef: 'task_define_clawtask_model_v0', kind: 'blocks' },
  ],
  blockers: [
    { id: 'blocker_clawtask_model_review', ref: 'task_define_clawtask_model_v0', title: 'ClawTask model still in review', description: 'Projects/Tasks board shells should wait until the core model is accepted to avoid rework.', severity: 'medium', status: 'open' },
    { id: 'blocker_metrics_endpoint_missing', ref: 'task_add_prometheus_metrics_endpoint', title: 'Gateway metrics endpoint not emitted yet', description: 'Grafana health/cost embeds should wait until first-wave metrics exist.', severity: 'medium', status: 'open' },
  ],
  artifacts: [
    { id: 'artifact_handoff_full', title: 'ClawDash Handoff — 2026-03-10', type: 'doc', pathOrUrl: 'docs/CLAWDASH_HANDOFF_2026-03-10.md', linkedRefs: ['epic_clawdash_ia_v0', 'epic_clawtask_model_v0'] },
    { id: 'artifact_handoff_summary', title: 'ClawDash Handoff Summary — 2026-03-10', type: 'doc', pathOrUrl: 'docs/CLAWDASH_HANDOFF_SUMMARY_2026-03-10.md', linkedRefs: ['epic_clawdash_ia_v0'] },
    { id: 'artifact_board_draft', title: 'ClawTask Board Draft — 2026-03-10', type: 'doc', pathOrUrl: 'docs/CLAWTASK_BOARD_DRAFT_2026-03-10.md', linkedRefs: ['epic_clawtask_model_v0'] },
    { id: 'artifact_clawtask_model_v0', title: 'ClawTask Domain Model v0', type: 'doc', pathOrUrl: 'docs/CLAWTASK_DOMAIN_MODEL_V0.md', linkedRefs: ['epic_clawtask_model_v0'] },
    { id: 'artifact_event_schema_v0', title: 'Shared Event Schema v0', type: 'doc', pathOrUrl: 'docs/EVENT_SCHEMA_V0.md', linkedRefs: ['epic_event_backbone_v0'] },
    { id: 'artifact_m1_scope_lock', title: 'ClawTask Milestone 1 Scope Lock v0', type: 'doc', pathOrUrl: 'docs/CLAWTASK_MILESTONE1_SCOPE_LOCK_V0.md', linkedRefs: ['ms_coordination_layer_m1'] },
    { id: 'artifact_lane_post_drafts', title: 'ClawDash Lane Post Drafts v0', type: 'doc', pathOrUrl: 'docs/CLAWDASH_LANE_POST_DRAFTS_V0.md', linkedRefs: ['ms_coordination_layer_m1'] },
  ],
}

export const boardColumns: BoardStatus[] = ['backlog', 'ready', 'active', 'blocked', 'review', 'done', 'watching']

export function getProductName(productId: string) {
  return clawtaskSeed.products.find((product) => product.id === productId)?.name ?? productId
}

export function getLaneName(laneId: string) {
  return clawtaskSeed.lanes.find((lane) => lane.id === laneId)?.name ?? laneId
}
