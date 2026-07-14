"use client";

import { useEffect, useRef } from "react";
import type { PageConfig } from "@/lib/types";

/**
 * Dashboard preview: the reference image lies flat like an open book page and
 * the GLB stands on it, fitted through the same stageModel() the AR viewer
 * uses — so the preview is faithful to the real experience.
 * Reports the file's animation clip names via onClips.
 */
export default function ModelPreview({
  modelUrl,
  targetImageUrl,
  config,
  onClips,
}: {
  modelUrl: string;
  targetImageUrl?: string;
  config: PageConfig;
  onClips?: (names: string[]) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onClipsRef = useRef(onClips);
  useEffect(() => {
    onClipsRef.current = onClips;
  }, [onClips]);
  // Rebuild only when values actually change, not on parent re-renders.
  const configKey = JSON.stringify(config);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !modelUrl) return;
    let disposed = false;
    let cleanup: (() => void) | null = null;

    const config: PageConfig = JSON.parse(configKey);

    (async () => {
      const THREE = await import("three");
      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
      const { stageModel, updateStagedModel } = await import("@/lib/model-stage");
      if (disposed) return;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xfff3e2);

      const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 50);
      camera.position.set(0, 0.9, 1.6);

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      host.appendChild(renderer.domElement);

      scene.add(new THREE.AmbientLight(0xffffff, 1.1));
      const sun = new THREE.DirectionalLight(0xffffff, 1.6);
      sun.position.set(1, 2, 1.5);
      scene.add(sun);

      // The printed page: 1 unit wide, lying in the X/Z plane.
      const pageGroup = new THREE.Group();
      scene.add(pageGroup);
      if (targetImageUrl) {
        new THREE.TextureLoader().load(targetImageUrl, (tex) => {
          if (disposed) return;
          tex.colorSpace = THREE.SRGBColorSpace;
          const aspect = tex.image.height / tex.image.width;
          const plane = new THREE.Mesh(
            new THREE.PlaneGeometry(1, aspect),
            new THREE.MeshBasicMaterial({ map: tex })
          );
          plane.rotation.x = -Math.PI / 2;
          pageGroup.add(plane);
        });
      } else {
        const plane = new THREE.Mesh(
          new THREE.PlaneGeometry(1, 1.4),
          new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        plane.rotation.x = -Math.PI / 2;
        pageGroup.add(plane);
      }

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.target.set(0, 0.25, 0);
      controls.maxPolarAngle = Math.PI * 0.55;

      const loader = new GLTFLoader();
      let staged: ReturnType<typeof stageModel> | null = null;
      loader.load(
        modelUrl,
        (gltf) => {
          if (disposed) return;
          staged = stageModel(gltf.scene, gltf.animations, config);
          scene.add(staged.group);
          onClipsRef.current?.(staged.clipNames);
          controls.target.y = Math.min(0.4, staged.height / 2);
        },
        undefined,
        (err) => console.error("GLB load failed", err)
      );

      const clock = new THREE.Clock();
      const resize = () => {
        const w = host.clientWidth;
        const h = host.clientHeight || 320;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      resize();
      const observer = new ResizeObserver(resize);
      observer.observe(host);

      renderer.setAnimationLoop(() => {
        const delta = clock.getDelta();
        if (staged) updateStagedModel(staged, delta, clock.elapsedTime);
        controls.update();
        renderer.render(scene, camera);
      });

      cleanup = () => {
        observer.disconnect();
        renderer.setAnimationLoop(null);
        controls.dispose();
        renderer.dispose();
        host.removeChild(renderer.domElement);
      };
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [modelUrl, targetImageUrl, configKey]);

  return <div ref={hostRef} className="w-full h-80 rounded-blob overflow-hidden border border-line" />;
}
