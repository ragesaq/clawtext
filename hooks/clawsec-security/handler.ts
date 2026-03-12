/**
 * ClawSec Security Hook
 * Automatically wraps web_search tool with security enforcement
 */

import { HookHandler } from '../types';

interface ClawSecConfig {
  enabled: boolean;
  logLevel: 'info' | 'warn' | 'error';
  blockThreshold: number;
}

const defaultConfig: ClawSecConfig = {
  enabled: true,
  logLevel: 'info',
  blockThreshold: 0.8
};

export const clawsecSecurityHook: HookHandler = {
  name: 'clawsec-security',
  version: '1.0.0',
  
  async onStartup(context) {
    const config = context.config?.clawsecSecurity || defaultConfig;
    
    if (!config.enabled) {
      console.log('[ClawSec] Hook disabled in config');
      return;
    }

    console.log('[ClawSec] Initializing security middleware...');
    
    try {
      // Load the Python security wrapper via subprocess
      const { execSync } = require('child_process');
      
      // Test if Python module is available
      const testResult = execSync(
        'python3 -c "import sys; sys.path.insert(0, \'/home/lumadmin/.openclaw/workspace/clawsec/src\'); from web_search_wrapper import WebSearchSecurityWrapper; print(\'OK\')"',
        { encoding: 'utf8' }
      );
      
      if (testResult.trim() === 'OK') {
        console.log('[ClawSec] ✓ Python security module loaded successfully');
        
        // Register the wrapped web_search tool
        const originalWebSearch = context.tools?.web_search;
        
        if (originalWebSearch) {
          context.tools.web_search = async (query: string, options?: any) => {
            // Call Python wrapper via subprocess
            const { spawnSync } = require('child_process');
            
            const result = spawnSync('python3', [
              '-c',
              `
import sys
import json
sys.path.insert(0, '/home/lumadmin/.openclaw/workspace/clawsec/src')
from web_search_wrapper import WebSearchSecurityWrapper

wrapper = WebSearchSecurityWrapper()
query = ${JSON.stringify(query)}
result = wrapper.search(query, session_id="${context.sessionId || 'unknown'}")
print(json.dumps(result))
              `
            ], { encoding: 'utf8' });
            
            if (result.error) {
              console.error('[ClawSec] Error calling security wrapper:', result.error);
              return originalWebSearch(query, options);
            }
            
            try {
              const securityResult = JSON.parse(result.stdout);
              
              if (securityResult.blocked) {
                console.warn('[ClawSec] Query blocked:', securityResult.reason);
                return {
                  blocked: true,
                  reason: securityResult.reason,
                  flags: securityResult.flags,
                  results: []
                };
              }
              
              if (securityResult.flagged) {
                console.warn('[ClawSec] Query flagged:', securityResult.reason);
                // Continue with original search but flag the result
                const originalResult = await originalWebSearch(query, options);
                return {
                  ...originalResult,
                  flagged: true,
                  securityFlags: securityResult.flags
                };
              }
              
              // Security passed, proceed with original search
              return await originalWebSearch(query, options);
              
            } catch (parseError) {
              console.error('[ClawSec] Failed to parse security result:', parseError);
              return originalWebSearch(query, options);
            }
          };
          
          console.log('[ClawSec] ✓ web_search tool wrapped with security');
        } else {
          console.warn('[ClawSec] web_search tool not found, skipping wrap');
        }
      } else {
        console.error('[ClawSec] Failed to load Python security module');
      }
    } catch (error) {
      console.error('[ClawSec] Initialization error:', error);
    }
  },
  
  async onMessage(context) {
    // Optional: Additional message-level security checks
    const config = context.config?.clawsecSecurity || defaultConfig;
    
    if (config.logLevel === 'info') {
      console.log('[ClawSec] Message processed');
    }
  }
};

export default clawsecSecurityHook;
