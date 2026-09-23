export function pounceMotion(progress: number, height: number, horizontalDistance: number) {
  const flight = Math.max(0, Math.min(1, (progress - .18) / .76))
  if (flight === 0) return { lift: 0, travel: 0 }

  // A toy jump is driven by the hind legs: rise quickly, hang briefly near
  // the apex, and postpone almost all horizontal drift until the descent.
  const lift = height * Math.sin(Math.PI * flight) ** .72
  const travel = horizontalDistance * flight * flight
  return {
    lift: Math.abs(lift) < 1e-8 ? 0 : lift,
    travel: Math.abs(horizontalDistance - travel) < 1e-8 ? horizontalDistance : travel,
  }
}
