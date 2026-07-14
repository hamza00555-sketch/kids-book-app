"use client";

// The MindAR ↔ three.js bridge, multi-target edition.
//
// We deliberately do NOT use the official MindARThree wrapper (it targets a
// three.js API that no longer exists). Instead we drive the raw `Controller`
// and copy the two pieces of math that must match the tracker exactly:
//   - postMatrix per target: position(w/2, w/2+(h-w)/2), scale(w) — makes
//     "1 unit = printed page width" with the origin at the page center.
//   - camera projection: fov/near/far derived from getProjectionMatrix(),
//     corrected for the cover-fit crop of the camera video.
//
// Scene graph per page:
//   anchor (matrix driven by tracker) → stage (rotX 90° so Y-up models stand
//   out of the page) → staged model group (shared stageModel() fitting).

import { useEffect, useRef } from "react";
import type * as ThreeNS from "three";
import type { BookPage } from "@/lib/types";
import type { StagedModel } from "@/lib/model-stage";

export interface TrackedViewerHandle {
  setMode: (mode: "track" | "explore", activeIndex: number | null) => void;
}

interface PageSlot {
  page: BookPage;
  anchor: ThreeNS.Group;
  stage: ThreeNS.Group;
  staged: StagedModel | null;
  loading: boolean;
  visible: boolean;
}

