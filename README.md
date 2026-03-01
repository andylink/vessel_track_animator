# VesselAnimator

VesselAnimator is an MVP app for uploading or generating vessel tracks, previewing them on a Cesium 3D globe, and exporting deterministic 4K MP4 renders with optional background music.

## Quick start (GitHub Codespaces)

1. Open this repo in Codespaces.
2. Wait for post-create setup (`pnpm install && pnpm -r build`).
3. Run:
   ```bash
   pnpm dev
   ```
4. Open http://localhost:3000.

Ports:
- `3000` web app
- `3001` API server
- `4000` headless render-view
- `6379` Redis

## MVP flow

1. Upload CSV (`Lat,Long,Timestamp`) or request a stub AIS route.
2. Preview animation at `/preview?routeId=...`.
3. Submit a render job.
4. Poll render status and download MP4 when complete.

## Storage

Local temporary storage is used by default:
- Routes: `/tmp/routes/{routeId}.json`
- Frames: `/tmp/frames/{jobId}/frame_%06d.png`
- Exports: `/tmp/exports/{jobId}.mp4`

S3-ready abstractions are left as TODOs and disabled.

## Environment variables

- `CESIUM_ION_TOKEN` (optional)
- `AIS_PROVIDER` (optional provider string)
- `AIS_API_KEY` (optional)

See [packages/shared/env.ts](packages/shared/env.ts) for schema.

## AIS integration note

Current AIS integration is a stub: if no API key is set, it returns deterministic demo data. A provider class scaffold is included to wire a real service later.

## Tiles and licensing note

When `CESIUM_ION_TOKEN` is missing, preview falls back to OpenStreetMap imagery. Verify your usage terms for map/terrain tiles before production use.

## License

MIT
