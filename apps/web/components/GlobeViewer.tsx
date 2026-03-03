'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { BoundingSphere, Entity, Viewer } from 'cesium';
import type { VesselType } from '@vessel/shared/geo';
import type { TimedPosition } from '@/lib/trackOps';
import { interpolatePosition } from '@/lib/trackOps';
import { isNearPort } from '@/lib/ports';
import type { Keyframe } from '@/components/KeyframeEditor';

import 'cesium/Build/Cesium/Widgets/widgets.css';

const vesselColor = {
  cruise: '#60a5fa',
  yacht: '#a78bfa',
  cargo: '#f59e0b'
} as const;

export function GlobeViewer({
  samples,
  vesselType,
  progress,
  playing,
  followCamera,
  cinematic,
  keyframes,
  timelineDurationSeconds
}: {
  samples: TimedPosition[];
  vesselType: VesselType;
  progress: number;
  playing: boolean;
  followCamera: boolean;
  cinematic: boolean;
  keyframes?: Keyframe[];
  timelineDurationSeconds?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const vesselEntityRef = useRef<Entity | null>(null);
  const lineEntityRef = useRef<Entity | null>(null);
  const cesiumRef = useRef<typeof import('cesium') | null>(null);
  const [viewerReady, setViewerReady] = useState(false);
  const lastCameraUpdateRef = useRef(0);
  const initialFitRef = useRef(false);
  const routeBoundsRef = useRef<BoundingSphere | null>(null);

  const current = useMemo(() => interpolatePosition(samples, progress), [samples, progress]);

  const cameraKeyframe = useMemo(() => {
    if (!keyframes || keyframes.length === 0) return null;
    const parsed = keyframes
      .map((kf) => ({
        ...kf,
        seconds: parseTimeToSeconds(kf.time)
      }))
      .filter((kf) => kf.seconds >= 0)
      .sort((a, b) => a.seconds - b.seconds);

    if (parsed.length === 0) return null;
    const totalDuration = Math.max(
      timelineDurationSeconds ?? parsed[parsed.length - 1]?.seconds ?? 0,
      1
    );
    const nowSeconds = progress * totalDuration;
    const nextIndex = parsed.findIndex((kf) => kf.seconds >= nowSeconds);

    if (nextIndex === -1) {
      const last = parsed[parsed.length - 1];
      return { heading: last.heading, pitch: last.pitch, altitude: last.altitude };
    }
    if (nextIndex === 0) {
      const first = parsed[0];
      return { heading: first.heading, pitch: first.pitch, altitude: first.altitude };
    }

    const prev = parsed[nextIndex - 1];
    const next = parsed[nextIndex];
    const span = Math.max(1, next.seconds - prev.seconds);
    const t = clamp((nowSeconds - prev.seconds) / span, 0, 1);
    const eased = applyEasing(t, prev.easing || 'Linear');

    return {
      heading: lerp(prev.heading, next.heading, eased),
      pitch: lerp(prev.pitch, next.pitch, eased),
      altitude: lerp(prev.altitude, next.altitude, eased)
    };
  }, [keyframes, progress, timelineDurationSeconds]);

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) {
      return;
    }

    let disposed = false;

    void (async () => {
      (globalThis as typeof globalThis & { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = '/cesium';
      const Cesium = await import('cesium');
      cesiumRef.current = Cesium;
      if (disposed || !containerRef.current) {
        return;
      }

      if (process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN) {
        Cesium.Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;
      }

      const viewer = new Cesium.Viewer(containerRef.current, {
        baseLayerPicker: false,
        timeline: false,
        animation: false,
        geocoder: false,
        sceneModePicker: false,
        homeButton: false,
        fullscreenButton: false,
        infoBox: false,
        selectionIndicator: false
      });

      if (!process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN) {
        viewer.imageryLayers.removeAll();
        viewer.imageryLayers.addImageryProvider(
          new Cesium.OpenStreetMapImageryProvider({ url: 'https://tile.openstreetmap.org' })
        );
      }

      viewerRef.current = viewer;
      setViewerReady(true);
    })();

    return () => {
      disposed = true;
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
      setViewerReady(false);
    };
  }, []);

  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || samples.length < 2 || !viewerReady) {
      return;
    }

    if (lineEntityRef.current) {
      viewer.entities.remove(lineEntityRef.current);
    }
    lineEntityRef.current = viewer.entities.add({
      polyline: {
        positions: samples.map((sample) => Cesium.Cartesian3.fromDegrees(sample.lon, sample.lat, 0)),
        width: 3,
        material: Cesium.Color.fromCssColorString(vesselColor[vesselType])
      }
    });

    if (!vesselEntityRef.current) {
      vesselEntityRef.current = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(samples[0].lon, samples[0].lat, 100),
        billboard: {
          image: `/icons/${vesselType}.svg`,
          width: 40,
          height: 40,
          color: Cesium.Color.fromCssColorString(vesselColor[vesselType])
        }
      });
    }

    viewer.trackedEntity = followCamera ? vesselEntityRef.current : undefined;
    initialFitRef.current = false;
  }, [samples, vesselType, viewerReady]);

  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    const vessel = vesselEntityRef.current;
    if (!viewer || !Cesium || !vessel || samples.length < 2 || !viewerReady) {
      return;
    }

    vessel.position = Cesium.Cartesian3.fromDegrees(current.lon, current.lat, 100);
    const now = performance.now();
    const shouldUpdateCamera = playing || progress === 0 || progress === 1;
    // Throttle camera updates to avoid queuing many flights that cause flicker.
    if (shouldUpdateCamera && now - lastCameraUpdateRef.current > 50) {
      lastCameraUpdateRef.current = now;
      const nearPort = isNearPort({ lat: current.lat, lon: current.lon }, 12);
      const cruiseAltitude = nearPort.near ? 1800 : 12000;
      const cruisePitch = nearPort.near ? Cesium.Math.toRadians(-35) : Cesium.Math.toRadians(-15);

      let altitude = cruiseAltitude;
      let pitch = cruisePitch;
      let heading = viewer.camera.heading;
      let targetLon = current.lon;
      let targetLat = current.lat;

      if (followCamera) {
        if (cinematic && routeBoundsRef.current) {
          const radius = routeBoundsRef.current.radius;
          const startBlend = Math.min(1, progress / 0.12); // first ~12% push-in
          const endBlend = Math.min(1, Math.max(0, (progress - 0.85) / 0.12)); // last ~15% pull-back
          const wideAltitude = Math.max(cruiseAltitude, radius * 2.2);
          const arrivalAltitude = Math.max(cruiseAltitude, radius * 1.4);
          altitude = wideAltitude * (1 - startBlend) + cruiseAltitude * startBlend;
          altitude = altitude * (1 - endBlend) + arrivalAltitude * endBlend;

          const widePitch = Cesium.Math.toRadians(-30);
          const arrivalPitch = Cesium.Math.toRadians(-20);
          pitch = widePitch * (1 - startBlend) + cruisePitch * startBlend;
          pitch = pitch * (1 - endBlend) + arrivalPitch * endBlend;
        }
      } else if (routeBoundsRef.current) {
        const cartographic = Cesium.Cartographic.fromCartesian(routeBoundsRef.current.center);
        targetLat = Cesium.Math.toDegrees(cartographic.latitude);
        targetLon = Cesium.Math.toDegrees(cartographic.longitude);

        const baseAltitude = Math.max(routeBoundsRef.current.radius * 1.8, 6000);
        const zoomAltitude = Math.max(routeBoundsRef.current.radius * 0.9, 2500);
        const startBlend = Math.min(1, progress / 0.18); // gentle push-in early
        const endBlend = Math.min(1, Math.max(0, (progress - 0.82) / 0.18)); // pull-back near finish
        altitude = baseAltitude * (1 - startBlend) + zoomAltitude * startBlend;
        altitude = altitude * (1 - endBlend) + baseAltitude * endBlend;

        const basePitch = Cesium.Math.toRadians(-22);
        const zoomPitch = Cesium.Math.toRadians(-35);
        pitch = basePitch * (1 - startBlend) + zoomPitch * startBlend;
        pitch = pitch * (1 - endBlend) + basePitch * endBlend;
      }

      if (cameraKeyframe) {
        altitude = cameraKeyframe.altitude;
        pitch = Cesium.Math.toRadians(cameraKeyframe.pitch);
        heading = Cesium.Math.toRadians(cameraKeyframe.heading);
      }

      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(targetLon, targetLat, altitude),
        orientation: { heading, pitch, roll: 0 }
      });
    }
  }, [cameraKeyframe, cinematic, current, followCamera, playing, progress, samples.length, viewerReady]);

  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || samples.length < 2 || !viewerReady) {
      return;
    }
    if (initialFitRef.current) {
      return;
    }
    const positions = samples.map((sample) => Cesium.Cartesian3.fromDegrees(sample.lon, sample.lat, 0));
    const sphere = Cesium.BoundingSphere.fromPoints(positions);
    routeBoundsRef.current = sphere;
    viewer.camera.flyToBoundingSphere(sphere, {
      duration: 1.2,
      offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-25), sphere.radius * 1.8)
    });
    initialFitRef.current = true;
  }, [samples, followCamera, viewerReady]);

  return <div ref={containerRef} className="h-[70vh] w-full rounded border border-slate-700" />;
}

function parseTimeToSeconds(time: string) {
  const match = time.match(/^(\d{2}):(\d{2})$/);
  if (!match) return -1;
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  return minutes * 60 + seconds;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function applyEasing(t: number, easing: string) {
  switch (easing) {
    case 'Ease In':
      return t * t;
    case 'Ease Out':
      return 1 - (1 - t) * (1 - t);
    case 'Ease In-Out':
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    default:
      return t;
  }
}
