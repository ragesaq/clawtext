"""
ClawSec Structured Prompt Enforcer
Ensures prompts follow structured format to prevent injection.
"""

import re
from dataclasses import dataclass
from typing import List, Dict, Any, Optional

@dataclass
class PromptValidation:
    """Result of prompt validation."""
    valid: bool
    structured: bool
    sections: Dict[str, str]
    errors: List[str]
    warnings: List[str]

class StructuredPromptEnforcer:
    """
    Enforces structured prompt format to prevent injection.
    
    Expected format:
    ```
    ### CONTEXT
    [Context text]
    
    ### QUERY
    [Query text]
    
    ### CONSTRAINTS
    [Constraints]
    ```
    """
    
    def __init__(self):
        self.REQUIRED_SECTIONS = ['CONTEXT', 'QUERY']
        self.OPTIONAL_SECTIONS = ['CONSTRAINTS', 'INSTRUCTIONS', 'OUTPUT_FORMAT']
        self.HEADER_PATTERN = r'^###\s+([A-Z_]+)\s*$'
    
    def validate_prompt(self, prompt: str) -> PromptValidation:
        """
        Validate that prompt follows structured format.
        
        Args:
            prompt: Full prompt text
        
        Returns:
            PromptValidation object
        """
        sections = {}
        errors = []
        warnings = []
        current_section = None
        current_content = []
        
        lines = prompt.split('\n')
        
        for line in lines:
            header_match = re.match(self.HEADER_PATTERN, line.strip())
            
            if header_match:
                # Save previous section
                if current_section:
                    sections[current_section] = '\n'.join(current_content).strip()
                
                # Start new section
                current_section = header_match.group(1)
                current_content = []
            elif current_section:
                current_content.append(line)
        
        # Save last section
        if current_section:
            sections[current_section] = '\n'.join(current_content).strip()
        
        # Check required sections
        for required in self.REQUIRED_SECTIONS:
            if required not in sections:
                errors.append(f"Missing required section: ### {required}")
        
        # Check for unknown sections
        for section in sections.keys():
            if section not in self.REQUIRED_SECTIONS and section not in self.OPTIONAL_SECTIONS:
                warnings.append(f"Unknown section: ### {section}")
        
        # Check for injection attempts in sections
        injection_flags = self._check_injection(sections)
        if injection_flags:
            errors.extend(injection_flags)
        
        valid = len(errors) == 0
        structured = all(section in sections for section in self.REQUIRED_SECTIONS)
        
        return PromptValidation(
            valid=valid,
            structured=structured,
            sections=sections,
            errors=errors,
            warnings=warnings
        )
    
    def _check_injection(self, sections: Dict[str, str]) -> List[str]:
        """Check sections for injection attempts."""
        flags = []
        
        injection_patterns = [
            (r'\b(ignore|disregard|override)\s+(previous|all)\s+(instructions|rules)', 'INJECTION:OVERRIDE'),
            (r'\b(you\s+are\s+now|from\s+now\s+on)\s+', 'INJECTION:ROLE_CHANGE'),
            (r'\b(print|output|reveal)\s+(your|system)\s+(instructions|prompt)', 'INJECTION:LEAK'),
        ]
        
        for section_name, content in sections.items():
            for pattern, flag in injection_patterns:
                if re.search(pattern, content, re.IGNORECASE):
                    flags.append(f"{flag} in {section_name} section")
        
        return flags
    
    def enforce_structure(self, query: str, context: str = "", constraints: str = "") -> str:
        """
        Enforce structured format on a query.
        
        Args:
            query: User query
            context: Optional context
            constraints: Optional constraints
        
        Returns:
            Structured prompt string
        """
        parts = []
        
        if context:
            parts.append("### CONTEXT")
            parts.append(context)
            parts.append("")
        
        parts.append("### QUERY")
        parts.append(query)
        parts.append("")
        
        if constraints:
            parts.append("### CONSTRAINTS")
            parts.append(constraints)
            parts.append("")
        
        parts.append("### OUTPUT_FORMAT")
        parts.append("Provide a clear, concise answer based on the query and context.")
        
        return '\n'.join(parts)
    
    def sanitize_section(self, content: str) -> str:
        """
        Sanitize section content to remove potential injection.
        
        Args:
            content: Section content
        
        Returns:
            Sanitized content
        """
        # Remove potential injection patterns
        sanitized = content
        
        # Remove instructions that try to override system behavior
        injection_removals = [
            r'\b(ignore|disregard|override)\s+(previous|all)\s+(instructions|rules)[^\n]*\n?',
            r'\b(you\s+are\s+now|from\s+now\s+on)\s+[^\n]*\n?',
            r'\b(print|output|reveal)\s+(your|system)\s+(instructions|prompt)[^\n]*\n?',
        ]
        
        for pattern in injection_removals:
            sanitized = re.sub(pattern, '', sanitized, flags=re.IGNORECASE)
        
        return sanitized

# Export
__all__ = ['StructuredPromptEnforcer', 'PromptValidation']
