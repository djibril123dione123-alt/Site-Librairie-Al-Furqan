'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Loader2, RotateCcw, Wand2, ZoomIn, ZoomOut } from 'lucide-react';
import { AdminModal } from './admin-modal';
import { BookStage } from '../books/book-stage';
import {
  canvasToWebpBlob,
  clampRect,
  detectContentBounds,
  drawCropToCanvas,
  drawPreviewCanvas,
  type CropData,
  type CropRect,
} from '@/lib/admin/crop-math';
import { directUploadToStorage } from '@/lib/admin/direct-upload';
import type { Product } from '@/lib/types/ui';

const VIEWPORT_SIZE = 380;
const HANDLE_HIT = 18;

type Handle = 'move' | 'nw' | 'ne' | 'sw' | 'se' | null;

export interface CropApplyResult {
  storagePath: string;
  originalStoragePath: string;
  cropData: CropData;
  publicUrl: string;
}

function buildPreviewProduct(overrides: Partial<Product>): Product {
  return {
    id: 'preview',
    slug: 'preview',
    title: overrides.title || 'Aperçu',
    author: overrides.author || '',
    publisher: '',
    category: '',
    themes: [],
    language: 'Français',
    price: 0,
    availability: 'Disponible',
    aliases: [],
    description: '',
    color: overrides.color || 'navy',
    ink: overrides.ink || '#f7e6c4',
    coverUrl: overrides.coverUrl,
  };
}

