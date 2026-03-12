"""
ClawSec - Web Search Security System
Enterprise-grade security for web_search tool.
"""

from .web_search_wrapper import WebSearchSecurityWrapper, ValidationResult, TypoglycemiaDetector
from .output_guard import OutputGuard, OutputValidation
from .structured_prompt_enforcer import StructuredPromptEnforcer, PromptValidation
from .rate_limiter import RateLimiter, RateLimitState
from .openclaw_middleware import OpenClawSecurityMiddleware, install_clawsec

__version__ = "1.0.0"
__all__ = [
    'WebSearchSecurityWrapper',
    'ValidationResult',
    'TypoglycemiaDetector',
    'OutputGuard',
    'OutputValidation',
    'StructuredPromptEnforcer',
    'PromptValidation',
    'RateLimiter',
    'RateLimitState',
    'OpenClawSecurityMiddleware',
    'install_clawsec'
]
