type Point = [number, number]

export function drawMesh(output: CanvasRenderingContext2D, image: HTMLCanvasElement, pose: (x: number, y: number) => Point) {
  const triangle = (a: Point, b: Point, c: Point) => {
    const [p, q, r] = [pose(...a), pose(...b), pose(...c)]
    const det = a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1])
    const coeff = (v: number[]) => [
      (v[0] * (b[1] - c[1]) + v[1] * (c[1] - a[1]) + v[2] * (a[1] - b[1])) / det,
      (v[0] * (c[0] - b[0]) + v[1] * (a[0] - c[0]) + v[2] * (b[0] - a[0])) / det,
      (v[0] * (b[0] * c[1] - c[0] * b[1]) + v[1] * (c[0] * a[1] - a[0] * c[1]) + v[2] * (a[0] * b[1] - b[0] * a[1])) / det,
    ]
    const u = coeff([p[0], q[0], r[0]]), v = coeff([p[1], q[1], r[1]])
    output.save()
    output.beginPath()
    const center: Point = [(p[0] + q[0] + r[0]) / 3, (p[1] + q[1] + r[1]) / 3]
    for (const [i, point] of [p, q, r].entries()) {
      const x = center[0] + (point[0] - center[0]) * 1.025
      const y = center[1] + (point[1] - center[1]) * 1.025
      if (i === 0) output.moveTo(x, y); else output.lineTo(x, y)
    }
    output.closePath(); output.clip()
    output.setTransform(u[0], v[0], u[1], v[1], u[2], v[2])
    output.drawImage(image, 0, 0)
    output.restore()
  }
  for (let y = 0; y < 724; y += 36) for (let x = 0; x < 543; x += 36) {
    const right = Math.min(543, x + 36), bottom = Math.min(724, y + 36)
    triangle([x, y], [right, y], [x, bottom])
    triangle([right, y], [right, bottom], [x, bottom])
  }
}
