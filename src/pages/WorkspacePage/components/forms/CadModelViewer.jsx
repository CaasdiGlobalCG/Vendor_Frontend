import React, { useEffect, useRef, useState } from 'react';
import { X, Loader2, Rotate3d } from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import DxfParser from 'dxf-parser';

// occt-import-js is loaded lazily (only for .step/.iges) — it pulls a ~10MB
// OpenCascade WASM module, so it must not be a static import in the bundle.
const MESH_MATERIAL = new THREE.MeshStandardMaterial({
  color: 0x818cf8,
  metalness: 0.15,
  roughness: 0.55
});
const LINE_MATERIAL = new THREE.LineBasicMaterial({ color: 0x93c5fd });

const buildOcctObject = (result) => {
  const group = new THREE.Group();
  (result?.meshes || []).forEach((mesh) => {
    const geometry = new THREE.BufferGeometry();
    const pos = mesh?.attributes?.position?.array;
    const idx = mesh?.index?.array;
    const nrm = mesh?.attributes?.normal?.array;
    if (!pos || !pos.length) return;
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    if (nrm && nrm.length) {
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    } else {
      geometry.computeVertexNormals();
    }
    if (idx && idx.length) geometry.setIndex(idx);
    const color = mesh?.color;
    const material = color
      ? new THREE.MeshStandardMaterial({
          color: new THREE.Color(color[0], color[1], color[2]),
          metalness: 0.15,
          roughness: 0.55
        })
      : MESH_MATERIAL;
    group.add(new THREE.Mesh(geometry, material));
  });
  return group.children.length ? group : null;
};

const loadStepIges = async (buffer, ext) => {
  const [{ default: occtimportjs }, wasmUrlModule] = await Promise.all([
    import('occt-import-js'),
    import('occt-import-js/dist/occt-import-js.wasm?url')
  ]);
  const occt = await occtimportjs({
    locateFile: (file) => (file.endsWith('.wasm') ? wasmUrlModule.default : file)
  });
  const data = new Uint8Array(buffer);
  const result = ext === 'igs' || ext === 'iges'
    ? occt.ReadIgesFile(data, null)
    : occt.ReadStepFile(data, null);
  if (!result?.success) throw new Error('Could not parse the model — file may be corrupted or unsupported');
  return buildOcctObject(result);
};

const SAMPLE_ARC_SEGMENTS = 48;

