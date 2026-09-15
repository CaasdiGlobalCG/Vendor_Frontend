import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

// Elements that should not appear in exported images
const EXCLUDE_FILTER = (node) => {
  const className = typeof node?.className === 'string' ? node.className : '';
  if (!className) return true;
  const skip = [
    'react-flow__minimap',
    'react-flow__controls',
    'react-flow__panel',
    'react-flow__attribution',
    'react-flow__selection',
    'react-flow__nodesselection-rect',
    'react-flow__edge-interaction',
    'remote-cursor'
  ];
  return !skip.some(cls => className.includes(cls));
};

const CAPTURE_OPTIONS = {
  pixelRatio: 2,
  backgroundColor: '#f8fafc',
  cacheBust: true,
  filter: EXCLUDE_FILTER
};

const downloadDataUrl = (dataUrl, filename) => {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
};

const timestamp = () => new Date().toISOString().slice(0, 10);

/** Export the canvas viewport element as a PNG download. */
export const exportCanvasAsPng = async (targetEl, filename = `workspace-canvas-${timestamp()}.png`) => {
  const dataUrl = await toPng(targetEl, CAPTURE_OPTIONS);
  downloadDataUrl(dataUrl, filename);
};

/** Export the canvas viewport element as a PDF download (image fitted to page). */
export const exportCanvasAsPdf = async (targetEl, filename = `workspace-canvas-${timestamp()}.pdf`) => {
  const dataUrl = await toPng(targetEl, CAPTURE_OPTIONS);
  const img = await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });

  const pdf = new jsPDF({
    orientation: img.width >= img.height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [img.width, img.height]
  });
  pdf.addImage(dataUrl, 'PNG', 0, 0, img.width, img.height);
  pdf.save(filename);
};
