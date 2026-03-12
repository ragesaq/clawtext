"""
ClawSec Automatic Integration Middleware for OpenClaw
Intercepts all web_search calls and routes them through security wrapper.
"""

import sys
import os
from web_search_wrapper import WebSearchSecurityWrapper

class OpenClawSecurityMiddleware:
    """
    Middleware that automatically routes all web_search calls through ClawSec.
    
    Usage:
        from clawsec.src.openclaw_middleware import OpenClawSecurityMiddleware
        middleware = OpenClawSecurityMiddleware()
        middleware.install()
    """
    
    def __init__(self):
        self.wrapper = WebSearchSecurityWrapper()
        self._original_search = None
        self._installed = False
    
    def install(self, tools_module=None):
        """
        Install middleware into OpenClaw's tool system.
        
        Args:
            tools_module: The module containing web_search tool.
                         If None, attempts to find OpenClaw tools automatically.
        """
        if self._installed:
            print("[ClawSec] Middleware already installed")
            return True
        
        # Try to find web_search if not provided
        if tools_module is None:
            # Attempt to find OpenClaw tools module
            try:
                import openclaw.tools as tools_module
            except ImportError:
                try:
                    from openclaw import tools as tools_module
                except ImportError:
                    print("[ClawSec] ERROR: Could not find OpenClaw tools module")
                    print("[ClawSec] Please provide tools_module explicitly")
                    return False
        
        # Check if web_search exists
        if not hasattr(tools_module, 'web_search'):
            print(f"[ClawSec] ERROR: web_search not found in {tools_module}")
            return False
        
        # Store original function
        self._original_search = tools_module.web_search
        
        # Replace with wrapped version
        tools_module.web_search = self._wrapped_search
        
        self._installed = True
        print("[ClawSec] ✓ Middleware installed successfully")
        print("[ClawSec] ✓ All web_search calls now routed through security wrapper")
        
        return True
    
    def _wrapped_search(self, query: str, **kwargs) -> dict:
        """
        Wrapped web_search function that enforces security.
        
        Args:
            query: Search query string
            **kwargs: Additional arguments (session_id, user_id, etc.)
        
        Returns:
            dict with search results or security block/flag response
        """
        session_id = kwargs.get('session_id', 'unknown')
        user_id = kwargs.get('user_id', 'unknown')
        
        # Security validation
        result = self.wrapper.search(query, session_id, user_id)
        
        # If blocked or flagged, return security response
        if result.get('blocked') or result.get('flagged'):
            return result
        
        # Validation passed - call original search
        # Note: In production, this would call the actual web_search API
        # For now, we return a placeholder indicating validation passed
        if self._original_search:
            try:
                return self._original_search(query, **kwargs)
            except Exception as e:
                return {
                    "error": f"Search failed after validation: {str(e)}",
                    "blocked": False,
                    "flagged": False,
                    "results": []
                }
        else:
            # Fallback: return success with empty results (for testing)
            return {
                "success": True,
                "blocked": False,
                "flagged": False,
                "query": query,
                "results": [],
                "message": "Query passed security validation (no search backend configured)"
            }
    
    def uninstall(self):
        """Remove middleware and restore original web_search."""
        if not self._installed:
            return False
        
        if self._original_search:
            # Find the module again to restore
            try:
                import openclaw.tools as tools_module
                tools_module.web_search = self._original_search
            except ImportError:
                pass
        
        self._installed = False
        self._original_search = None
        print("[ClawSec] Middleware uninstalled")
        return True
    
    def is_installed(self) -> bool:
        """Check if middleware is currently installed."""
        return self._installed

# Convenience function for quick installation
def install_clawsec():
    """Quick install ClawSec middleware."""
    middleware = OpenClawSecurityMiddleware()
    return middleware.install()

# Auto-install on import (optional - can be disabled)
# Uncomment the following line to auto-install when this module is imported:
# install_clawsec()
