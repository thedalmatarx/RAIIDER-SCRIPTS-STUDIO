import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { createVehicle, disposeObject, countModelPolys, type VehicleConfig } from '../lib/vehicle';
import { createClothing, type ClothingConfig } from '../lib/clothing';

export type ModelKind = 'vehicle' | 'clothing';

export interface PerfStats {
  fps: number;
  drawCalls: number;
  triangles: number;
  vertices: number;
  memMB: number;
}

export interface ViewerHandle {
  exportGLB: () => Promise<Blob | null>;
  screenshot: () => string | null;
  importGLB: (file: File) => Promise<void>;
  applyTextureFile: (file: File) => Promise<boolean>;
}

interface ViewerProps {
  kind: ModelKind;
  vehicleConfig: VehicleConfig;
  clothingConfig: ClothingConfig;
  shadingMode: 'shaded' | 'wireframe';
  autoRotate: boolean;
  isNightMode: boolean;
  onPerf: (s: Pick<PerfStats, 'fps' | 'drawCalls' | 'memMB'>) => void;
  onModelStats: (s: Pick<PerfStats, 'triangles' | 'vertices'>) => void;
  onLog: (msg: string) => void;
}

const Viewer = forwardRef<ViewerHandle, ViewerProps>(function Viewer(
  { kind, vehicleConfig, clothingConfig, shadingMode, autoRotate, isNightMode, onPerf, onModelStats, onLog },
  ref
) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const groupRef = useRef<THREE.Object3D | null>(null);
  const importedRef = useRef(false);
  const kindRef = useRef<ModelKind>(kind);
  const texRef = useRef<THREE.Texture | null>(null);
  const lightsRef = useRef<{ ambient: THREE.AmbientLight; dir: THREE.DirectionalLight } | null>(null);
  const wireRef = useRef(shadingMode);
  const cbRef = useRef({ onPerf, onModelStats, onLog });
  cbRef.current = { onPerf, onModelStats, onLog };
  wireRef.current = shadingMode;

  useImperativeHandle(ref, () => ({
    getGroup: () => groupRef.current,
    exportGLB: () =>
      new Promise<Blob | null>((resolve) => {
        const g = groupRef.current;
        if (!g) return resolve(null);
        new GLTFExporter().parse(
          g,
          (buf) => resolve(new Blob([buf as ArrayBuffer], { type: 'model/gltf-binary' })),
          (e) => {
            cbRef.current.onLog(`ERROR exportando GLB: ${e}`);
            resolve(null);
          },
          { binary: true }
        );
      }),
    screenshot: () => {
      const r = rendererRef.current;
      const scene = sceneRef.current;
      const controls = controlsRef.current;
      if (!r || !scene || !controls) return null;
      r.render(scene, controls.object as THREE.PerspectiveCamera);
      return r.domElement.toDataURL('image/png');
    },
    importGLB: (file: File) =>
      new Promise<void>((resolve, reject) => {
        const url = URL.createObjectURL(file);
        new GLTFLoader()
          .loadAsync(url)
          .then((gltf) => {
            const scene = sceneRef.current;
            if (!scene) return reject(new Error('Escena no lista'));
            if (groupRef.current) {
              scene.remove(groupRef.current);
              if (!importedRef.current) disposeObject(groupRef.current);
            }
            gltf.scene.userData.imported = true;
            scene.add(gltf.scene);
            groupRef.current = gltf.scene;
            importedRef.current = true;
            const polys = countModelPolys(gltf.scene);
            cbRef.current.onModelStats(polys);
            cbRef.current.onLog(`Modelo importado: ${file.name}`);
            applyWireframe(gltf.scene, wireRef.current === 'wireframe');
            URL.revokeObjectURL(url);
            resolve();
          })
          .catch((e) => {
            URL.revokeObjectURL(url);
            reject(e);
          });
      }),
    applyTextureFile: (file: File) =>
      new Promise<boolean>((resolve) => {
        const url = URL.createObjectURL(file);
        new THREE.TextureLoader().load(
          url,
          (t) => {
            t.colorSpace = THREE.SRGBColorSpace;
            t.wrapS = t.wrapT = THREE.RepeatWrapping;
            texRef.current?.dispose();
            texRef.current = t;
            const g = groupRef.current;
            if (g) {
              g.traverse((o) => {
                const mesh = o as THREE.Mesh;
                if (!mesh.isMesh) return;
                (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m) => {
                  if (m && 'name' in m && (m.name === 'Pintura_Principal' || importedRef.current)) {
                    const std = m as THREE.MeshStandardMaterial;
                    std.map = t;
                    std.color.set(0xffffff);
                    std.needsUpdate = true;
                  }
                });
              });
            }
            cbRef.current.onLog(`Textura aplicada: ${file.name}`);
            URL.revokeObjectURL(url);
            resolve(true);
          },
          undefined,
          () => {
            cbRef.current.onLog(`ERROR cargando textura ${file.name}`);
            URL.revokeObjectURL(url);
            resolve(false);
          }
        );
      }),
  }));

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x09090b);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(4.8, 3.4, 6.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.35;

    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    const dir = new THREE.DirectionalLight(0xffffff, 1.6);
    dir.position.set(8, 12, 8);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    const fill = new THREE.DirectionalLight(0x38bdf8, 0.6);
    fill.position.set(-8, 5, -5);
    scene.add(ambient, dir, fill);
    lightsRef.current = { ambient, dir };

    const grid = new THREE.GridHelper(35, 35, 0x8b5cf6, 0x18181b);
    scene.add(grid);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 1.5;
    controls.maxDistance = 40;
    controls.maxPolarAngle = Math.PI / 2.02;
    controls.update();
    controlsRef.current = controls;

    let raf = 0;
    let frames = 0;
    let last = performance.now();
    let flash = 0;

    const animate = () => {
      raf = requestAnimationFrame(animate);
      flash += 0.06;
      const g = groupRef.current;
      if (g) {
        const blue = g.getObjectByName('luz_sirena_azul') as THREE.Mesh | null;
        const red = g.getObjectByName('luz_sirena_roja') as THREE.Mesh | null;
        if (blue && red) {
          const blueOn = Math.sin(flash * 9) > 0;
          (blue.material as THREE.MeshStandardMaterial).emissiveIntensity = blueOn ? 7.0 : 0.2;
          (red.material as THREE.MeshStandardMaterial).emissiveIntensity = blueOn ? 0.2 : 7.0;
        }
      }
      controls.update();
      renderer.render(scene, camera);

      frames++;
      const now = performance.now();
      if (now - last >= 1000) {
        cbRef.current.onPerf({
          fps: Math.round((frames * 1000) / (now - last)),
          drawCalls: renderer.info.render.calls,
          memMB: (renderer.info.memory.geometries + renderer.info.memory.textures) * 0.12 + 10,
        });
        frames = 0;
        last = now;
      }
    };
    animate();

    const ro = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(container);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      pmrem.dispose();
      disposeObject(scene);
      renderer.dispose();
      container.removeChild(renderer.domElement);
      sceneRef.current = null;
      rendererRef.current = null;
      groupRef.current = null;
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (groupRef.current) {
      scene.remove(groupRef.current);
      if (!importedRef.current) disposeObject(groupRef.current);
    }
    importedRef.current = false;
    kindRef.current = kind;
    const model =
      kind === 'vehicle' ? createVehicle(vehicleConfig) : createClothing(clothingConfig, isNightMode);
    scene.add(model);
    groupRef.current = model;

    if (texRef.current && kind === 'vehicle') {
      model.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m) => {
          if (m && 'name' in m && m.name === 'Pintura_Principal') {
            const std = m as THREE.MeshStandardMaterial;
            std.map = texRef.current;
            std.color.set(0xffffff);
            std.needsUpdate = true;
          }
        });
      });
    }
    applyWireframe(model, shadingMode === 'wireframe');
    onModelStats(countModelPolys(model));
  }, [kind, vehicleConfig, clothingConfig, isNightMode, shadingMode, onModelStats]);

  useEffect(() => {
    applyWireframe(groupRef.current, shadingMode === 'wireframe');
  }, [shadingMode]);

  useEffect(() => {
    if (controlsRef.current) controlsRef.current.autoRotate = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    const scene = sceneRef.current;
    const lights = lightsRef.current;
    if (!scene || !lights) return;
    scene.background = new THREE.Color(isNightMode ? 0x020617 : 0x09090b);
    scene.environmentIntensity = isNightMode ? 0.08 : 0.35;
    lights.ambient.intensity = isNightMode ? 0.18 : 0.55;
    lights.dir.intensity = isNightMode ? 0.45 : 1.6;
  }, [isNightMode]);

  function applyWireframe(root: THREE.Object3D | null, on: boolean) {
    if (!root) return;
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m) => {
        if (m && 'wireframe' in m) (m as THREE.MeshStandardMaterial).wireframe = on;
      });
    });
  }

  return <div ref={mountRef} className="h-full w-full cursor-grab active:cursor-grabbing" />;
});

export default Viewer;
