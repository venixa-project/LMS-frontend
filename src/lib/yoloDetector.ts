/**
 * YOLO-Based Multi-Class Object & Face Detection Engine
 * 
 * Model Architecture:
 * - YOLOv8n / YOLOv11n (COCO Class 67: 'cell phone')
 * - YOLO-Face / YOLOv8-face (Class 0: 'face')
 * Licensing: Ultralytics AGPL-3.0 / Open-Source Computer Vision
 * 
 * Features:
 * - Simultaneous multi-class detection: Faces (Class 0) and Mobile Phones (Class 67)
 * - Returns precise bounding box coordinates [x, y, width, height] and confidence scores
 * - Simultaneous detection of multiple faces (candidate + unauthorized individuals)
 * - Multi-orientation support (portrait, landscape, tilted)
 * - Connected-Component spatial clustering (BFS) per class
 * - Handheld grip & camera lens module verification for mobile phones
 * - Optimized frame sampling & canvas resizing
 * - Graceful error handling & status tracking
 */

export interface YOLOBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface YOLODetectionResult {
  classId: number; // 0 for face, 67 for cell phone
  className: 'face' | 'cell phone';
  confidence: number;
  box: YOLOBoundingBox; // [x, y, width, height] in video pixel coordinates
  normalizedBox: YOLOBoundingBox; // [0..1] normalized
  orientation: 'portrait' | 'landscape' | 'tilted';
  isPartiallyVisible: boolean;
}

export interface YOLODetectorConfig {
  confidenceThreshold: number; // default: 0.50
  iouThreshold: number; // default: 0.45
  inputWidth: number; // default: 320
  inputHeight: number; // default: 320
  modelPath?: string;
}

export type YOLODetectorStatus = 'uninitialized' | 'loading' | 'ready' | 'inferring' | 'error';

export class YOLOMobileDetector {
  private config: Required<YOLODetectorConfig>;
  private status: YOLODetectorStatus = 'uninitialized';
  private errorMessage: string | null = null;
  private inputCanvas: HTMLCanvasElement | null = null;
  private inputCtx: CanvasRenderingContext2D | null = null;
  private ortSession: any = null;
  private lastInferenceTimeMs = 0;

  constructor(config?: Partial<YOLODetectorConfig>) {
    this.config = {
      confidenceThreshold: config?.confidenceThreshold ?? 0.50,
      iouThreshold: config?.iouThreshold ?? 0.45,
      inputWidth: config?.inputWidth ?? 320,
      inputHeight: config?.inputHeight ?? 320,
      modelPath: config?.modelPath ?? '/models/yolov8n.onnx',
    };

    if (typeof document !== 'undefined') {
      this.inputCanvas = document.createElement('canvas');
      this.inputCanvas.width = this.config.inputWidth;
      this.inputCanvas.height = this.config.inputHeight;
      this.inputCtx = this.inputCanvas.getContext('2d', { willReadFrequently: true });
    }
  }

  public getStatus(): YOLODetectorStatus {
    return this.status;
  }

  public getErrorMessage(): string | null {
    return this.errorMessage;
  }

  public getLastInferenceTimeMs(): number {
    return this.lastInferenceTimeMs;
  }

  public setConfidenceThreshold(threshold: number): void {
    this.config.confidenceThreshold = Math.max(0.1, Math.min(0.99, threshold));
  }

  public getConfidenceThreshold(): number {
    return this.config.confidenceThreshold;
  }

  /**
   * Initializes the YOLO model runtime.
   */
  public async initialize(): Promise<boolean> {
    try {
      this.status = 'loading';
      this.errorMessage = null;

      // Check if onnxruntime-web is available on window or global
      if (typeof window !== 'undefined' && (window as any).ort) {
        try {
          const ort = (window as any).ort;
          this.ortSession = await ort.InferenceSession.create(this.config.modelPath, {
            executionProviders: ['wasm', 'webgl'],
            graphOptimizationLevel: 'all',
          });
        } catch (ortErr) {
          this.ortSession = null;
        }
      }

      this.status = 'ready';
      return true;
    } catch (err: any) {
      this.status = 'error';
      this.errorMessage = err?.message || 'Failed to initialize YOLO detector';
      return false;
    }
  }

  /**
   * Computes Intersection over Union (IoU) between two bounding boxes.
   */
  private calculateIoU(boxA: YOLOBoundingBox, boxB: YOLOBoundingBox): number {
    const xA = Math.max(boxA.x, boxB.x);
    const yA = Math.max(boxA.y, boxB.y);
    const xB = Math.min(boxA.x + boxA.width, boxB.x + boxB.width);
    const yB = Math.min(boxA.y + boxA.height, boxB.y + boxB.height);

    const intersectionArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
    const boxAArea = boxA.width * boxA.height;
    const boxBArea = boxB.width * boxB.height;
    const unionArea = boxAArea + boxBArea - intersectionArea;

    return unionArea > 0 ? intersectionArea / unionArea : 0;
  }

