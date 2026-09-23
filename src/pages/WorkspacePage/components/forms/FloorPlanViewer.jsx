import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { X, Loader2, Ruler } from 'lucide-react';
import {
  extractFromVector,
  extractFromImage,
} from '../../utils/floorPlanExtract';

const fmt = (n, d = 2) => (Number.isFinite(n) ? Number(n).toFixed(d) : '—');

/** Split a wall segment around openings that overlap it (in plan space). */
function splitWallAtOpenings(wall, openings, gapPad) {
  const wx = wall.x2 - wall.x1, wy = wall.y2 - wall.y1;
  const wlen = Math.hypot(wx, wy) || 1;
  const ux = wx / wlen, uy = wy / wlen;
  const nx = -uy, ny = ux;

  const spans = [];
  for (const o of openings) {
    // opening center → project onto wall
    const cx = (o.x1 + o.x2) / 2, cy = (o.y1 + o.y2) / 2;
    const t = (cx - wall.x1) * ux + (cy - wall.y1) * uy;
    const d = Math.abs((cx - wall.x1) * nx + (cy - wall.y1) * ny);
    const half = Math.hypot(o.x2 - o.x1, o.y2 - o.y1) / 2 + gapPad;
    // opening must sit on/near the wall and be along it
    if (d <= wall.thickness * 1.5 + half && t - half < wlen && t + half > 0) {
      spans.push({ a: Math.max(0, t - half), b: Math.min(wlen, t + half), kind: o.kind, sillHeight: o.sillHeight || 0 });
    }
  }
  if (!spans.length) return [{ wall, opening: null }];
  spans.sort((a, b) => a.a - b.a);

  const out = [];
  let cursor = 0;
  for (const sp of spans) {
    if (sp.a > cursor) {
      out.push({
        wall: { x1: wall.x1 + ux * cursor, y1: wall.y1 + uy * cursor, x2: wall.x1 + ux * sp.a, y2: wall.y1 + uy * sp.a, thickness: wall.thickness },
        opening: null,
      });
    }
    // the opening span itself → render lintel above door / sill below window
    out.push({
      wall: { x1: wall.x1 + ux * sp.a, y1: wall.y1 + uy * sp.a, x2: wall.x1 + ux * sp.b, y2: wall.y1 + uy * sp.b, thickness: wall.thickness },
      opening: sp,
    });
    cursor = sp.b;
  }
  if (cursor < wlen) {
    out.push({
      wall: { x1: wall.x1 + ux * cursor, y1: wall.y1 + uy * cursor, x2: wall.x2, y2: wall.y2, thickness: wall.thickness },
      opening: null,
    });
  }
  return out;
}

