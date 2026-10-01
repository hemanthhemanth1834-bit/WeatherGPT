import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { feature } from "topojson-client";
import { fetchActiveAlerts, fetchCycloneTrack, fetchEarthquakes, fetchWildfires } from "../services/api";

/* 3D Earth command view. Original implementation (three.js, lazy chunk).
   Coastlines: Natural Earth 110m via world-atlas (public domain), fetched at
   runtime; falls back to a labelled wireframe globe when offline. Markers
   come only from live feeds (alerts, cyclone DEMO track, quakes, fires).
   Quality scales down on small screens / reduced motion / no WebGL. */
const LAND_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json";
const R = 1;

function latLon(lat, lon, r = R) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

function subsolar() {
  const now = new Date();
  const start = Date.UTC(now.getUTCFullYear(), 0, 0);
  const day = (now.getTime() - start) / 864e5;
  const decl = -23.44 * Math.cos(((2 * Math.PI) / 365) * (day + 10));
  const lon = 180 - (now.getUTCHours() * 15 + now.getUTCMinutes() * 0.25);
  return latLon(decl, lon > 180 ? lon - 360 : lon, 5);
}

export default function Earth3D({ weather }) {
  const mountRef = useRef(null);
  const [status, setStatus] = useState("Loading globe…");
  const [selected, setSelected] = useState(null);
  const [quality, setQuality] = useState("HIGH");

  useEffect(() => {
    let cancelled = false;
    let renderer = null;
    let raf = 0;
    let onResize = null;
    let onTap = null;
    const disposables = [];

    (async () => {
      const mount = mountRef.current;
      if (!mount) return;
      const small = Math.min(window.innerWidth, window.innerHeight) < 700;
      const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setQuality(small ? "LOW (mobile)" : "HIGH");

      try {
        renderer = new THREE.WebGLRenderer({ antialias: !small, alpha: true });
      } catch {
        if (!cancelled) setStatus("WebGL unavailable — 2D map remains fully usable.");
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1 : 2));
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      mount.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, mount.clientWidth / mount.clientHeight, 0.1, 100);
      camera.position.set(0, 0.7, 3.1);

      const globe = new THREE.Group();
      scene.add(globe);

      const ocean = new THREE.Mesh(
        new THREE.SphereGeometry(R, small ? 32 : 64, small ? 32 : 64),
        new THREE.MeshPhongMaterial({ color: 0x0a1a33, shininess: 8, transparent: true, opacity: 0.96 })
      );
      globe.add(ocean);
      disposables.push(ocean.geometry, ocean.material);

      // Graticule (our own linework).
      const grat = [];
      for (let lon = -180; lon < 180; lon += 15) {
        for (let lat = -75; lat < 75; lat += 3) {
          grat.push(latLon(lat, lon), latLon(lat + 3, lon));
        }
      }
      for (let lat = -75; lat <= 75; lat += 15) {
        for (let lon = -180; lon < 180; lon += 3) {
          grat.push(latLon(lat, lon), latLon(lat, lon + 3));
        }
      }
      const gratGeo = new THREE.BufferGeometry().setFromPoints(grat);
      globe.add(new THREE.LineSegments(gratGeo, new THREE.LineBasicMaterial({ color: 0x1e3a5f, transparent: true, opacity: 0.5 })));
      disposables.push(gratGeo);

      // Coastlines: Natural Earth 110m (public domain) via world-atlas.
      // land is a GeometryCollection, so feature() yields a FeatureCollection.
      try {
        const res = await fetch(LAND_URL);
        if (!res.ok) throw new Error(`land ${res.status}`);
        const topo = await res.json();
        const land = feature(topo, topo.objects.land);
        const feats = land.type === "FeatureCollection" ? land.features : [land];
        const pts = [];
        feats.forEach((feat) => {
          const geom = feat.geometry;
          if (!geom) return;
          const polys = geom.type === "MultiPolygon" ? geom.coordinates : [geom.coordinates];
          polys.forEach((poly) => {
            poly.forEach((ring) => {
              if (!Array.isArray(ring) || ring.length < 2) return;
              const step = Math.max(1, Math.floor(ring.length / (small ? 60 : 140)));
              for (let i = 0; i < ring.length; i += step) {
                const a = ring[i];
                const b = ring[(i + step) % ring.length];
                if (!Array.isArray(a) || !Array.isArray(b)) continue;
                pts.push(latLon(a[1], a[0], R + 0.003), latLon(b[1], b[0], R + 0.003));
              }
            });
          });
        });
        if (!pts.length) throw new Error("no coastline points");
        const coastGeo = new THREE.BufferGeometry().setFromPoints(pts);
        globe.add(new THREE.LineSegments(coastGeo, new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.75 })));
        disposables.push(coastGeo);
        if (!cancelled) setStatus("Coastlines: Natural Earth (public domain) · live markers below");
      } catch {
        if (!cancelled) setStatus("Coastlines offline — wireframe globe with live markers.");
      }

      // Atmosphere glow (fresnel-style backside shell).
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(R * 1.14, 32, 32),
        new THREE.ShaderMaterial({
          side: THREE.BackSide, transparent: true, depthWrite: false,
          uniforms: { tint: { value: new THREE.Color(0x2ea8ff) } },
          vertexShader: "varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
          fragmentShader: "varying vec3 vN; uniform vec3 tint; void main(){ float i = pow(0.62 - dot(vN, vec3(0.,0.,1.)), 2.0); gl_FragColor = vec4(tint, 1.0) * i; }",
        })
      );
      scene.add(glow);
      disposables.push(glow.geometry, glow.material);

      // Day/night terminator from real UTC time.
      const sun = new THREE.DirectionalLight(0xffffff, 2.2);
      sun.position.copy(subsolar());
      scene.add(sun, new THREE.AmbientLight(0x8fb4dd, 0.55));

      // Live markers: user place, alerts, cyclone DEMO, quakes, fires.
      const pickables = [];
      const addMarker = (lat, lon, color, size, info) => {
        if (lat == null || lon == null) return;
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(size, 12, 12),
          new THREE.MeshBasicMaterial({ color })
        );
        dot.position.copy(latLon(lat, lon, R + 0.012));
        dot.userData.info = info;
        globe.add(dot);
        pickables.push(dot);
        disposables.push(dot.geometry, dot.material);
      };

      try {
        const [alerts, track, quakes, fires] = await Promise.all([
          fetchActiveAlerts().catch(() => []),
          fetchCycloneTrack().catch(() => null),
          fetchEarthquakes(5, 7).catch(() => null),
          fetchWildfires(25).catch(() => null),
        ]);
        if (cancelled) return;
        alerts.slice(0, 12).forEach((a) =>
          addMarker(a.lat, a.lon, a.severity === "Red" ? 0xef4444 : a.severity === "Orange" ? 0xf97316 : 0xeab308, 0.016,
            { title: a.headline, sub: `${a.severity} · computed, unofficial` }));
        const line = track?.features?.find((f) => f.geometry?.type === "LineString");
        (line?.geometry.coordinates || []).forEach(([lo, la]) =>
          addMarker(la, lo, 0xef4444, 0.011, { title: "Illustrative cyclone point (DEMO)", sub: "Not a live bulletin" }));
        (quakes?.events || []).forEach((q) => {
          addMarker(q.lat, q.lon, 0xc084fc, 0.008 + Math.min(0.02, (q.magnitude || 0) * 0.003),
            { title: `M${q.magnitude} — ${q.place}`, sub: "USGS, official third-party" });
        });
        (fires?.events || []).slice(0, 25).forEach((e) =>
          addMarker(e.lat, e.lon, 0xfb923c, 0.012, { title: e.title, sub: "NASA EONET" }));
      } catch {
        /* markers optional */
      }

      if (weather) {
        addMarker(weather.lat, weather.lon, 0x38bdf8, 0.02,
          { title: `${weather.location}: ${weather.current_temp}°C`, sub: weather.condition });
        const target = latLon(weather.lat, weather.lon, R + 0.012);
        const dir = target.clone().normalize().multiplyScalar(3.1);
        camera.position.copy(dir.add(new THREE.Vector3(0, 0.5, 0)));
      }

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.rotateSpeed = 0.55;
      controls.minDistance = 1.6;
      controls.maxDistance = 8;
      controls.autoRotate = !calm;
      controls.autoRotateSpeed = 0.5;

      const ray = new THREE.Raycaster();
      const ptr = new THREE.Vector2();
      onTap = (event) => {
        const rect = renderer.domElement.getBoundingClientRect();
        ptr.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        ptr.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        ray.setFromCamera(ptr, camera);
        const hit = ray.intersectObjects(pickables, false)[0];
        setSelected(hit ? hit.object.userData.info : null);
      };
      renderer.domElement.addEventListener("click", onTap);

      onResize = () => {
        if (!mount.clientWidth) return;
        camera.aspect = mount.clientWidth / mount.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(mount.clientWidth, mount.clientHeight);
      };
      window.addEventListener("resize", onResize);

      const spin = () => {
        raf = requestAnimationFrame(spin);
        controls.update();
        renderer.render(scene, camera);
      };
      if (!cancelled) spin();

      return () => {};
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      disposables.forEach((d) => d.dispose && d.dispose());
      if (onResize) window.removeEventListener("resize", onResize);
      if (renderer) {
        if (onTap) renderer.domElement?.removeEventListener("click", onTap);
        renderer.domElement?.remove();
        renderer.dispose();
        renderer = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="wg-card" style={{ padding: "0.9rem 1rem" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center", justifyContent: "space-between" }}>
        <h3 style={{ margin: 0, fontSize: "0.85rem" }}>
          🌍 3D Earth <span className="wg-chip live" style={{ marginLeft: "0.4rem" }}>LIVE MARKERS</span>
        </h3>
        <span className="wg-mono" style={{ fontSize: "0.66rem", color: "var(--wg-muted)" }}>
          {status} · quality {quality} · drag to rotate, scroll to zoom, click a marker
        </span>
      </div>
      <div ref={mountRef} role="img" aria-label="Interactive 3D globe with live weather, alert, earthquake and wildfire markers"
        style={{ height: "26rem", minHeight: "20rem", marginTop: "0.6rem", borderRadius: "0.8rem", overflow: "hidden", background: "radial-gradient(circle at 50% 45%, #0b1a33, #05080f)" }} />
      {selected && (
        <div className="wg-alert info" role="status" style={{ marginTop: "0.6rem" }}>
          <strong>{selected.title}</strong>
          <span style={{ display: "block", fontSize: "0.74rem" }}>{selected.sub}</span>
        </div>
      )}
      <p style={{ fontSize: "0.7rem", color: "var(--wg-muted)", margin: "0.5rem 0 0" }}>
        Coastlines: Natural Earth (public domain). Markers: Open-Meteo alerts feed (computed), illustrative cyclone line (DEMO), USGS quakes and NASA EONET fires (official third-party). Tracker-free; data fetched live in your browser.
      </p>
    </div>
  );
}