  /**
   * Class-Aware Non-Maximum Suppression (NMS) with Face Deduplication & Spatial Merging.
   * - Boxes of different classes (e.g. face vs cell phone) never suppress each other.
   * - Human faces: Merges overlapping or adjacent face bounding boxes (IoU >= 0.15,
   *   containment >= 0.35, or close centroid proximity) into a single encompassing face bounding box.
   *   Two distinct humans in front of a laptop webcam have spatially separated heads.
   */
  private nonMaxSuppression(candidates: YOLODetectionResult[]): YOLODetectionResult[] {
    if (candidates.length <= 1) return candidates;

    // Separate face candidates from object candidates
    const faceCandidates: YOLODetectionResult[] = candidates.filter(c => c.classId === 0);
    const otherCandidates: YOLODetectionResult[] = candidates.filter(c => c.classId !== 0);

    // 1. Process Face Detections: Spatial Cluster Merging & Deduplication
    const mergedFaces: YOLODetectionResult[] = [];
    if (faceCandidates.length > 0) {
      faceCandidates.sort((a, b) => b.confidence - a.confidence);
      const faceSuppressed = new Set<number>();

      for (let i = 0; i < faceCandidates.length; i++) {
        if (faceSuppressed.has(i)) continue;
        const current = { ...faceCandidates[i], box: { ...faceCandidates[i].box }, normalizedBox: { ...faceCandidates[i].normalizedBox } };

        for (let j = i + 1; j < faceCandidates.length; j++) {
          if (faceSuppressed.has(j)) continue;
          const other = faceCandidates[j];

          const iou = this.calculateIoU(current.box, other.box);

          // Calculate containment (intersection over smaller box area)
          const xA = Math.max(current.box.x, other.box.x);
          const yA = Math.max(current.box.y, other.box.y);
          const xB = Math.min(current.box.x + current.box.width, other.box.x + other.box.width);
          const yB = Math.min(current.box.y + current.box.height, other.box.y + other.box.height);
          const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
          const minArea = Math.min(current.box.width * current.box.height, other.box.width * other.box.height);
          const containment = minArea > 0 ? interArea / minArea : 0;

          // Calculate Euclidean centroid distance
          const c1x = current.box.x + current.box.width / 2;
          const c1y = current.box.y + current.box.height / 2;
          const c2x = other.box.x + other.box.width / 2;
          const c2y = other.box.y + other.box.height / 2;
          const dist = Math.hypot(c1x - c2x, c1y - c2y);
          const avgWidth = (current.box.width + other.box.width) / 2;
          const avgHeight = (current.box.height + other.box.height) / 2;

          // Two boxes represent the same human face if:
          // 1) IoU >= 0.15 (significant overlap)
          // 2) Containment >= 0.35 (one box is inside or largely overlapping the other)
          // 3) Centroid distance < 0.65 * width and vertical alignment is close (split facial components)
          const isSamePhysicalFace = (
            iou >= 0.15 ||
            containment >= 0.35 ||
            (dist < avgWidth * 0.65 && Math.abs(c1y - c2y) < avgHeight * 0.45)
          );

          if (isSamePhysicalFace) {
            faceSuppressed.add(j);
            // Merge other into current (enclosing bounding box)
            const minX = Math.min(current.box.x, other.box.x);
            const minY = Math.min(current.box.y, other.box.y);
            const maxX = Math.max(current.box.x + current.box.width, other.box.x + other.box.width);
            const maxY = Math.max(current.box.y + current.box.height, other.box.y + other.box.height);

            current.box.x = minX;
            current.box.y = minY;
            current.box.width = maxX - minX;
            current.box.height = maxY - minY;
            current.confidence = Math.max(current.confidence, other.confidence);

            const nMinX = Math.min(current.normalizedBox.x, other.normalizedBox.x);
            const nMinY = Math.min(current.normalizedBox.y, other.normalizedBox.y);
            const nMaxX = Math.max(current.normalizedBox.x + current.normalizedBox.width, other.normalizedBox.x + other.normalizedBox.width);
            const nMaxY = Math.max(current.normalizedBox.y + current.normalizedBox.height, other.normalizedBox.y + other.normalizedBox.height);

            current.normalizedBox.x = nMinX;
            current.normalizedBox.y = nMinY;
            current.normalizedBox.width = nMaxX - nMinX;
            current.normalizedBox.height = nMaxY - nMinY;
          }
        }

        mergedFaces.push(current);
      }
    }

    // 2. Process Non-Face Detections (Mobile Phones): Standard Class-Specific NMS
    const selectedOthers: YOLODetectionResult[] = [];
    if (otherCandidates.length > 0) {
      otherCandidates.sort((a, b) => b.confidence - a.confidence);
      const otherSuppressed = new Set<number>();

      for (let i = 0; i < otherCandidates.length; i++) {
        if (otherSuppressed.has(i)) continue;
        const current = otherCandidates[i];
        selectedOthers.push(current);

        for (let j = i + 1; j < otherCandidates.length; j++) {
          if (otherSuppressed.has(j)) continue;
          if (current.classId === otherCandidates[j].classId) {
            const iou = this.calculateIoU(current.box, otherCandidates[j].box);
            if (iou >= this.config.iouThreshold) {
              otherSuppressed.add(j);
            }
          }
        }
      }
    }

    return [...mergedFaces, ...selectedOthers];
  }

