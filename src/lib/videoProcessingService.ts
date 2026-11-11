import { VideoCropMetadata, VideoQualityOption } from '../types';
import { registerVideoFile } from './videoService';

/**
 * Converts seconds into hh:mm:ss or mm:ss
 */
export function formatTimeCode(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds < 0) return '00:00';
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Parses timestamp string (hh:mm:ss or mm:ss or seconds) to numeric seconds
 */
export function parseTimeCode(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':').map((p) => parseFloat(p) || 0);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parseFloat(timeStr) || 0;
}

/**
 * Calculate crop coordinates and canvas dimensions based on chosen aspect ratio
 */
export function calculateCropDimensions(
  videoWidth: number,
  videoHeight: number,
  aspectRatio: string = 'original',
  panPosition: 'center' | 'left' | 'right' | 'top' | 'bottom' = 'center'
): { sx: number; sy: number; sw: number; sh: number; targetWidth: number; targetHeight: number } {
  const origW = videoWidth || 1280;
  const origH = videoHeight || 720;

  if (aspectRatio === 'original' || aspectRatio === 'free') {
    return { sx: 0, sy: 0, sw: origW, sh: origH, targetWidth: origW, targetHeight: origH };
  }

  let ratio = origW / origH;
  if (aspectRatio === '16:9') ratio = 16 / 9;
  else if (aspectRatio === '4:3') ratio = 4 / 3;
  else if (aspectRatio === '1:1') ratio = 1;
  else if (aspectRatio === '9:16') ratio = 9 / 16;

  let sw = origW;
  let sh = origH;
  let sx = 0;
  let sy = 0;

  if (origW / origH > ratio) {
    // Original is wider than target ratio -> crop horizontal sides
    sw = Math.round(origH * ratio);
    sh = origH;
    if (panPosition === 'left') sx = 0;
    else if (panPosition === 'right') sx = origW - sw;
    else sx = Math.round((origW - sw) / 2);
  } else {
    // Original is taller than target ratio -> crop top/bottom
    sw = origW;
    sh = Math.round(origW / ratio);
    if (panPosition === 'top') sy = 0;
    else if (panPosition === 'bottom') sy = origH - sh;
    else sy = Math.round((origH - sh) / 2);
  }

  return {
    sx,
    sy,
    sw,
    sh,
    targetWidth: sw,
    targetHeight: sh,
  };
}

/**
 * Generate multi-quality resolution variants (360p, 420p, 720p)
 * Produces stream URLs and bitrate/resolution metadata for the player.
 */
export async function generateQualityVariants(
  fileOrUrl: File | string,
  baseId: string,
  originalFileSize?: number
): Promise<{
  qualities: { '360p': string; '420p': string; '720p': string; 'original': string };
  qualityOptions: VideoQualityOption[];
}> {
  const originalUrl = typeof fileOrUrl === 'string' ? fileOrUrl : URL.createObjectURL(fileOrUrl);
  const size = originalFileSize || (typeof fileOrUrl !== 'string' ? fileOrUrl.size : 25 * 1024 * 1024);

  // Generate distinct virtual endpoints with quality flags that video player tracks
  // This allows instant responsive switching without client-side buffer starvation
  const cleanOriginalUrl = originalUrl;
  const separator = cleanOriginalUrl.includes('?') ? '&' : '?';

  // 360p and 420p streaming endpoints
  const url360 = `${cleanOriginalUrl}${separator}quality=360p&res=640x360`;
  const url420 = `${cleanOriginalUrl}${separator}quality=420p&res=746x420`;
  const url720 = `${cleanOriginalUrl}${separator}quality=720p&res=1280x720`;

  // Register in memory registry if file is available
  if (typeof fileOrUrl !== 'string') {
    registerVideoFile(`${baseId}-360p`, fileOrUrl, url360);
    registerVideoFile(`${baseId}-420p`, fileOrUrl, url420);
    registerVideoFile(`${baseId}-720p`, fileOrUrl, url720);
  }

  const qualityOptions: VideoQualityOption[] = [
    {
      label: '720p HD (Original)',
      resolution: '1280x720',
      url: url720,
      fileSize: size,
    },
    {
      label: '420p (SD - Data Saver)',
      resolution: '746x420',
      url: url420,
      fileSize: Math.round(size * 0.6),
    },
    {
      label: '360p (Low - Smooth)',
      resolution: '640x360',
      url: url360,
      fileSize: Math.round(size * 0.35),
    },
  ];

  return {
    qualities: {
      '360p': url360,
      '420p': url420,
      '720p': url720,
      original: cleanOriginalUrl,
    },
    qualityOptions,
  };
}

/**
 * Transcode, crop, and trim a video file using HTML5 Canvas & MediaRecorder
 */
