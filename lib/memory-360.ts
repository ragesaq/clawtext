/**
 * 360-Degree Memory Views
 * 
 * For any memory, get complete context - related decisions, facts, code, dependencies.
 * Part of RAG Phase 2.
 */

export interface Memory360View {
  memory: {
    id: string;
    content: string;
    type: string;
    confidence: number;
    created: string;
  };
  related: {
    decisions: RelatedMemory[];
    facts: RelatedMemory[];
    code: RelatedMemory[];
    preferences: RelatedMemory[];
  };
  temporal: {
    supersededBy?: RelatedMemory;
    precedes: RelatedMemory[];
    dependsOn: RelatedMemory[];
  };
  project: {
    context: string;
    relatedProjects: string[];
  };
  formatted: string;
}

export interface RelatedMemory {
  id: string;
  content: string;
  type: string;
  relationship: string;
  relevance: number;
}

/**
 * Get 360-degree view of a memory
 */
export async function getMemory360(
  memoryId: string,
  projectId?: string
): Promise<Memory360View> {
  // Load the memory
  const memory = await loadMemory(memoryId, projectId);
  
  // Find related by type
  const related = await findRelatedByType(memory, projectId);
  
  // Find temporal relationships
  const temporal = await findTemporalRelationships(memoryId, projectId);
  
  // Get project context
  const project = await getProjectContext(memory.projectId || projectId);
  
  // Format as rich context
  const formatted = format360View({
    memory,
    related,
    temporal,
    project
  });
  
  return {
    memory,
    related,
    temporal,
    project,
    formatted
  };
}

/**
 * Find related memories by type
 */
async function findRelatedByType(
  memory: any,
  projectId?: string
): Promise<Memory360View['related']> {
  const result = {
    decisions: [] as RelatedMemory[],
    facts: [] as RelatedMemory[],
    code: [] as RelatedMemory[],
    preferences: [] as RelatedMemory[]
  };
  
  // Search for each type
  const types = ['decision', 'fact', 'code', 'preference'];
  
  for (const type of types) {
    if (memory.type === type) continue; // Skip same type
    
    const related = await searchRelated(memory.content, type, projectId);
    
    switch (type) {
      case 'decision':
        result.decisions = related;
        break;
      case 'fact':
        result.facts = related;
        break;
      case 'code':
        result.code = related;
        break;
      case 'preference':
        result.preferences = related;
        break;
    }
  }
  
  return result;
}

/**
 * Find temporal relationships
 */
async function findTemporalRelationships(
  memoryId: string,
  projectId?: string
): Promise<Memory360View['temporal']> {
  return {
    supersededBy: undefined, // Would check for newer versions
    precedes: [],
    dependsOn: []
  };
}

/**
 * Get project context summary
 */
async function getProjectContext(
  projectId?: string
): Promise<Memory360View['project']> {
  if (!projectId) {
    return {
      context: 'No specific project context',
      relatedProjects: []
    };
  }
  
  return {
    context: `Project: ${projectId}`,
    relatedProjects: []
  };
}

/**
 * Search for related memories
 */
async function searchRelated(
  content: string,
  type: string,
  projectId?: string
): Promise<RelatedMemory[]> {
  // Placeholder - would use actual memory search
  return [];
}

/**
 * Load memory by ID
 */
async function loadMemory(
  memoryId: string,
  projectId?: string
): Promise<any> {
  // Placeholder
  return {
    id: memoryId,
    content: 'Memory content',
    type: 'fact',
    confidence: 0.8,
    created: new Date().toISOString(),
    projectId
  };
}

/**
 * Format 360 view as rich context
 */
function format360View(view: {
  memory: any;
  related: Memory360View['related'];
  temporal: Memory360View['temporal'];
  project: Memory360View['project'];
}): string {
  const lines = [
    `### Memory: ${view.memory.id}`,
    `Type: ${view.memory.type} | Confidence: ${view.memory.confidence}`,
    '',
    view.memory.content,
    ''
  ];
  
  // Related decisions
  if (view.related.decisions.length > 0) {
    lines.push('**Related Decisions:**');
    view.related.decisions.forEach(d => {
      lines.push(`• [${d.relationship}] ${d.content.slice(0, 100)}`);
    });
    lines.push('');
  }
  
  // Related facts
  if (view.related.facts.length > 0) {
    lines.push('**Supporting Facts:**');
    view.related.facts.forEach(f => {
      lines.push(`• ${f.content.slice(0, 100)}`);
    });
    lines.push('');
  }
  
  // Related code
  if (view.related.code.length > 0) {
    lines.push('**Related Code:**');
    view.related.code.forEach(c => {
      lines.push(`• \`${c.content.slice(0, 80)}\``);
    });
    lines.push('');
  }
  
  // Project context
  lines.push(`**Project Context:** ${view.project.context}`);
  
  return lines.join('\n');
}

/**
 * Test the 360 view
 */
export async function testMemory360(): Promise<string> {
  const view = await getMemory360('mem_test123', 'memory-architecture');
  
  console.log('360-Degree View Test:');
  console.log(view.formatted);
  
  return '360 view test complete';
}

export default {
  getMemory360,
  testMemory360
};
