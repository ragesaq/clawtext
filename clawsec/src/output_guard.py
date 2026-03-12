"""
ClawSec Output Guard
Monitors and validates search results before returning to agent.
"""

import re
from dataclasses import dataclass
from typing import List, Dict, Any

@dataclass
class OutputValidation:
    """Result of output validation."""
    valid: bool
    blocked: bool
    flagged: bool
    flags: List[str]
    sanitized_output: str
    reason: str

class OutputGuard:
    """
    Validates search results before returning to agent.
    Detects:
    - Poisoned results (malicious content injected into search results)
    - Excessive data leakage
    - Hidden instructions in results
    """
    
    def __init__(self):
        # Patterns that indicate poisoned/malicious content in results
        self.POISON_PATTERNS = [
            (r'\b(ignore|disregard|override)\s+(previous|all)\s+(instructions|rules)', 'POISON:INSTRUCTION_OVERRIDE'),
            (r'\b(you\s+are\s+now|from\s+now\s+on)\s+(a|an)\s+(developer|admin|unrestricted)', 'POISON:ROLE_CHANGE'),
            (r'\b(print|output|reveal)\s+(your|system)\s+(instructions|prompt|rules)', 'POISON:PROMPT_LEAK'),
            (r'\b(bypass|disable|turn\s+off)\s+(security|filter|validation)', 'POISON:DISABLE_SECURITY'),
            (r'\b(translate|decode|deobfuscate)\s+(this|the)\s+(into|to)\s+(python|bash|code)', 'POISON:CODE_INJECTION'),
        ]
        
        # Patterns indicating data leakage attempts in results
        self.LEAK_PATTERNS = [
            (r'\b(secret|password|api[_-]?key|token|credential)\s*(=|:|is)', 'LEAK:SENSITIVE_DATA'),
            (r'\b(internal|confidential|private)\s+(document|data|file|information)', 'LEAK:INTERNAL_DATA'),
        ]
    
    def validate_result(self, result: str) -> OutputValidation:
        """
        Validate a single search result.
        
        Args:
            result: Search result text
        
        Returns:
            OutputValidation object
        """
        flags = []
        blocked = False
        flagged = False
        
        # Check poison patterns
        for pattern, reason in self.POISON_PATTERNS:
            if re.search(pattern, result, re.IGNORECASE):
                flags.append(reason)
                blocked = True
        
        # Check leak patterns
        for pattern, reason in self.LEAK_PATTERNS:
            if re.search(pattern, result, re.IGNORECASE):
                flags.append(reason)
                flagged = True
        
        valid = not blocked
        sanitized = result if not blocked else ""
        
        reason = self._explain_flags(flags)
        
        return OutputValidation(
            valid=valid,
            blocked=blocked,
            flagged=flagged,
            flags=flags,
            sanitized_output=sanitized,
            reason=reason
        )
    
    def validate_results(self, results: List[str]) -> Dict[str, Any]:
        """
        Validate multiple search results.
        
        Args:
            results: List of search result texts
        
        Returns:
            Dict with validation summary and filtered results
        """
        validated_results = []
        all_flags = []
        blocked_count = 0
        flagged_count = 0
        
        for result in results:
            validation = self.validate_result(result)
            
            if validation.blocked:
                blocked_count += 1
                all_flags.extend(validation.flags)
                continue
            
            if validation.flagged:
                flagged_count += 1
                all_flags.extend(validation.flags)
                validated_results.append({
                    "content": validation.sanitized_output,
                    "flagged": True,
                    "flags": validation.flags,
                    "reason": validation.reason
                })
            else:
                validated_results.append({
                    "content": validation.sanitized_output,
                    "flagged": False,
                    "flags": [],
                    "reason": ""
                })
        
        return {
            "total_results": len(results),
            "valid_results": len(validated_results),
            "blocked_count": blocked_count,
            "flagged_count": flagged_count,
            "results": validated_results,
            "all_flags": list(set(all_flags)),
            "blocked": blocked_count > 0,
            "flagged": flagged_count > 0
        }
    
    def _explain_flags(self, flags: List[str]) -> str:
        """Human-readable explanation of flags."""
        explanations = {
            "POISON:INSTRUCTION_OVERRIDE": "Result contains instructions to override system rules",
            "POISON:ROLE_CHANGE": "Result attempts to change agent role",
            "POISON:PROMPT_LEAK": "Result attempts to leak system instructions",
            "POISON:DISABLE_SECURITY": "Result attempts to disable security",
            "POISON:CODE_INJECTION": "Result contains code injection attempt",
            "LEAK:SENSITIVE_DATA": "Result contains sensitive data",
            "LEAK:INTERNAL_DATA": "Result contains internal/confidential data"
        }
        
        explanations_list = []
        for flag in flags:
            if flag in explanations:
                explanations_list.append(explanations[flag])
            else:
                explanations_list.append(f"Security violation: {flag}")
        
        return "; ".join(explanations_list)

# Export
__all__ = ['OutputGuard', 'OutputValidation']
