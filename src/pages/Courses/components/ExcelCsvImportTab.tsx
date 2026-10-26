import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet, Download, Upload, AlertCircle, CheckCircle2,
  Trash2, Edit2, AlertTriangle, Check, RefreshCw, X, HelpCircle,
  Layers, ArrowRight, Eye, Info
} from 'lucide-react';
import { QuizQuestionItem } from '../../../types';
import {
  downloadFile, generateCsvTemplate, generateExcelXmlTemplate,
  parseCsvLines, validateParsedRow, rowToQuizQuestionItem,
  RawParsedQuestionRow
} from './csvTemplateUtils';

interface Props {
  existingQuestions: QuizQuestionItem[];
  onImportQuestions: (importedQuestions: QuizQuestionItem[]) => void;
  courseTitle: string;
}

export const ExcelCsvImportTab: React.FC<Props> = ({
  existingQuestions,
  onImportQuestions,
  courseTitle
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [rawRows, setRawRows] = useState<RawParsedQuestionRow[]>([]);
  const [filterMode, setFilterMode] = useState<'all' | 'valid' | 'invalid'>('all');
  const [parseError, setParseError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [showConfirmLarge, setShowConfirmLarge] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadCsv = () => {
    const csv = generateCsvTemplate();
    downloadFile('venilearn_question_import_template.csv', csv, 'text/csv;charset=utf-8;');
  };

  const handleDownloadExcel = () => {
    const excelXml = generateExcelXmlTemplate();
    downloadFile('venilearn_question_import_template.xls', excelXml, 'application/vnd.ms-excel;charset=utf-8;');
  };

  const processFile = (uploadedFile: File) => {
    setParseError(null);
    if (!uploadedFile.name.match(/\.(csv|xlsx|xls|txt)$/i)) {
      setParseError('Unsupported file type. Please upload a .csv or .xls / .xlsx spreadsheet file.');
      return;
    }

    if (uploadedFile.size > 10 * 1024 * 1024) {
      setParseError('File size exceeds the 10MB limit. Please upload a smaller spreadsheet.');
      return;
    }

    setFile(uploadedFile);
    setIsParsing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text || text.trim().length === 0) {
          setParseError('The uploaded file is empty.');
          setIsParsing(false);
          return;
        }

        const lines = parseCsvLines(text);
        if (lines.length <= 1) {
          setParseError('File does not appear to contain question data rows below the header row.');
          setIsParsing(false);
          return;
        }

        // Header detection
        const headerRow = lines[0].map((h) => h.toLowerCase());
        const promptIdx = headerRow.findIndex((h) => h.includes('question') || h.includes('prompt') || h.includes('text'));
        const typeIdx = headerRow.findIndex((h) => h.includes('type') || h.includes('format'));
        const optAIdx = headerRow.findIndex((h) => h.includes('option a') || h.includes('opt a') || h === 'a');
        const optBIdx = headerRow.findIndex((h) => h.includes('option b') || h.includes('opt b') || h === 'b');
        const optCIdx = headerRow.findIndex((h) => h.includes('option c') || h.includes('opt c') || h === 'c');
        const optDIdx = headerRow.findIndex((h) => h.includes('option d') || h.includes('opt d') || h === 'd');
        const ansIdx = headerRow.findIndex((h) => h.includes('correct') || h.includes('answer') || h.includes('key'));
        const marksIdx = headerRow.findIndex((h) => h.includes('mark') || h.includes('point') || h.includes('score'));
        const diffIdx = headerRow.findIndex((h) => h.includes('diff') || h.includes('level'));
        const topicIdx = headerRow.findIndex((h) => h.includes('topic') || h.includes('lesson') || h.includes('unit'));
        const expIdx = headerRow.findIndex((h) => h.includes('explain') || h.includes('rationale') || h.includes('notes'));

        const seenPrompts = new Set<string>();
        const parsedRows: RawParsedQuestionRow[] = [];

        for (let r = 1; r < lines.length; r++) {
          const cells = lines[r];
          // skip completely empty rows
          if (cells.every((c) => !c.trim())) continue;

          const rowData = {
            prompt: promptIdx >= 0 ? cells[promptIdx] || '' : cells[0] || '',
            type: typeIdx >= 0 ? cells[typeIdx] || '' : cells[1] || 'single_choice',
            optionA: optAIdx >= 0 ? cells[optAIdx] || '' : cells[2] || '',
            optionB: optBIdx >= 0 ? cells[optBIdx] || '' : cells[3] || '',
            optionC: optCIdx >= 0 ? cells[optCIdx] || '' : cells[4] || '',
            optionD: optDIdx >= 0 ? cells[optDIdx] || '' : cells[5] || '',
            correctAnswer: ansIdx >= 0 ? cells[ansIdx] || '' : cells[6] || '',
            points: marksIdx >= 0 ? cells[marksIdx] || 5 : cells[7] || 5,
            difficulty: diffIdx >= 0 ? cells[diffIdx] || 'medium' : cells[8] || 'medium',
            topic: topicIdx >= 0 ? cells[topicIdx] || '' : cells[9] || '',
            explanation: expIdx >= 0 ? cells[expIdx] || '' : cells[10] || ''
          };

          const validated = validateParsedRow(rowData, r, existingQuestions, seenPrompts);
          parsedRows.push(validated);
        }

        setRawRows(parsedRows);
        setIsParsing(false);
      } catch (err: any) {
        console.error('CSV parse error', err);
        setParseError(`Failed to parse file: ${err.message || 'Invalid format.'}`);
        setIsParsing(false);
      }
    };

    reader.onerror = () => {
      setParseError('Failed to read file from disk.');
      setIsParsing(false);
    };

    reader.readAsText(uploadedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleCellChange = (rowIndex: number, field: keyof RawParsedQuestionRow, value: any) => {
    const updated = [...rawRows];
    const target = { ...updated[rowIndex], [field]: value };

    // Re-validate
    const seenPrompts = new Set<string>();
    // Collect prior prompts
    for (let i = 0; i < updated.length; i++) {
      if (i !== rowIndex && updated[i].prompt) {
        seenPrompts.add(updated[i].prompt.toLowerCase());
      }
    }

    const revalidated = validateParsedRow(
      {
        prompt: target.prompt,
        type: target.type,
        optionA: target.optionA,
        optionB: target.optionB,
        optionC: target.optionC,
        optionD: target.optionD,
        correctAnswer: target.correctAnswer,
        points: target.points,
        difficulty: target.difficulty,
        topic: target.topic,
        explanation: target.explanation
      },
      target.rowNumber,
      existingQuestions,
      seenPrompts
    );

    updated[rowIndex] = revalidated;
    setRawRows(updated);
  };

  const handleDeleteRow = (rowIndex: number) => {
    setRawRows(rawRows.filter((_, i) => i !== rowIndex));
  };

  const totalCount = rawRows.length;
  const validRows = rawRows.filter((r) => r.isValid);
  const invalidRows = rawRows.filter((r) => !r.isValid);
  const duplicateRows = rawRows.filter((r) => r.isDuplicate);

  const displayedRows = rawRows.filter((r) => {
    if (filterMode === 'valid') return r.isValid;
    if (filterMode === 'invalid') return !r.isValid;
    return true;
  });

  const triggerImport = (onlyValid: boolean) => {
    const rowsToImport = onlyValid ? validRows : rawRows.filter((r) => r.isValid);
    if (rowsToImport.length === 0) {
      alert('There are no valid questions ready to import.');
      return;
    }

    const converted = rowsToImport.map((row, i) => rowToQuizQuestionItem(row, i));
    onImportQuestions(converted);

    // Reset view
    setFile(null);
    setRawRows([]);
    setShowConfirmLarge(false);
  };

  const handleConfirmImport = (onlyValid: boolean) => {
    const count = onlyValid ? validRows.length : rawRows.filter((r) => r.isValid).length;
    if (count > 15) {
      setShowConfirmLarge(true);
    } else {
      triggerImport(onlyValid);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header Info & Template Downloads */}
      <div
        style={{
          padding: '14px 18px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(16, 185, 129, 0.05))',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: 'var(--primary-light, rgba(99, 102, 241, 0.15))',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>
              Bulk Question Import from Spreadsheet
            </div>
            <p className="text-secondary text-xs" style={{ margin: '2px 0 0' }}>
              Import single-choice, multiple-choice, true/false, and short-answer questions in bulk using Excel or CSV.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleDownloadCsv}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}
          >
            <Download size={13} /> Download CSV Template
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleDownloadExcel}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}
          >
            <Download size={13} /> Download Excel Template
          </button>
        </div>
      </div>

      {/* Upload Zone */}
      {!file && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: isDragging ? '2px dashed var(--primary)' : '2px dashed var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '36px 20px',
            textAlign: 'center',
            background: isDragging ? 'var(--primary-light, rgba(99, 102, 241, 0.08))' : 'var(--bg-input)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv, .xlsx, .xls, text/csv, application/vnd.ms-excel"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                processFile(e.target.files[0]);
              }
            }}
          />

          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'var(--primary-light, rgba(99, 102, 241, 0.12))',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px'
            }}
          >
            <Upload size={22} />
          </div>

          <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '4px' }}>
            Click to upload or drag & drop your Excel or CSV file
          </div>
          <p className="text-secondary text-xs" style={{ margin: 0 }}>
            Supports <strong>.csv</strong>, <strong>.xlsx</strong>, and <strong>.xls</strong> up to 10MB
          </p>

          <div
            style={{
              marginTop: '16px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.75rem',
              color: 'var(--text-muted)'
            }}
          >
            <Info size={13} />
            <span>Expected columns: Question Text, Question Type, Option A-D, Correct Answer, Marks, Difficulty</span>
          </div>
        </div>
      )}

      {/* Parse Error Alert */}
      {parseError && (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--danger-bg, rgba(239, 68, 68, 0.1))',
            border: '1px solid var(--danger, #ef4444)',
            color: 'var(--danger, #ef4444)',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <AlertCircle size={16} />
          <span>{parseError}</span>
        </div>
      )}

      {/* Parsing Loading State */}
      {isParsing && (
        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
          <RefreshCw size={24} className="spin" style={{ margin: '0 auto 8px', animation: 'spin 1s linear infinite' }} />
          <div>Parsing spreadsheet data and evaluating question rules...</div>
        </div>
      )}

      {/* Preview Table & Validation Summary */}
      {file && !isParsing && rawRows.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Summary Strip */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              background: 'var(--bg-input)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className="text-sm font-semibold">{file.name}</span>
              <span className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>
                {totalCount} Total Rows
              </span>
              <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                <Check size={11} style={{ marginRight: '3px' }} /> {validRows.length} Valid
              </span>
              {invalidRows.length > 0 && (
                <span className="badge badge-danger" style={{ fontSize: '0.75rem' }}>
                  <AlertCircle size={11} style={{ marginRight: '3px' }} /> {invalidRows.length} Invalid
                </span>
              )}
              {duplicateRows.length > 0 && (
                <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>
                  <AlertTriangle size={11} style={{ marginRight: '3px' }} /> {duplicateRows.length} Duplicate(s)
                </span>
              )}
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  border: '1px solid var(--border-subtle)',
                  background: filterMode === 'all' ? 'var(--primary)' : 'var(--bg-surface)',
                  color: filterMode === 'all' ? '#fff' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                All ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('valid')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  border: '1px solid var(--border-subtle)',
                  background: filterMode === 'valid' ? 'var(--success)' : 'var(--bg-surface)',
                  color: filterMode === 'valid' ? '#fff' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                Valid ({validRows.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('invalid')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  border: '1px solid var(--border-subtle)',
                  background: filterMode === 'invalid' ? 'var(--danger)' : 'var(--bg-surface)',
                  color: filterMode === 'invalid' ? '#fff' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                Errors ({invalidRows.length})
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setFile(null);
                  setRawRows([]);
                }}
                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                title="Clear spreadsheet and upload a different file"
              >
                Change File
              </button>
            </div>
          </div>

          {/* Inline Edit Notice */}
          <div className="text-muted text-xs" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Edit2 size={12} />
            <span>You can click and edit any cell directly below to correct errors before confirming the import.</span>
          </div>

          {/* Table Container */}
          <div
            style={{
              maxHeight: '380px',
              overflowY: 'auto',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface)'
            }}
          >
            <table className="table" style={{ width: '100%', margin: 0, fontSize: '0.8rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-input)', position: 'sticky', top: 0, zIndex: 1, borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ width: '45px', padding: '8px', textAlign: 'center' }}>#</th>
                  <th style={{ width: '85px', padding: '8px' }}>Status</th>
                  <th style={{ minWidth: '220px', padding: '8px' }}>Question Text</th>
                  <th style={{ width: '120px', padding: '8px' }}>Type</th>
                  <th style={{ width: '130px', padding: '8px' }}>Options / Answers</th>
                  <th style={{ width: '100px', padding: '8px' }}>Correct Key</th>
                  <th style={{ width: '60px', padding: '8px', textAlign: 'center' }}>Marks</th>
                  <th style={{ width: '90px', padding: '8px' }}>Difficulty</th>
                  <th style={{ width: '50px', padding: '8px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {displayedRows.map((row, idx) => {
                  const originalIndex = rawRows.findIndex((r) => r.rowNumber === row.rowNumber);

                  return (
                    <React.Fragment key={row.rowNumber}>
                      <tr
                        style={{
                          background: !row.isValid
                            ? 'rgba(239, 68, 68, 0.05)'
                            : row.isDuplicate
                            ? 'rgba(245, 158, 11, 0.05)'
                            : 'transparent',
                          borderBottom: row.errors.length > 0 ? 'none' : '1px solid var(--border-subtle)'
                        }}
                      >
                        <td style={{ textAlign: 'center', padding: '8px', fontWeight: 600, color: 'var(--text-muted)' }}>
                          {row.rowNumber}
                        </td>
                        <td style={{ padding: '8px' }}>
                          {row.isValid ? (
                            <span className="badge badge-success" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                              Valid
                            </span>
                          ) : (
                            <span className="badge badge-danger" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                              Error
                            </span>
                          )}
                          {row.isDuplicate && (
                            <span className="badge badge-warning" style={{ fontSize: '0.65rem', padding: '1px 4px', marginTop: '2px', display: 'block' }}>
                              Duplicate
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <input
                            type="text"
                            value={row.prompt}
                            onChange={(e) => handleCellChange(originalIndex, 'prompt', e.target.value)}
                            className="form-input"
                            style={{
                              padding: '4px 6px',
                              fontSize: '0.8rem',
                              borderColor: !row.prompt ? 'var(--danger)' : undefined
                            }}
                          />
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <select
                            value={row.type}
                            onChange={(e) => handleCellChange(originalIndex, 'type', e.target.value)}
                            className="form-select"
                            style={{ padding: '4px 6px', fontSize: '0.78rem' }}
                          >
                            <option value="single_choice">Single Choice</option>
                            <option value="multiple_choice">Multiple Select</option>
                            <option value="true_false">True / False</option>
                            <option value="short_answer">Short Answer</option>
                          </select>
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          {row.type === 'true_false' ? (
                            <span className="text-muted text-xs">True / False</span>
                          ) : row.type === 'short_answer' ? (
                            <span className="text-muted text-xs">Direct Answer</span>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <input
                                type="text"
                                placeholder="A: text"
                                value={row.optionA}
                                onChange={(e) => handleCellChange(originalIndex, 'optionA', e.target.value)}
                                style={{ padding: '2px 4px', fontSize: '0.72rem', borderRadius: '3px', border: '1px solid var(--border-subtle)', background: 'var(--bg-input)' }}
                              />
                              <input
                                type="text"
                                placeholder="B: text"
                                value={row.optionB}
                                onChange={(e) => handleCellChange(originalIndex, 'optionB', e.target.value)}
                                style={{ padding: '2px 4px', fontSize: '0.72rem', borderRadius: '3px', border: '1px solid var(--border-subtle)', background: 'var(--bg-input)' }}
                              />
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <input
                            type="text"
                            value={row.correctAnswer}
                            placeholder={row.type === 'true_false' ? 'True / False' : 'A, B...'}
                            onChange={(e) => handleCellChange(originalIndex, 'correctAnswer', e.target.value)}
                            style={{
                              padding: '4px 6px',
                              fontSize: '0.78rem',
                              width: '100%',
                              borderRadius: '4px',
                              border: '1px solid var(--border-subtle)',
                              background: 'var(--bg-input)'
                            }}
                          />
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={row.points}
                            onChange={(e) => handleCellChange(originalIndex, 'points', e.target.value)}
                            style={{
                              padding: '4px',
                              fontSize: '0.78rem',
                              width: '45px',
                              textAlign: 'center',
                              borderRadius: '4px',
                              border: '1px solid var(--border-subtle)',
                              background: 'var(--bg-input)'
                            }}
                          />
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <select
                            value={row.difficulty}
                            onChange={(e) => handleCellChange(originalIndex, 'difficulty', e.target.value)}
                            className="form-select"
                            style={{ padding: '4px 6px', fontSize: '0.75rem' }}
                          >
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                          </select>
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(originalIndex)}
                            className="btn-icon"
                            style={{ color: 'var(--danger, #ef4444)' }}
                            title="Remove Row"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>

                      {/* Display Row Errors */}
                      {row.errors.length > 0 && (
                        <tr style={{ background: 'rgba(239, 68, 68, 0.08)', borderBottom: '1px solid var(--border-subtle)' }}>
                          <td colSpan={9} style={{ padding: '4px 12px 8px 36px', color: 'var(--danger)', fontSize: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <AlertCircle size={13} style={{ flexShrink: 0 }} />
                              <span>{row.errors.join(' • ')}</span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom Import Actions Toolbar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              background: 'var(--bg-input)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div className="text-xs text-secondary">
              Importing will append verified questions to the current assessment question set.
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              {invalidRows.length > 0 && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleConfirmImport(true)}
                  disabled={validRows.length === 0}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
                >
                  <CheckCircle2 size={15} /> Import {validRows.length} Valid Questions Only
                </button>
              )}

              {invalidRows.length === 0 && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleConfirmImport(false)}
                  disabled={rawRows.length === 0}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
                >
                  <CheckCircle2 size={15} /> Import All {rawRows.length} Questions
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Large Batch Import */}
      {showConfirmLarge && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '16px'
          }}
        >
          <div className="card" style={{ maxWidth: '440px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'var(--primary-light, rgba(99, 102, 241, 0.15))',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Layers size={18} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Confirm Bulk Import</h4>
                <span className="text-muted text-xs">Target: {courseTitle}</span>
              </div>
            </div>

            <p className="text-secondary text-sm" style={{ margin: '0 0 16px' }}>
              You are about to add <strong>{validRows.length} questions</strong> from <strong>{file?.name}</strong> directly into this assessment. Questions can be reviewed and edited at any time.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowConfirmLarge(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => triggerImport(true)}
              >
                Confirm & Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
