import os from 'os';
import path from 'path';
import ClawTextRAG from './src/rag.js';
import OperationalCaptureManager from './dist/operational-capture.js';
import OperationalRetrievalManager from './dist/operational-retrieval.js';
import OperationalReviewManager from './dist/operational-review.js';

const WORKSPACE_PATH = path.join(os.homedir(), '.openclaw', 'workspace');

/**
 * ClawText RAG Injection Plugin
 * Hooks into OpenClaw runtime hooks to:
 * - inject normal ClawText memory on before_prompt_build
 * - inject operational/self-improvement context selectively on before_prompt_build
 * - proactively surface matured deferred review candidates in operationally relevant contexts
 * - capture tool/command failures automatically on after_tool_call
 */
export class ClawTextRAGPlugin {
  constructor(api) {
    this.api = api;
    this.rag = new ClawTextRAG();
    this.operationalCapture = new OperationalCaptureManager(WORKSPACE_PATH);
    this.operationalRetrieval = new OperationalRetrievalManager(WORKSPACE_PATH);
    this.operationalReview = new OperationalReviewManager(WORKSPACE_PATH);

    this.rag.config.maxMemories = 7;
    this.rag.config.minConfidence = 0.70;

    this.projectKeywords = {
      moltmud: ['moltmud', 'agent', 'game', 'zorthak', 'mud', 'bridge', 'phase'],
      openclaw: ['openclaw', 'gateway', 'plugin', 'session', 'memory', 'cron', 'heartbeat'],
      rgcs: ['rgcs', 'steamvr', 'driver', 'smoothing', 'controller', 'overlay'],
      clawtext: ['clawtext', 'cluster', 'embedding', 'rag', 'injection', 'keywords'],
      infrastructure: ['infrastructure', 'deployment', 'server', 'ssh', 'config', 'setup'],
    };

    this.setupHooks();
  }

  setupHooks() {
    this.api.on('before_prompt_build', async (event) => {
      try {
        const ragResult = await this.injectMemories(event);
        const operationalResult = await this.injectOperationalPatterns(event);
        const reviewNudgeResult = await this.injectOperationalReviewNudges(event, operationalResult);

        const hookResult = {};
        if (ragResult.systemPrompt && ragResult.systemPrompt !== event.systemPrompt) {
          hookResult.systemPrompt = ragResult.systemPrompt;
        }

        const prependParts = [
          reviewNudgeResult.prependContext,
          operationalResult.prependContext,
        ].filter(Boolean);

        if (prependParts.length > 0) {
          hookResult.prependContext = prependParts.join('\n\n');
        }

        if (process.env.DEBUG_CLAWTEXT) {
          const memoriesInjected = ragResult.stats?.memoriesInjected || 0;
          const tokensAdded = ragResult.stats?.tokensAdded || 0;
          const operationalPatterns = operationalResult.stats?.patternsInjected || 0;
          const reviewNudges = reviewNudgeResult.stats?.maturedDeferredCandidates || 0;
          if (memoriesInjected > 0 || operationalPatterns > 0 || reviewNudges > 0) {
            console.log(
              `[ClawText] before_prompt_build: memories=${memoriesInjected} ` +
              `tokens=${tokensAdded} operationalPatterns=${operationalPatterns} ` +
              `reviewNudges=${reviewNudges}`
            );
          }
        }

        return Object.keys(hookResult).length > 0 ? hookResult : undefined;
      } catch (error) {
        console.error('[ClawText RAG] before_prompt_build hook error:', error);
        return undefined;
      }
    });

    this.api.on('after_tool_call', async (event, ctx) => {
      try {
        this.captureOperationalFromToolCall(event, ctx);
      } catch (error) {
        console.error('[ClawText Operational] after_tool_call hook error:', error);
      }
    });

    console.log('[ClawText] Plugin initialized (RAG + operational retrieval/capture hooks)');
  }

  async injectMemories(event) {
    const systemPrompt = event.systemPrompt || '';
    const userMessage = event.userMessage || event.prompt || '';

    let projectKeywords = [];
    const combined = `${systemPrompt} ${userMessage}`.toLowerCase();

    Object.entries(this.projectKeywords).forEach(([_project, keywords]) => {
      keywords.forEach((kw) => {
        if (combined.includes(kw)) {
          projectKeywords.push(kw);
        }
      });
    });

    const { prompt, injected, tokens } = this.rag.injectMemories(
      systemPrompt,
      userMessage,
      projectKeywords
    );

    return {
      systemPrompt: prompt,
      stats: {
        memoriesInjected: injected,
        tokensAdded: tokens,
        projectsTargeted: [...new Set(projectKeywords)],
        qualityEnhanced: 'BM25 with project weighting + pattern-key + entity boost',
      },
    };
  }

  async injectOperationalPatterns(event) {
    const userMessage = (event.userMessage || event.prompt || '').trim();
    if (!userMessage) {
      return { prependContext: '', stats: { patternsInjected: 0, taskType: 'unknown' } };
    }

    const recentHistory = this.extractRecentHistory(event.messages || []);
    const operationalResult = await this.operationalRetrieval.retrieveForTask({
      userMessage,
      systemPrompt: event.systemPrompt || '',
      recentHistory,
    });

    if (!operationalResult.injectionReady || operationalResult.patterns.length === 0) {
      return {
        prependContext: '',
        stats: {
          patternsInjected: 0,
          taskType: operationalResult.taskType,
        },
      };
    }

    return {
      prependContext: this.operationalRetrieval.formatForInjection(operationalResult.patterns).trim(),
      stats: {
        patternsInjected: operationalResult.patterns.length,
        taskType: operationalResult.taskType,
      },
    };
  }

