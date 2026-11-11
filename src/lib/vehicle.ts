import * as THREE from 'three';

export type DoorStyle = 'lambo' | 'suicide' | 'standard';

export interface VehicleConfig {
  hasLightbar: boolean;
  lightbarActive: boolean;
  hasPushbar: boolean;
  hasSpotlight: boolean;
  hasAntennas: boolean;
  hasSpoiler: boolean;
  bodykitStyle: 'widebody' | 'stock';
  hasRollCage: boolean;
  hasEngineBlock: boolean;
  hasTurbo: boolean;
  hasSteeringWheel: boolean;
  doorStyle: DoorStyle;
  doorsOpen: boolean;
  hoodOpen: boolean;
  trunkOpen: boolean;
  paintColor: number;
  secondaryColor: number;
  neonActive: boolean;
  neonColor: number;
  externalSteps: boolean;
}

const geoCache = new Map<string, THREE.BufferGeometry>();

function cachedGeo(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let g = geoCache.get(key);
  if (!g) {
    g = make();
    g.userData.shared = true;
    geoCache.set(key, g);
  }
  return g;
}

export function disposeObject(root: THREE.Object3D): void {
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (mesh.geometry && !mesh.geometry.userData?.shared) mesh.geometry.dispose();
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach((m) => m?.dispose());
  });
}

export function countModelPolys(root: THREE.Object3D): { vertices: number; triangles: number } {
  let vertices = 0;
  let triangles = 0;
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    const g = mesh.geometry as THREE.BufferGeometry;
    if (g.index) triangles += g.index.count / 3;
    else if (g.attributes.position) triangles += g.attributes.position.count / 3;
    if (g.attributes.position) vertices += g.attributes.position.count;
  });
  return { vertices: Math.round(vertices), triangles: Math.round(triangles) };
}

