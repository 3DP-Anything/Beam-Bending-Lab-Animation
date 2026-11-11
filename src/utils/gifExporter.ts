/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// gifshot is imported dynamically or typed for client-side bundle
// @ts-expect-error - gifshot does not have official typescript types
import gifshot from 'gifshot';

export interface GifExportProgress {
  status: 'idle' | 'rendering' | 'encoding' | 'completed' | 'error';
  progress: number; // 0 to 100
  message: string;
}

export interface ExportSlideOptions {
  aspectRatio: '16:9' | '4:3';
  theme: 'white' | 'dark' | 'transparent';
  durationSeconds: number;
  fps: number;
  includeLegend: boolean;
  includeLoadInfo: boolean;
}

/**
 * Encodes a list of canvas frames into an animated GIF using gifshot.
 */
export async function createGifFromCanvases(
  frameCanvases: HTMLCanvasElement[],
  options: {
    width: number;
    height: number;
    fps: number;
    onProgress?: (progress: number) => void;
  }
): Promise<Blob> {
  const { width, height, fps, onProgress } = options;
  const frameDuration = 1 / fps;

  return new Promise((resolve, reject) => {
    // Convert canvases to data URLs or pass directly
    const images = frameCanvases.map((canvas) => canvas.toDataURL('image/png', 0.95));

    gifshot.createGIF(
      {
        images,
        gifWidth: width,
        gifHeight: height,
        interval: frameDuration,
        numFrames: images.length,
        sampleInterval: 8,
        numWorkers: 2,
        progressCallback: (captureProgress: number) => {
          if (onProgress) {
            onProgress(Math.round(captureProgress * 100));
          }
        },
      },
      (obj: { error: boolean; errorCode?: string; image?: string; errorMsg?: string }) => {
        if (obj.error) {
          reject(new Error(obj.errorMsg || 'Failed to generate GIF.'));
          return;
        }

        if (!obj.image) {
          reject(new Error('No image generated from gifshot.'));
          return;
        }

        // Convert base64 data uri to Blob
        fetch(obj.image)
          .then((res) => res.blob())
          .then((blob) => resolve(blob))
          .catch((err) => reject(err));
      }
    );
  });
}

/**
 * Records a video (WebM/MP4) from a canvas rendering cycle using MediaRecorder.
 */
export async function recordVideoFromCanvas(
  canvas: HTMLCanvasElement,
  renderFrame: (progress: number) => void,
  durationMs: number = 3000,
  fps: number = 30,
  onProgress?: (pct: number) => void
): Promise<Blob> {
  const stream = canvas.captureStream(fps);
  
  // Pick best supported MIME type
  let mimeType = 'video/webm;codecs=vp9';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/mp4';
    }
  }

  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(stream, {
    mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined,
    videoBitsPerSecond: 4000000,
  });

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      resolve(blob);
    };

    recorder.onerror = (e) => {
      reject(e);
    };

    recorder.start();

    const startTime = performance.now();
    const intervalTime = 1000 / fps;
    const totalFrames = Math.round((durationMs / 1000) * fps);
    let frameIndex = 0;

    const timer = setInterval(() => {
      frameIndex++;
      const t = frameIndex / totalFrames;
      if (t > 1) {
        clearInterval(timer);
        recorder.stop();
        return;
      }

      renderFrame(t);
      if (onProgress) {
        onProgress(Math.round(t * 100));
      }
    }, intervalTime);
  });
}

/**
 * Triggers browser download for a Blob
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
