import time
from collections import defaultdict, deque
from fastapi import HTTPException, Request, status
import logging

logger = logging.getLogger(__name__)


class RateLimiter:
    """
    Simple in-memory sliding window rate limiter.
    No Redis required — resets on server restart.
    """

    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        # ip -> deque of request timestamps
        self._requests: dict[str, deque] = defaultdict(deque)

    def _get_ip(self, request: Request) -> str:
        # Respect X-Forwarded-For if behind a proxy
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    def check(self, request: Request) -> None:
        """
        Raises HTTP 429 if the caller has exceeded the rate limit.
        Call this at the start of a route handler.
        """
        ip = self._get_ip(request)
        now = time.monotonic()
        window_start = now - self.window_seconds

        q = self._requests[ip]

        # Evict timestamps outside the current window
        while q and q[0] < window_start:
            q.popleft()

        if len(q) >= self.max_requests:
            retry_after = int(self.window_seconds - (now - q[0])) + 1
            logger.warning(f"Rate limit exceeded for IP {ip}")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many requests. Please try again in {retry_after} seconds.",
                headers={"Retry-After": str(retry_after)},
            )

        q.append(now)


# Singleton rate limiter for the /login endpoint:
# max 500 attempts per IP per 60 seconds (relaxed for demo/dev)
login_limiter = RateLimiter(max_requests=500, window_seconds=60)
