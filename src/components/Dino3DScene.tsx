
import { useEffect, useMemo, useState } from "react"
import { Canvas, useThree } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import * as THREE from "three"

export type DinoShape =
  | "cube"
  | "cuboid"
  | "cylinder"
  | "cone"
  | "sphere"
  | "triangularPrism"
  | "squarePyramid"
  | "triangularPyramid"

export interface SelectedPart {
  type: "Sisi" | "Rusuk" | "Titik sudut" | "Permukaan lengkung"
  name: string
  detail: string
}

interface Dino3DSceneProps {
  shape: DinoShape
  length: number
  width: number
  height: number
  radius: number
  onSelectPart?: (part: SelectedPart | null) => void
}

const material = {
  color: "#22c5a5",
  roughness: 0.35,
  metalness: 0.08,
}

function PartMarker({
  position,
  type,
  name,
  detail,
  onSelect,
}: {
  position: [number, number, number]
  type: SelectedPart["type"]
  name: string
  detail: string
  onSelect: (part: SelectedPart) => void
}) {
  return (
    <mesh
      position={position}
      onClick={(event) => {
        event.stopPropagation()
        onSelect({ type, name, detail })
      }}
    >
      <sphereGeometry args={[0.075, 16, 16]} />
      <meshStandardMaterial color="#f97316" />
    </mesh>
  )
}

function Edge({
  start,
  end,
  onSelect,
}: {
  start: THREE.Vector3
  end: THREE.Vector3
  onSelect: (part: SelectedPart) => void
}) {
  const direction = new THREE.Vector3().subVectors(end, start)
  const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.clone().normalize(),
  )

  return (
    <mesh
      position={midpoint}
      quaternion={quaternion}
      onClick={(event) => {
        event.stopPropagation()
        onSelect({
          type: "Rusuk",
          name: "Rusuk bangun",
          detail: `Panjang rusuk sekitar ${direction.length().toFixed(2)} satuan.`,
        })
      }}
    >
      <cylinderGeometry args={[0.035, 0.035, direction.length(), 8]} />
      <meshStandardMaterial color="#f59e0b" />
    </mesh>
  )
}

function BoxModel({
  length,
  width,
  height,
  onSelect,
}: {
  length: number
  width: number
  height: number
  onSelect: (part: SelectedPart) => void
}) {
  const x = length / 2
  const y = height / 2
  const z = width / 2

  const vertices = [
    new THREE.Vector3(-x, -y, -z),
    new THREE.Vector3(x, -y, -z),
    new THREE.Vector3(x, y, -z),
    new THREE.Vector3(-x, y, -z),
    new THREE.Vector3(-x, -y, z),
    new THREE.Vector3(x, -y, z),
    new THREE.Vector3(x, y, z),
    new THREE.Vector3(-x, y, z),
  ]

  const edges: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ]

  return (
    <group>
      <mesh
        onClick={(event) => {
          event.stopPropagation()
          onSelect({
            type: "Sisi",
            name: "Sisi bangun",
            detail: "Bangun ini memiliki enam sisi berbentuk persegi atau persegi panjang.",
          })
        }}
      >
        <boxGeometry args={[length, height, width]} />
        <meshStandardMaterial {...material} transparent opacity={0.78} />
      </mesh>

      {edges.map(([a, b], index) => (
        <Edge key={index} start={vertices[a]} end={vertices[b]} onSelect={onSelect} />
      ))}

      {vertices.map((vertex, index) => (
        <PartMarker
          key={index}
          position={[vertex.x, vertex.y, vertex.z]}
          type="Titik sudut"
          name={`Titik sudut ${index + 1}`}
          detail="Titik sudut adalah pertemuan beberapa rusuk."
          onSelect={onSelect}
        />
      ))}
    </group>
  )
}

