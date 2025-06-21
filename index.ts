interface RateLimiterProps {
  timeWindow: number;
  maxRequests: number;
}

type UserRequests = number[];
type UserId = string;

class RateLimiter implements RateLimiterProps {
  timeWindow: number;
  maxRequests: number;

  constructor(timeWindow: number, maxRequests: number) {
    if (timeWindow <= 0 || maxRequests <= 0) {
      throw new Error("timeWindow and maxRequests must be positive numbers.");
    }
    this.timeWindow = timeWindow;
    this.maxRequests = maxRequests;
    this.startCleanupTask();
  }

  private requests = new Map<UserId, UserRequests>();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private static readonly CLEANUP_FREQUENCY = 60 * 1000;

  acceptRequest(id: UserId, timestamp: number): boolean {
    if (timestamp < 0) {
      console.warn(
        "Timestamp cannot be negative. Request rejected for user:",
        id
      );
      return false;
    }

    const userRequests = this.requests.get(id);

    if (!userRequests) {
      this.requests.set(id, [timestamp]);
      return true;
    }

    let i = 0;
    while (
      i < userRequests.length &&
      timestamp - userRequests[i] >= this.timeWindow
    ) {
      i++;
    }
    if (i > 0) {
      userRequests.splice(0, i);
    }

    //   check requests in timeWindow
    if (userRequests.length >= this.maxRequests) {
      return false;
    }

    userRequests.push(timestamp);
    return true;
  }

  /**
   * Starts a background task to periodically clean up stale user request data
   * to prevent memory leaks.
   */
  private startCleanupTask(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleRequests();
    }, RateLimiter.CLEANUP_FREQUENCY);

    if (typeof this.cleanupInterval.unref === "function") {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Manually cleans up stale requests for all users.
   */
  private cleanupStaleRequests(): void {
    const now = Date.now();
    for (const [userId, userRequests] of this.requests.entries()) {
      let i = 0;
      while (
        i < userRequests.length &&
        now - userRequests[i] >= this.timeWindow
      ) {
        i++;
      }
      if (i > 0) {
        userRequests.splice(0, i);
      }

      if (userRequests.length === 0) {
        this.requests.delete(userId);
      }
    }
    console.log("RateLimiter cleanup performed.");
  }

  /**
   * Stops the background cleanup task. Call this when the RateLimiter is no longer needed.
   */
  public stopCleanupTask(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Gets the current number of requests for a specific user.
   * Useful for debugging or monitoring.
   */
  public getCurrentRequestCount(id: UserId): number {
    return this.requests.get(id)?.length || 0;
  }

  /**
   * Gets the total number of unique users currently tracked by the rate limiter.
   */
  public getTrackedUserCount(): number {
    return this.requests.size;
  }
}

// --- Usage Example ---
console.log("--- Testing Rate Limiter ---");

const limiter1 = new RateLimiter(5000, 2); // 5000ms

console.log("User A, t=1000:", limiter1.acceptRequest("userA", 1000)); // true (1/2)
console.log("User A, t=2000:", limiter1.acceptRequest("userA", 2000)); // true (2/2)
console.log("User A, t=3000:", limiter1.acceptRequest("userA", 3000)); // false (exceeds 2/2)
console.log("User B, t=3000:", limiter1.acceptRequest("userB", 3000)); // true (1/2 for B)
console.log("User A, t=6000:", limiter1.acceptRequest("userA", 6000)); // true (1/2 - 1000ms request is now stale)
console.log("User A, t=7000:", limiter1.acceptRequest("userA", 7000)); // true (2/2)
console.log("User A, t=8000:", limiter1.acceptRequest("userA", 8000)); // false (exceeds 2/2)

// Simulate passage of time for cleanup
setTimeout(() => {
  console.log("\n--- After 10 seconds (simulated cleanup might run) ---");
  console.log(
    "User A current requests:",
    limiter1.getCurrentRequestCount("userA")
  );
  console.log("Total tracked users:", limiter1.getTrackedUserCount());
  limiter1.stopCleanupTask();
}, 10000);
