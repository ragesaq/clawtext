/**
 * ClawBridge v2.0 — LLM-Powered Extraction Pipeline
 *
 * Replaces mechanical bullet-point extraction with progressive summarization.
 * Three LLM passes: Extract → Compress → Structure
 *
 * Input: Raw thread messages
 * Output: Structured knowledge across 6 types (episodic, semantic, procedural,
 *         relational, implicit, priority)
 */

/**
 * @typedef {Object} ExtractionConfig
 * @property {'quick'|'standard'|'deep'|'exhaustive'} depth
 * @property {number} [maxMessages] - Override message limit
 * @property {string} [model] - LLM model to use (default: varies by depth)
 * @property {boolean} [validate] - Run validation pass (default: true for deep+)
 */

/**
 * @typedef {Object} MindMeldPacket
 * @property {Object} metadata
 * @property {Object} episodic
 * @property {Object} semantic
 * @property {Object} procedural
 * @property {Object} relational
 * @property {Object} implicit
 * @property {Object} priority
 * @property {Object} [provenance]
 * @property {Object} [chain]
 */

const DEPTH_CONFIG = {
  quick:      { messages: 20,  passes: 1, targetTokens: 500,  validate: false },
  standard:   { messages: 100, passes: 2, targetTokens: 1500, validate: false },
  deep:       { messages: 300, passes: 3, targetTokens: 3000, validate: true  },
  exhaustive: { messages: 999, passes: 3, targetTokens: 6000, validate: true  },
};

/**
 * Density scoring factors for extracted passages.
 * Score ≥ 0.7: Keep verbatim
 * Score 0.4–0.7: Compress
 * Score < 0.4: Discard
 */
function scoreDensity(text) {
  let score = 0;
  const lower = text.toLowerCase();

  // Contains a decision or constraint
  if (/\b(decided|decision|agreed|approved|confirmed|rejected|chose|chosen|must|shall not|will not|constraint)\b/i.test(text)) score += 0.3;

  // Contains an identifier, version, path, or error code
  if (/\b(v\d+\.\d+|[a-f0-9]{7,}|\/[\w/.-]+\.\w+|\d+\.\d+\.\d+|error|ERR_|TypeError|SyntaxError)\b/.test(text)) score += 0.25;

  // Contains a "why" or rationale
  if (/\b(because|reason|rationale|since|due to|in order to|so that|the goal|the problem)\b/i.test(text)) score += 0.2;

  // Contains a timeline/sequence marker
  if (/\b(then|after|before|first|next|finally|step \d|phase \d|\d{4}-\d{2}-\d{2})\b/i.test(text)) score += 0.15;

  // Contains an action item or next step
  if (/\b(todo|action|next step|should|need to|will|blocked|blocker|depends on)\b/i.test(text)) score += 0.1;

  return Math.min(score, 1.0);
}

/**
 * Pre-filter messages: remove noise, system messages, empty content.
 */
function prefilter(messages) {
  return messages.filter(m => {
    const content = String(m?.content || '').trim();
    if (!content) return false;
    if (content.length < 5) return false;
    // Skip pure reactions/emoji-only messages
    if (/^[\p{Emoji}\s]+$/u.test(content) && content.length < 20) return false;
    return true;
  });
}

/**
 * Build the extraction prompt for Pass 1.
 * Asks the LLM to extract structured knowledge from raw messages.
 */
