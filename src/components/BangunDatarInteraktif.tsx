import { useEffect, useState } from "react"
import { BookOpen, CheckCircle2, Ruler, Shapes, Sparkles } from "lucide-react"

type ShapeId =
  | "square"
  | "rectangle"
  | "equilateralTriangle"
  | "rightTriangle"
  | "isoscelesTriangle"
  | "parallelogram"
  | "rhombus"
  | "kite"
  | "trapezoid"
  | "circle"
  | "pentagon"
  | "hexagon"

type DimensionKey =
  | "side"
  | "length"
  | "width"
  | "base"
  | "height"
  | "equalSide"
  | "radius"
  | "diagonalA"
  | "diagonalB"
  | "sideLength"
  | "topBase"
  | "bottomBase"

type Dimensions = Record<DimensionKey, number>
type Point = { x: number; y: number }
type SymmetryAxis = { start: Point; end: Point; title: string; description: string }

interface DimensionControl {
  key: DimensionKey
  label: string
  min: number
  max: number
}

interface PlaneShape {
  id: ShapeId
  name: string
  group: string
  sides: string
  description: string
  controls: DimensionControl[]
}

const INITIAL_DIMENSIONS: Dimensions = {
  side: 6,
  length: 10,
  width: 6,
  base: 10,
  height: 4,
  equalSide: 7,
  radius: 5,
  diagonalA: 10,
  diagonalB: 6,
  sideLength: 6,
  topBase: 6,
  bottomBase: 12,
}

const MAX_DIMENSION = 20

const planeShapes: PlaneShape[] = [
  { id: "square", name: "Persegi", group: "Segiempat", sides: "4 sisi sama panjang", description: "Empat sisi sama panjang dan empat sudut siku-siku.", controls: [{ key: "side", label: "Panjang sisi (s)", min: 2, max: MAX_DIMENSION }] },
  { id: "rectangle", name: "Persegi panjang", group: "Segiempat", sides: "2 pasang sisi sama panjang", description: "Sisi yang berhadapan sama panjang; keempat sudutnya siku-siku.", controls: [{ key: "length", label: "Panjang (p)", min: 3, max: MAX_DIMENSION }, { key: "width", label: "Lebar (l)", min: 2, max: MAX_DIMENSION }] },
  { id: "equilateralTriangle", name: "Segitiga sama sisi", group: "Segitiga", sides: "3 sisi sama panjang", description: "Ketiga sisi sama panjang dan setiap sudutnya 60°.", controls: [{ key: "side", label: "Panjang sisi (s)", min: 3, max: MAX_DIMENSION }] },
  { id: "rightTriangle", name: "Segitiga siku-siku", group: "Segitiga", sides: "1 sudut 90°", description: "Dua kaki segitiga saling tegak lurus; sisi miring dapat dihitung dengan Teorema Pythagoras.", controls: [{ key: "base", label: "Alas (a)", min: 3, max: MAX_DIMENSION }, { key: "height", label: "Tinggi (t)", min: 3, max: MAX_DIMENSION }] },
  { id: "isoscelesTriangle", name: "Segitiga sama kaki", group: "Segitiga", sides: "2 sisi sama panjang", description: "Dua sisi sama panjang. Tinggi membagi alas menjadi dua bagian sama panjang.", controls: [{ key: "base", label: "Alas (a)", min: 4, max: MAX_DIMENSION }, { key: "equalSide", label: "Sisi sama panjang (s)", min: 6, max: MAX_DIMENSION }] },
  { id: "parallelogram", name: "Jajar genjang", group: "Segiempat", sides: "2 pasang sisi sejajar", description: "Sisi berhadapan sejajar dan sama panjang. Luas memakai tinggi tegak lurus alas.", controls: [{ key: "base", label: "Alas (a)", min: 6, max: MAX_DIMENSION }, { key: "height", label: "Tinggi tegak lurus (t)", min: 2, max: MAX_DIMENSION }, { key: "sideLength", label: "Sisi miring (b)", min: 5, max: MAX_DIMENSION }] },
  { id: "rhombus", name: "Belah ketupat", group: "Segiempat", sides: "4 sisi sama panjang", description: "Semua sisi sama panjang. Kedua diagonalnya saling tegak lurus.", controls: [{ key: "diagonalA", label: "Diagonal mendatar (d₁)", min: 5, max: MAX_DIMENSION }, { key: "diagonalB", label: "Diagonal tegak (d₂)", min: 4, max: MAX_DIMENSION }] },
  { id: "kite", name: "Layang-layang", group: "Segiempat", sides: "2 pasang sisi berdekatan sama panjang", description: "Dua diagonal saling tegak lurus; salah satunya membagi diagonal lainnya.", controls: [{ key: "diagonalA", label: "Diagonal tegak (d₁)", min: 5, max: MAX_DIMENSION }, { key: "diagonalB", label: "Diagonal mendatar (d₂)", min: 4, max: MAX_DIMENSION }] },
  { id: "trapezoid", name: "Trapesium sama kaki", group: "Segiempat", sides: "1 pasang sisi sejajar", description: "Sepasang sisi sejajar disebut alas. Pada model ini, kedua sisi miring sama panjang.", controls: [{ key: "topBase", label: "Alas atas (a)", min: 4, max: MAX_DIMENSION }, { key: "bottomBase", label: "Alas bawah (b)", min: 8, max: MAX_DIMENSION }, { key: "height", label: "Tinggi (t)", min: 3, max: MAX_DIMENSION }] },
  { id: "circle", name: "Lingkaran", group: "Bentuk lengkung", sides: "Tidak memiliki sisi lurus atau titik sudut", description: "Semua titik pada keliling berjarak sama dari titik pusat.", controls: [{ key: "radius", label: "Jari-jari (r)", min: 2, max: MAX_DIMENSION }] },
  { id: "pentagon", name: "Segi lima beraturan", group: "Poligon beraturan", sides: "5 sisi dan sudut sama besar", description: "Lima sisi sama panjang; luas dapat dihitung dari keliling dan apotema.", controls: [{ key: "sideLength", label: "Panjang sisi (s)", min: 3, max: MAX_DIMENSION }] },
  { id: "hexagon", name: "Segi enam beraturan", group: "Poligon beraturan", sides: "6 sisi dan sudut sama besar", description: "Enam sisi sama panjang; bentuk ini dapat dibagi menjadi enam segitiga sama sisi.", controls: [{ key: "sideLength", label: "Panjang sisi (s)", min: 3, max: MAX_DIMENSION }] },
]

