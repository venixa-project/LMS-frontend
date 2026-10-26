// ============================================================
// LMS - Document Parser Service
// Handles file validation, format verification, text extraction
// for PDF, DOCX, and TXT documents.
// ============================================================
import JSZip from 'jszip';
import { UploadedDocumentInfo } from '../types';

export interface ParseProgressCallback {
  (progress: number, stage: 'validating' | 'reading' | 'extracting' | 'analyzing' | 'ready' | 'error', message: string): void;
}

export interface DocumentParseResult {
  success: boolean;
  docInfo?: UploadedDocumentInfo;
  error?: string;
  isScannedOrImageOnly?: boolean;
}

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB limit
const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain'
];

/**
 * Validates file type, size, and basic integrity before extraction.
 */
export function validateDocumentFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file provided.' };
  }

  if (file.size === 0) {
    return { valid: false, error: 'The selected file is empty (0 bytes). Please upload a valid document.' };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size (${sizeMb} MB) exceeds maximum allowed upload limit of 25 MB.`
    };
  }

  const fileNameLower = file.name.toLowerCase();
  const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => fileNameLower.endsWith(ext));
  const hasValidMime = ALLOWED_MIME_TYPES.includes(file.type) || file.type === '';

  if (!hasValidExt && !hasValidMime) {
    return {
      valid: false,
      error: `Unsupported format "${file.name}". Only PDF (.pdf), Microsoft Word (.docx), and Plain Text (.txt) files are supported.`
    };
  }

  return { valid: true };
}

/**
 * Parses TXT document
 */
async function parseTxtFile(
  file: File,
  onProgress?: ParseProgressCallback
): Promise<string> {
  onProgress?.(30, 'reading', 'Reading text file contents...');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      onProgress?.(80, 'extracting', 'Processing text structure...');
      const text = (e.target?.result as string) || '';
      resolve(text);
    };
    reader.onerror = () => reject(new Error('Failed to read plain text file. The file may be locked or corrupted.'));
    reader.readAsText(file, 'utf-8');
  });
}

/**
 * Parses DOCX document via JSZip and document.xml DOM extraction
 */
async function parseDocxFile(
  file: File,
  onProgress?: ParseProgressCallback
): Promise<string> {
  onProgress?.(25, 'reading', 'Unpacking DOCX document archive...');
  const arrayBuffer = await file.arrayBuffer();

  onProgress?.(50, 'extracting', 'Parsing XML document tree...');
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(arrayBuffer);
  } catch (err: any) {
    throw new Error(`Corrupted DOCX archive: ${err?.message || 'Unable to decompress file structure.'}`);
  }

  const documentXmlFile = zip.file('word/document.xml');
  if (!documentXmlFile) {
    throw new Error('Invalid DOCX format: missing word/document.xml content stream.');
  }

  const xmlText = await documentXmlFile.async('text');
  onProgress?.(75, 'analyzing', 'Extracting structured headings and text paragraphs...');

  // Parse XML using DOMParser
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

  // Check for XML parse errors
  const parseError = xmlDoc.getElementsByTagName('parsererror');
  if (parseError.length > 0) {
    // Fallback: regex extraction of w:t tags
    const tagMatches = xmlText.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
    if (tagMatches && tagMatches.length > 0) {
      return tagMatches
        .map((tag) => tag.replace(/<[^>]+>/g, ''))
        .filter(Boolean)
        .join(' ');
    }
    throw new Error('Failed to parse XML content inside DOCX document.');
  }

  // Extract paragraphs (<w:p>) to preserve structure
  const paragraphs = xmlDoc.getElementsByTagName('w:p');
  const extractedParagraphs: string[] = [];

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    const textNodes = p.getElementsByTagName('w:t');
    let pText = '';
    for (let j = 0; j < textNodes.length; j++) {
      pText += textNodes[j].textContent || '';
    }
    const trimmed = pText.trim();
    if (trimmed) {
      extractedParagraphs.push(trimmed);
    }
  }

  return extractedParagraphs.join('\n\n');
}

/**
 * Parses PDF document using pdfjs-dist or stream fallback
 */
async function parsePdfFile(
  file: File,
  onProgress?: ParseProgressCallback
): Promise<{ text: string; pageCount: number; isScanned: boolean }> {
  onProgress?.(20, 'reading', 'Loading PDF binary stream...');
  const arrayBuffer = await file.arrayBuffer();

  try {
    // Dynamic import to allow clean bundling
    const pdfjs = await import('pdfjs-dist');
    // Configure worker
    if (pdfjs.GlobalWorkerOptions && !pdfjs.GlobalWorkerOptions.workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version || '4.0.379'}/pdf.worker.min.mjs`;
    }

    onProgress?.(45, 'extracting', 'Reading PDF document structure...');
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true
    });

    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    const pageTexts: string[] = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const progressPercent = Math.min(85, Math.round(45 + (pageNum / numPages) * 35));
      onProgress?.(progressPercent, 'extracting', `Extracting text from page ${pageNum} of ${numPages}...`);

      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageStrings = textContent.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .filter(Boolean);

      pageTexts.push(pageStrings.join(' '));
    }

    const fullText = pageTexts.join('\n\n').trim();
    const wordCount = fullText ? fullText.split(/\s+/).filter(Boolean).length : 0;
    const isScanned = numPages > 0 && wordCount < numPages * 10;

    return {
      text: fullText,
      pageCount: numPages,
      isScanned
    };
  } catch (pdfJsError: any) {
    // Fallback: rudimentary direct text stream extractor from PDF bytes
    onProgress?.(65, 'extracting', 'Attempting raw stream fallback extraction...');
    const rawText = extractRawTextFromPdfBytes(arrayBuffer);
    const wordCount = rawText ? rawText.split(/\s+/).filter(Boolean).length : 0;
    if (wordCount > 20) {
      return {
        text: rawText,
        pageCount: 1,
        isScanned: false
      };
    }

    // Check if password protected
    const errorMsg = pdfJsError?.message?.toLowerCase() || '';
    if (errorMsg.includes('password') || errorMsg.includes('encrypt')) {
      throw new Error('This PDF file is password protected or encrypted. Please upload an unlocked PDF.');
    }

    throw new Error(`Unable to extract text from PDF: ${pdfJsError?.message || 'File may be corrupted or unreadable.'}`);
  }
}

