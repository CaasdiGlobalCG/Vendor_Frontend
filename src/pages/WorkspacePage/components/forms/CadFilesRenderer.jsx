import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  UploadCloud,
  Download,
  Trash2,
  Clock,
  Loader2,
  ScanLine,
  Rotate3d
} from 'lucide-react';
import { createPortal } from 'react-dom';
import CadModelViewer from './CadModelViewer';
import { persistNodeDataPatch } from '../../utils/nodePersistence';

const CAD_EXTENSIONS = ['dwg', 'dxf', 'step', 'stp', 'iges', 'igs', 'stl', 'obj', 'cdr'];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // CAD files are large — 100MB cap

// Variant config — 'cad' = full CAD card, 'cdr' = CorelDRAW-only variant
const VARIANTS = {
  cad: {
    extensions: CAD_EXTENSIONS,
    dataKey: 'cadFilesData',
    title: 'CAD Files',
    headerClass: 'from-slate-50 to-indigo-50',
    iconClass: 'text-indigo-500',
    countClass: 'bg-indigo-100 text-indigo-700',
    buttonIdle: 'bg-indigo-600 cursor-pointer hover:bg-indigo-700',
    buttonBusy: 'bg-indigo-400 cursor-not-allowed',
    dropHint: 'Drop CAD files here — the element scans each file and shows its format.'
  },
  cdr: {
    extensions: ['cdr'],
    dataKey: 'cdrFilesData',
    title: 'CDR Files',
    headerClass: 'from-orange-50 to-amber-50',
    iconClass: 'text-orange-500',
    countClass: 'bg-orange-100 text-orange-700',
    buttonIdle: 'bg-orange-600 cursor-pointer hover:bg-orange-700',
    buttonBusy: 'bg-orange-400 cursor-not-allowed',
    dropHint: 'Drop CorelDRAW (.cdr) files here — each file is shown as a card with an SVG preview.'
  }
};

const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const formatTimestamp = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// "Scan" a CAD file: detect the format from its extension and tag it so the
// card shows what kind of drawing it is (mesh vs drawing vs exchange format).
const scanCadFile = (name = '') => {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const kind =
    ['stl', 'obj'].includes(ext) ? 'Mesh model'
    : ['step', 'stp', 'iges', 'igs'].includes(ext) ? '3D exchange'
    : ['dwg', 'dxf'].includes(ext) ? '2D/3D drawing'
    : ext === 'cdr' ? 'CorelDRAW'
    : 'CAD file';
  const badgeClass =
    ['stl', 'obj'].includes(ext) ? 'bg-violet-100 text-violet-700 border-violet-200'
    : ['step', 'stp'].includes(ext) ? 'bg-blue-100 text-blue-700 border-blue-200'
    : ['iges', 'igs'].includes(ext) ? 'bg-cyan-100 text-cyan-700 border-cyan-200'
    : ['dwg', 'dxf'].includes(ext) ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : ext === 'cdr' ? 'bg-orange-100 text-orange-700 border-orange-200'
    : 'bg-slate-100 text-slate-600 border-slate-200';
  // In-browser preview: stl/obj/dxf via three.js loaders, step/iges via occt
  // wasm, dwg via libredwg wasm (dwg -> svg in-browser). .cdr is converted to
  // .svg on the backend (LibreOffice headless), then rendered in the same modal.
  const previewable = CAD_EXTENSIONS.includes(ext);
  const convertedPreview = ext === 'cdr';
  return { ext, kind, badgeClass, supported: CAD_EXTENSIONS.includes(ext), previewable, convertedPreview };
};