function format(value: number) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(value)
}

function getVertices(id: ShapeId, dimensions: Dimensions): Point[] {
  const { side, length, width, base, height, equalSide, radius, diagonalA, diagonalB, sideLength, topBase, bottomBase } = dimensions
  switch (id) {
    case "square":
      return [{ x: 0, y: 0 }, { x: side, y: 0 }, { x: side, y: side }, { x: 0, y: side }]
    case "rectangle":
      return [{ x: 0, y: 0 }, { x: length, y: 0 }, { x: length, y: width }, { x: 0, y: width }]
    case "equilateralTriangle":
      return [{ x: 0, y: 0 }, { x: side, y: 0 }, { x: side / 2, y: Math.sqrt(3) * side / 2 }]
    case "rightTriangle":
      return [{ x: 0, y: 0 }, { x: base, y: 0 }, { x: 0, y: height }]
    case "isoscelesTriangle": {
      const triangleHeight = Math.sqrt(Math.max(0, equalSide ** 2 - (base / 2) ** 2))
      return [{ x: 0, y: 0 }, { x: base, y: 0 }, { x: base / 2, y: triangleHeight }]
    }
    case "parallelogram": {
      const offset = Math.sqrt(Math.max(0, sideLength ** 2 - height ** 2))
      return [{ x: offset, y: 0 }, { x: offset + base, y: 0 }, { x: base, y: height }, { x: 0, y: height }]
    }
    case "rhombus":
      return [{ x: diagonalA / 2, y: diagonalB }, { x: diagonalA, y: diagonalB / 2 }, { x: diagonalA / 2, y: 0 }, { x: 0, y: diagonalB / 2 }]
    case "kite": {
      const split = 0.58
      return [{ x: diagonalB / 2, y: diagonalA }, { x: diagonalB, y: diagonalA * split }, { x: diagonalB / 2, y: 0 }, { x: 0, y: diagonalA * split }]
    }
    case "trapezoid": {
      const inset = (bottomBase - topBase) / 2
      return [{ x: inset, y: height }, { x: inset + topBase, y: height }, { x: bottomBase, y: 0 }, { x: 0, y: 0 }]
    }
    case "circle":
      return Array.from({ length: 80 }, (_, index) => {
        const angle = (Math.PI * 2 * index) / 80
        return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) }
      })
    case "pentagon":
    case "hexagon": {
      const sides = id === "pentagon" ? 5 : 6
      const circumradius = sideLength / (2 * Math.sin(Math.PI / sides))
      return Array.from({ length: sides }, (_, index) => {
        const angle = -Math.PI / 2 + (Math.PI * 2 * index) / sides
        return { x: circumradius * Math.cos(angle), y: circumradius * Math.sin(angle) }
      })
    }
  }
}