export function createVehicle(cfg: VehicleConfig): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Vehiculo_Modding_Pro_GTA';

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: cfg.paintColor,
    roughness: 0.18,
    metalness: 0.85,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
    name: 'Pintura_Principal',
  });

  const carbonMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.4, metalness: 0.8 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, metalness: 1.0 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x09090b, metalness: 0.8, roughness: 0.3 });
  const engineMat = new THREE.MeshStandardMaterial({ color: 0x71717a, metalness: 0.9, roughness: 0.3 });

  const body = new THREE.Mesh(cachedGeo('body', () => new THREE.BoxGeometry(2.2, 0.75, 4.5)), bodyMat);
  body.position.y = 0.8;
  body.castShadow = true;
  body.receiveShadow = true;
  body.name = 'chasis_principal';
  group.add(body);

  if (cfg.bodykitStyle === 'widebody') {
    const skirt = new THREE.Mesh(cachedGeo('skirt', () => new THREE.BoxGeometry(2.45, 0.3, 4.2)), carbonMat);
    skirt.position.y = 0.45;
    group.add(skirt);
  }

  if (cfg.externalSteps) {
    const stepGeo = cachedGeo('step', () => new THREE.BoxGeometry(0.15, 0.08, 3.8));
    const stepL = new THREE.Mesh(stepGeo, darkMat);
    stepL.position.set(-1.22, 0.38, 0);
    const stepR = new THREE.Mesh(stepGeo, darkMat);
    stepR.position.set(1.22, 0.38, 0);
    const stepRear = new THREE.Mesh(cachedGeo('stepRear', () => new THREE.BoxGeometry(2.1, 0.08, 0.18)), darkMat);
    stepRear.position.set(0, 0.38, -2.35);
    group.add(stepL, stepR, stepRear);
  }

  const doorGeo = cachedGeo('door', () => new THREE.BoxGeometry(0.12, 0.72, 1.4));
  const mkDoor = (side: -1 | 1) => {
    const g = new THREE.Group();
    g.position.set(1.1 * side, 0.85, 0.3);
    const mesh = new THREE.Mesh(doorGeo, bodyMat);
    mesh.position.set(0.06 * side, 0, -0.7);
    g.add(mesh);
    if (cfg.doorsOpen) {
      if (cfg.doorStyle === 'lambo') {
        g.rotation.z = -side * (Math.PI / 2.8);
        g.rotation.y = side * (Math.PI / 6);
      } else if (cfg.doorStyle === 'suicide') {
        g.rotation.y = side * (Math.PI / 2.2);
      } else {
        g.rotation.y = -side * (Math.PI / 2.5);
      }
    }
    return g;
  };
  group.add(mkDoor(-1), mkDoor(1));

  const hoodGroup = new THREE.Group();
  hoodGroup.position.set(0, 0.82, 1.1);
  const hoodMesh = new THREE.Mesh(cachedGeo('hood', () => new THREE.BoxGeometry(1.8, 0.08, 1.6)), bodyMat);
  hoodMesh.position.set(0, 0.4, 0.8);
  hoodGroup.add(hoodMesh);

  if (cfg.hasEngineBlock) {
    const block = new THREE.Mesh(cachedGeo('engine', () => new THREE.BoxGeometry(1.0, 0.5, 1.0)), engineMat);
    block.position.set(0, 0.3, 0.8);
    hoodGroup.add(block);
    if (cfg.hasTurbo) {
      const turbo = new THREE.Mesh(cachedGeo('turbo', () => new THREE.CylinderGeometry(0.2, 0.2, 0.4, 16)), chromeMat);
      turbo.rotation.z = Math.PI / 2;
      turbo.position.set(0.4, 0.4, 0.6);
      hoodGroup.add(turbo);
    }
  }
  if (cfg.hoodOpen) hoodGroup.rotation.x = -Math.PI / 3.5;
  group.add(hoodGroup);

  const trunkGroup = new THREE.Group();
  trunkGroup.position.set(0, 0.9, -1.5);
  const trunkMesh = new THREE.Mesh(cachedGeo('trunk', () => new THREE.BoxGeometry(1.8, 0.08, 1.2)), bodyMat);
  trunkMesh.position.set(0, 0.3, -0.6);
  trunkGroup.add(trunkMesh);
  if (cfg.trunkOpen) trunkGroup.rotation.x = Math.PI / 3;
  group.add(trunkGroup);

  const cabin = new THREE.Mesh(
    cachedGeo('cabin', () => new THREE.BoxGeometry(1.8, 0.68, 2.3)),
    new THREE.MeshPhysicalMaterial({
      color: 0x09090b,
      roughness: 0.05,
      metalness: 0.95,
      transparent: true,
      opacity: 0.75,
    })
  );
  cabin.position.set(0, 1.45, -0.2);
  group.add(cabin);

  if (cfg.hasRollCage) {
    const cageMat = new THREE.MeshStandardMaterial({ color: cfg.secondaryColor, roughness: 0.3, metalness: 0.8 });
    const rollBar = new THREE.Mesh(cachedGeo('rollbar', () => new THREE.CylinderGeometry(0.04, 0.04, 1.8, 12)), cageMat);
    rollBar.position.set(0, 1.3, -0.4);
    group.add(rollBar);
  }

  if (cfg.hasSteeringWheel) {
    const steering = new THREE.Mesh(
      cachedGeo('wheel_steer', () => new THREE.TorusGeometry(0.18, 0.03, 12, 24)),
      new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.5 })
    );
    steering.rotation.x = Math.PI / 3;
    steering.position.set(-0.45, 1.3, 0.3);
    group.add(steering);
  }

  const wheelGeo = cachedGeo('wheel', () => {
    const g = new THREE.CylinderGeometry(0.46, 0.46, 0.36, 32);
    g.rotateZ(Math.PI / 2);
    return g;
  });
  const rimGeo = cachedGeo('rim', () => new THREE.CylinderGeometry(0.32, 0.32, 0.38, 16));
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.85 });
  const rimMat = new THREE.MeshStandardMaterial({ color: cfg.secondaryColor, metalness: 0.9, roughness: 0.2 });

  const wheelPositions: Array<[number, number, number]> = [
    [-1.2, 0.46, 1.3],
    [1.2, 0.46, 1.3],
    [-1.2, 0.46, -1.3],
    [1.2, 0.46, -1.3],
  ];
  for (const pos of wheelPositions) {
    const wg = new THREE.Group();
    wg.position.set(...pos);
    const tire = new THREE.Mesh(wheelGeo, tireMat);
    tire.castShadow = true;
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.z = Math.PI / 2;
    wg.add(tire, rim);
    group.add(wg);
  }

  if (cfg.neonActive) {
    const neon = new THREE.Mesh(
      cachedGeo('neon', () => new THREE.BoxGeometry(1.9, 0.06, 3.8)),
      new THREE.MeshStandardMaterial({
        color: cfg.neonColor,
        emissive: cfg.neonColor,
        emissiveIntensity: 5.0,
      })
    );
    neon.position.set(0, 0.12, 0);
    neon.name = 'neon_suelo';
    group.add(neon);
  }

  if (cfg.hasLightbar) {
    const barGroup = new THREE.Group();
    barGroup.name = 'puente_luces_emergencia';
    const baseBar = new THREE.Mesh(cachedGeo('barbase', () => new THREE.BoxGeometry(1.6, 0.1, 0.4)), chromeMat);
    baseBar.position.set(0, 1.88, -0.2);
    barGroup.add(baseBar);

    const state = cfg.lightbarActive;
    const blueMat = new THREE.MeshStandardMaterial({
      color: 0x0066ff,
      emissive: state ? 0x0066ff : 0x001133,
      emissiveIntensity: state ? 6.0 : 0.2,
    });
    const redMat = new THREE.MeshStandardMaterial({
      color: 0xff0033,
      emissive: state ? 0xff0033 : 0x330011,
      emissiveIntensity: state ? 6.0 : 0.2,
    });
    const lightL = new THREE.Mesh(cachedGeo('sirenL', () => new THREE.BoxGeometry(0.65, 0.18, 0.35)), blueMat);
    lightL.position.set(-0.45, 1.98, -0.2);
    lightL.name = 'luz_sirena_azul';
    const lightR = new THREE.Mesh(cachedGeo('sirenR', () => new THREE.BoxGeometry(0.65, 0.18, 0.35)), redMat);
    lightR.position.set(0.45, 1.98, -0.2);
    lightR.name = 'luz_sirena_roja';
    barGroup.add(lightL, lightR);
    group.add(barGroup);
  }

  if (cfg.hasPushbar) {
    const barFront = new THREE.Mesh(cachedGeo('pushfront', () => new THREE.BoxGeometry(1.9, 0.95, 0.18)), darkMat);
    barFront.position.set(0, 0.82, 2.38);
    const guardL = new THREE.Mesh(cachedGeo('pushguard', () => new THREE.BoxGeometry(0.12, 1.2, 0.25)), darkMat);
    guardL.position.set(-0.65, 0.85, 2.42);
    const guardR = new THREE.Mesh(cachedGeo('pushguard', () => new THREE.BoxGeometry(0.12, 1.2, 0.25)), darkMat);
    guardR.position.set(0.65, 0.85, 2.42);
    group.add(barFront, guardL, guardR);
  }

  if (cfg.hasSpotlight) {
    const spot = new THREE.Mesh(
      cachedGeo('spot', () => new THREE.CylinderGeometry(0.08, 0.08, 0.15, 12)),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffaa, emissiveIntensity: 2 })
    );
    spot.rotation.z = Math.PI / 2;
    spot.position.set(-0.95, 1.6, 0.8);
    group.add(spot);
  }

  if (cfg.hasAntennas) {
    const ant = new THREE.Mesh(
      cachedGeo('antenna', () => new THREE.CylinderGeometry(0.015, 0.015, 0.8, 8)),
      new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9 })
    );
    ant.position.set(0.6, 2.3, -1.2);
    group.add(ant);
  }

  if (cfg.hasSpoiler) {
    const wing = new THREE.Mesh(cachedGeo('wing', () => new THREE.BoxGeometry(2.0, 0.08, 0.5)), carbonMat);
    wing.position.set(0, 1.6, -2.15);
    const supGeo = cachedGeo('wingsup', () => new THREE.BoxGeometry(0.08, 0.45, 0.2));
    const supL = new THREE.Mesh(supGeo, carbonMat);
    supL.position.set(-0.7, 1.35, -2.15);
    const supR = new THREE.Mesh(supGeo, carbonMat);
    supR.position.set(0.7, 1.35, -2.15);
    group.add(wing, supL, supR);
  }

  return group;
}
