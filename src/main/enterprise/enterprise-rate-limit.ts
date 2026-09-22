export class SlidingWindowLimiter {
  private hits: number[] = []

  constructor(
    private readonly limit: number,
    private readonly windowMs: number
  ) {}

  allow(now = Date.now()): boolean {
    this.hits = this.hits.filter((time) => now - time < this.windowMs)
    if (this.hits.length >= this.limit) return false
    this.hits.push(now)
    return true
  }
}