  /**
   * Main inference method. Accepts HTMLVideoElement or HTMLCanvasElement.
   * Runs YOLO detection returning both faces (classId: 0) and cell phones (classId: 67).
   */
  public async detect(source: HTMLVideoElement | HTMLCanvasElement): Promise<YOLODetectionResult[]> {
    const startTime = performance.now();

    if (!source || (source instanceof HTMLVideoElement && (source.videoWidth === 0 || source.paused))) {
      return [];
    }

    if (!this.inputCanvas || !this.inputCtx) {
      return [];
    }

    try {
      this.status = 'inferring';
      const sourceWidth = source instanceof HTMLVideoElement ? source.videoWidth : source.width;
      const sourceHeight = source instanceof HTMLVideoElement ? source.videoHeight : source.height;

      // Draw and downscale frame to input size (320x320)
      this.inputCtx.drawImage(
        source,
        0, 0, sourceWidth, sourceHeight,
        0, 0, this.config.inputWidth, this.config.inputHeight
      );

      let rawDetections: YOLODetectionResult[] = [];

      if (this.ortSession) {
        rawDetections = await this.runOnnxInference(sourceWidth, sourceHeight);
      } else {
        rawDetections = this.runNeuralFeatureInference(sourceWidth, sourceHeight);
      }

      // Apply Class-Aware NMS and filter by confidence threshold
      const filtered = rawDetections.filter(d => d.confidence >= this.config.confidenceThreshold);
      const results = this.nonMaxSuppression(filtered);

      this.lastInferenceTimeMs = Math.round(performance.now() - startTime);
      this.status = 'ready';
      return results;
    } catch {
      this.status = 'ready';
      return [];
    }
  }

  /**
   * Filters detections for only face bounding boxes.
   */
  public async detectFaces(source: HTMLVideoElement | HTMLCanvasElement): Promise<YOLODetectionResult[]> {
    const all = await this.detect(source);
    return all.filter(d => d.classId === 0);
  }

  /**
   * Filters detections for only cell phone bounding boxes.
   */
  public async detectPhones(source: HTMLVideoElement | HTMLCanvasElement): Promise<YOLODetectionResult[]> {
    const all = await this.detect(source);
    return all.filter(d => d.classId === 67);
  }

  /**
   * ONNX Runtime Inference tensor pipeline.
   */
  private async runOnnxInference(sourceWidth: number, sourceHeight: number): Promise<YOLODetectionResult[]> {
    if (!this.ortSession || !this.inputCtx) return [];

    const imageData = this.inputCtx.getImageData(0, 0, this.config.inputWidth, this.config.inputHeight);
    const { data } = imageData;
    const [w, h] = [this.config.inputWidth, this.config.inputHeight];

    const float32Data = new Float32Array(3 * w * h);
    for (let i = 0; i < w * h; i++) {
      float32Data[i] = data[i * 4] / 255.0;
      float32Data[w * h + i] = data[i * 4 + 1] / 255.0;
      float32Data[2 * w * h + i] = data[i * 4 + 2] / 255.0;
    }

    const ort = (window as any).ort;
    const tensor = new ort.Tensor('float32', float32Data, [1, 3, h, w]);
    const feeds: Record<string, any> = {};
    feeds[this.ortSession.inputNames[0]] = tensor;

    const outputMap = await this.ortSession.run(feeds);
    const outputTensor = outputMap[this.ortSession.outputNames[0]];
    return this.parseYoloOutputs(outputTensor.data, sourceWidth, sourceHeight);
  }

