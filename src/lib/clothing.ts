import * as THREE from 'three';

export interface ClothingConfig {
  glowEmissive: boolean;
  hasTacticalVest: boolean;
  hasDutyBelt: boolean;
  hasHolster: boolean;
  hasBadge: boolean;
  jacketColor: number;
  emissiveColor: number;
}

export function createClothing(cfg: ClothingConfig, isNightMode: boolean): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Personaje_Ropa_Modding';

  const glow = isNightMode && cfg.glowEmissive;

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.48, 32, 32),
    new THREE.MeshStandardMaterial({ color: 0xfed7aa, roughness: 0.6 })
  );
  head.position.y = 1.95;
  head.castShadow = true;
  group.add(head);

  const clothingMat = new THREE.MeshStandardMaterial({
    color: cfg.jacketColor,
    roughness: 0.4,
    metalness: 0.2,
    emissive: glow ? cfg.emissiveColor : 0x000000,
    emissiveIntensity: glow ? 4.0 : 0,
  });
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.45, 1.15, 24), clothingMat);
  torso.position.y = 1.0;
  torso.castShadow = true;
  group.add(torso);

  if (cfg.hasTacticalVest) {
    const vest = new THREE.Mesh(
      new THREE.CylinderGeometry(0.58, 0.5, 0.85, 24),
      new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.7 })
    );
    vest.position.y = 1.05;
    group.add(vest);
  }

  if (cfg.hasDutyBelt) {
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.5 });
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.12, 24), beltMat);
    belt.position.y = 0.52;
    group.add(belt);
    if (cfg.hasHolster) {
      const holster = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.3, 0.15), beltMat);
      holster.position.set(0.42, 0.35, 0.15);
      group.add(holster);
    }
  }

  if (cfg.hasBadge) {
    const badge = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.14, 0.04),
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: glow ? 0xf59e0b : 0x000000,
        emissiveIntensity: glow ? 3.5 : 0,
      })
    );
    badge.position.set(-0.25, 1.25, 0.48);
    group.add(badge);
  }

  const legs = new THREE.Mesh(
    new THREE.CylinderGeometry(0.44, 0.36, 0.95, 24),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 })
  );
  legs.position.y = 0.05;
  group.add(legs);

  return group;
}
