// Shared model normalization used by BOTH the dashboard preview and the AR
// viewer, so what the publisher sees is exactly what the child gets.
//
// Stage convention: the printed page is 1 unit wide, lying in the X/Z plane,
// Y pointing up out of the page. Models (GLB is Y-up) stand on the page.

import * as THREE from "three";
import type { PageConfig } from "./types";

/** With config.scale = 1 the model's largest dimension spans 80% of the page width. */
const BASE_FIT = 0.8;

export interface StagedModel {
  /** Add this to the scene/anchor. Contains the model, already fitted. */
  group: THREE.Group;
  mixer: THREE.AnimationMixer | null;
  clipNames: string[];
  /** Approximate world height of the fitted model (for camera framing). */
  height: number;
}

/**
 * Wraps a loaded GLB scene so that: largest dimension = BASE_FIT * scale page
 * widths, base resting on the page (plus offsetY), centered, rotated by
 * rotationY. Starts the configured animation clip, or a gentle procedural
 * float when the file has no animations (a character should never look dead).
 */
export function stageModel(
  modelScene: THREE.Group,
  animations: THREE.AnimationClip[],
  config: PageConfig
): StagedModel {
  const scale = config.scale ?? 1;
  const offsetY = config.offsetY ?? 0;
  const rotationY = ((config.rotationY ?? 0) * Math.PI) / 180;

  const box = new THREE.Box3().setFromObject(modelScene);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const factor = (BASE_FIT * scale) / maxDim;

  const inner = new THREE.Group();
  inner.add(modelScene);
  modelScene.position.set(
    -(box.min.x + size.x / 2),
    -box.min.y,
    -(box.min.z + size.z / 2)
  );
  inner.scale.setScalar(factor);
  inner.rotation.y = rotationY;
  inner.position.y = offsetY;

  const group = new THREE.Group();
  group.add(inner);

  let mixer: THREE.AnimationMixer | null = null;
  const clipNames = animations.map((c) => c.name);
  if (animations.length > 0) {
    mixer = new THREE.AnimationMixer(modelScene);
    const clip =
      (config.animationClip && animations.find((c) => c.name === config.animationClip)) ||
      animations[0];
    mixer.clipAction(clip).play();
  }

  return { group, mixer, clipNames, height: size.y * factor };
}

/**
 * Per-frame update. When there is no real animation, applies the procedural
 * float/sway fallback so the character always feels alive.
 */
export function updateStagedModel(staged: StagedModel, delta: number, elapsed: number): void {
  if (staged.mixer) {
    staged.mixer.update(delta);
  } else {
    const inner = staged.group.children[0];
    if (inner) {
      inner.position.y = (inner.userData.baseY ?? (inner.userData.baseY = inner.position.y)) +
        Math.sin(elapsed * 1.8) * 0.02;
      inner.rotation.y = (inner.userData.baseRot ?? (inner.userData.baseRot = inner.rotation.y)) +
        Math.sin(elapsed * 0.9) * 0.06;
    }
  }
}