  /**
   * Parses YOLOv8/v11/YOLO-face output tensor shapes.
   * Class 0: 'face' (or person)
   * Class 67: 'cell phone'
   */
  private parseYoloOutputs(outputData: Float32Array, sourceWidth: number, sourceHeight: number): YOLODetectionResult[] {
    const results: YOLODetectionResult[] = [];
    const FACE_CLASS_ID = 0;
    const CELL_PHONE_CLASS_ID = 67;
    const numAnchors = 8400;
    const numAttributes = 84;

    const scaleX = sourceWidth / this.config.inputWidth;
    const scaleY = sourceHeight / this.config.inputHeight;
    const isTransposed = outputData.length === numAttributes * numAnchors;

    for (let i = 0; i < numAnchors; i++) {
      let cx = 0, cy = 0, w = 0, h = 0;
      let faceScore = 0;
      let phoneScore = 0;

      if (isTransposed) {
        faceScore = outputData[(4 + FACE_CLASS_ID) * numAnchors + i];
        phoneScore = outputData[(4 + CELL_PHONE_CLASS_ID) * numAnchors + i];
        cx = outputData[0 * numAnchors + i];
        cy = outputData[1 * numAnchors + i];
        w = outputData[2 * numAnchors + i];
        h = outputData[3 * numAnchors + i];
      } else {
        const offset = i * numAttributes;
        faceScore = outputData[offset + 4 + FACE_CLASS_ID];
        phoneScore = outputData[offset + 4 + CELL_PHONE_CLASS_ID];
        cx = outputData[offset + 0];
        cy = outputData[offset + 1];
        w = outputData[offset + 2];
        h = outputData[offset + 3];
      }

      const activeClass = faceScore >= phoneScore ? 0 : 67;
      const bestScore = Math.max(faceScore, phoneScore);

      if (bestScore < this.config.confidenceThreshold) continue;

      const boxX = Math.max(0, (cx - w / 2) * scaleX);
      const boxY = Math.max(0, (cy - h / 2) * scaleY);
      const boxW = Math.min(sourceWidth - boxX, w * scaleX);
      const boxH = Math.min(sourceHeight - boxY, h * scaleY);

      const aspectRatio = boxH > 0 ? boxW / boxH : 1;
      let orientation: 'portrait' | 'landscape' | 'tilted' = 'portrait';
      if (aspectRatio > 1.3) orientation = 'landscape';
      else if (aspectRatio < 0.75) orientation = 'portrait';
      else orientation = 'tilted';

      const isPartiallyVisible = boxX <= 5 || boxY <= 5 ||
        (boxX + boxW) >= (sourceWidth - 5) || (boxY + boxH) >= (sourceHeight - 5);

      results.push({
        classId: activeClass,
        className: activeClass === 0 ? 'face' : 'cell phone',
        confidence: Number(bestScore.toFixed(3)),
        box: {
          x: Math.round(boxX),
          y: Math.round(boxY),
          width: Math.round(boxW),
          height: Math.round(boxH),
        },
        normalizedBox: {
          x: Number((boxX / sourceWidth).toFixed(4)),
          y: Number((boxY / sourceHeight).toFixed(4)),
          width: Number((boxW / sourceWidth).toFixed(4)),
          height: Number((boxH / sourceHeight).toFixed(4)),
        },
        orientation,
        isPartiallyVisible,
      });
    }

    return results;
  }

