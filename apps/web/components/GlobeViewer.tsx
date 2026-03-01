'use client';

import { useEffect, useMemo, useRef } from 'react';
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
  playing
}: {
  samples: TimedPosition[];
  vesselType: VesselType;
  progress: number;
  playing: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<any>(null);
  const vesselEntityRef = useRef<any>(null);
  const lineEntityRef = useRef<any>(null);
  const cesiumRef = useRef<any>(null);

  const current = useMemo(() => interpolatePosition(samples, progress), [samples, progress]);

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) {
      return;
    }

    let disposed = false;

    void (async () => {
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
    })();

    return () => {
      disposed = true;
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || samples.length < 2) {
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
      viewer.trackedEntity = vesselEntityRef.current;
    }
  }, [samples, vesselType]);

  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    const vessel = vesselEntityRef.current;
    if (!viewer || !Cesium || !vessel || samples.length < 2) {
      return;
    }

    vessel.position = Cesium.Cartesian3.fromDegrees(current.lon, current.lat, 100);
    const nearPort = isNearPort({ lat: current.lat, lon: current.lon }, 12);
    const altitude = nearPort.near ? 1800 : 12000;
    const pitch = nearPort.near ? Cesium.Math.toRadians(-35) : Cesium.Math.toRadians(-15);

    if (playing) {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(current.lon, current.lat, altitude),
        orientation: { heading: viewer.camera.heading, pitch, roll: 0 },
        duration: 0.2
      });
    }
  }, [current, playing, samples.length]);

  return <div ref={containerRef} className="h-[70vh] w-full rounded border border-slate-700" />;
}