function CylinderModel({
  radius,
  height,
  onSelect,
}: {
  radius: number
  height: number
  onSelect: (part: SelectedPart) => void
}) {
  const y = height / 2

  return (
    <group>
      {/* Tabung tertutup: tutup atas dan bawah menyatu dengan badan */}
      <mesh
        onClick={(event) => {
          event.stopPropagation()
          onSelect({
            type: "Permukaan lengkung",
            name: "Selimut tabung",
            detail: "Selimut tabung merupakan satu permukaan lengkung.",
          })
        }}
      >
        <cylinderGeometry args={[radius, radius, height, 64, 1, false]} />
        <meshStandardMaterial
          {...material}
          transparent
          opacity={0.82}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Lingkaran atas: bidang XY diputar agar mendatar pada bidang XZ */}
      <mesh
        position={[0, y + 0.006, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(event) => {
          event.stopPropagation()
          onSelect({
            type: "Sisi",
            name: "Alas atas tabung",
            detail: "Alas atas tabung berbentuk lingkaran dengan luas πr².",
          })
        }}
      >
        <circleGeometry args={[radius, 64]} />
        <meshStandardMaterial color="#7dd3fc" side={THREE.DoubleSide} />
      </mesh>

      <mesh
        position={[0, -y - 0.006, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        onClick={(event) => {
          event.stopPropagation()
          onSelect({
            type: "Sisi",
            name: "Alas bawah tabung",
            detail: "Alas bawah tabung berbentuk lingkaran dengan luas πr².",
          })
        }}
      >
        <circleGeometry args={[radius, 64]} />
        <meshStandardMaterial color="#0284c7" side={THREE.DoubleSide} />
      </mesh>

      <mesh
        position={[0, y, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        onClick={(event) => {
          event.stopPropagation()
          onSelect({
            type: "Rusuk",
            name: "Rusuk lengkung atas",
            detail: "Keliling lingkaran alas atas sekitar " + (2 * 3.14 * radius).toFixed(2) + " satuan.",
          })
        }}
      >
        <torusGeometry args={[radius, 0.025, 8, 64]} />
        <meshStandardMaterial color="#f59e0b" />
      </mesh>

      <mesh
        position={[0, -y, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        onClick={(event) => {
          event.stopPropagation()
          onSelect({
            type: "Rusuk",
            name: "Rusuk lengkung bawah",
            detail: "Keliling lingkaran alas bawah sekitar " + (2 * 3.14 * radius).toFixed(2) + " satuan.",
          })
        }}
      >
        <torusGeometry args={[radius, 0.025, 8, 64]} />
        <meshStandardMaterial color="#f59e0b" />
      </mesh>
    </group>
  )
}

function ConeModel({
  radius,
  height,
  onSelect,
}: {
  radius: number
  height: number
  onSelect: (part: SelectedPart) => void
}) {
  return (
    <group>
      <mesh
        onClick={(event) => {
          event.stopPropagation()
          onSelect({
            type: "Permukaan lengkung",
            name: "Selimut kerucut",
            detail: "Selimut kerucut adalah permukaan lengkung yang bertemu di satu titik puncak.",
          })
        }}
      >
        <coneGeometry args={[radius, height, 64, 1, false]} />
        <meshStandardMaterial
          {...material}
          transparent
          opacity={0.82}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh
        position={[0, -height / 2 - 0.006, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(event) => {
          event.stopPropagation()
          onSelect({
            type: "Sisi",
            name: "Alas kerucut",
            detail: "Alas kerucut berbentuk lingkaran dengan luas πr².",
          })
        }}
      >
        <circleGeometry args={[radius, 64]} />
        <meshStandardMaterial color="#7dd3fc" side={THREE.DoubleSide} />
      </mesh>

      <mesh
        position={[0, -height / 2, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        onClick={(event) => {
          event.stopPropagation()
          onSelect({
            type: "Rusuk",
            name: "Rusuk lengkung alas kerucut",
            detail: "Keliling alas kerucut sekitar " + (2 * 3.14 * radius).toFixed(2) + " satuan.",
          })
        }}
      >
        <torusGeometry args={[radius, 0.025, 8, 64]} />
        <meshStandardMaterial color="#f59e0b" />
      </mesh>

      <PartMarker
        position={[0, height / 2, 0]}
        type="Titik sudut"
        name="Titik puncak kerucut"
        detail="Kerucut memiliki satu titik puncak."
        onSelect={onSelect}
      />
    </group>
  )
}

function SphereModel({
  radius,
  onSelect,
}: {
  radius: number
  onSelect: (part: SelectedPart) => void
}) {
  return (
    <mesh
      onClick={(event) => {
        event.stopPropagation()
        onSelect({
          type: "Permukaan lengkung",
          name: "Permukaan bola",
          detail: "Bola memiliki satu permukaan lengkung tanpa rusuk dan titik sudut.",
        })
      }}
    >
      <sphereGeometry args={[radius, 48, 32]} />
      <meshStandardMaterial {...material} />
    </mesh>
  )
}

function Polyhedron({
  shape,
  length,
  width,
  height,
  onSelect,
}: {
  shape: "triangularPrism" | "squarePyramid" | "triangularPyramid"
  length: number
  width: number
  height: number
  onSelect: (part: SelectedPart) => void
}) {
  const geometry = useMemoGeometry(shape, length, width, height)

  return (
    <group>
      <mesh
        geometry={geometry}
        onClick={(event) => {
          event.stopPropagation()
          onSelect({
            type: "Sisi",
            name: "Sisi bangun",
            detail: "Pilih rusuk atau titik sudut berwarna jingga untuk mempelajarinya.",
          })
        }}
      >
        <meshStandardMaterial
          color="#22c5a5"
          roughness={0.4}
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
          flatShading
        />
      </mesh>
      <Edges geometry={geometry} onSelect={onSelect} />
    </group>
  )
}

function useMemoGeometry(
  shape: "triangularPrism" | "squarePyramid" | "triangularPyramid",
  length: number,
  width: number,
  height: number,
) {
  const geometry = useMemo(() => {
    const positions: number[] = []
    const faces: [THREE.Vector3, THREE.Vector3, THREE.Vector3][] = []

    const addFace = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => {
      faces.push([a, b, c])
    }

    if (shape === "triangularPrism") {
      const a = new THREE.Vector3(-length / 2, -height / 2, -width / 2)
      const b = new THREE.Vector3(length / 2, -height / 2, -width / 2)
      const c = new THREE.Vector3(0, height / 2, -width / 2)
      const d = new THREE.Vector3(-length / 2, -height / 2, width / 2)
      const e = new THREE.Vector3(length / 2, -height / 2, width / 2)
      const f = new THREE.Vector3(0, height / 2, width / 2)

      addFace(a, b, c); addFace(d, f, e)
      addFace(a, d, e); addFace(a, e, b)
      addFace(b, e, f); addFace(b, f, c)
      addFace(c, f, d); addFace(c, d, a)
    } else if (shape === "squarePyramid") {
      const s = width / 2
      const a = new THREE.Vector3(-s, -height / 2, -s)
      const b = new THREE.Vector3(s, -height / 2, -s)
      const c = new THREE.Vector3(s, -height / 2, s)
      const d = new THREE.Vector3(-s, -height / 2, s)
      const top = new THREE.Vector3(0, height / 2, 0)

      addFace(a, c, b); addFace(a, d, c)
      addFace(a, b, top); addFace(b, c, top)
      addFace(c, d, top); addFace(d, a, top)
    } else {
      const r = width / Math.sqrt(3)
      const a = new THREE.Vector3(0, -height / 2, r)
      const b = new THREE.Vector3(-width / 2, -height / 2, -r / 2)
      const c = new THREE.Vector3(width / 2, -height / 2, -r / 2)
      const top = new THREE.Vector3(0, height / 2, 0)

      addFace(a, c, b)
      addFace(a, b, top)
      addFace(b, c, top)
      addFace(c, a, top)
    }

    for (const face of faces) {
      positions.push(
        face[0].x, face[0].y, face[0].z,
        face[1].x, face[1].y, face[1].z,
        face[2].x, face[2].y, face[2].z,
      )
    }

    const next = new THREE.BufferGeometry()
    next.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
    next.computeVertexNormals()
    return next
  }, [shape, length, width, height])

  useEffect(() => () => geometry.dispose(), [geometry])

  return geometry
}

function Edges({
  geometry,
  onSelect,
}: {
  geometry: THREE.BufferGeometry
  onSelect: (part: SelectedPart) => void
}) {
  const points = geometry.getAttribute("position")
  const unique = new Map<string, THREE.Vector3>()
  const edgeFaces = new Map<string, { start: THREE.Vector3; end: THREE.Vector3; normals: THREE.Vector3[] }>()

  for (let i = 0; i < points.count; i++) {
    const point = new THREE.Vector3(
      points.getX(i),
      points.getY(i),
      points.getZ(i),
    )
    unique.set(`${point.x.toFixed(3)},${point.y.toFixed(3)},${point.z.toFixed(3)}`, point)
  }

  const vertices = [...unique.values()]
  const edges: [THREE.Vector3, THREE.Vector3][] = []

  for (let i = 0; i < points.count; i += 3) {
    const face = [0, 1, 2].map((offset) => new THREE.Vector3(
      points.getX(i + offset),
      points.getY(i + offset),
      points.getZ(i + offset),
    ))
    const normal = new THREE.Vector3()
      .subVectors(face[1].clone().sub(face[0]), face[2].clone().sub(face[0]))
      .normalize()

    for (const [start, end] of [[face[0], face[1]], [face[1], face[2]], [face[2], face[0]]] as [THREE.Vector3, THREE.Vector3][]) {
      const startKey = `${start.x.toFixed(3)},${start.y.toFixed(3)},${start.z.toFixed(3)}`
      const endKey = `${end.x.toFixed(3)},${end.y.toFixed(3)},${end.z.toFixed(3)}`
      const key = [startKey, endKey].sort().join("|")
      const existing = edgeFaces.get(key)
      if (existing) existing.normals.push(normal)
      else edgeFaces.set(key, { start, end, normals: [normal] })
    }
  }

  for (const edge of edgeFaces.values()) {
    const isVisibleEdge = edge.normals.length === 1 || edge.normals.some((normal) => edge.normals[0].angleTo(normal) > THREE.MathUtils.degToRad(1))
    if (isVisibleEdge) edges.push([edge.start, edge.end])
  }

  return (
    <group>
      {edges.map(([a, b], index) => (
        <Edge key={index} start={a} end={b} onSelect={onSelect} />
      ))}
      {vertices.map((v, index) => (
        <PartMarker
          key={index}
          position={[v.x, v.y, v.z]}
          type="Titik sudut"
          name={`Titik sudut ${index + 1}`}
          detail="Titik sudut adalah pertemuan beberapa rusuk."
          onSelect={onSelect}
        />
      ))}
    </group>
  )
}

function getShapeBounds({ shape, length, width, height, radius }: Dino3DSceneProps) {
  if (shape === "cube") return [length, length, length] as const
  if (shape === "cuboid") return [length, height, width] as const
  if (shape === "cylinder" || shape === "cone") return [radius * 2, height, radius * 2] as const
  if (shape === "sphere") return [radius * 2, radius * 2, radius * 2] as const
  if (shape === "triangularPrism") return [length, height, width] as const
  return [width, height, width] as const
}

function CameraFrame({ bounds }: { bounds: readonly [number, number, number] }) {
  const { camera, size } = useThree()
  const boundingRadius = Math.hypot(...bounds) / 2

  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return

    const verticalFov = THREE.MathUtils.degToRad(camera.fov)
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * (size.width / size.height))
    const limitingFov = Math.min(verticalFov, horizontalFov)
    const distance = Math.max(4, boundingRadius / Math.sin(limitingFov / 2) * 1.22)

    camera.position.set(distance * 0.8, distance * 0.66, distance)
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
  }, [camera, size.height, size.width, boundingRadius])

  return null
}

function SceneContent({
  shape,
  length,
  width,
  height,
  radius,
  dark,
  onSelect,
}: Dino3DSceneProps & { dark: boolean; onSelect: (part: SelectedPart) => void }) {
  const bounds = getShapeBounds({ shape, length, width, height, radius })
  const sceneSize = Math.max(...bounds)
  const gridSize = Math.max(12, sceneSize * 1.8)
  const groundY = shape === "sphere" ? -radius : shape === "cube" ? -length / 2 : -height / 2
  const cameraDistance = Math.max(4, (Math.hypot(...bounds) / 2) / Math.sin(THREE.MathUtils.degToRad(19)) * 1.22)

  return (
    <>
      <color attach="background" args={[dark ? "#0d1917" : "#effcf8"]} />
      <ambientLight intensity={dark ? 1.15 : 1.7} />
      <directionalLight position={[5, 8, 5]} intensity={dark ? 1.7 : 2.4} />
      <directionalLight position={[-4, 3, -4]} intensity={0.75} />
      <CameraFrame bounds={bounds} />

      <gridHelper
        args={[gridSize, Math.ceil(gridSize * 2), dark ? "#32735f" : "#86cbb2", dark ? "#1b4137" : "#c6eadb"]}
        position={[0, groundY - 0.05, 0]}
      />

      {shape === "cube" && (
        <BoxModel length={length} width={length} height={length} onSelect={onSelect} />
      )}
      {shape === "cuboid" && (
        <BoxModel length={length} width={width} height={height} onSelect={onSelect} />
      )}
      {shape === "cylinder" && (
        <CylinderModel radius={radius} height={height} onSelect={onSelect} />
      )}
      {shape === "cone" && (
        <ConeModel radius={radius} height={height} onSelect={onSelect} />
      )}
      {shape === "sphere" && (
        <SphereModel radius={radius} onSelect={onSelect} />
      )}
      {(shape === "triangularPrism" ||
        shape === "squarePyramid" ||
        shape === "triangularPyramid") && (
        <Polyhedron
          shape={shape}
          length={length}
          width={width}
          height={height}
          onSelect={onSelect}
        />
      )}

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={Math.max(1.5, sceneSize * 0.32)}
        maxDistance={cameraDistance * 4}
      />
    </>
  )
}

export default function Dino3DScene(props: Dino3DSceneProps) {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    const updateTheme = () => {
      setDark(root.classList.contains("dark") || root.dataset.theme === "dark")
    }

    updateTheme()
    const observer = new MutationObserver(updateTheme)
    observer.observe(root, { attributes: true, attributeFilter: ["class", "data-theme"] })
    return () => observer.disconnect()
  }, [])

  return (
    <div className="relative w-full overflow-hidden">
      <div className="h-[min(68vh,44rem)] min-h-[22rem] w-full sm:min-h-[26rem]">
        <Canvas
          dpr={[1, 1.75]}
          gl={{ antialias: true, alpha: false }}
          camera={{ position: [7, 6, 8], fov: 38, near: 0.1, far: 250 }}
        >
          <SceneContent
            {...props}
            dark={dark}
            onSelect={(part) => props.onSelectPart?.(part)}
          />
        </Canvas>
      </div>

    </div>
  )
}