const CadFilesRenderer = ({ data, nodeId, workspaceId, taskId, subtaskId, setNodes, variant = 'cad' }) => {
  const cfg = VARIANTS[variant] || VARIANTS.cad;
  const ACCEPT = cfg.extensions.map((e) => `.${e}`).join(',');
  const initial = data?.[cfg.dataKey] ?? {};
  const [files, setFiles] = useState(initial.files ?? []);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [previewFile, setPreviewFile] = useState(null);
  const saveTimeoutRef = useRef(null);

  // Debounced auto-save of file data to the backend (same pattern as
  // DocumentBlockRenderer).
  useEffect(() => {
    if (!workspaceId || !nodeId) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const filesData = { files, lastModifiedAt: new Date().toISOString() };
        if (setNodes) {
          setNodes((nodes) =>
            nodes.map((node) =>
              node.id === nodeId
                ? { ...node, data: { ...node.data, [cfg.dataKey]: filesData, lastModifiedAt: filesData.lastModifiedAt } }
                : node
            )
          );
        }
        await persistNodeDataPatch(nodeId, { [cfg.dataKey]: filesData }, null, workspaceId);
      } catch (error) {
        console.error('❌ Error auto-saving CAD files:', error);
      }
    }, 1500);

    return () => clearTimeout(saveTimeoutRef.current);
  }, [files, workspaceId, nodeId, setNodes, cfg.dataKey]);

  const uploadOne = async (file) => {
    const scan = scanCadFile(file.name);
    if (!scan.supported || !cfg.extensions.includes(scan.ext)) {
      throw new Error(`${file.name}: not a supported format (accepts ${cfg.extensions.join(', ')})`);
    }
    if (!subtaskId) {
      // Workspace file uploads are scoped to subtasks on the backend
      throw new Error(`${file.name}: add this element inside a subtask to enable uploads`);
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`${file.name}: file exceeds the 100MB limit`);
    }

    const entry = {
      id: `cad-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: file.name,
      size: file.size,
      format: scan.ext,
      kind: scan.kind,
      uploadedAt: new Date().toISOString(),
      url: null,
      s3Key: null
    };

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('workspaceId', workspaceId);
      formData.append('nodeId', nodeId);
      formData.append('fileType', 'cad-file');
      // The upload endpoint requires subtaskId — files are scoped per subtask
      if (taskId) formData.append('taskId', taskId);
      if (subtaskId) formData.append('subtaskId', subtaskId);

      const response = await fetch('/api/workspace-files/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Upload failed');
      }

      const result = await response.json();
      entry.url = result.file?.s3Url || result.s3Url || result.url || null;
      entry.s3Key = result.file?.s3Key || result.s3Key || null;
      entry.fileId = result.file?.fileId || null;
    } catch (err) {
      // Keep the file visible locally even if S3 upload fails, so the user
      // can still see it was scanned in (marked as not synced).
      entry.localOnly = true;
      entry.uploadError = err.message;
      console.error('❌ CAD upload failed:', err);
    }

    return entry;
  };

  const handleFileUpload = async (event) => {
    const selected = Array.from(event.target.files || []);
    event.target.value = '';
    if (!selected.length) return;

    setUploading(true);
    setUploadError('');

    const uploaded = [];
    const failures = [];
    for (const file of selected) {
      try {
        uploaded.push(await uploadOne(file));
      } catch (err) {
        failures.push(err.message);
      }
    }

    if (uploaded.length) setFiles((prev) => [...prev, ...uploaded]);
    if (failures.length) setUploadError(failures.join(' · '));
    setUploading(false);
  };

  const handleDownload = (file) => {
    if (!file.url) return;
    const anchor = document.createElement('a');
    anchor.href = file.url;
    anchor.download = file.name;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  const handleRemove = (fileId) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  return (
    <div
      className="w-[420px] bg-white border-2 border-slate-200 rounded-2xl shadow-lg overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className={`px-4 py-3 bg-gradient-to-r ${cfg.headerClass} border-b border-slate-200 flex items-center justify-between`}>
        <div className="flex items-center space-x-2">
          <Box className={`w-5 h-5 ${cfg.iconClass}`} />
          <span className="text-sm font-semibold text-gray-800">{cfg.title}</span>
          {files.length > 0 && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.countClass}`}>
              {files.length}
            </span>
          )}
        </div>
        <label
          className={`inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-white rounded-lg ${
            uploading || !subtaskId ? cfg.buttonBusy : cfg.buttonIdle
          }`}
          title={!subtaskId ? `${cfg.title} uploads need a subtask canvas — add this element inside a task/subtask` : undefined}
        >
          {uploading ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <UploadCloud className="w-3 h-3" />
              <span>{variant === 'cdr' ? 'Add CDR' : 'Add CAD'}</span>
            </>
          )}
          <input
            type="file"
            accept={ACCEPT}
            multiple
            className="hidden"
            onChange={handleFileUpload}
            disabled={uploading || !subtaskId}
          />
        </label>
      </div>

      {uploadError && (
        <div className="mx-4 mt-3 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
          {uploadError}
        </div>
      )}

      <div className="p-4">
        {files.length === 0 ? (
          <div className="text-center space-y-2 py-6 text-gray-400">
            <ScanLine className="w-10 h-10 mx-auto" />
            <p className="text-sm">{cfg.dropHint}</p>
            {!subtaskId && (
              <p className="text-[11px] text-amber-600">Uploads are enabled when this element sits inside a task/subtask canvas.</p>
            )}
            <p className="text-[11px] uppercase tracking-wide">
              {cfg.extensions.join(' · ')}
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {files.map((file) => {
              const scan = scanCadFile(file.name);
              const canPreview3d = scan.previewable && (file.fileId || file.url);
              return (
                <div
                  key={file.id}
                  className="flex items-center gap-3 px-3 py-2.5 border border-slate-200 rounded-lg bg-white hover:border-indigo-200 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <Box className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-800 truncate" title={file.name}>
                        {file.name}
                      </p>
                      <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded border flex-shrink-0 ${scan.badgeClass}`}>
                        {scan.ext.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500">
                      <span>{scan.kind}</span>
                      {file.size ? <span>· {formatBytes(file.size)}</span> : null}
                      {file.uploadedAt && (
                        <span className="inline-flex items-center gap-1">
                          · <Clock className="w-3 h-3" /> {formatTimestamp(file.uploadedAt)}
                        </span>
                      )}
                      {file.localOnly && (
                        <span className="text-amber-600 font-medium">· not synced</span>
                      )}
                    </div>
                  </div>
                  {scan.previewable && (
                    <button
                      type="button"
                      onClick={() => canPreview3d && setPreviewFile(file)}
                      disabled={!canPreview3d}
                      className={`p-1.5 rounded-lg ${
                        canPreview3d ? 'text-violet-600 hover:bg-violet-50' : 'text-gray-300 cursor-not-allowed'
                      }`}
                      title={canPreview3d ? '3D preview' : 'Upload the file first to enable 3D preview'}
                    >
                      <Rotate3d className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDownload(file)}
                    disabled={!file.url}
                    className={`p-1.5 rounded-lg ${
                      file.url ? 'text-indigo-600 hover:bg-indigo-50' : 'text-gray-300 cursor-not-allowed'
                    }`}
                    title={file.url ? 'Download' : 'File is not uploaded to storage'}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(file.id)}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"
                    title="Remove file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {previewFile && createPortal(
        (() => {
          const previewScan = scanCadFile(previewFile.name);
          const hasServerFile = previewFile.fileId && workspaceId && subtaskId;
          const streamUrl = hasServerFile
            ? `/api/workspace-files/stream/${previewFile.fileId}?workspaceId=${encodeURIComponent(workspaceId)}&subtaskId=${encodeURIComponent(subtaskId)}`
            : previewFile.url;
          // .cdr is converted server-side (cdr -> svg); .dwg is parsed
          // in-browser via libredwg wasm so it streams the raw file.
          const sourceUrl = previewScan.convertedPreview && hasServerFile
            ? `/api/workspace-files/preview/${previewFile.fileId}?workspaceId=${encodeURIComponent(workspaceId)}&subtaskId=${encodeURIComponent(subtaskId)}`
            : streamUrl;
          const previewExt = previewScan.convertedPreview ? 'svg' : previewScan.ext;
          return (
            <CadModelViewer
              fileName={previewFile.name}
              fileUrl={streamUrl}
              streamUrl={sourceUrl}
              previewExt={previewExt}
              onClose={() => setPreviewFile(null)}
            />
          );
        })(),
        document.body
      )}
    </div>
  );
};

export default CadFilesRenderer;