export function CoverCropModal({
  open,
  onClose,
  productId,
  imageId,
  originalUrl,
  existingCropData,
  productTitle,
  productAuthor,
  color,
  ink,
  onApplied,
  onReset,
}: {
  open: boolean;
  onClose: () => void;
  productId: string;
  imageId: string;
  /** Always the untouched original's public URL — never a prior derivative. */
  originalUrl: string;
  existingCropData?: CropData | null;
  productTitle?: string;
  productAuthor?: string;
  color?: string;
  ink?: string;
  onApplied: (result: CropApplyResult) => void;
  onReset: (result: { storagePath: string; originalStoragePath: string; publicUrl: string }) => void;
}) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [rect, setRect] = useState<CropRect | null>(null);
  const [zoom, setZoom] = useState(1);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState('');
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const localPreviewUrlRef = useRef<string | null>(null);
  const previewRafRef = useRef<number | null>(null);
  const dragRef = useRef<{ handle: Handle; startX: number; startY: number; startRect: CropRect } | null>(null);

  function revokeLocalPreview() {
    if (localPreviewUrlRef.current) {
      URL.revokeObjectURL(localPreviewUrlRef.current);
      localPreviewUrlRef.current = null;
    }
  }

  // Fresh state every time the modal opens for a (possibly different) image.
  useEffect(() => {
    if (!open) return;
    setImgLoaded(false);
    setImgError(false);
    setRect(null);
    setZoom(1);
    setError('');
    revokeLocalPreview();
    setLocalPreviewUrl(null);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
      if (existingCropData && existingCropData.sourceWidth === img.naturalWidth && existingCropData.sourceHeight === img.naturalHeight) {
        setRect(clampRect(existingCropData, img.naturalWidth, img.naturalHeight));
      } else {
        setRect({ x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight });
      }
      imgRef.current = img;
      setImgLoaded(true);
    };
    img.onerror = () => setImgError(true);
    img.src = originalUrl;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, originalUrl]);

  // Regenerate the "Aperçu boutique" thumbnail from whatever the rectangle
  // currently is — before Apply, before any server round-trip — so the
  // operator judges the actual unsaved crop, not a stale post-save image
  // (Phase L.1 §8/§9). One rAF-coalesced redraw per change (drag fires
  // many rect updates per second; this still only draws once per frame),
  // at thumbnail resolution so it stays cheap regardless of source size.
  useEffect(() => {
    if (!imgLoaded || !rect || !imgRef.current) return;
    const image = imgRef.current;
    const currentRect = rect;
    if (previewRafRef.current) cancelAnimationFrame(previewRafRef.current);
    previewRafRef.current = requestAnimationFrame(() => {
      previewRafRef.current = null;
      try {
        const canvas = drawPreviewCanvas(image, currentRect);
        canvas.toBlob((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          revokeLocalPreview();
          localPreviewUrlRef.current = url;
          setLocalPreviewUrl(url);
        }, 'image/png');
      } catch {
        // Tainted canvas (cross-origin without proper CORS headers) — the
        // stage falls back to its placeholder rather than a broken image;
        // Apply still works via the server-side crop, only this live
        // preview is unavailable.
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rect, imgLoaded]);

  // Revoke whatever's left when the component actually unmounts.
  useEffect(() => {
    return () => {
      if (previewRafRef.current) cancelAnimationFrame(previewRafRef.current);
      revokeLocalPreview();
    };
  }, []);

  const displayScale = useMemo(() => {
    if (!naturalSize.width) return 1;
    const base = Math.min(VIEWPORT_SIZE / naturalSize.width, VIEWPORT_SIZE / naturalSize.height, 1);
    return base * zoom;
  }, [naturalSize, zoom]);

  const contentWidth = naturalSize.width * displayScale;
  const contentHeight = naturalSize.height * displayScale;

  function toDisplay(r: CropRect) {
    return {
      left: r.x * displayScale,
      top: r.y * displayScale,
      width: r.width * displayScale,
      height: r.height * displayScale,
    };
  }

  function handlePointerDown(handle: Handle, e: React.PointerEvent) {
    if (!rect) return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = { handle, startX: e.clientX, startY: e.clientY, startRect: rect };
  }

  function handlePointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag || !rect) return;
    const dx = (e.clientX - drag.startX) / displayScale;
    const dy = (e.clientY - drag.startY) / displayScale;
    let next: CropRect = { ...drag.startRect };

    if (drag.handle === 'move') {
      next.x = drag.startRect.x + dx;
      next.y = drag.startRect.y + dy;
    } else if (drag.handle === 'se') {
      next.width = drag.startRect.width + dx;
      next.height = drag.startRect.height + dy;
    } else if (drag.handle === 'nw') {
      next.x = drag.startRect.x + dx;
      next.y = drag.startRect.y + dy;
      next.width = drag.startRect.width - dx;
      next.height = drag.startRect.height - dy;
    } else if (drag.handle === 'ne') {
      next.y = drag.startRect.y + dy;
      next.width = drag.startRect.width + dx;
      next.height = drag.startRect.height - dy;
    } else if (drag.handle === 'sw') {
      next.x = drag.startRect.x + dx;
      next.width = drag.startRect.width - dx;
      next.height = drag.startRect.height + dy;
    }

    setRect(clampRect(next, naturalSize.width, naturalSize.height));
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  function nudge(dx: number, dy: number, resize: boolean) {
    if (!rect) return;
    const next = resize
      ? { ...rect, width: rect.width + dx, height: rect.height + dy }
      : { ...rect, x: rect.x + dx, y: rect.y + dy };
    setRect(clampRect(next, naturalSize.width, naturalSize.height));
  }

  function handleReset() {
    if (!naturalSize.width) return;
    setRect({ x: 0, y: 0, width: naturalSize.width, height: naturalSize.height });
    setZoom(1);
  }

  function handleDetectMargins() {
    if (!imgRef.current) return;
    setDetecting(true);
    setError('');
    try {
      const proposal = detectContentBounds(imgRef.current);
      if (proposal) {
        setRect(clampRect(proposal, naturalSize.width, naturalSize.height));
      } else {
        setError("Aucune marge évidente détectée — ajustez manuellement si besoin.");
      }
    } catch {
      setError('Détection indisponible pour cette image — ajustez manuellement.');
    } finally {
      setDetecting(false);
    }
  }

  async function handleApply() {
    if (!rect || !imgRef.current || saving) return;
    setSaving(true);
    setError('');
    try {
      const canvas = drawCropToCanvas(imgRef.current, rect);
      const blob = await canvasToWebpBlob(canvas);
      const cropData: CropData = { ...rect, sourceWidth: naturalSize.width, sourceHeight: naturalSize.height };

      // The derivative goes straight to Storage — a real high-resolution
      // crop can exceed a Vercel Function's request body limit, so this
      // route now only ever receives the small JSON "commit" below
      // (Phase L.1 §11/§14).
      const { path: uploadedPath } = await directUploadToStorage(blob, {
        productId,
        contentType: 'image/webp',
        suffix: 'crop',
      });

      const res = await fetch(`/api/admin/products/${productId}/images/${imageId}/crop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storagePath: uploadedPath, cropData }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur lors de l\'enregistrement du recadrage.');
        return;
      }
      onApplied({
        storagePath: data.storagePath,
        originalStoragePath: data.originalStoragePath,
        cropData: data.cropData,
        publicUrl: data.publicUrl,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau lors de l\'enregistrement du recadrage — le recadrage n\'a pas été sauvegardé.');
    } finally {
      setSaving(false);
    }
  }

  async function handleResetToOriginal() {
    if (resetting) return;
    setResetting(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/products/${productId}/images/${imageId}/crop/reset`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur lors de la réinitialisation.');
        return;
      }
      onReset({ storagePath: data.storagePath, originalStoragePath: data.originalStoragePath, publicUrl: data.publicUrl });
      onClose();
    } catch {
      setError('Erreur réseau lors de la réinitialisation.');
    } finally {
      setResetting(false);
    }
  }

  const busy = saving || resetting;
  const displayRect = rect ? toDisplay(rect) : null;
  const previewProduct = useMemo(
    () => buildPreviewProduct({ title: productTitle, author: productAuthor, color, ink, coverUrl: localPreviewUrl || undefined }),
    [productTitle, productAuthor, color, ink, localPreviewUrl]
  );

  return (
    <AdminModal open={open} onClose={onClose} title="Ajuster la couverture" maxWidth={880}>
      <div className="cover-crop-layout">
        <div className="cover-crop-stage-col">
          {imgError && (
            <div className="admin-alert admin-alert-error">Impossible de charger l&apos;image originale.</div>
          )}
          {!imgError && (
            <div
              className="cover-crop-viewport"
              style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE }}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              {imgLoaded && (
                <div className="cover-crop-scroll">
                  <div className="cover-crop-content" style={{ width: contentWidth, height: contentHeight }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={originalUrl} alt="" className="cover-crop-image" draggable={false} />
                    {displayRect && (
                      <div
                        className="cover-crop-rect"
                        style={{ left: displayRect.left, top: displayRect.top, width: displayRect.width, height: displayRect.height }}
                        onPointerDown={(e) => handlePointerDown('move', e)}
                        role="slider"
                        tabIndex={0}
                        aria-label="Zone de recadrage"
                        aria-valuenow={Math.round(rect!.width)}
                        onKeyDown={(e) => {
                          const step = e.shiftKey ? 10 : 2;
                          if (e.key === 'ArrowLeft') nudge(-step, 0, false);
                          else if (e.key === 'ArrowRight') nudge(step, 0, false);
                          else if (e.key === 'ArrowUp') nudge(0, -step, false);
                          else if (e.key === 'ArrowDown') nudge(0, step, false);
                          else return;
                          e.preventDefault();
                        }}
                      >
                        {(['nw', 'ne', 'sw', 'se'] as const).map((corner) => (
                          <span
                            key={corner}
                            className={`cover-crop-handle cover-crop-handle-${corner}`}
                            onPointerDown={(e) => handlePointerDown(corner, e)}
                            style={{ touchAction: 'none' }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {!imgLoaded && !imgError && (
                <div className="cover-crop-loading"><Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /></div>
              )}
            </div>
          )}

          <div className="cover-crop-controls">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setZoom((z) => Math.max(1, z - 0.25))} aria-label="Zoom arrière" disabled={!imgLoaded}>
              <ZoomOut size={14} />
            </button>
            <input
              type="range"
              min={1}
              max={4}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              aria-label="Zoom"
              disabled={!imgLoaded}
              style={{ flex: 1 }}
            />
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setZoom((z) => Math.min(4, z + 0.25))} aria-label="Zoom avant" disabled={!imgLoaded}>
              <ZoomIn size={14} />
            </button>
          </div>

          <div className="cover-crop-actions-row">
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleDetectMargins} disabled={!imgLoaded || busy || detecting}>
              <Wand2 size={13} />
              <span>{detecting ? 'Analyse…' : 'Détecter les marges'}</span>
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleReset} disabled={!imgLoaded || busy}>
              <RotateCcw size={13} />
              <span>Réinitialiser la sélection</span>
            </button>
          </div>

          {error && <p className="delivery-error-text" role="alert" style={{ marginTop: 8 }}>{error}</p>}
        </div>

        <div className="cover-crop-preview-col">
          <span className="form-label">Aperçu boutique</span>
          <div className="cover-crop-preview-stage">
            <BookStage product={previewProduct} />
          </div>
          <p className="field-hint">
            Ce recadrage ne modifie jamais le fichier original — vous pourrez toujours revenir en arrière ou ajuster à nouveau.
          </p>
        </div>
      </div>

      <div className="cover-crop-modal-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="text-link" onClick={handleResetToOriginal} disabled={busy}>
          {resetting ? 'Réinitialisation…' : "Revenir à l'image d'origine"}
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={busy}>
            Annuler
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleApply} disabled={!imgLoaded || busy}>
            {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
            <span>{saving ? 'Enregistrement…' : 'Appliquer'}</span>
          </button>
        </div>
      </div>
    </AdminModal>
  );
}
