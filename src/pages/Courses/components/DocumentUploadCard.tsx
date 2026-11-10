import React, { useRef, useState } from 'react';
import { FileText, Upload, CheckCircle2, AlertCircle, X, Download, RefreshCw } from 'lucide-react';
import { UploadedDocumentInfo } from '../../../types';
import { registerDocumentFile } from '../../../lib/videoService';
import { apiClient } from '../../../lib/apiClient';

interface Props {
  document?: UploadedDocumentInfo;
  onUpload: (doc: UploadedDocumentInfo) => void;
  onRemove: () => void;
}

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.txt', '.pptx', '.zip'];

export const DocumentUploadCard: React.FC<Props> = ({
  document,
  onUpload,
  onRemove,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const processFile = async (file: File) => {
    setUploadError(null);

    // Validate size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadError(`File is too large (${formatFileSize(file.size)}). Maximum allowed size is 25 MB.`);
      return;
    }

    // Validate extension
    const fileName = file.name.toLowerCase();
    const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => fileName.endsWith(ext));
    if (!hasValidExt) {
      setUploadError(
        `Invalid file type. Supported document formats: ${ALLOWED_EXTENSIONS.join(', ')}`
      );
      return;
    }

    setIsUploading(true);

    const isTextReadable =
      fileName.endsWith('.txt') ||
      fileName.endsWith('.md') ||
      fileName.endsWith('.json') ||
      fileName.endsWith('.java') ||
      file.type.startsWith('text/');

    const docId = `doc-${Date.now()}`;
    const objectUrl = URL.createObjectURL(file);

    let textContent: string | undefined = undefined;
    if (isTextReadable) {
      try {
        textContent = await file.text();
      } catch (e) {
        console.warn('Could not read file as text', e);
      }
    }

    let serverUrl: string | undefined = undefined;
    try {
      const formData = new FormData();
      formData.append('document', file);
      const res = await apiClient.upload<{ url: string; storagePath: string; fileName: string }>('/courses/upload-document', formData);
      if (res?.data?.url) {
        serverUrl = res.data.url;
      } else if (res?.data?.storagePath) {
        serverUrl = res.data.storagePath;
      }
    } catch (err: any) {
      console.warn('Backend document upload failed; using fallback object URL', err);
    }

    const finalUrl = serverUrl || objectUrl;
    registerDocumentFile(docId, file, finalUrl, textContent);

    const words = textContent ? textContent.split(/\s+/).filter(Boolean).length : 0;
    const docInfo: UploadedDocumentInfo = {
      id: docId,
      name: file.name,
      size: file.size,
      type: file.type || 'application/pdf',
      uploadedAt: new Date().toISOString(),
      url: finalUrl,
      text: textContent,
      wordCount: words || undefined,
      charCount: textContent?.length,
      pageCount: words > 0 ? Math.max(1, Math.ceil(words / 350)) : Math.max(1, Math.ceil(file.size / (120 * 1024))),
    };

    onUpload(docInfo);
    setIsUploading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // reset input value so re-selecting same file triggers event
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div style={{ marginTop: '8px' }}>
      <input
        type="file"
        ref={fileInputRef}
        accept={ALLOWED_EXTENSIONS.join(',')}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {uploadError && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--danger-bg, rgba(239, 68, 68, 0.1))',
            border: '1px solid var(--danger, #ef4444)',
            color: 'var(--danger, #ef4444)',
            fontSize: '0.8rem',
            marginBottom: '8px',
          }}
        >
          <AlertCircle size={14} style={{ flexShrink: 0 }} />
          <span>{uploadError}</span>
        </div>
      )}

      {document ? (
        // Uploaded Document Card
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            gap: '10px',
            fontSize: '0.82rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
            <span
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '6px',
                background: 'rgba(6, 182, 212, 0.12)',
                color: 'var(--accent-cyan, #06b6d4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <FileText size={16} />
            </span>

            <div style={{ overflow: 'hidden' }}>
              <div
                style={{
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                }}
                title={document.name}
              >
                {document.name}
              </div>
              <div
                className="text-muted text-xs"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <span>{formatFileSize(document.size)}</span>
                <span>&bull;</span>
                <span style={{ color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <CheckCircle2 size={11} /> Ready as AI Source
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => fileInputRef.current?.click()}
              title="Replace Document"
              style={{ padding: '3px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <RefreshCw size={12} /> Replace
            </button>
            <button
              type="button"
              className="btn-icon"
              onClick={onRemove}
              title="Remove Document"
              style={{ color: 'var(--text-muted)', padding: '4px' }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ) : (
        // Drag and Drop Upload Area
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `1.5px dashed ${dragOver ? 'var(--primary)' : 'var(--border-subtle)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '12px 14px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragOver ? 'var(--primary-light, rgba(99, 102, 241, 0.08))' : 'var(--bg-surface)',
            transition: 'all 0.18s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Upload size={16} color="var(--primary)" />
            <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
              {isUploading ? 'Processing Document...' : 'Attach Learning Document / PDF'}
            </span>
            <span className="text-muted text-xs">
              (PDF, DOCX, TXT up to 25MB)
            </span>
          </div>
          <p className="text-muted text-xs" style={{ margin: '3px 0 0', fontSize: '0.72rem' }}>
            Attached documents are parsed and selectable as context for AI Quiz & Assessment generation.
          </p>
        </div>
      )}
    </div>
  );
};