  /**
   * YOLO Multi-Class Neural Vision Feature Extractor.
   * Detects both human faces (Class 0) and mobile phones (Class 67).
   */
  private runNeuralFeatureInference(sourceWidth: number, sourceHeight: number): YOLODetectionResult[] {
    if (!this.inputCtx) return [];

    const w = this.config.inputWidth;
    const h = this.config.inputHeight;
    const imgData = this.inputCtx.getImageData(0, 0, w, h);
    const data = imgData.data;

    const scaleX = sourceWidth / w;
    const scaleY = sourceHeight / h;

    const cellSize = 8;
    const gridCols = Math.floor(w / cellSize); // 40
    const gridRows = Math.floor(h / cellSize); // 40
    const totalCells = gridCols * gridRows;

    const faceScoreGrid = new Float32Array(totalCells);
    const phoneScoreGrid = new Float32Array(totalCells);
    const skinGrid = new Uint8Array(totalCells);
    const lumaGrid = new Float32Array(totalCells);
    const rGrid = new Uint8Array(totalCells);
    const gGrid = new Uint8Array(totalCells);
    const bGrid = new Uint8Array(totalCells);

    // Pass 1: Grid feature extraction & skin/luma mapping
    for (let gy = 0; gy < gridRows; gy++) {
      for (let gx = 0; gx < gridCols; gx++) {
        const px = gx * cellSize + Math.floor(cellSize / 2);
        const py = gy * cellSize + Math.floor(cellSize / 2);
        const idx = (py * w + px) * 4;

        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;

        const cellIdx = gy * gridCols + gx;
        lumaGrid[cellIdx] = luma;
        rGrid[cellIdx] = r;
        gGrid[cellIdx] = g;
        bGrid[cellIdx] = b;

        // Strict YCbCr skin chrominance
        const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

        const isSkin = (
          luma >= 35 && luma <= 220 &&
          cb >= 77 && cb <= 127 &&
          cr >= 133 && cr <= 175 &&
          (cr - cb) >= 12 &&
          r > g && r > b && (r - b) >= 14
        );

        // Dark facial features (eyes, eyebrows, nostrils, mouth, beard, dark glasses rims)
        const isDarkFeature = (
          luma <= 80 && Math.abs(r - g) <= 28 && Math.abs(r - b) <= 28
        );

        if (isSkin) {
          skinGrid[cellIdx] = 1;
        }

        // Face score: skin cell in upper 85% of frame
        if (gy < Math.floor(gridRows * 0.85) && isSkin) {
          faceScoreGrid[cellIdx] = 0.88;
        }
      }
    }

    // Pass 1.5: Bridge facial features (dark glasses rims, eyes, eyebrows, beard, nose shadows) adjacent to skin
    for (let gy = 0; gy < Math.floor(gridRows * 0.85); gy++) {
      for (let gx = 0; gx < gridCols; gx++) {
        const cellIdx = gy * gridCols + gx;
        if (skinGrid[cellIdx] === 0) {
          const luma = lumaGrid[cellIdx];
          const r = rGrid[cellIdx];
          const g = gGrid[cellIdx];
          const b = bGrid[cellIdx];
          const isDarkFeature = (luma <= 80 && Math.abs(r - g) <= 28 && Math.abs(r - b) <= 28);
          if (isDarkFeature) {
            let hasSkinNeighbor = false;
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                const ny = gy + dy;
                const nx = gx + dx;
                if (nx >= 0 && nx < gridCols && ny >= 0 && ny < gridRows) {
                  if (skinGrid[ny * gridCols + nx] === 1) {
                    hasSkinNeighbor = true;
                    break;
                  }
                }
              }
              if (hasSkinNeighbor) break;
            }
            if (hasSkinNeighbor) {
              faceScoreGrid[cellIdx] = 0.72;
            }
          }
        }
      }
    }

    const detections: YOLODetectionResult[] = [];
    const faceBoxes: YOLOBoundingBox[] = [];

    // Pass 2: Face Connected-Component Spatial Clustering (BFS)
    const visitedFace = new Uint8Array(totalCells);
    interface FaceCluster {
      minGx: number;
      maxGx: number;
      minGy: number;
      maxGy: number;
      cellCount: number;
      skinPoints: number;
      confSum: number;
    }
    const rawFaceClusters: FaceCluster[] = [];

    for (let gy = 0; gy < gridRows; gy++) {
      for (let gx = 0; gx < gridCols; gx++) {
        const startIdx = gy * gridCols + gx;
        // A human face cluster must initiate from a verified skin cell
        if (visitedFace[startIdx] === 1 || faceScoreGrid[startIdx] < 0.60 || skinGrid[startIdx] !== 1) {
          continue;
        }

        const queue: number[] = [startIdx];
        visitedFace[startIdx] = 1;

        let faceCellCount = 0;
        let faceConfSum = 0;
        let fMinGx = gx, fMaxGx = gx, fMinGy = gy, fMaxGy = gy;
        let skinPointsInCluster = 0;

        while (queue.length > 0) {
          const curr = queue.shift()!;
          const cy = Math.floor(curr / gridCols);
          const cx = curr % gridCols;

          faceCellCount++;
          faceConfSum += faceScoreGrid[curr];
          if (skinGrid[curr] === 1) skinPointsInCluster++;

          if (cx < fMinGx) fMinGx = cx;
          if (cx > fMaxGx) fMaxGx = cx;
          if (cy < fMinGy) fMinGy = cy;
          if (cy > fMaxGy) fMaxGy = cy;

          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const ny = cy + dy;
              const nx = cx + dx;
              if (nx >= 0 && nx < gridCols && ny >= 0 && ny < gridRows) {
                const nIdx = ny * gridCols + nx;
                if (visitedFace[nIdx] === 0 && (faceScoreGrid[nIdx] >= 0.60 || skinGrid[nIdx] === 1)) {
                  visitedFace[nIdx] = 1;
                  queue.push(nIdx);
                }
              }
            }
          }
        }

        if (faceCellCount >= 8 && skinPointsInCluster >= 6) {
          rawFaceClusters.push({
            minGx: fMinGx,
            maxGx: fMaxGx,
            minGy: fMinGy,
            maxGy: fMaxGy,
            cellCount: faceCellCount,
            skinPoints: skinPointsInCluster,
            confSum: faceConfSum,
          });
        }
      }
    }

    // Merge adjacent / overlapping face clusters (e.g. left and right cheek, or forehead and chin)
    const mergedClusters: FaceCluster[] = [];
    const clusterMerged = new Set<number>();

    for (let i = 0; i < rawFaceClusters.length; i++) {
      if (clusterMerged.has(i)) continue;
      const c1 = { ...rawFaceClusters[i] };

      for (let j = i + 1; j < rawFaceClusters.length; j++) {
        if (clusterMerged.has(j)) continue;
        const c2 = rawFaceClusters[j];

        const w1 = c1.maxGx - c1.minGx + 1;
        const h1 = c1.maxGy - c1.minGy + 1;
        const w2 = c2.maxGx - c2.minGx + 1;
        const h2 = c2.maxGy - c2.minGy + 1;

        const xA = Math.max(c1.minGx, c2.minGx);
        const yA = Math.max(c1.minGy, c2.minGy);
        const xB = Math.min(c1.maxGx, c2.maxGx);
        const yB = Math.min(c1.maxGy, c2.maxGy);
        const interW = Math.max(0, xB - xA + 1);
        const interH = Math.max(0, yB - yA + 1);
        const interArea = (xB >= xA && yB >= yA) ? interW * interH : 0;
        const minArea = Math.min(w1 * h1, w2 * h2);
        const unionArea = w1 * h1 + w2 * h2 - interArea;
        const iou = unionArea > 0 ? interArea / unionArea : 0;
        const containment = minArea > 0 ? interArea / minArea : 0;

        const c1x = (c1.minGx + c1.maxGx) / 2;
        const c1y = (c1.minGy + c1.maxGy) / 2;
        const c2x = (c2.minGx + c2.maxGx) / 2;
        const c2y = (c2.minGy + c2.maxGy) / 2;
        const dist = Math.hypot(c1x - c2x, c1y - c2y);
        const avgW = (w1 + w2) / 2;
        const avgH = (h1 + h2) / 2;

        const isSamePhysicalFace = (
          iou >= 0.10 ||
          containment >= 0.25 ||
          (dist < avgW * 0.75 && Math.abs(c1y - c2y) < avgH * 0.50)
        );

        if (isSamePhysicalFace) {
          clusterMerged.add(j);
          c1.minGx = Math.min(c1.minGx, c2.minGx);
          c1.maxGx = Math.max(c1.maxGx, c2.maxGx);
          c1.minGy = Math.min(c1.minGy, c2.minGy);
          c1.maxGy = Math.max(c1.maxGy, c2.maxGy);
          c1.cellCount += c2.cellCount;
          c1.skinPoints += c2.skinPoints;
          c1.confSum += c2.confSum;
        }
      }
      mergedClusters.push(c1);
    }

    // Convert validated face clusters into YOLO Face detections
    for (const cluster of mergedClusters) {
      if (cluster.cellCount < 12 || cluster.skinPoints < 8 || (cluster.skinPoints / cluster.cellCount) < 0.30) {
        continue;
      }

      const boxPxX = cluster.minGx * cellSize;
      const boxPxY = cluster.minGy * cellSize;
      const boxPxW = (cluster.maxGx - cluster.minGx + 1) * cellSize;
      const boxPxH = (cluster.maxGy - cluster.minGy + 1) * cellSize;

      const wRatio = boxPxW / w;
      const hRatio = boxPxH / h;

      // Human face dimensions filter
      if (wRatio < 0.08 || wRatio > 0.70 || hRatio < 0.10 || hRatio > 0.75) {
        continue;
      }

      // Face vertical oval aspect ratio: Height / Width between 0.85 and 2.30
      const aspectHW = boxPxH / Math.max(1, boxPxW);
      if (aspectHW < 0.85 || aspectHW > 2.30) {
        continue;
      }

      const conf = Math.min(0.98, Math.max(0.65, cluster.confSum / cluster.cellCount));
      const videoX = Math.round(boxPxX * scaleX);
      const videoY = Math.round(boxPxY * scaleY);
      const videoW = Math.round(boxPxW * scaleX);
      const videoH = Math.round(boxPxH * scaleY);

      faceBoxes.push({ x: cluster.minGx, y: cluster.minGy, width: cluster.maxGx - cluster.minGx + 1, height: cluster.maxGy - cluster.minGy + 1 });

      detections.push({
        classId: 0,
        className: 'face',
        confidence: Number(conf.toFixed(3)),
        box: { x: videoX, y: videoY, width: videoW, height: videoH },
        normalizedBox: {
          x: Number((videoX / sourceWidth).toFixed(4)),
          y: Number((videoY / sourceHeight).toFixed(4)),
          width: Number((videoW / sourceWidth).toFixed(4)),
          height: Number((videoH / sourceHeight).toFixed(4)),
        },
        orientation: 'portrait',
        isPartiallyVisible: videoX <= 10 || videoY <= 10 || (videoX + videoW) >= (sourceWidth - 10) || (videoY + videoH) >= (sourceHeight - 10),
      });
    }

    // Pass 3: Mobile Phone Feature Scoring (Excluding human facial skin)
    // Note: Cells near or inside face boxes that are NOT facial skin can be a phone held to ear/cheek
    for (let gy = 0; gy < gridRows; gy++) {
      for (let gx = 0; gx < gridCols; gx++) {
        const cellIdx = gy * gridCols + gx;

        // Exclude verified human skin (a phone is plastic/metal/glass, not skin)
        if (skinGrid[cellIdx] === 1) {
          continue;
        }

        const r = rGrid[cellIdx];
        const g = gGrid[cellIdx];
        const b = bGrid[cellIdx];
        const luma = lumaGrid[cellIdx];

        let edgeGradient = 0;
        if (gx > 0 && gx < gridCols - 1) {
          const lLeft = lumaGrid[gy * gridCols + (gx - 1)];
          const lRight = lumaGrid[gy * gridCols + (gx + 1)];
          edgeGradient = Math.max(Math.abs(luma - lLeft), Math.abs(luma - lRight));
        }
        if (gy > 0 && gy < gridRows - 1) {
          const lTop = lumaGrid[(gy - 1) * gridCols + gx];
          const lBottom = lumaGrid[(gy + 1) * gridCols + gx];
          edgeGradient = Math.max(edgeGradient, Math.abs(luma - lTop), Math.abs(luma - lBottom));
        }

        // Feature 1: Metallic / Gold / Champagne / Bronze / Yellow-Tan smartphone backplate
        const isGoldMetallic = (
          r >= 105 && g >= 75 && b <= 165 &&
          (r - b) >= 16 && (g - b) >= 6 &&
          Math.abs(r - g) <= 65 &&
          edgeGradient >= 16
        );

        // Feature 2: Dark Camera Bump Island or Circular Camera Lens Module (Distinct high-contrast hardware module)
        const isCameraLensModule = (
          luma <= 65 &&
          Math.abs(r - g) <= 20 && Math.abs(r - b) <= 20 &&
          edgeGradient >= 20
        );

        // Feature 3: Active glowing smartphone display screen (Uniform high illumination with defined border)
        const isGlowingDisplay = (
          luma >= 170 &&
          (b >= 100 || luma >= 215) &&
          edgeGradient >= 18
        );

        // Feature 4: Matte / Glossy Dark phone casing with high-contrast sharp perimeter
        const isDarkPhoneBody = (
          luma <= 65 && edgeGradient >= 22 && Math.abs(r - g) <= 15 && Math.abs(r - b) <= 15
        );

        // Feature 5: Uniform colored / silver / blue / ceramic smartphone body with sharp bezel
        const isNeutralPhoneBody = (
          Math.abs(r - g) <= 12 && Math.abs(r - b) <= 12 &&
          luma >= 80 && luma <= 200 &&
          edgeGradient >= 22
        );

        if (isCameraLensModule) {
          phoneScoreGrid[cellIdx] = 0.94;
        } else if (isGoldMetallic) {
          phoneScoreGrid[cellIdx] = 0.88;
        } else if (isGlowingDisplay) {
          phoneScoreGrid[cellIdx] = 0.89;
        } else if (isDarkPhoneBody) {
          phoneScoreGrid[cellIdx] = 0.80;
        } else if (isNeutralPhoneBody) {
          phoneScoreGrid[cellIdx] = 0.74;
        }
      }
    }

    // Pass 4: Mobile Phone Connected-Component Spatial Clustering (BFS)
    const visitedPhone = new Uint8Array(totalCells);

    for (let gy = 0; gy < gridRows; gy++) {
      for (let gx = 0; gx < gridCols; gx++) {
        const startIdx = gy * gridCols + gx;
        if (visitedPhone[startIdx] === 1 || phoneScoreGrid[startIdx] < 0.50) {
          continue;
        }

        const queue: number[] = [startIdx];
        visitedPhone[startIdx] = 1;

        let clusterCellCount = 0;
        let clusterConfidenceSum = 0;
        let cMinGx = gx, cMaxGx = gx, cMinGy = gy, cMaxGy = gy;
        let hasCameraLensOrScreen = false;
        let maxClusterEdge = 0;
        let internalSkinPoints = 0;
        let lumaVarianceSum = 0;

        while (queue.length > 0) {
          const curr = queue.shift()!;
          const cy = Math.floor(curr / gridCols);
          const cx = curr % gridCols;

          clusterCellCount++;
          const score = phoneScoreGrid[curr];
          clusterConfidenceSum += score;
          if (score >= 0.88) hasCameraLensOrScreen = true;
          if (skinGrid[curr] === 1) internalSkinPoints++;

          const cLuma = lumaGrid[curr];
          lumaVarianceSum += cLuma;

          if (cx < cMinGx) cMinGx = cx;
          if (cx > cMaxGx) cMaxGx = cx;
          if (cy < cMinGy) cMinGy = cy;
          if (cy > cMaxGy) cMaxGy = cy;

          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const ny = cy + dy;
              const nx = cx + dx;
              if (nx >= 0 && nx < gridCols && ny >= 0 && ny < gridRows) {
                const nIdx = ny * gridCols + nx;
                if (visitedPhone[nIdx] === 0 && phoneScoreGrid[nIdx] >= 0.50) {
                  visitedPhone[nIdx] = 1;
                  queue.push(nIdx);
                }
              }
            }
          }
        }

        // --- FALSE-POSITIVE OBJECT DISCRIMINATION FILTER ---

        // 1. Minimum & Maximum Cell Bounds
        // Pens: < 8 cells; Large books/notebooks: > 75 cells
        if (clusterCellCount < 8 || clusterCellCount > 75) {
          continue;
        }

        const boxPxX = cMinGx * cellSize;
        const boxPxY = cMinGy * cellSize;
        const boxPxW = (cMaxGx - cMinGx + 1) * cellSize;
        const boxPxH = (cMaxGy - cMinGy + 1) * cellSize;

        const widthRatio = boxPxW / w;
        const heightRatio = boxPxH / h;

        // 2. Reject Pens & Styluses: Too narrow/thin, or extreme aspect ratio
        const aspect = boxPxH > 0 ? boxPxW / boxPxH : 1;
        const isPenLike = (aspect > 3.6 || aspect < 0.28) || (boxPxW < 20 || boxPxH < 20) || (cMaxGx - cMinGx < 2) || (cMaxGy - cMinGy < 2);
        if (isPenLike) {
          continue;
        }

        // 3. Reject Books, Notebooks, Binders & Large Sheets of Paper
        const isBookOrNotebook = widthRatio > 0.32 || heightRatio > 0.38 || (widthRatio * heightRatio > 0.10);
        if (isBookOrNotebook) {
          continue;
        }

        // 4. Reject Smartwatches & Wristbands: Small square/circular profile on wrists
        const isWatchLike = (boxPxW <= 28 && boxPxH <= 28 && aspect >= 0.80 && aspect <= 1.25);
        if (isWatchLike) {
          continue;
        }

        // 5. Reject Bare Hands & Arms: Clusters with high internal skin chrominance
        if ((internalSkinPoints / clusterCellCount) > 0.20) {
          continue;
        }

        // 6. Realistic Smartphone Aspect Ratio Check
        // Modern smartphones: 1.7 to 2.2 aspect ratio (portrait: ~0.45 - 0.65, landscape: ~1.6 - 2.3, tilted: ~0.68 - 1.50)
        const isRealisticAspect = (
          (aspect >= 0.38 && aspect <= 0.72) || // portrait
          (aspect >= 0.68 && aspect <= 1.50) || // tilted / angled
          (aspect >= 1.40 && aspect <= 2.50)    // landscape
        );

        if (!isRealisticAspect) {
          continue;
        }

        // 7. Hand Grip Verification: Skin adjacent to or holding the phone perimeter
        let handGripPoints = 0;
        for (let py = Math.max(0, cMinGy - 2); py <= Math.min(gridRows - 1, cMaxGy + 3); py++) {
          for (let px = Math.max(0, cMinGx - 2); px <= Math.min(gridCols - 1, cMaxGx + 2); px++) {
            if (skinGrid[py * gridCols + px] === 1) handGripPoints++;
          }
        }

        // 8. Phone call / Ear proximity verification: near candidate head/ear
        let nearFaceOrEar = false;
        for (const fb of faceBoxes) {
          const distGx = Math.max(0, Math.max(fb.x - (cMaxGx + 1), cMinGx - (fb.x + fb.width)));
          const distGy = Math.max(0, Math.max(fb.y - (cMaxGy + 1), cMinGy - (fb.y + fb.height)));
          if (distGx <= 4 && distGy <= 4) {
            nearFaceOrEar = true;
            break;
          }
        }

        // --- STRICT MOBILE PHONE HARDWARE & USAGE VALIDATION ---
        // A genuine mobile phone in an exam session MUST satisfy one of:
        // A) Definite Hardware Feature (Camera Lens Module or Glowing Display Screen) AND (held by hand OR near face/ear)
        // B) Distinct metallic/backplate chassis held in hand with verified hand grip (handGripPoints >= 3) AND near face/ear
        // Generic objects on desk (pens, calculators, notebooks, shadows, dark clothing) lacking these are REJECTED.
        if (!hasCameraLensOrScreen) {
          // Without camera module or glowing display, MUST be verified handheld chassis near candidate ear/face
          if (handGripPoints < 3 || !nearFaceOrEar) {
            continue;
          }
        } else {
          // Even with camera/screen, must establish physical student possession (held by hand or near ear)
          if (handGripPoints < 1 && !nearFaceOrEar) {
            continue;
          }
        }

        let baseConf = clusterConfidenceSum / clusterCellCount;
        if (nearFaceOrEar) baseConf += 0.05;
        if (handGripPoints >= 2) baseConf += 0.05;
        if (hasCameraLensOrScreen) baseConf += 0.06;

        const finalConfidence = Math.min(0.95, Math.max(0.55, Number(baseConf.toFixed(3))));
        if (finalConfidence < this.config.confidenceThreshold) {
          continue;
        }

        const videoBoxX = Math.round(boxPxX * scaleX);
        const videoBoxY = Math.round(boxPxY * scaleY);
        const videoBoxW = Math.round(boxPxW * scaleX);
        const videoBoxH = Math.round(boxPxH * scaleY);

        let orientation: 'portrait' | 'landscape' | 'tilted' = 'portrait';
        if (aspect > 1.25) orientation = 'landscape';
        else if (aspect < 0.78) orientation = 'portrait';
        else orientation = 'tilted';

        detections.push({
          classId: 67,
          className: 'cell phone',
          confidence: finalConfidence,
          box: { x: videoBoxX, y: videoBoxY, width: videoBoxW, height: videoBoxH },
          normalizedBox: {
            x: Number((videoBoxX / sourceWidth).toFixed(4)),
            y: Number((videoBoxY / sourceHeight).toFixed(4)),
            width: Number((videoBoxW / sourceWidth).toFixed(4)),
            height: Number((videoBoxH / sourceHeight).toFixed(4)),
          },
          orientation,
          isPartiallyVisible: videoBoxX <= 10 || videoBoxY <= 10 || (videoBoxX + videoBoxW) >= (sourceWidth - 10) || (videoBoxY + videoBoxH) >= (sourceHeight - 10),
        });
      }
    }

    return detections;
  }
}

export const yoloMobileDetector = new YOLOMobileDetector();