/** Build the three.js group from a plan model. */
function buildPlanGroup(plan, spec) {
  const group = new THREE.Group();
  const upm = plan.unitsPerMeter || spec.pxPerMeter || 1000; // drawing units per meter
  const wallH = spec.wallHeight;        // meters
  const slabT = spec.slabThickness;     // meters
  const toM = (v) => v / upm;

  const { minX, minY, maxX, maxY } = plan.bounds;
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const X = (x) => toM(x - cx);          // centered plan → meters
  const Y = (y) => toM(y - cy);

  // floor slab
  const floorW = toM(maxX - minX), floorD = toM(maxY - minY);
  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(floorW, slabT, floorD),
    new THREE.MeshStandardMaterial({ color: 0xcbd5bf, roughness: 0.95 })
  );
  slab.position.set(0, -slabT / 2, 0);
  group.add(slab);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0xe8e0cf, roughness: 0.85 });
  const lintelMat = new THREE.MeshStandardMaterial({ color: 0x6b6255, roughness: 0.7 });
  const sillMat = new THREE.MeshStandardMaterial({ color: 0x9aa4b0, roughness: 0.7 });
  const doorMat = new THREE.MeshStandardMaterial({ color: 0xa05a2c, roughness: 0.6 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x4fa3d8, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.55 });

  // Furniture gets a stable pastel color per label so chairs vs tables read differently
  const furnColor = (label = '') => {
    let h = 0;
    for (const c of label) h = (h * 31 + c.charCodeAt(0)) % 360;
    return new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(h / 360, 0.4, 0.68), roughness: 0.6 });
  };

  // walls (plan Y → three -Z keeps drawings "up" matching the floor plan)
  const gapPad = 0.05 * upm;
  for (const wall of plan.walls) {
    for (const piece of splitWallAtOpenings(wall, plan.openings, gapPad)) {
      const w = piece.wall;
      const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
      if (len < 1e-9) continue;
      const lenM = toM(len), thickM = Math.max(toM(w.thickness), spec.minWallThickness);
      const angle = Math.atan2(-(w.y2 - w.y1), w.x2 - w.x1); // plan y is flipped

      if (!piece.opening) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(lenM, wallH, thickM), wallMat);
        mesh.position.set(X((w.x1 + w.x2) / 2), wallH / 2, -Y((w.y1 + w.y2) / 2));
        mesh.rotation.y = angle;
        group.add(mesh);
      } else if (piece.opening.kind === 'door') {
        // lintel above 2.1m door head + a thin door leaf so the opening reads as a door
        const headH = 2.1;
        const door = new THREE.Mesh(
          new THREE.BoxGeometry(lenM * 0.98, headH, Math.max(thickM * 0.6, 0.05)),
          doorMat
        );
        door.position.set(X((w.x1 + w.x2) / 2), headH / 2, -Y((w.y1 + w.y2) / 2));
        door.rotation.y = angle;
        group.add(door);
        if (wallH > headH) {
          const mesh = new THREE.Mesh(new THREE.BoxGeometry(lenM, wallH - headH, thickM), lintelMat);
          mesh.position.set(X((w.x1 + w.x2) / 2), headH + (wallH - headH) / 2, -Y((w.y1 + w.y2) / 2));
          mesh.rotation.y = angle;
          group.add(mesh);
        }
      } else {
        // window: sill below + lintel above + glass pane
        const sillM = toM(piece.opening.sillHeight || 0) || 0.9;
        const headH = Math.min(wallH - 0.3, sillM + 1.4);
        if (sillM > 0.05) {
          const sill = new THREE.Mesh(new THREE.BoxGeometry(lenM, sillM, thickM), sillMat);
          sill.position.set(X((w.x1 + w.x2) / 2), sillM / 2, -Y((w.y1 + w.y2) / 2));
          sill.rotation.y = angle;
          group.add(sill);
        }
        const glass = new THREE.Mesh(
          new THREE.BoxGeometry(lenM * 0.98, headH - sillM, Math.max(thickM * 0.6, 0.05)),
          glassMat
        );
        glass.position.set(X((w.x1 + w.x2) / 2), (sillM + headH) / 2, -Y((w.y1 + w.y2) / 2));
        glass.rotation.y = angle;
        group.add(glass);
        if (wallH > headH) {
          const lin = new THREE.Mesh(new THREE.BoxGeometry(lenM, wallH - headH, thickM), lintelMat);
          lin.position.set(X((w.x1 + w.x2) / 2), headH + (wallH - headH) / 2, -Y((w.y1 + w.y2) / 2));
          lin.rotation.y = angle;
          group.add(lin);
        }
      }
    }
  }

  // furniture proxy boxes — color varies by block label
  for (const f of plan.furniture) {
    const h = toM(f.height) || 0.9;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(toM(f.w), h, toM(f.d)), furnColor(f.label));
    mesh.position.set(X(f.x), h / 2, -Y(f.y));
    mesh.rotation.y = -(f.rot || 0) * (Math.PI / 180);
    group.add(mesh);
  }

  // room labels → sprites
  for (const l of plan.labels.slice(0, 60)) {
    const cvs = document.createElement('canvas');
    const ctx = cvs.getContext('2d');
    ctx.font = '28px sans-serif';
    const tw = Math.ceil(ctx.measureText(l.text).width) + 16;
    cvs.width = Math.max(tw, 4); cvs.height = 44;
    const c2 = cvs.getContext('2d');
    c2.fillStyle = 'rgba(255,255,255,0.85)';
    c2.fillRect(0, 0, cvs.width, cvs.height);
    c2.fillStyle = '#334155';
    c2.font = '28px sans-serif';
    c2.fillText(l.text, 8, 32);
    const tex = new THREE.CanvasTexture(cvs);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
    const s = 0.6;
    spr.scale.set((cvs.width / cvs.height) * s, s, 1);
    spr.position.set(X(l.x), wallH + 0.4, -Y(l.y));
    group.add(spr);
  }

  return group;
}

// ---------------------------------------------------------------------------

const SPEC_FIELDS = [
  { key: 'wallHeight', label: 'Wall height (m)', step: 0.1, min: 1.5, max: 6 },
  { key: 'slabThickness', label: 'Slab thickness (m)', step: 0.05, min: 0.05, max: 0.5 },
  { key: 'minWallThickness', label: 'Min wall thickness (m)', step: 0.01, min: 0.02, max: 0.5 },
];

