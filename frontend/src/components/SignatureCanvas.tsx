import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './SignatureCanvas.module.css';

interface SignatureCanvasProps {
  width?: number;
  height?: number;
  onSignatureChange: (hasSignature: boolean) => void;
}

export interface SignatureCanvasHandle {
  getSignatureData: () => string | null;
}

interface Point {
  x: number;
  y: number;
}

export const SignatureCanvas = forwardRef<SignatureCanvasHandle, SignatureCanvasProps>(
  ({ width = 500, height = 150, onSignatureChange }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawingRef = useRef(false);
    const [hasDrawn, setHasDrawn] = useState(false);

    useImperativeHandle(
      ref,
      () => ({
        getSignatureData: () => {
          const canvas = canvasRef.current;
          if (!canvas || !hasDrawn) return null;
          return canvas.toDataURL('image/png');
        },
      }),
      [hasDrawn]
    );

    const getCanvasPoint = useCallback((event: MouseEvent | TouchEvent): Point | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      if ('touches' in event) {
        if (event.touches.length === 0) return null;
        return {
          x: (event.touches[0].clientX - rect.left) * scaleX,
          y: (event.touches[0].clientY - rect.top) * scaleY,
        };
      }
      return {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY,
      };
    }, []);

    const startDrawing = useCallback(
      (event: MouseEvent | TouchEvent) => {
        event.preventDefault();
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        const point = getCanvasPoint(event);
        if (!point) return;
        isDrawingRef.current = true;
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
      },
      [getCanvasPoint]
    );

    const draw = useCallback(
      (event: MouseEvent | TouchEvent) => {
        event.preventDefault();
        if (!isDrawingRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        const point = getCanvasPoint(event);
        if (!point) return;
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
        setHasDrawn((prev) => {
          if (!prev) {
            onSignatureChange(true);
            return true;
          }
          return prev;
        });
      },
      [getCanvasPoint, onSignatureChange]
    );

    const stopDrawing = useCallback(() => {
      isDrawingRef.current = false;
    }, []);

    const clearCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      setHasDrawn(false);
      onSignatureChange(false);
    }, [onSignatureChange]);

    useEffect(() => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      canvas.addEventListener('mousedown', startDrawing);
      canvas.addEventListener('mousemove', draw);
      canvas.addEventListener('mouseup', stopDrawing);
      canvas.addEventListener('mouseout', stopDrawing);
      canvas.addEventListener('touchstart', startDrawing, { passive: false });
      canvas.addEventListener('touchmove', draw, { passive: false });
      canvas.addEventListener('touchend', stopDrawing);

      return () => {
        canvas.removeEventListener('mousedown', startDrawing);
        canvas.removeEventListener('mousemove', draw);
        canvas.removeEventListener('mouseup', stopDrawing);
        canvas.removeEventListener('mouseout', stopDrawing);
        canvas.removeEventListener('touchstart', startDrawing);
        canvas.removeEventListener('touchmove', draw);
        canvas.removeEventListener('touchend', stopDrawing);
      };
    }, [startDrawing, draw, stopDrawing]);

    return (
      <div className={styles.container}>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className={styles.canvas}
          style={{ touchAction: 'none' }}
        />
        <div className={styles.controls}>
          <button type="button" onClick={clearCanvas} className={styles.clearButton}>
            Clear
          </button>
        </div>
      </div>
    );
  }
);

SignatureCanvas.displayName = 'SignatureCanvas';