function getSymmetryAxes(id: ShapeId, d: Dimensions): SymmetryAxis[] {
  const line = (start: Point, end: Point, title: string, description: string): SymmetryAxis => ({ start, end, title, description })
  const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
  const centerLine = "Jika dilipat pada garis ini, kedua bagian akan saling berimpit."

  switch (id) {
    case "square":
      return [
        line({ x: d.side / 2, y: 0 }, { x: d.side / 2, y: d.side }, "Sumbu tegak", centerLine),
        line({ x: 0, y: d.side / 2 }, { x: d.side, y: d.side / 2 }, "Sumbu mendatar", centerLine),
        line({ x: 0, y: 0 }, { x: d.side, y: d.side }, "Diagonal", centerLine),
        line({ x: 0, y: d.side }, { x: d.side, y: 0 }, "Diagonal", centerLine),
      ]
    case "rectangle":
      return [
        line({ x: d.length / 2, y: 0 }, { x: d.length / 2, y: d.width }, "Sumbu tegak", centerLine),
        line({ x: 0, y: d.width / 2 }, { x: d.length, y: d.width / 2 }, "Sumbu mendatar", centerLine),
      ]
    case "equilateralTriangle": {
      const vertices = getVertices(id, d)
      return vertices.map((vertex, index) => line(vertex, midpoint(vertices[(index + 1) % 3], vertices[(index + 2) % 3]), `Sumbu ${index + 1}`, centerLine))
    }
    case "rightTriangle":
      return d.base === d.height
        ? [line({ x: 0, y: 0 }, { x: d.base / 2, y: d.height / 2 }, "Sumbu lipat", centerLine)]
        : []
    case "isoscelesTriangle": {
      const height = Math.sqrt(Math.max(0, d.equalSide ** 2 - (d.base / 2) ** 2))
      return [line({ x: d.base / 2, y: 0 }, { x: d.base / 2, y: height }, "Sumbu tegak", centerLine)]
    }
    case "parallelogram": {
      const offset = Math.sqrt(Math.max(0, d.sideLength ** 2 - d.height ** 2))
      if (offset > 0.02) return []
      const axes = [
        line({ x: d.base / 2, y: 0 }, { x: d.base / 2, y: d.height }, "Sumbu tegak", centerLine),
        line({ x: 0, y: d.height / 2 }, { x: d.base, y: d.height / 2 }, "Sumbu mendatar", centerLine),
      ]
      if (d.base === d.height) {
        axes.push(line({ x: 0, y: 0 }, { x: d.base, y: d.height }, "Diagonal", centerLine))
        axes.push(line({ x: 0, y: d.height }, { x: d.base, y: 0 }, "Diagonal", centerLine))
      }
      return axes
    }
    case "rhombus": {
      const vertices = getVertices(id, d)
      const axes = [
        line(vertices[0], vertices[2], "Diagonal mendatar", centerLine),
        line(vertices[1], vertices[3], "Diagonal tegak", centerLine),
      ]
      if (d.diagonalA === d.diagonalB) {
        axes.push(line(midpoint(vertices[0], vertices[1]), midpoint(vertices[2], vertices[3]), "Sumbu sisi", centerLine))
        axes.push(line(midpoint(vertices[1], vertices[2]), midpoint(vertices[3], vertices[0]), "Sumbu sisi", centerLine))
      }
      return axes
    }
    case "kite":
      return [line({ x: d.diagonalB / 2, y: 0 }, { x: d.diagonalB / 2, y: d.diagonalA }, "Diagonal tegak", centerLine)]
    case "trapezoid": {
      const axes = [line({ x: d.bottomBase / 2, y: 0 }, { x: d.bottomBase / 2, y: d.height }, "Sumbu tegak", centerLine)]
      if (d.topBase === d.bottomBase) {
        axes.push(line({ x: 0, y: d.height / 2 }, { x: d.bottomBase, y: d.height / 2 }, "Sumbu mendatar", centerLine))
        if (d.bottomBase === d.height) {
          axes.push(line({ x: 0, y: 0 }, { x: d.bottomBase, y: d.height }, "Diagonal", centerLine))
          axes.push(line({ x: 0, y: d.height }, { x: d.bottomBase, y: 0 }, "Diagonal", centerLine))
        }
      }
      return axes
    }
    case "circle":
      return [
        line({ x: -d.radius, y: 0 }, { x: d.radius, y: 0 }, "Diameter mendatar", "Lingkaran memiliki tak terhingga banyak sumbu simetri; garis ini salah satu contohnya."),
        line({ x: 0, y: -d.radius }, { x: 0, y: d.radius }, "Diameter tegak", "Lingkaran memiliki tak terhingga banyak sumbu simetri; garis ini salah satu contohnya."),
      ]
    case "pentagon":
    case "hexagon": {
      const vertices = getVertices(id, d)
      const sides = vertices.length
      if (sides % 2 === 1) {
        return vertices.map((vertex, index) => {
          const oppositeStart = vertices[(index + Math.floor(sides / 2)) % sides]
          const oppositeEnd = vertices[(index + Math.floor(sides / 2) + 1) % sides]
          return line(vertex, midpoint(oppositeStart, oppositeEnd), `Sumbu ${index + 1}`, centerLine)
        })
      }
      const axes: SymmetryAxis[] = []
      for (let index = 0; index < sides / 2; index++) {
        axes.push(line(vertices[index], vertices[index + sides / 2], `Sumbu titik ${index + 1}`, centerLine))
        axes.push(line(midpoint(vertices[index], vertices[(index + 1) % sides]), midpoint(vertices[index + sides / 2], vertices[(index + sides / 2 + 1) % sides]), `Sumbu sisi ${index + 1}`, centerLine))
      }
      return axes
    }
  }
}

function createPointMapper(points: Point[], width: number, height: number, padding: number) {
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const rawWidth = maxX - minX || 1
  const rawHeight = maxY - minY || 1
  const scale = Math.min((width - padding * 2) / rawWidth, (height - padding * 2) / rawHeight)
  const offsetX = (width - rawWidth * scale) / 2
  const offsetY = (height - rawHeight * scale) / 2
  return (point: Point) => ({
    x: offsetX + (point.x - minX) * scale,
    y: height - offsetY - (point.y - minY) * scale,
  })
}