export default function FloorPlanViewer({ fileUrl, streamUrl, fileName, ext, onClose }) {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const controlsRef = useRef(null);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadStage, setLoadStage] = useState('Reading file…');
  const [spec, setSpec] = useState({ wallHeight: 2.7, slabThickness: 0.15, minWallThickness: 0.1, pxPerMeter: 100 });

  // ------------------------------------------------------------------
  // Parse → plan model
  // ------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sourceUrl = streamUrl || fileUrl;
        if (!sourceUrl) throw new Error('File is not uploaded to storage yet.');
        const response = await fetch(sourceUrl);
        if (!response.ok) throw new Error(`Failed to load file (HTTP ${response.status})`);

        let model = null;
        const e = (ext || '').toLowerCase();

        if (e === 'dxf') {
          setLoadStage('Parsing DXF entities…');
          const text = await response.text();
          const DxfParser = (await import('dxf-parser')).default;
          const parsed = new DxfParser().parseSync(text);
          const DXF_UPM = { 1: 39.3701, 2: 3.28084, 4: 1000, 5: 100, 6: 1 };
          model = extractFromVector(parsed.entities, {
            blocks: parsed.blocks,
            unitsPerMeter: DXF_UPM[parsed.header?.$INSUNITS] || null,
          });
        } else if (e === 'dwg') {
          setLoadStage('Parsing DWG via WASM…');
          const buffer = await response.arrayBuffer();
          const { LibreDwg, Dwg_File_Type } = await import('@mlightcad/libredwg-web');
          const libredwg = await LibreDwg.create('/wasm');
          const dwg = libredwg.dwg_read_data(buffer, Dwg_File_Type.DWG);
          if (!dwg) throw new Error('Could not parse the DWG file');
          const db = libredwg.convert(dwg);
          libredwg.dwg_free(dwg);
          model = extractFromVector(db.entities, {
            isDwg: true,
            blockRecords: db.tables?.BLOCK_RECORD?.entries || [],
            insunits: db.header?.INSUNITS,
          });
        } else if (['png', 'jpg', 'jpeg', 'webp', 'bmp'].includes(e) || e === 'pdf') {
          setLoadStage(e === 'pdf' ? 'Rendering PDF page…' : 'Analyzing image…');
          let img;
          if (e === 'pdf') {
            const pdfjs = await import('pdfjs-dist/build/pdf');
            pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.js', import.meta.url).toString();
            const doc = await pdfjs.getDocument({ data: await response.arrayBuffer() }).promise;
            const page = await doc.getPage(1);
            const viewport = page.getViewport({ scale: 2 });
            const cvs = document.createElement('canvas');
            cvs.width = viewport.width; cvs.height = viewport.height;
            await page.render({ canvasContext: cvs.getContext('2d'), viewport }).promise;
            img = cvs;
          } else {
            const blob = await response.blob();
            img = await createImageBitmap(blob);
          }
          model = extractFromImage(img);
        } else {
          throw new Error(`Floor-plan 3D supports .dxf, .dwg, images, and .pdf — got .${e}`);
        }

        if (cancelled) return;
        if (!model.walls.length) {
          setError('No wall geometry detected — the plan may use unusual layers or be too complex for auto-extraction.');
        }
        setPlan(model);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to extract floor plan');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [fileUrl, streamUrl, ext]);

  // ------------------------------------------------------------------
  // three.js scene — rebuilt when plan or spec changes
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!plan || !containerRef.current) return;
    const container = containerRef.current;

    let renderer = rendererRef.current;
    let scene = sceneRef.current;
    let controls = controlsRef.current;

    if (!renderer) {
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(container.clientWidth, container.clientHeight);
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1c2430);
      sceneRef.current = scene;

      const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.05, 2000);
      camera.position.set(6, 8, 6);
      renderer.domElement.__camera = camera;

      scene.add(new THREE.AmbientLight(0xffffff, 0.45));
      const hemi = new THREE.HemisphereLight(0xdfeaff, 0x8a7f6a, 0.5);
      scene.add(hemi);
      const dir = new THREE.DirectionalLight(0xffffff, 0.9);
      dir.position.set(5, 12, 6);
      scene.add(dir);

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controlsRef.current = controls;

      const onResize = () => {
        if (!container.clientWidth) return;
        renderer.setSize(container.clientWidth, container.clientHeight);
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
      };
      window.addEventListener('resize', onResize);
      renderer.domElement.__cleanupResize = () => window.removeEventListener('resize', onResize);

      const animate = () => {
        if (rendererRef.current !== renderer) return;
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();
    }

    // clear previous geometry
    const old = scene.getObjectByName('planGroup');
    if (old) {
      scene.remove(old);
      old.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.(); });
    }

    const group = buildPlanGroup(plan, spec);
    group.name = 'planGroup';
    scene.add(group);

    // fit camera
    const box = new THREE.Box3().setFromObject(group);
    const size = box.getSize(new THREE.Vector3()).length() || 1;
    const center = box.getCenter(new THREE.Vector3());
    controls.target.copy(center);
    const camera = renderer.domElement.__camera;
    camera.position.copy(center).add(new THREE.Vector3(size * 0.5, size * 0.55, size * 0.5));
    camera.near = size / 500;
    camera.far = size * 20;
    camera.updateProjectionMatrix();
    controls.update();
  }, [plan, spec]);

  // unmount cleanup
  useEffect(() => () => {
    rendererRef.current?.domElement.__cleanupResize?.();
    rendererRef.current?.dispose();
    rendererRef.current = null;
    sceneRef.current = null;
    controlsRef.current = null;
  }, []);

  const stats = plan?.stats;
  const upm = plan?.unitsPerMeter;
  const metersLen = plan?.unitsHint === 'px'
    ? (stats ? stats.wallLength / spec.pxPerMeter : 0)
    : stats?.wallLength;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="relative w-[92vw] h-[86vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 3D canvas */}
        <div className="flex-1 relative bg-slate-900">
          <div ref={containerRef} className="absolute inset-0" />
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 space-y-2">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm">{loadStage}</p>
            </div>
          )}
          {!loading && error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="max-w-md p-4 bg-white/95 rounded-xl text-sm text-red-600 shadow">{error}</div>
            </div>
          )}
          {!loading && !error && plan && !plan.walls.length && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="max-w-md p-4 bg-white/95 rounded-xl text-sm text-amber-700 shadow">
                File loaded but no walls were detected — check the layer naming or try a cleaner plan.
              </div>
            </div>
          )}
        </div>

        {/* Spec panel */}
        <div className="w-72 border-l border-slate-200 bg-white flex flex-col">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800 truncate max-w-[160px]">{fileName}</p>
              <p className="text-[11px] text-gray-400">Floor plan → 3D</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* auto-extracted stats */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2 flex items-center gap-1">
                <Ruler className="w-3 h-3" /> Extracted
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 rounded-lg p-2"><p className="text-slate-400">Walls</p><p className="font-semibold text-slate-700">{stats?.wallCount ?? '—'}</p></div>
                <div className="bg-slate-50 rounded-lg p-2"><p className="text-slate-400">Wall length</p><p className="font-semibold text-slate-700">{metersLen != null ? `${fmt(metersLen)} m` : '—'}</p></div>
                <div className="bg-slate-50 rounded-lg p-2"><p className="text-slate-400">Openings</p><p className="font-semibold text-slate-700">{stats?.openingCount ?? '—'}</p></div>
                <div className="bg-slate-50 rounded-lg p-2"><p className="text-slate-400">Furniture</p><p className="font-semibold text-slate-700">{stats?.furnitureCount ?? '—'}</p></div>
              </div>
              {upm && <p className="text-[10px] text-slate-400 mt-1">Drawing units ≈ {upm >= 500 ? 'mm' : `${upm}/m`} detected</p>}
            </div>

            {/* user-entered spec */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Specification</p>
              <div className="space-y-2.5">
                {SPEC_FIELDS.map((f) => (
                  <label key={f.key} className="block">
                    <span className="text-[11px] text-slate-500">{f.label}</span>
                    <input
                      type="number"
                      step={f.step}
                      min={f.min}
                      max={f.max}
                      value={spec[f.key]}
                      onChange={(e) => setSpec((s) => ({ ...s, [f.key]: parseFloat(e.target.value) || s[f.key] }))}
                      className="mt-0.5 w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </label>
                ))}
                {plan?.unitsHint === 'px' && (
                  <label className="block">
                    <span className="text-[11px] text-slate-500">Image scale — pixels per meter</span>
                    <input
                      type="number" step="5" min="5" max="2000" value={spec.pxPerMeter}
                      onChange={(e) => setSpec((s) => ({ ...s, pxPerMeter: parseFloat(e.target.value) || s.pxPerMeter }))}
                      className="mt-0.5 w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-[10px] text-slate-400">Calibrate: plan width ÷ real building width</span>
                  </label>
                )}
              </div>
            </div>

            {plan?.unitsHint === 'px' && (
              <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-100 rounded-lg p-2">
                Raster extraction detects axis-aligned walls only — openings and furniture aren't detected from images. For full detail, upload the DWG/DXF source.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