/**
 * Fallback raw text extractor for PDF byte streams when worker/canvas fails
 */
function extractRawTextFromPdfBytes(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const len = Math.min(bytes.byteLength, 5 * 1024 * 1024); // read up to 5MB
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  // Look for text in () inside BT ... ET blocks
  const textMatches = binary.match(/\(([^()]{2,})\)\s*T[jJ]/g);
  if (textMatches && textMatches.length > 5) {
    return textMatches
      .map((m) => m.replace(/^[\(\s]+|[\)\sTjJ]+$/g, ''))
      .filter((s) => s.length > 2)
      .join(' ');
  }

  return '';
}

/**
 * Main public extractor: parses PDF, DOCX, or TXT file into UploadedDocumentInfo
 */
export async function extractDocumentContent(
  file: File,
  onProgress?: ParseProgressCallback
): Promise<DocumentParseResult> {
  const validation = validateDocumentFile(file);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error || 'Invalid file uploaded.'
    };
  }

  onProgress?.(10, 'validating', `Validating ${file.name} (${(file.size / 1024).toFixed(1)} KB)...`);

  const fileNameLower = file.name.toLowerCase();

  try {
    let extractedText = '';
    let pageCount: number | undefined;
    let isScannedOrImageOnly = false;

    if (fileNameLower.endsWith('.txt')) {
      extractedText = await parseTxtFile(file, onProgress);
    } else if (fileNameLower.endsWith('.docx')) {
      extractedText = await parseDocxFile(file, onProgress);
    } else if (fileNameLower.endsWith('.pdf')) {
      const pdfRes = await parsePdfFile(file, onProgress);
      extractedText = pdfRes.text;
      pageCount = pdfRes.pageCount;
      isScannedOrImageOnly = pdfRes.isScanned;
    }

    const cleanText = extractedText.replace(/\r\n/g, '\n').trim();
    const words = cleanText ? cleanText.split(/\s+/).filter(Boolean) : [];
    const wordCount = words.length;
    const charCount = cleanText.length;

    onProgress?.(95, 'analyzing', 'Finalizing document structure and word count...');

    if (wordCount < 15 && isScannedOrImageOnly) {
      return {
        success: false,
        isScannedOrImageOnly: true,
        error: `Document "${file.name}" appears to be a scanned image or empty. OCR (Optical Character Recognition) is required to parse scanned documents, or please upload a digital PDF/Word document with selectable text.`
      };
    }

    if (wordCount === 0) {
      return {
        success: false,
        error: `No readable text content could be extracted from "${file.name}". The document may be blank, corrupted, or formatted without selectable text.`
      };
    }

    onProgress?.(100, 'ready', `Extracted ${wordCount.toLocaleString()} words successfully.`);

    const docInfo: UploadedDocumentInfo = {
      id: `doc-${Date.now()}`,
      name: file.name,
      size: file.size,
      type: file.type || fileNameLower.split('.').pop() || 'unknown',
      uploadedAt: new Date().toISOString(),
      text: cleanText,
      wordCount,
      charCount,
      pageCount,
      isScannedOrImageOnly
    };

    return {
      success: true,
      docInfo,
      isScannedOrImageOnly
    };
  } catch (err: any) {
    onProgress?.(100, 'error', err?.message || 'Extraction failed.');
    return {
      success: false,
      error: err?.message || 'An unexpected error occurred while parsing the document.'
    };
  }
}