function createPointRotator(points: Point[], degrees: number) {
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const centerX = (Math.min(...xs) + Math.max(...xs)) / 2
  const centerY = (Math.min(...ys) + Math.max(...ys)) / 2
  const radians = (degrees * Math.PI) / 180
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)

  return (point: Point) => {
    const x = point.x - centerX
    const y = point.y - centerY
    return {
      x: centerX + x * cosine - y * sine,
      y: centerY + x * sine + y * cosine,
    }
  }
}

function createRotationSafeMapper(points: Point[], width: number, height: number, padding: number) {
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const centerX = (Math.min(...xs) + Math.max(...xs)) / 2
  const centerY = (Math.min(...ys) + Math.max(...ys)) / 2
  const radius = Math.max(...points.map((point) => Math.hypot(point.x - centerX, point.y - centerY))) || 1
  const scale = Math.min((width - padding * 2) / (radius * 2), (height - padding * 2) / (radius * 2))

  return (point: Point) => ({
    x: width / 2 + (point.x - centerX) * scale,
    y: height / 2 - (point.y - centerY) * scale,
  })
}

function fitPoints(points: Point[], width: number, height: number, padding: number) {
  const mapPoint = createPointMapper(points, width, height, padding)
  return points.map(mapPoint)
}

function ShapeThumbnail({ id }: { id: ShapeId }) {
  const points = fitPoints(getVertices(id, INITIAL_DIMENSIONS), 48, 36, 5)
  return (
    <svg viewBox="0 0 48 36" aria-hidden="true" className="h-9 w-12 shrink-0 overflow-visible">
      <polygon points={points.map((point) => `${point.x},${point.y}`).join(" ")} fill="currentColor" fillOpacity=".16" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

function getStats(id: ShapeId, d: Dimensions) {
  switch (id) {
    case "square":
      return { area: d.side ** 2, perimeter: 4 * d.side, areaFormula: "A = s²", perimeterFormula: "K = 4s", note: `s = ${format(d.side)} cm` }
    case "rectangle":
      return { area: d.length * d.width, perimeter: 2 * (d.length + d.width), areaFormula: "A = p × l", perimeterFormula: "K = 2(p + l)", note: `p = ${format(d.length)} cm · l = ${format(d.width)} cm` }
    case "equilateralTriangle":
      return { area: (Math.sqrt(3) * d.side ** 2) / 4, perimeter: 3 * d.side, areaFormula: "A = (√3 / 4)s²", perimeterFormula: "K = 3s", note: `s = ${format(d.side)} cm · tinggi = ${format((Math.sqrt(3) * d.side) / 2)} cm` }
    case "rightTriangle": {
      const hypotenuse = Math.hypot(d.base, d.height)
      return { area: (d.base * d.height) / 2, perimeter: d.base + d.height + hypotenuse, areaFormula: "A = ½ × a × t", perimeterFormula: "K = a + t + c", note: `c = √(${d.base}² + ${d.height}²) = ${format(hypotenuse)} cm` }
    }
    case "isoscelesTriangle": {
      const triangleHeight = Math.sqrt(Math.max(0, d.equalSide ** 2 - (d.base / 2) ** 2))
      return { area: (d.base * triangleHeight) / 2, perimeter: d.base + 2 * d.equalSide, areaFormula: "A = ½ × a × t", perimeterFormula: "K = a + 2s", note: `tinggi = √(s² − (a/2)²) = ${format(triangleHeight)} cm` }
    }
    case "parallelogram":
      return { area: d.base * d.height, perimeter: 2 * (d.base + d.sideLength), areaFormula: "A = a × t", perimeterFormula: "K = 2(a + b)", note: `a = ${format(d.base)} cm · t tegak lurus = ${format(d.height)} cm · b = ${format(d.sideLength)} cm` }
    case "rhombus": {
      const side = Math.hypot(d.diagonalA / 2, d.diagonalB / 2)
      return { area: (d.diagonalA * d.diagonalB) / 2, perimeter: 4 * side, areaFormula: "A = (d₁ × d₂) / 2", perimeterFormula: "K = 4s", note: `s = √((d₁/2)² + (d₂/2)²) = ${format(side)} cm` }
    }
    case "kite": {
      const upperSide = Math.hypot(d.diagonalB / 2, d.diagonalA * 0.58)
      const lowerSide = Math.hypot(d.diagonalB / 2, d.diagonalA * 0.42)
      return { area: (d.diagonalA * d.diagonalB) / 2, perimeter: 2 * (upperSide + lowerSide), areaFormula: "A = (d₁ × d₂) / 2", perimeterFormula: "K = 2(a + b)", note: `Diagonal saling tegak lurus; d₁ = ${format(d.diagonalA)} cm · d₂ = ${format(d.diagonalB)} cm` }
    }
    case "trapezoid": {
      const leg = Math.hypot(d.height, (d.bottomBase - d.topBase) / 2)
      return { area: ((d.topBase + d.bottomBase) * d.height) / 2, perimeter: d.topBase + d.bottomBase + 2 * leg, areaFormula: "A = ½ × (a + b) × t", perimeterFormula: "K = a + b + 2c", note: `sisi miring sama panjang, masing-masing ${format(leg)} cm` }
    }
    case "circle":
      return { area: Math.PI * d.radius ** 2, perimeter: 2 * Math.PI * d.radius, areaFormula: "A = πr²", perimeterFormula: "K = 2πr", note: `r = ${format(d.radius)} cm · diameter = ${format(2 * d.radius)} cm` }
    case "pentagon": {
      const apothem = d.sideLength / (2 * Math.tan(Math.PI / 5))
      return { area: (5 * d.sideLength * apothem) / 2, perimeter: 5 * d.sideLength, areaFormula: "A = ½ × K × apotema", perimeterFormula: "K = 5s", note: `apotema = ${format(apothem)} cm` }
    }
    case "hexagon":
      return { area: (3 * Math.sqrt(3) * d.sideLength ** 2) / 2, perimeter: 6 * d.sideLength, areaFormula: "A = (3√3 / 2)s²", perimeterFormula: "K = 6s", note: "Terbagi menjadi 6 segitiga sama sisi." }
  }
}

function RangeControl({
  control,
  value,
  onChange,
}: {
  control: DimensionControl
  value: number
  onChange: (value: number) => void
}) {
  return (
    <label className="block space-y-2">
      <span className="flex items-center justify-between gap-3 text-sm font-medium">
        <span>{control.label}</span>
        <span className="rounded-lg bg-muted px-2.5 py-1 text-xs font-bold tabular-nums text-foreground">{value} cm</span>
      </span>
      <input
        type="range"
        min={control.min}
        max={control.max}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={control.label}
        className="h-2 w-full cursor-pointer accent-emerald-600"
      />
      <span className="flex justify-between text-[11px] text-muted-foreground"><span>{control.min}</span><span>{control.max} cm</span></span>
    </label>
  )
}

function fitDimensionsToShape(shape: PlaneShape, dimensions: Dimensions): Dimensions {
  const fitted = { ...dimensions }
  for (const control of shape.controls) {
    fitted[control.key] = Math.min(control.max, Math.max(control.min, fitted[control.key]))
  }
  if (shape.id === "isoscelesTriangle") {
    fitted.equalSide = Math.max(fitted.equalSide, Math.floor(fitted.base / 2) + 1)
  }
  if (shape.id === "parallelogram") {
    fitted.sideLength = Math.max(fitted.sideLength, fitted.height)
  }
  return fitted
}

export default function BangunDatarInteraktif({ resetSignal }: { resetSignal: number }) {
  const [mode, setMode] = useState<"learn" | "lab">("learn")
  const [lessonStep, setLessonStep] = useState(0)
  const [selectedId, setSelectedId] = useState<ShapeId>("square")
  const [dimensions, setDimensions] = useState<Dimensions>(INITIAL_DIMENSIONS)
  const [showGrid, setShowGrid] = useState(true)
  const [showMeasures, setShowMeasures] = useState(true)
  const [showSymmetry, setShowSymmetry] = useState(true)
  const [selectedAxis, setSelectedAxis] = useState<number | null>(null)
  const [rotationAngle, setRotationAngle] = useState(0)
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null)
  const [quizChecked, setQuizChecked] = useState(false)

  useEffect(() => {
    if (resetSignal === 0) return
    setDimensions(INITIAL_DIMENSIONS)
    setQuizAnswer(null)
    setQuizChecked(false)
    setLessonStep(0)
  }, [resetSignal])

  const selectedShape = planeShapes.find((shape) => shape.id === selectedId)!
  const stats = getStats(selectedId, dimensions)
  const guidedLessons = [
    { title: "Kenali bentuknya", description: `${selectedShape.description} Amati juga garis putus-putus untuk mengenali simetri lipatnya.` },
    { title: "Pahami rumusnya", description: `Luas ${selectedShape.name.toLowerCase()} dihitung dengan ${stats.areaFormula}; kelilingnya dihitung dengan ${stats.perimeterFormula}.` },
    { title: "Lakukan eksperimen", description: "Ubah ukuran dan putar bentuknya. Amati perubahan luas serta keliling, lalu jawab uji pemahaman." },
  ]
  const correctQuizAnswer = Number(stats.area.toFixed(2))
  const quizAnswers = [...new Set([
    Number((correctQuizAnswer * 0.5).toFixed(2)),
    Number((correctQuizAnswer * 0.75).toFixed(2)),
    correctQuizAnswer,
    Number((correctQuizAnswer * 1.5).toFixed(2)),
  ])].sort((a, b) => a - b)
  const quizQuestion = `Berapakah luas ${selectedShape.name.toLowerCase()} dengan ${selectedShape.controls.map((control) => `${control.label.replace(/\s*\([^)]*\)/, "").toLowerCase()} ${format(dimensions[control.key])} cm`).join(", ")}?`
  const rawPoints = getVertices(selectedId, dimensions)
  const rotatePoint = createPointRotator(rawPoints, rotationAngle)
  const rotatedPoints = rawPoints.map(rotatePoint)
  const mapPoint = createRotationSafeMapper(rawPoints, 360, 270, 42)
  const points = rotatedPoints.map(mapPoint)
  const symmetryAxes = getSymmetryAxes(selectedId, dimensions).map((axis) => ({ ...axis, start: mapPoint(rotatePoint(axis.start)), end: mapPoint(rotatePoint(axis.end)) }))
  const resetQuiz = () => {
    setQuizAnswer(null)
    setQuizChecked(false)
  }
  const updateDimension = (key: DimensionKey, value: number) => {
    setDimensions((current) => {
      const next = { ...current, [key]: value }
      if (selectedId === "isoscelesTriangle") {
        if (key === "base") next.equalSide = Math.max(next.equalSide, Math.floor(value / 2) + 1)
        if (key === "equalSide") next.base = Math.min(next.base, value * 2 - 1)
      }
      if (selectedId === "parallelogram") {
        if (key === "height") next.sideLength = Math.max(next.sideLength, value)
        if (key === "sideLength") next.height = Math.min(next.height, value)
      }
      return next
    })
    resetQuiz()
  }
  const chooseShape = (shape: PlaneShape) => {
    setSelectedId(shape.id)
    setSelectedAxis(null)
    setRotationAngle(0)
    setLessonStep(0)
    setDimensions((current) => fitDimensionsToShape(shape, current))
    resetQuiz()
  }

  return (
    <div className="relative mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300"><Shapes className="h-3.5 w-3.5" />Geometri · 12 bentuk interaktif</div>
          <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">Bangun datar</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Bangun datar adalah bentuk dua dimensi dengan panjang dan lebar. Poligon memiliki sisi lurus; lingkaran memiliki garis tepi lengkung. Pilih bentuk lalu geser ukurannya untuk melihat perubahan luas dan keliling.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Pilih mode materi bangun datar" className="inline-flex rounded-full border border-border/70 bg-muted/70 p-1">
            <button type="button" onClick={() => setMode("learn")} aria-pressed={mode === "learn"} className={"inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition sm:px-4 sm:text-sm " + (mode === "learn" ? "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700" : "text-muted-foreground hover:bg-background/80 hover:text-foreground")}>
              <BookOpen className="h-4 w-4" />Mode Belajar
            </button>
            <button type="button" onClick={() => setMode("lab")} aria-pressed={mode === "lab"} className={"inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition sm:px-4 sm:text-sm " + (mode === "lab" ? "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700" : "text-muted-foreground hover:bg-background/80 hover:text-foreground")}>
              <Shapes className="h-4 w-4" />Laboratorium
            </button>
          </div>
        </div>
      </section>

      {mode === "learn" && (
        <section className="rounded-2xl bg-emerald-500/5 p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"><BookOpen className="h-5 w-5" /></div>
            <div><h3 className="font-bold">Pembelajaran terpandu</h3><p className="text-xs text-muted-foreground">Langkah {lessonStep + 1} dari {guidedLessons.length}</p></div>
          </div>
          <div className="mb-5 space-y-2"><h4 className="font-semibold">{guidedLessons[lessonStep].title}</h4><p className="text-sm leading-6 text-muted-foreground">{guidedLessons[lessonStep].description}</p></div>
          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: String(((lessonStep + 1) / guidedLessons.length) * 100) + "%" }} /></div>
          <div className="flex justify-between gap-3">
            <button type="button" disabled={lessonStep === 0} onClick={() => setLessonStep((current) => current - 1)} className="rounded-xl px-4 py-2 text-sm font-semibold transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40">Sebelumnya</button>
            <button type="button" disabled={lessonStep === guidedLessons.length - 1} onClick={() => setLessonStep((current) => current + 1)} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40">Berikutnya</button>
          </div>
        </section>
      )}

      <section aria-labelledby="pilih-bangun-datar" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id="pilih-bangun-datar" className="font-bold">Pilih bentuk</h3>
          <p className="text-xs text-muted-foreground">Pilih salah satu untuk mulai bereksperimen</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {planeShapes.map((shape) => {
            const active = shape.id === selectedId
            return (
              <button
                key={shape.id}
                type="button"
                onClick={() => chooseShape(shape)}
                aria-pressed={active}
                className={"group flex min-h-[4.25rem] items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:gap-2.5 sm:px-3 " + (active ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-800 shadow-sm dark:text-emerald-200" : "border-border/70 bg-background/75 hover:border-emerald-500/30 hover:bg-emerald-500/5")}
              >
                <span className={"flex h-10 w-11 shrink-0 items-center justify-center rounded-lg " + (active ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-muted/70 text-muted-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-300")}>
                  <ShapeThumbnail id={shape.id} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold leading-4 sm:text-sm">{shape.name}</span>
                  <span className="mt-0.5 block truncate text-[10px] text-muted-foreground sm:text-[11px]">{shape.group}</span>
                </span>
                {active && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />}
              </button>
            )
          })}
        </div>
      </section>

      <section className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 overflow-hidden rounded-3xl border border-border/70 bg-background/75 shadow-lg shadow-emerald-950/5">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 px-4 py-4 sm:px-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"><Shapes className="h-5 w-5" /></div>
              <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{selectedShape.name}</h3><span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{selectedShape.group}</span></div><p className="mt-1 text-xs leading-5 text-muted-foreground">{selectedShape.sides}</p></div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => { setShowSymmetry((current) => !current); setSelectedAxis(null) }} aria-pressed={showSymmetry} className={"rounded-lg px-2.5 py-2 text-xs font-semibold transition " + (showSymmetry ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground")}>
                Simetri lipat {showSymmetry ? "aktif" : "nonaktif"}
              </button>
              <button type="button" onClick={() => setShowGrid((current) => !current)} aria-pressed={showGrid} className={"rounded-lg px-2.5 py-2 text-xs font-semibold transition " + (showGrid ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground")}>
                Kisi {showGrid ? "aktif" : "nonaktif"}
              </button>
              <button type="button" onClick={() => setShowMeasures((current) => !current)} aria-pressed={showMeasures} className={"rounded-lg px-2.5 py-2 text-xs font-semibold transition " + (showMeasures ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground")}>
                Ukuran {showMeasures ? "aktif" : "nonaktif"}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-b border-border/60 px-4 py-3 sm:px-6">
            <label htmlFor="bangun-datar-rotation" className="shrink-0 text-xs font-semibold">Putar bentuk</label>
            <input
              id="bangun-datar-rotation"
              type="range"
              min={0}
              max={360}
              step={1}
              value={rotationAngle}
              onChange={(event) => setRotationAngle(Number(event.target.value))}
              aria-label="Sudut putar bentuk, 0 sampai 360 derajat"
              className="h-2 min-w-28 flex-1 cursor-pointer accent-emerald-600"
            />
            <span className="min-w-12 text-right text-xs font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{rotationAngle}°</span>
            <button type="button" onClick={() => setRotationAngle(0)} className="rounded-lg bg-muted px-2.5 py-1.5 text-xs font-semibold transition hover:bg-muted/70" aria-label="Kembalikan sudut ke 0 derajat">0°</button>
          </div>

          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-cyan-50/80 to-white px-3 py-5 dark:from-emerald-950/25 dark:via-[#10201d] dark:to-background sm:px-6 sm:py-7">
            <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-emerald-300/15 blur-3xl" />
            <svg viewBox="0 0 360 270" role="img" aria-labelledby="shape-svg-title shape-svg-description" className="relative mx-auto block h-auto max-h-[390px] min-h-[245px] w-full max-w-2xl">
              <title id="shape-svg-title">Visual {selectedShape.name}</title>
              <desc id="shape-svg-description">Gambar {selectedShape.name} dengan ukuran yang dapat diubah melalui penggeser.</desc>
              <defs>
                <linearGradient id="shapeFill" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stopColor="#34d399" stopOpacity=".75" /><stop offset="100%" stopColor="#22d3ee" stopOpacity=".48" /></linearGradient>
                <pattern id="shapeGrid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" strokeOpacity=".09" strokeWidth="1" /></pattern>
              </defs>
              {showGrid && <rect width="360" height="270" fill="url(#shapeGrid)" className="text-emerald-900 dark:text-emerald-100" />}
              <polygon points={points.map((point) => `${point.x},${point.y}`).join(" ")} fill="url(#shapeFill)" stroke="#059669" strokeWidth="4" strokeLinejoin="round" className="drop-shadow-lg dark:stroke-emerald-300" />
              {showSymmetry && symmetryAxes.map((axis, index) => (
                <g
                  key={`${axis.title}-${index}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`Pilih ${axis.title}`}
                  className="cursor-pointer outline-none"
                  onClick={() => setSelectedAxis(index)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      setSelectedAxis(index)
                    }
                  }}
                >
                  <line x1={axis.start.x} y1={axis.start.y} x2={axis.end.x} y2={axis.end.y} stroke="transparent" strokeWidth="18" pointerEvents="stroke" />
                  <line x1={axis.start.x} y1={axis.start.y} x2={axis.end.x} y2={axis.end.y} stroke={selectedAxis === index ? "#f97316" : "#047857"} strokeWidth={selectedAxis === index ? "3.5" : "2.5"} strokeDasharray="7 6" strokeLinecap="round" pointerEvents="none" />
                </g>
              ))}
              {selectedId !== "circle" && points.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r="4" fill="#fff" stroke="#059669" strokeWidth="2" />)}
              {selectedId === "circle" && <circle cx="180" cy="135" r="3.5" fill="#f97316" />}
            </svg>
            <div className="relative mx-auto mt-2 flex max-w-2xl flex-wrap items-center justify-center gap-2">
              {showMeasures && selectedShape.controls.map((control) => (
                <span key={control.key} className="rounded-full border border-white/70 bg-white/75 px-3 py-1.5 text-xs font-semibold text-emerald-900 shadow-sm dark:border-white/10 dark:bg-background/70 dark:text-emerald-100">
                  {control.label.replace(/\s*\([^)]*\)/, "")}: {format(dimensions[control.key])} cm
                </span>
              ))}
              <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"><Ruler className="h-3.5 w-3.5" />Kisi hanya panduan visual; nilai ukuran memakai cm.</span>
            </div>
          </div>

          <div className="border-t border-border/60 px-4 py-4 sm:px-6">
            <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /><h4 className="text-sm font-bold">Kenali sifatnya</h4></div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{selectedShape.description}</p>
            {showSymmetry && (
              <div className="mt-3 rounded-xl bg-muted/45 p-3 text-xs leading-5 text-muted-foreground" aria-live="polite">
                {symmetryAxes.length > 0 ? (
                  <>
                    <p>{selectedId === "circle" ? "Lingkaran memiliki tak terhingga banyak sumbu simetri; dua contoh ditampilkan." : `Garis putus-putus menunjukkan ${symmetryAxes.length} sumbu simetri pada ukuran ini.`} Klik salah satu garis untuk memilihnya.</p>
                    {selectedAxis !== null && symmetryAxes[selectedAxis] && <p className="mt-2 font-semibold text-emerald-700 dark:text-emerald-300">{symmetryAxes[selectedAxis].title}: {symmetryAxes[selectedAxis].description}</p>}
                  </>
                ) : <p>Bentuk ini tidak memiliki sumbu simetri pada ukuran saat ini.</p>}
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-20">
          <section className="rounded-2xl border border-border/70 bg-background/75 p-4 shadow-sm sm:p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div><h3 className="font-bold">Ubah ukuran</h3><p className="mt-1 text-xs text-muted-foreground">Visual dan hasil hitung berubah langsung.</p></div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"><Ruler className="h-4 w-4" /></div>
            </div>
            <div className="space-y-5">
              {selectedShape.controls.map((control) => (
                <RangeControl key={control.key} control={control} value={dimensions[control.key]} onChange={(value) => updateDimension(control.key, value)} />
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-emerald-500/20 bg-background/80 p-4 shadow-sm sm:p-5" aria-live="polite">
            <div className="mb-4 flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /><h3 className="font-bold">Hasil perhitungan</h3></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-emerald-500/10 p-3"><p className="text-xs text-muted-foreground">Luas (A)</p><p className="mt-1 text-xl font-black tabular-nums">{format(stats.area)}</p><p className="mt-0.5 text-[11px] text-muted-foreground">cm²</p></div>
              <div className="rounded-xl bg-cyan-500/10 p-3"><p className="text-xs text-muted-foreground">Keliling (K)</p><p className="mt-1 text-xl font-black tabular-nums">{format(stats.perimeter)}</p><p className="mt-0.5 text-[11px] text-muted-foreground">cm</p></div>
            </div>
            <div className="mt-4 space-y-3 rounded-xl bg-muted/45 p-3.5">
              <div><p className="text-[11px] font-medium text-muted-foreground">Rumus luas</p><p className="mt-1 font-mono text-sm font-bold">{stats.areaFormula}</p></div>
              <div className="border-t border-border/60 pt-3"><p className="text-[11px] font-medium text-muted-foreground">Rumus keliling</p><p className="mt-1 font-mono text-sm font-bold">{stats.perimeterFormula}</p></div>
              <p className="border-t border-border/60 pt-3 text-xs leading-5 text-muted-foreground">{stats.note}</p>
              {selectedId === "circle" && <p className="text-[11px] text-muted-foreground">Perhitungan menggunakan nilai π penuh; hasil ditampilkan sampai dua angka desimal.</p>}
            </div>
          </section>

          <section className="rounded-2xl bg-background/70 p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex items-center gap-2"><Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /><h3 className="font-bold">Uji pemahaman</h3></div>
            <p className="text-sm leading-6 text-muted-foreground">{quizQuestion} Jawab dalam cm².</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {quizAnswers.map((option) => (
                <button
                  type="button"
                  key={option}
                  aria-pressed={quizAnswer === option}
                  onClick={() => { setQuizAnswer(option); setQuizChecked(false) }}
                  className={"rounded-xl px-3 py-3 text-sm font-semibold transition " + (quizAnswer === option ? "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/40 dark:text-emerald-300" : "bg-muted/50 hover:bg-muted")}
                >
                  {format(option)} cm²
                </button>
              ))}
            </div>
            <button type="button" disabled={quizAnswer === null} onClick={() => setQuizChecked(true)} className="mt-3 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40">Periksa jawaban</button>
            {quizChecked && <div role="status" className={"mt-3 rounded-xl p-3 text-sm " + (quizAnswer === correctQuizAnswer ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 text-amber-800 dark:text-amber-300")}>
              {quizAnswer === correctQuizAnswer ? "Benar! Kamu memahami cara menghitung luas." : `Belum tepat. Coba hitung kembali menggunakan rumus ${stats.areaFormula}.`}
            </div>}
          </section>

          <section className="rounded-2xl bg-emerald-500/5 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"><BookOpen className="h-4 w-4" /></div>
              <div><h3 className="text-sm font-bold">Luas dan keliling</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Luas mengukur daerah yang tertutup di dalam bentuk (cm²). Keliling mengukur panjang garis tepinya (cm).</p></div>
            </div>
          </section>
        </aside>
      </section>

    </div>
  )
}
