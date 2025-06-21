# Rate Limiter

This is a simple, in-memory rate limiter designed to control the frequency of requests from individual users or clients within a specified time window. It's a foundational component for preventing abuse, protecting resources, and ensuring fair usage in applications.
Features

-Sliding Window Algorithm: Tracks requests based on a sliding time window, allowing for more precise control than fixed-window methods.
- Configurable Limits: Easily set the maximum number of requests and the time window duration.
- Memory Efficient: Includes a background cleanup mechanism to automatically remove stale request data, preventing memory leaks in long-running applications.
- TypeScript Support: Written in TypeScript for better type safety and code maintainability.
