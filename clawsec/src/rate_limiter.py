"""
ClawSec Best-of-N Defense (Rate Limiter)
Implements rate limiting and Best-of-N defense against repeated attacks.
"""

import time
import hashlib
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional
from threading import Lock

@dataclass
class RateLimitState:
    """State for rate limiting."""
    request_count: int = 0
    first_request_time: float = 0
    blocked_count: int = 0
    last_block_time: float = 0
    flagged_queries: List[str] = field(default_factory=list)

class RateLimiter:
    """
    Rate limiter with Best-of-N defense.
    
    Features:
    - Per-user rate limiting
    - Per-query hash rate limiting (detects repeated attacks)
    - Best-of-N: if N similar queries are blocked, escalate
    - Automatic cooldown periods
    """
    
    def __init__(
        self,
        max_requests_per_minute: int = 60,
        max_blocked_per_minute: int = 5,
        best_of_n_threshold: int = 3,
        cooldown_seconds: int = 300
    ):
        self.max_requests_per_minute = max_requests_per_minute
        self.max_blocked_per_minute = max_blocked_per_minute
        self.best_of_n_threshold = best_of_n_threshold
        self.cooldown_seconds = cooldown_seconds
        
        # State tracking
        self.user_states: Dict[str, RateLimitState] = defaultdict(RateLimitState)
        self.query_hashes: Dict[str, List[float]] = defaultdict(list)
        self.blocked_hashes: Dict[str, int] = defaultdict(int)
        
        self._lock = Lock()
    
    def check_rate_limit(self, user_id: str, query: str) -> Dict[str, Any]:
        """
        Check if request should be rate limited.
        
        Args:
            user_id: User identifier
            query: Query string
        
        Returns:
            Dict with 'allowed', 'reason', 'retry_after'
        """
        with self._lock:
            now = time.time()
            state = self.user_states[user_id]
            query_hash = hashlib.sha256(query.encode()).hexdigest()[:16]
            
            # Clean old requests (older than 1 minute)
            cutoff = now - 60
            state.request_count = sum(
                1 for t in self.query_hashes[query_hash] if t > cutoff
            )
            
            # Check request rate
            if state.request_count >= self.max_requests_per_minute:
                return {
                    "allowed": False,
                    "reason": "Rate limit exceeded (too many requests)",
                    "retry_after": 60,
                    "blocked": True
                }
            
            # Check blocked rate
            if state.blocked_count >= self.max_blocked_per_minute:
                return {
                    "allowed": False,
                    "reason": "Too many blocked requests",
                    "retry_after": self.cooldown_seconds,
                    "blocked": True
                }
            
            # Check Best-of-N (repeated similar attacks)
            if self.blocked_hashes[query_hash] >= self.best_of_n_threshold:
                return {
                    "allowed": False,
                    "reason": f"Repeated blocked query detected (Best-of-N threshold: {self.best_of_n_threshold})",
                    "retry_after": self.cooldown_seconds,
                    "blocked": True,
                    "escalated": True
                }
            
            # Record this request
            self.query_hashes[query_hash].append(now)
            
            return {
                "allowed": True,
                "reason": "",
                "retry_after": 0,
                "blocked": False
            }
    
    def record_block(self, user_id: str, query: str):
        """Record a blocked query for Best-of-N tracking."""
        with self._lock:
            state = self.user_states[user_id]
            state.blocked_count += 1
            state.last_block_time = time.time()
            
            query_hash = hashlib.sha256(query.encode()).hexdigest()[:16]
            self.blocked_hashes[query_hash] += 1
    
    def record_flag(self, user_id: str, query: str):
        """Record a flagged query."""
        with self._lock:
            state = self.user_states[user_id]
            state.flagged_queries.append(query)
            
            # Keep only last 10 flagged queries
            if len(state.flagged_queries) > 10:
                state.flagged_queries = state.flagged_queries[-10:]
    
    def reset_user(self, user_id: str):
        """Reset rate limit state for a user."""
        with self._lock:
            if user_id in self.user_states:
                del self.user_states[user_id]
    
    def get_user_stats(self, user_id: str) -> Dict[str, Any]:
        """Get rate limit stats for a user."""
        with self._lock:
            state = self.user_states.get(user_id)
            if not state:
                return {
                    "request_count": 0,
                    "blocked_count": 0,
                    "flagged_count": 0
                }
            
            return {
                "request_count": state.request_count,
                "blocked_count": state.blocked_count,
                "flagged_count": len(state.flagged_queries),
                "last_block_time": state.last_block_time
            }
    
    def cleanup_old_entries(self):
        """Clean up old entries to prevent memory growth."""
        with self._lock:
            now = time.time()
            cutoff = now - 3600  # 1 hour
            
            # Clean query hashes
            for query_hash in list(self.query_hashes.keys()):
                self.query_hashes[query_hash] = [
                    t for t in self.query_hashes[query_hash] if t > cutoff
                ]
                if not self.query_hashes[query_hash]:
                    del self.query_hashes[query_hash]
            
            # Clean empty user states
            for user_id in list(self.user_states.keys()):
                state = self.user_states[user_id]
                if state.request_count == 0 and state.blocked_count == 0:
                    del self.user_states[user_id]

# Export
__all__ = ['RateLimiter', 'RateLimitState']