// Convert dxf-parser entities into flat position buffers:
// lines -> LineSegments, faces -> Mesh. depth controls INSERT expansion.
const collectDxfGeometry = (entities, blocks, depth = 0) => {
  const lines = [];
  const tris = [];

  const pushLine = (a, b) => lines.push(a.x, a.y, a.z || 0, b.x, b.y, b.z || 0);
  const pushTriangle = (a, b, c) => tris.push(a.x, a.y, a.z || 0, b.x, b.y, b.z || 0, c.x, c.y, c.z || 0);
  const polyline = (pts, closed) => {
    for (let i = 0; i < pts.length - 1; i++) pushLine(pts[i], pts[i + 1]);
    if (closed && pts.length > 2) pushLine(pts[pts.length - 1], pts[0]);
  };
  const arcPoints = (cx, cy, cz, r, startDeg, endDeg) => {
    const s = THREE.MathUtils.degToRad(startDeg);
    let e = THREE.MathUtils.degToRad(endDeg);
    if (e <= s) e += Math.PI * 2;
    return Array.from({ length: SAMPLE_ARC_SEGMENTS + 1 }, (_, i) => {
      const t = s + (e - s) * (i / SAMPLE_ARC_SEGMENTS);
      return { x: cx + r * Math.cos(t), y: cy + r * Math.sin(t), z: cz };
    });
  };

  (entities || []).forEach((entity) => {
    switch (entity.type) {
      case 'LINE':
        pushLine(entity.vertices[0], entity.vertices[1]);
        break;
      case 'LWPOLYLINE':
      case 'POLYLINE':
        polyline(entity.vertices || [], entity.closed || entity.shape);
        break;
      case 'CIRCLE':
        polyline(arcPoints(entity.center.x, entity.center.y, entity.center.z || 0, entity.radius, 0, 360), false);
        break;
      case 'ARC':
        polyline(arcPoints(entity.center.x, entity.center.y, entity.center.z || 0, entity.radius, entity.startAngle, entity.endAngle), false);
        break;
      case 'ELLIPSE': {
        const mx = entity.majorAxisEndPoint.x, my = entity.majorAxisEndPoint.y;
        const major = Math.hypot(mx, my);
        const minor = major * entity.axisRatio;
        const rot = Math.atan2(my, mx);
        const s = entity.startAngle ?? 0, e = entity.endAngle ?? Math.PI * 2;
        const pts = Array.from({ length: SAMPLE_ARC_SEGMENTS + 1 }, (_, i) => {
          const t = s + (e - s) * (i / SAMPLE_ARC_SEGMENTS);
          const px = major * Math.cos(t), py = minor * Math.sin(t);
          return {
            x: entity.center.x + px * Math.cos(rot) - py * Math.sin(rot),
            y: entity.center.y + px * Math.sin(rot) + py * Math.cos(rot),
            z: entity.center.z || 0
          };
        });
        polyline(pts, false);
        break;
      }
      case 'SPLINE': {
        const pts = entity.controlPoints || [];
        if (pts.length > 1) polyline(pts, false);
        break;
      }
      case 'SOLID':
      case '3DFACE': {
        const v = entity.vertices || [];
        if (v.length >= 3) {
          pushTriangle(v[0], v[1], v[2]);
          if (v.length >= 4 && (v[2].x !== v[3].x || v[2].y !== v[3].y || v[2].z !== v[3].z)) {
            pushTriangle(v[0], v[2], v[3]);
          }
        }
        break;
      }
      case 'INSERT': {
        const block = depth === 0 && blocks?.[entity.name];
        if (!block) break;
        const inner = collectDxfGeometry(block.entities, blocks, depth + 1);
        const rot = THREE.MathUtils.degToRad(entity.rotation || 0);
        const cos = Math.cos(rot), sin = Math.sin(rot);
        const sx = entity.xScale ?? 1, sy = entity.yScale ?? 1, sz = entity.zScale ?? 1;
        const bx = entity.position?.x || 0, by = entity.position?.y || 0, bz = entity.position?.z || 0;
        const transform = (x, y, z) => {
          const tx = x * sx, ty = y * sy;
          return [bx + tx * cos - ty * sin, by + tx * sin + ty * cos, bz + z * sz];
        };
        for (let i = 0; i < inner.lines.length; i += 3) lines.push(...transform(inner.lines[i], inner.lines[i + 1], inner.lines[i + 2]));
        for (let i = 0; i < inner.tris.length; i += 3) tris.push(...transform(inner.tris[i], inner.tris[i + 1], inner.tris[i + 2]));
        break;
      }
      default:
        break; // TEXT, MTEXT, DIMENSION, POINT, etc. — skipped for preview
    }
  });

  return { lines, tris };
};

const loadDxf = (buffer) => {
  const text = new TextDecoder().decode(buffer);
  const parser = new DxfParser();
  const dxf = parser.parseSync(text);
  if (!dxf || !dxf.entities) throw new Error('Could not parse DXF — file may be binary DXF or corrupted');

  const { lines, tris } = collectDxfGeometry(dxf.entities, dxf.blocks);
  const object3d = new THREE.Group();

  if (lines.length) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
    object3d.add(new THREE.LineSegments(geometry, LINE_MATERIAL.clone()));
  }
  if (tris.length) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(tris, 3));
    geometry.computeVertexNormals();
    object3d.add(new THREE.Mesh(geometry, MESH_MATERIAL.clone()));
  }
  if (!object3d.children.length) return null;

  // DXF is Z-up; three.js is Y-up — rotate so the drawing lies naturally
  object3d.rotation.x = -Math.PI / 2;
  return object3d;
};