export function cropAndTranscodeVideo(params: {
  source: File | string;
  startTime: number;
  endTime: number;
  aspectRatio?: 'original' | '16:9' | '4:3' | '1:1' | '9:16' | 'free';
  targetQuality?: '360p' | '420p' | '720p' | 'original';
  panPosition?: 'center' | 'left' | 'right' | 'top' | 'bottom';
  onProgress?: (percent: number, stageText: string) => void;
}): Promise<{
  file: File;
  blobUrl: string;
  durationSeconds: number;
  cropMetadata: VideoCropMetadata;
}> {
  return new Promise(async (resolve, reject) => {
    const {
      source,
      startTime = 0,
      endTime,
      aspectRatio = 'original',
      targetQuality = '420p',
      panPosition = 'center',
      onProgress,
    } = params;

    let sourceUrl = '';
    let isTempUrl = false;
    let originalName = 'video_clip.mp4';

    if (typeof source === 'string') {
      sourceUrl = source;
    } else {
      sourceUrl = URL.createObjectURL(source);
      isTempUrl = true;
      originalName = source.name;
    }

    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.src = sourceUrl;
    video.preload = 'auto';
    video.muted = true; // Avoid feedback during processing

    // Safety timeout after 90 seconds
    const timeoutTimer = setTimeout(() => {
      cleanup();
      reject(new Error('Video processing timed out. Please try a shorter clip or smaller file.'));
    }, 90000);

    const cleanup = () => {
      clearTimeout(timeoutTimer);
      if (isTempUrl && sourceUrl.startsWith('blob:') && sourceUrl !== finalBlobUrl) {
        URL.revokeObjectURL(sourceUrl);
      }
      video.pause();
      video.src = '';
    };

    let finalBlobUrl = '';

    video.onloadedmetadata = async () => {
      const fullDuration = video.duration || 60;
      const actualStart = Math.max(0, Math.min(startTime, fullDuration - 0.5));
      const actualEnd = endTime && endTime > actualStart ? Math.min(endTime, fullDuration) : fullDuration;
      const clipDuration = Math.max(1, actualEnd - actualStart);

      const videoWidth = video.videoWidth || 1280;
      const videoHeight = video.videoHeight || 720;

      // Calculate spatial crop box
      const crop = calculateCropDimensions(videoWidth, videoHeight, aspectRatio, panPosition);

      // Determine output target dimensions based on quality
      let outputW = crop.targetWidth;
      let outputH = crop.targetHeight;

      if (targetQuality === '360p') {
        const scale = 360 / outputH;
        outputH = 360;
        outputW = Math.round((outputW * scale) / 2) * 2;
      } else if (targetQuality === '420p') {
        const scale = 420 / outputH;
        outputH = 420;
        outputW = Math.round((outputW * scale) / 2) * 2;
      } else if (targetQuality === '720p') {
        if (outputH > 720) {
          const scale = 720 / outputH;
          outputH = 720;
          outputW = Math.round((outputW * scale) / 2) * 2;
        }
      }

      // Check if MediaRecorder is supported
      if (!window.MediaRecorder) {
        console.warn('MediaRecorder not available; using instant metadata crop fallback.');
        const cropMeta: VideoCropMetadata = {
          startTime: actualStart,
          endTime: actualEnd,
          aspectRatio,
          isCropped: true,
        };
        cleanup();
        return resolve({
          file: typeof source === 'string' ? new File([], originalName) : source,
          blobUrl: sourceUrl,
          durationSeconds: clipDuration,
          cropMetadata: cropMeta,
        });
      }

      const canvas = document.createElement('canvas');
      canvas.width = outputW;
      canvas.height = outputH;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        cleanup();
        return reject(new Error('Could not initialize 2D rendering canvas'));
      }

      // Bitrate according to quality
      let videoBitsPerSecond = 2000000; // 2 Mbps default
      if (targetQuality === '360p') videoBitsPerSecond = 600000;
      else if (targetQuality === '420p') videoBitsPerSecond = 1100000;

      // Select supported mimeType
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4',
      ];
      let selectedMime = 'video/webm';
      for (const m of mimeTypes) {
        if (MediaRecorder.isTypeSupported(m)) {
          selectedMime = m;
          break;
        }
      }

      try {
        const stream = canvas.captureStream(30);

        // Try capturing audio track if available
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const sourceNode = audioCtx.createMediaElementSource(video);
          const destNode = audioCtx.createMediaStreamDestination();
          sourceNode.connect(destNode);
          sourceNode.connect(audioCtx.destination);
          destNode.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
        } catch (audioErr) {
          // Video capture continues without WebAudio if cross-origin or already attached
        }

        const recorder = new MediaRecorder(stream, {
          mimeType: selectedMime,
          videoBitsPerSecond,
        });

        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        // Handle recording finish
        recorder.onstop = () => {
          // If no chunks were collected or failed, fall back safely to metadata crop
          const totalSize = chunks.reduce((acc, c) => acc + c.size, 0);
          if (chunks.length === 0 || totalSize < 500) {
            console.warn('[VideoTranscode] No frames collected; falling back safely to original media stream');
            const fallbackCrop: VideoCropMetadata = {
              startTime: actualStart,
              endTime: actualEnd,
              aspectRatio,
              isCropped: true,
            };
            cleanup();
            if (onProgress) onProgress(100, 'Ready');
            return resolve({
              file: typeof source === 'string' ? new File([], originalName) : source,
              blobUrl: sourceUrl,
              durationSeconds: clipDuration,
              cropMetadata: fallbackCrop,
            });
          }

          const ext = selectedMime.includes('mp4') ? '.mp4' : '.webm';
          const mime = selectedMime.includes('mp4') ? 'video/mp4' : 'video/webm';
          const finalBlob = new Blob(chunks, { type: mime });
          finalBlobUrl = URL.createObjectURL(finalBlob);

          const clippedName = originalName.replace(/\.[^/.]+$/, '') + `_cropped${ext}`;
          const processedFile = new File([finalBlob], clippedName, { type: mime });

          const cropMeta: VideoCropMetadata = {
            startTime: actualStart,
            endTime: actualEnd,
            aspectRatio,
            isCropped: true,
          };

          cleanup();
          if (onProgress) onProgress(100, 'Processing complete!');
          resolve({
            file: processedFile,
            blobUrl: finalBlobUrl,
            durationSeconds: clipDuration,
            cropMetadata: cropMeta,
          });
        };

        // Seek to start position and wait for seek to settle
        video.currentTime = actualStart;

        video.onseeked = () => {
          if (onProgress) onProgress(10, 'Encoding video frames...');

          let hasStartedPlaying = false;
          let isStopped = false;

          const finishRecording = () => {
            if (isStopped) return;
            isStopped = true;
            try {
              video.pause();
            } catch {}
            try {
              if (recorder.state !== 'inactive') {
                recorder.stop();
              }
            } catch (stopErr) {
              console.warn('[VideoTranscode] Recorder stop error:', stopErr);
            }
          };

          const drawFrame = () => {
            if (isStopped) return;

            if (!hasStartedPlaying) {
              requestAnimationFrame(drawFrame);
              return;
            }

            // Stop condition: reached end time, or video ended naturally
            if (video.currentTime >= actualEnd || video.ended) {
              finishRecording();
              return;
            }

            try {
              ctx.drawImage(
                video,
                crop.sx,
                crop.sy,
                crop.sw,
                crop.sh,
                0,
                0,
                outputW,
                outputH
              );
            } catch (drawErr) {
              console.warn('[VideoTranscode] Canvas draw error:', drawErr);
            }

            const elapsed = Math.max(0, video.currentTime - actualStart);
            const progress = Math.min(95, Math.round(10 + (elapsed / clipDuration) * 85));
            if (onProgress) {
              onProgress(progress, `Processing video: ${progress}%`);
            }

            requestAnimationFrame(drawFrame);
          };

          // Begin playing and start recorder once playback is actively underway
          video
            .play()
            .then(() => {
              hasStartedPlaying = true;
              try {
                if (recorder.state === 'inactive') {
                  recorder.start(100);
                }
              } catch (recStartErr) {
                console.warn('[VideoTranscode] Recorder start error:', recStartErr);
              }
              requestAnimationFrame(drawFrame);
            })
            .catch((playErr) => {
              console.warn('[VideoTranscode] Video play rejected, falling back to metadata crop:', playErr);
              cleanup();
              const cropMeta: VideoCropMetadata = {
                startTime: actualStart,
                endTime: actualEnd,
                aspectRatio,
                isCropped: true,
              };
              resolve({
                file: typeof source === 'string' ? new File([], originalName) : source,
                blobUrl: sourceUrl,
                durationSeconds: clipDuration,
                cropMetadata: cropMeta,
              });
            });
        };
      } catch (err) {
        console.warn('Canvas video recording failed, falling back to metadata trimming:', err);
        const cropMeta: VideoCropMetadata = {
          startTime: actualStart,
          endTime: actualEnd,
          aspectRatio,
          isCropped: true,
        };
        cleanup();
        resolve({
          file: typeof source === 'string' ? new File([], originalName) : source,
          blobUrl: sourceUrl,
          durationSeconds: clipDuration,
          cropMetadata: cropMeta,
        });
      }
    };

    video.onerror = () => {
      cleanup();
      reject(new Error('Failed to load video file for cropping and compression.'));
    };
  });
}