function buildExtractionPrompt(messages, context = {}) {
  const messageBlock = messages.map((m, i) => {
    const author = m?.author?.username || m?.author?.name || 'unknown';
    const isBot = m?.author?.bot ? ' [bot]' : '';
    const ts = m?.timestamp || '';
    return `[${i + 1}] ${author}${isBot} (${ts}):\n${String(m.content || '').trim()}`;
  }).join('\n\n---\n\n');

  return `You are extracting structured knowledge from a conversation thread for handoff to another AI agent.

Extract ALL of the following from the messages below. Be thorough — missing a decision or identifier is a critical failure.

## Required Extractions

### Episodic (Timeline)
What happened, in what order? Include dates when available.
Format: List of events with approximate dates/order.

### Semantic (Facts & State)
All concrete facts: project names, versions, file paths, commit hashes, URLs, error codes, configuration values, identifiers.
Format: Key-value pairs. Preserve identifiers EXACTLY as written — do not paraphrase paths, hashes, or version numbers.

### Procedural (How-To & Lessons)
Reasoning patterns, debugging approaches, lessons learned, workflows established.
Format: "When X happens, do Y because Z" pattern.

### Relational (Working Style)
How participants communicate, what they prefer, trust level, communication style.
Format: Brief observations about working dynamics.

### Implicit (Unspoken Context)
Things understood but not explicitly stated — project importance, quality bar, political context, emotional state.
Format: Brief inferences with confidence level.

### Priority (What Matters Now)
Current urgency, blockers, deadlines, what's most important right now.
Format: Ordered list with urgency indicators.

${context.objective ? `\n## Thread Objective\n${context.objective}\n` : ''}
${context.previousHandoff ? `\n## Previous Handoff Context\nThis is a continuation. Previous handoff summary:\n${context.previousHandoff}\n` : ''}

## Messages (${messages.length} total)

${messageBlock}

## Output Format

Respond with a structured extraction using the exact section headers above. Use markdown formatting. Preserve all identifiers, paths, versions, and error codes verbatim.`;
}

/**
 * Build the compression prompt for Pass 2.
 * Takes extracted knowledge and compresses to target token budget.
 */
function buildCompressionPrompt(extraction, targetTokens) {
  return `You are compressing an extracted knowledge document into a dense handoff packet.

## Rules
1. Every sentence must carry unique information. Remove ALL filler.
2. Preserve ALL identifiers, versions, paths, commit hashes, and error codes EXACTLY as written.
3. Merge redundant points — if two items say the same thing differently, keep the more precise one.
4. Decisions are sacred — never drop a decision, even if it seems minor.
5. Target length: approximately ${targetTokens} tokens (${Math.round(targetTokens * 4)} characters).
6. If you must cut, cut explanations before facts, rationale before identifiers, context before decisions.

## Source Extraction

${extraction}

## Output

Produce the compressed version using the same section structure (Episodic, Semantic, Procedural, Relational, Implicit, Priority). Every line must earn its place.`;
}

/**
 * Build the structuring prompt for Pass 3.
 * Takes compressed extraction and outputs the final mind-meld YAML.
 */
function buildStructuringPrompt(compressed, metadata = {}) {
  return `You are producing the final structured handoff document from compressed knowledge.

## Output Format
Produce a YAML document following this exact schema. All string values should be quoted.

\`\`\`yaml
handoff:
  version: "2.0-mindmeld"
  metadata:
    source_thread: "${metadata.sourceThread || 'unknown'}"
    timestamp: "${new Date().toISOString()}"
    message_count: ${metadata.messageCount || 0}
    depth: "${metadata.depth || 'standard'}"
  
  episodic:
    timeline:
      - date: "YYYY-MM-DD"
        events:
          - "event description"
  
  semantic:
    facts:
      - key: "identifier_name"
        value: "exact value"
        type: "version|path|hash|url|config|error|id"
    state:
      project: "project name"
      status: "current status"
      version: "current version"
  
  procedural:
    lessons:
      - trigger: "when this happens"
        action: "do this"
        reason: "because"
    workflows:
      - name: "workflow name"
        steps:
          - "step 1"
  
  relational:
    participants:
      - name: "name"
        role: "role"
        style: "communication style notes"
    dynamics: "brief description of working dynamics"
  
  implicit:
    context:
      - observation: "what's understood but not said"
        confidence: 0.8
    quality_bar: "description of expected quality level"
  
  priority:
    urgency: "low|medium|high|critical"
    blockers:
      - "blocker description"
    next_actions:
      - action: "what to do"
        priority: "P0|P1|P2"
    focus: "what the receiving agent should focus on first"
\`\`\`

## Compressed Knowledge

${compressed}

## Instructions
Fill in the YAML template above with the knowledge from the compressed document. Preserve all identifiers exactly. If a section has no content, use an empty list []. Output ONLY the YAML block, no commentary.`;
}

/**
 * Build the validation prompt.
 * Checks if the handoff preserves critical information from source.
 */
function buildValidationPrompt(handoffYaml, sourceMessages) {
  const sampleMessages = sourceMessages.slice(-30).map((m, i) => {
    const author = m?.author?.username || 'unknown';
    return `[${i + 1}] ${author}: ${String(m.content || '').trim().slice(0, 200)}`;
  }).join('\n');

  return `You are validating a handoff document against source messages.

## Handoff Document
${handoffYaml}

## Source Messages (sample of last 30)
${sampleMessages}

## Validation Checklist
For each item, respond PASS or FAIL with brief explanation:

1. **Decision Preservation**: Are all decisions from the source present in the handoff?
2. **Identifier Accuracy**: Are versions, paths, commit hashes, and error codes preserved exactly?
3. **Blocker Coverage**: Are all blockers and open issues mentioned?
4. **Timeline Accuracy**: Does the episodic section correctly reflect what happened?
5. **Completeness**: Would the receiving agent need to ask questions that are already answered in the source?

## Output
Respond with:
- Overall: PASS or FAIL
- Score: 0.0 to 1.0
- Issues: List any specific gaps found
- Suggestion: How to improve (if FAIL)`;
}

module.exports = {
  DEPTH_CONFIG,
  scoreDensity,
  prefilter,
  buildExtractionPrompt,
  buildCompressionPrompt,
  buildStructuringPrompt,
  buildValidationPrompt,
};