export default function TrackedBookViewer({
  mindUrl,
  pages,
  onReady,
  onTargetFound,
  onTargetLost,
  onModelLoading,
  onError,
  handleRef,
}: {
  mindUrl: string;
  pages: BookPage[];
  onReady: () => void;
  onTargetFound: (index: number) => void;
  onTargetLost: (index: number) => void;
  onModelLoading: (index: number, loading: boolean) => void;
  onError: (kind: "camera" | "load", message: string) => void;
  /** Imperative handle for mode switching without re-mounting the AR session. */
  handleRef: { current: TrackedViewerHandle | null };
}) {
  const hostRef = useRef<HTMLDivElement>(null);

  // Callbacks live in refs so the (heavy) AR session never re-mounts.
  const cbRef = useRef({ onReady, onTargetFound, onTargetLost, onModelLoading, onError });
  useEffect(() => {
    cbRef.current = { onReady, onTargetFound, onTargetLost, onModelLoading, onError };
  }, [onReady, onTargetFound, onTargetLost, onModelLoading, onError]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    const cleanups: (() => void)[] = [];

    (async () => {
      const THREE = await import("three");
      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
      const { stageModel, updateStagedModel } = await import("@/lib/model-stage");

      // --- Camera stream -------------------------------------------------
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
      } catch (e) {
        cbRef.current.onError("camera", e instanceof Error ? e.message : String(e));
        return;
      }
      if (disposed) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      cleanups.push(() => stream.getTracks().forEach((t) => t.stop()));

      const video = document.createElement("video");
      video.setAttribute("playsinline", "");
      video.muted = true;
      video.srcObject = stream;
      video.style.position = "absolute";
      video.style.zIndex = "0";
      host.appendChild(video);
      cleanups.push(() => video.remove());
      await video.play();
      await new Promise<void>((resolve) => {
        if (video.videoWidth > 0) resolve();
        else video.addEventListener("loadedmetadata", () => resolve(), { once: true });
      });
      if (disposed) return;

      // --- three.js scene -------------------------------------------------
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      // The tracker (TensorFlow.js) shares this GPU — keep render cost low.
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.domElement.style.position = "absolute";
      renderer.domElement.style.inset = "0";
      renderer.domElement.style.zIndex = "1";
      host.appendChild(renderer.domElement);
      cleanups.push(() => {
        renderer.setAnimationLoop(null);
        renderer.dispose();
        renderer.domElement.remove();
      });

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera();
      scene.add(new THREE.AmbientLight(0xffffff, 1.2));
      const sun = new THREE.DirectionalLight(0xffffff, 1.4);
      sun.position.set(0.5, 1, 1);
      scene.add(sun);

      // --- MindAR controller ----------------------------------------------
      const { Controller } = await import("mind-ar/dist/mindar-image.prod.js");
      if (disposed) return;

      const slots: PageSlot[] = pages.map((page) => {
        const anchor = new THREE.Group();
        anchor.matrixAutoUpdate = false;
        anchor.visible = false;
        const stage = new THREE.Group();
        stage.rotation.x = Math.PI / 2; // Y-up model stands out of the page
        anchor.add(stage);
        scene.add(anchor);
        return { page, anchor, stage, staged: null, loading: false, visible: false };
      });

      const postMatrices: ThreeNS.Matrix4[] = [];

      const controller = new Controller({
        inputWidth: video.videoWidth,
        inputHeight: video.videoHeight,
        maxTrack: 1, // one open page at a time — best tracking performance
        onUpdate: (data: { type: string; targetIndex?: number; worldMatrix?: number[] | null }) => {
          if (data.type !== "updateMatrix") return;
          const i = data.targetIndex!;
          const slot = slots[i];
          if (!slot || !postMatrices[i]) return;
          const worldMatrix = data.worldMatrix ?? null;
          if (worldMatrix !== null) {
            const m = new THREE.Matrix4();
            m.elements = [...worldMatrix] as unknown as ThreeNS.Matrix4["elements"];
            m.multiply(postMatrices[i]);
            slot.anchor.matrix = m;
          }
          const nowVisible = worldMatrix !== null;
          if (nowVisible !== slot.visible) {
            slot.visible = nowVisible;
            slot.anchor.visible = nowVisible && exploreIndex === null;
            if (nowVisible) {
              void ensureModel(i);
              cbRef.current.onTargetFound(i);
            } else {
              cbRef.current.onTargetLost(i);
            }
          }
        },
      });
      cleanups.push(() => {
        try {
          controller.stopProcessVideo();
          controller.dispose();
        } catch {
          /* already stopped */
        }
      });

      // --- Cover-fit video + camera projection (math from official MindARThree) ---
      const resize = () => {
        const cw = host.clientWidth;
        const ch = host.clientHeight;
        if (!cw || !ch) return;
        const videoRatio = video.videoWidth / video.videoHeight;
        const containerRatio = cw / ch;
        let dispW: number, dispH: number;
        if (videoRatio > containerRatio) {
          dispH = ch;
          dispW = dispH * videoRatio;
        } else {
          dispW = cw;
          dispH = dispW / videoRatio;
        }
        video.style.top = `${-(dispH - ch) / 2}px`;
        video.style.left = `${-(dispW - cw) / 2}px`;
        video.style.width = `${dispW}px`;
        video.style.height = `${dispH}px`;

        const proj = controller.getProjectionMatrix();
        // Visible vertical fraction of the video after the cover crop.
        const fullH = videoRatio > containerRatio ? ch : cw / videoRatio;
        const g = ch / fullH;
        camera.fov = (2 * Math.atan((1 / proj[5]) * g) * 180) / Math.PI;
        camera.near = proj[14] / (proj[10] - 1);
        camera.far = proj[14] / (proj[10] + 1);
        camera.aspect = containerRatio;
        camera.updateProjectionMatrix();
        renderer.setSize(cw, ch);
      };

      // --- Load targets ----------------------------------------------------
      let dims: [number, number][];
      try {
        const res = await controller.addImageTargets(mindUrl);
        dims = res.dimensions;
      } catch (e) {
        cbRef.current.onError("load", e instanceof Error ? e.message : String(e));
        return;
      }
      if (disposed) return;
      for (const [w, h] of dims) {
        const m = new THREE.Matrix4();
        m.compose(
          new THREE.Vector3(w / 2, w / 2 + (h - w) / 2, 0),
          new THREE.Quaternion(),
          new THREE.Vector3(w, w, w)
        );
        postMatrices.push(m);
      }

      resize();
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);
      cleanups.push(() => resizeObserver.disconnect());

      // --- GLB loading (lazy + background prefetch) -------------------------
      const loader = new GLTFLoader();
      const ensureModel = async (i: number): Promise<void> => {
        const slot = slots[i];
        if (!slot || slot.staged || slot.loading) return;
        slot.loading = true;
        cbRef.current.onModelLoading(i, true);
        try {
          const gltf = await loader.loadAsync(slot.page.modelUrl);
          if (disposed) return;
          slot.staged = stageModel(gltf.scene, gltf.animations, slot.page.config);
          slot.stage.add(slot.staged.group);
        } catch (e) {
          console.error(`Model load failed for page ${i}`, e);
        } finally {
          slot.loading = false;
          cbRef.current.onModelLoading(i, false);
        }
      };
      // Prefetch every model in the background, one at a time.
      void (async () => {
        for (let i = 0; i < slots.length && !disposed; i++) await ensureModel(i);
      })();

      // --- Explore mode ("bring it closer") ---------------------------------
      let exploreIndex: number | null = null;
      const exploreGroup = new THREE.Group();
      exploreGroup.visible = false;
      scene.add(exploreGroup);

      const enterExplore = async (i: number) => {
        await ensureModel(i);
        const slot = slots[i];
        if (!slot?.staged || disposed) return;
        exploreIndex = i;
        try {
          controller.stopProcessVideo();
        } catch {
          /* not running */
        }
        slots.forEach((s) => (s.anchor.visible = false));
        exploreGroup.clear();
        exploreGroup.add(slot.staged.group);
        // Fill a comfortable chunk of the view at arm's length.
        exploreGroup.position.set(0, -0.25, -1.1);
        exploreGroup.rotation.set(0, 0, 0);
        exploreGroup.scale.setScalar(1);
        exploreGroup.visible = true;
      };

      const exitExplore = () => {
        if (exploreIndex === null) return;
        const slot = slots[exploreIndex];
        if (slot?.staged) slot.stage.add(slot.staged.group);
        exploreGroup.visible = false;
        exploreIndex = null;
        slots.forEach((s) => (s.anchor.visible = s.visible));
        controller.processVideo(video);
      };

      handleRef.current = {
        setMode: (mode, activeIndex) => {
          if (mode === "explore" && activeIndex !== null) void enterExplore(activeIndex);
          else exitExplore();
        },
      };
      cleanups.push(() => {
        handleRef.current = null;
      });

      // Touch controls for explore: drag = rotate, pinch = zoom.
      const pointers = new Map<number, { x: number; y: number }>();
      let pinchStart = 0;
      let pinchScale = 1;
      const el = renderer.domElement;
      const onPointerDown = (e: PointerEvent) => {
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.size === 2) {
          const [a, b] = [...pointers.values()];
          pinchStart = Math.hypot(a.x - b.x, a.y - b.y);
          pinchScale = exploreGroup.scale.x;
        }
      };
      const onPointerMove = (e: PointerEvent) => {
        if (exploreIndex === null || !pointers.has(e.pointerId)) return;
        const prev = pointers.get(e.pointerId)!;
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.size === 1) {
          exploreGroup.rotation.y += (e.clientX - prev.x) * 0.01;
          exploreGroup.rotation.x = Math.max(
            -0.7,
            Math.min(0.7, exploreGroup.rotation.x + (e.clientY - prev.y) * 0.006)
          );
        } else if (pointers.size === 2 && pinchStart > 0) {
          const [a, b] = [...pointers.values()];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          exploreGroup.scale.setScalar(Math.max(0.4, Math.min(3, (pinchScale * d) / pinchStart)));
        }
      };
      const onPointerUp = (e: PointerEvent) => pointers.delete(e.pointerId);
      el.addEventListener("pointerdown", onPointerDown);
      el.addEventListener("pointermove", onPointerMove);
      el.addEventListener("pointerup", onPointerUp);
      el.addEventListener("pointercancel", onPointerUp);
      cleanups.push(() => {
        el.removeEventListener("pointerdown", onPointerDown);
        el.removeEventListener("pointermove", onPointerMove);
        el.removeEventListener("pointerup", onPointerUp);
        el.removeEventListener("pointercancel", onPointerUp);
      });

      // --- Render loop -------------------------------------------------------
      const clock = new THREE.Clock();
      renderer.setAnimationLoop(() => {
        const delta = clock.getDelta();
        for (let i = 0; i < slots.length; i++) {
          const slot = slots[i];
          if (slot.staged && (slot.anchor.visible || exploreIndex === i)) {
            updateStagedModel(slot.staged, delta, clock.elapsedTime);
          }
        }
        renderer.render(scene, camera);
      });

      // --- Start tracking -----------------------------------------------------
      await controller.dummyRun(video); // warm up the TF.js kernels
      if (disposed) return;
      controller.processVideo(video);
      cbRef.current.onReady();
    })().catch((e) => {
      if (!disposed) cbRef.current.onError("load", e instanceof Error ? e.message : String(e));
    });

    return () => {
      disposed = true;
      cleanups.reverse().forEach((fn) => fn());
    };
    // The AR session must mount exactly once per book.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mindUrl]);

  return <div ref={hostRef} className="absolute inset-0 overflow-hidden bg-black" />;
}