const loadModelObject = async (buffer, ext) => {
  if (ext === 'stl') {
    const geometry = new STLLoader().parse(buffer);
    geometry.computeVertexNormals();
    return new THREE.Mesh(geometry, MESH_MATERIAL.clone());
  }
  if (ext === 'obj') {
    const object3d = new OBJLoader().parse(new TextDecoder().decode(buffer));
    object3d.traverse((child) => {
      if (child.isMesh) child.material = MESH_MATERIAL.clone();
    });
    return object3d;
  }
  if (ext === 'dxf') {
    return loadDxf(buffer);
  }
  if (['step', 'stp', 'iges', 'igs'].includes(ext)) {
    return loadStepIges(buffer, ext);
  }
  throw new Error(
    ext === 'dwg'
      ? '.dwg is a proprietary format and cannot be previewed in the browser — convert it to .dxf or .step to preview here'
      : `No preview available for .${ext} files`
  );
};

/**
 * CadModelViewer — in-browser preview for CAD files.
 * Renders .stl/.obj meshes and .step/.iges/.dxf models via three.js, and
 * converted previews (dwg->dxf, cdr->svg) produced by the backend.
 * Fetches file bytes through the same-origin /api/workspace-files/stream
 * and /preview proxies to avoid S3 CORS issues.
 */