  async injectOperationalReviewNudges(event, operationalResult) {
    const userMessage = (event.userMessage || event.prompt || '').trim();
    const recentHistory = this.extractRecentHistory(event.messages || []);

    const shouldSurface = this.shouldSurfaceReviewNudges(
      userMessage,
      recentHistory,
      operationalResult?.stats?.taskType || operationalResult?.taskType || 'unknown'
    );

    if (!shouldSurface) {
      return { prependContext: '', stats: { maturedDeferredCandidates: 0 } };
    }

    const matured = this.operationalReview.getMaturedDeferredCandidates(2);
    if (!matured.length) {
      return { prependContext: '', stats: { maturedDeferredCandidates: 0 } };
    }

    return {
      prependContext: this.operationalReview.formatMaturedDeferredNudge(matured).trim(),
      stats: { maturedDeferredCandidates: matured.length },
    };
  }

  shouldSurfaceReviewNudges(userMessage, recentHistory, taskType) {
    const relevantTaskTypes = new Set([
      'debugging',
      'tool-use',
      'command-execution',
      'config-change',
      'deployment',
      'gateway-work',
      'plugin-work',
    ]);

    if (relevantTaskTypes.has(taskType)) {
      return true;
    }

    const combined = `${userMessage} ${(recentHistory || []).join(' ')}`.toLowerCase();
    const keywords = [
      'clawtext',
      'operational',
      'review',
      'candidate',
      'pattern',
      'defer',
      'memory',
      'gateway',
      'plugin',
      'debug',
      'fix',
      'error',
    ];

    return keywords.some((keyword) => combined.includes(keyword));
  }

  extractRecentHistory(messages) {
    if (!Array.isArray(messages)) return [];
    return messages
      .slice(-6)
      .map((message) => this.extractMessageText(message))
      .filter(Boolean)
      .slice(-4);
  }

  extractMessageText(message) {
    if (!message || typeof message !== 'object') return '';

    const role = typeof message.role === 'string' ? message.role : 'message';
    const content = message.content;

    let text = '';
    if (typeof content === 'string') {
      text = content;
    } else if (Array.isArray(content)) {
      text = content
        .map((part) => {
          if (!part || typeof part !== 'object') return '';
          if (typeof part.text === 'string') return part.text;
          if (part.type === 'text' && typeof part.text === 'string') return part.text;
          return '';
        })
        .filter(Boolean)
        .join(' ');
    }

    text = text.trim();
    return text ? `${role}: ${text}` : '';
  }

  captureOperationalFromToolCall(event, ctx) {
    const errorMessage = this.extractToolError(event);
    if (!errorMessage) return;

    const sessionId = ctx?.sessionId;

    if (event.toolName === 'bash') {
      const command = typeof event.params?.command === 'string' ? event.params.command : '[unknown command]';
      const workdir = typeof event.params?.workdir === 'string' ? event.params.workdir : undefined;
      const exitCode = this.extractExitCode(event.result);
      this.operationalCapture.captureCommandFailure(command, errorMessage, {
        workdir,
        exitCode,
        sessionId,
      });
      return;
    }

    const workdir = typeof event.params?.workdir === 'string' ? event.params.workdir : undefined;
    this.operationalCapture.captureToolFailure(event.toolName, errorMessage, {
      inputs: event.params || {},
      workdir,
      sessionId,
    });
  }

  extractToolError(event) {
    if (typeof event?.error === 'string' && event.error.trim()) {
      return event.error.trim();
    }

    const exitCode = this.extractExitCode(event?.result);
    if (event?.toolName === 'bash' && typeof exitCode === 'number' && exitCode !== 0) {
      const output = this.extractToolOutput(event.result);
      return output
        ? `bash exited with code ${exitCode}: ${output.slice(0, 300)}`
        : `bash exited with code ${exitCode}`;
    }

    const result = event?.result;
    if (result && typeof result === 'object') {
      if (typeof result.error === 'string' && result.error.trim()) {
        return result.error.trim();
      }
      if (typeof result.message === 'string' && result.message.trim()) {
        return result.message.trim();
      }
      if (result.isError === true) {
        try {
          return JSON.stringify(result).slice(0, 400);
        } catch {
          return 'tool returned error result';
        }
      }
    }

    return '';
  }

  extractExitCode(result) {
    if (!result || typeof result !== 'object') return undefined;
    if (typeof result.exitCode === 'number') return result.exitCode;
    if (result.details && typeof result.details === 'object' && typeof result.details.exitCode === 'number') {
      return result.details.exitCode;
    }
    return undefined;
  }

  extractToolOutput(result) {
    if (!result || typeof result !== 'object') return '';
    if (typeof result.output === 'string') return result.output.trim();
    if (typeof result.stdout === 'string') return result.stdout.trim();
    if (result.details && typeof result.details === 'object') {
      if (typeof result.details.output === 'string') return result.details.output.trim();
      if (typeof result.details.stdout === 'string') return result.details.stdout.trim();
    }
    return '';
  }

  getStats() {
    return {
      rag: this.rag.getStats(),
      operational: this.operationalRetrieval.getHealthSummary(),
      enabled: true,
      mode: 'before_prompt_build + after_tool_call',
      enhancement: 'Operational retrieval + failure capture integrated',
    };
  }
}

export default async function initPlugin(api) {
  return new ClawTextRAGPlugin(api);
}
