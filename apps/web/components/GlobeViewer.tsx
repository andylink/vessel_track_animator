'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { VesselType } from '@vessel/shared/geo';
import type { TimedPosition } from '@/lib/trackOps';
import { interpolatePosition } from '@/lib/trackOps';
import { isNearPort } from '@/lib/ports';

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
  cinematic
}: {
  samples: TimedPosition[];
  vesselType: VesselType;
  progress: number;
  playing: boolean;
  followCamera: boolean;
  cinematic: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<any>(null);
  const vesselEntityRef = useRef<any>(null);
  const lineEntityRef = useRef<any>(null);
  const cesiumRef = useRef<any>(null);
  const [viewerReady, setViewerReady] = useState(false);
  const lastCameraUpdateRef = useRef(0);
  const initialFitRef = useRef(false);
  const routeBoundsRef = useRef<any>(null);

  const current = useMemo(() => interpolatePosition(samples, progress), [samples, progress]);

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

      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(targetLon, targetLat, altitude),
        orientation: { heading: viewer.camera.heading, pitch, roll: 0 }
      });
    }
  }, [cinematic, current, followCamera, playing, progress, samples.length, viewerReady]);

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