const CadModelViewer = ({ fileName, fileUrl, streamUrl, previewExt, onClose }) => {
  const mountRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [svgUrl, setSvgUrl] = useState(null);
  const [svgScale, setSvgScale] = useState(1);

  const ext = previewExt || (fileName || '').split('.').pop()?.toLowerCase();
  // svg = server-converted .cdr; dwg = client-side libredwg wasm -> svg string
  const isSvgPreview = ext === 'svg' || ext === 'dwg';

  // 2D preview path (.svg output or .dwg -> svg via WASM): plain <img>, no WebGL needed
  useEffect(() => {
    if (!isSvgPreview) return undefined;
    let objectUrl = null;
    const load = async () => {
      const sourceUrl = streamUrl || fileUrl;
      if (!sourceUrl) {
        setError('File is not uploaded to storage yet.');
        setLoading(false);
        return;
      }
      const response = await fetch(sourceUrl);
      if (!response.ok) throw new Error(`Failed to load preview (HTTP ${response.status})`);

      if (ext === 'dwg') {
        // Parse DWG in-browser via LibreDWG WASM and render to SVG
        const buffer = await response.arrayBuffer();
        const { LibreDwg, Dwg_File_Type } = await import('@mlightcad/libredwg-web');
        const libredwg = await LibreDwg.create('/wasm');
        const dwg = libredwg.dwg_read_data(buffer, Dwg_File_Type.DWG);
        if (!dwg) throw new Error('Could not parse the DWG file — it may be an unsupported version or corrupted');
        const db = libredwg.convert(dwg);
        libredwg.dwg_free(dwg);
        const svg = libredwg.dwg_to_svg(db);
        if (!svg) throw new Error('DWG parsed but produced no renderable geometry');
        objectUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      } else {
        objectUrl = URL.createObjectURL(await response.blob());
      }
      setSvgUrl(objectUrl);
      setLoading(false);
    };
    load().catch((err) => {
      console.error('❌ CAD svg preview error:', err);
      setError(err.message || 'Failed to load preview');
      setLoading(false);
    });
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [isSvgPreview, fileUrl, streamUrl]);

  // 3D preview path
  useEffect(() => {
    if (isSvgPreview) return undefined;
    const mount = mountRef.current;
    if (!mount) return undefined;

    let disposed = false;
    let renderer;
    let frameId;

    const init = async () => {
      const sourceUrl = streamUrl || fileUrl;
      if (!sourceUrl) {
        setError('File is not uploaded to storage yet.');
        setLoading(false);
        return;
      }

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0f172a);

      const width = mount.clientWidth || 640;
      const height = mount.clientHeight || 480;
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 1e6);

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      mount.appendChild(renderer.domElement);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;

      scene.add(new THREE.AmbientLight(0xffffff, 0.6));
      const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
      keyLight.position.set(5, 10, 7);
      scene.add(keyLight);
      const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
      fillLight.position.set(-6, -4, -6);
      scene.add(fillLight);

      const response = await fetch(sourceUrl);
      if (!response.ok) throw new Error(`Failed to load model (HTTP ${response.status})`);
      const buffer = await response.arrayBuffer();

      const object3d = await loadModelObject(buffer, ext);
      if (!object3d) throw new Error('The file parsed but contains no geometry to display');
      if (disposed) return;

      // Center model on origin and auto-fit the camera to its bounding box
      const bbox = new THREE.Box3().setFromObject(object3d);
      const center = bbox.getCenter(new THREE.Vector3());
      const size = bbox.getSize(new THREE.Vector3());
      const radius = Math.max(size.x, size.y, size.z, 0.001);

      object3d.position.sub(center);
      scene.add(object3d);

      // Grid scaled to model size
      const grid = new THREE.GridHelper(radius * 4, 20, 0x334155, 0x1e293b);
      grid.position.y = -radius / 2;
      scene.add(grid);

      const distance = radius * 1.9;
      camera.position.set(distance, distance * 0.7, distance);
      camera.near = Math.max(distance / 1000, 0.001);
      camera.far = distance * 1000;
      camera.updateProjectionMatrix();
      controls.target.set(0, 0, 0);
      controls.update();

      setLoading(false);

      const animate = () => {
        if (disposed) return;
        frameId = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      const handleResize = () => {
        if (!mount || !renderer) return;
        const w = mount.clientWidth;
        const h = mount.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener('resize', handleResize);
      mount._cleanupResize = () => window.removeEventListener('resize', handleResize);
    };

    init().catch((err) => {
      console.error('❌ CAD viewer error:', err);
      if (!disposed) {
        setError(err.message || 'Failed to render model');
        setLoading(false);
      }
    });

    return () => {
      disposed = true;
      if (frameId) cancelAnimationFrame(frameId);
      mount._cleanupResize?.();
      if (renderer) {
        renderer.dispose();
        renderer.domElement?.remove();
      }
    };
  }, [fileName, fileUrl, streamUrl, ext, isSvgPreview]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-[80vw] max-w-4xl h-[75vh] bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-slate-900/80 border-b border-slate-700">
          <div className="flex items-center gap-2 min-w-0">
            <Rotate3d className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <span className="text-sm font-semibold text-slate-100 truncate">{fileName}</span>
            <span className="text-[10px] text-slate-400">
              {isSvgPreview ? 'scroll to zoom' : 'drag to rotate · scroll to zoom'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewport */}
        {isSvgPreview ? (
          <div
            className="w-full h-full flex items-center justify-center overflow-hidden bg-slate-950"
            onWheel={(e) => setSvgScale((s) => Math.min(8, Math.max(0.2, s * (e.deltaY < 0 ? 1.1 : 0.9))))}
          >
            {svgUrl && (
              <img
                src={svgUrl}
                alt={fileName}
                draggable={false}
                style={{ transform: `scale(${svgScale})`, transition: 'transform 0.1s ease-out' }}
                className="max-w-full max-h-full object-contain select-none"
              />
            )}
          </div>
        ) : (
          <div ref={mountRef} className="w-full h-full" />
        )}

        {loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60">
            <div className="flex items-center gap-2 text-slate-200 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading 3D model…</span>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
            <div className="max-w-sm text-center space-y-2 px-6">
              <p className="text-sm font-medium text-rose-300">{error}</p>
              <p className="text-xs text-slate-400">Download the file to view it in a desktop CAD viewer.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CadModelViewer;
