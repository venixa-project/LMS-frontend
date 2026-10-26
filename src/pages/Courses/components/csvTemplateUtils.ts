import { QuizQuestionItem, QuizOption } from '../../../types';

/**
 * Native client-side file downloader
 */
export const downloadFile = (filename: string, content: string, mimeType = 'text/csv;charset=utf-8;') => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Standard CSV template content with instructions and sample rows
 */
export const generateCsvTemplate = (): string => {
  const headers = [
    'Question Text',
    'Question Type',
    'Option A',
    'Option B',
    'Option C',
    'Option D',
    'Correct Answer',
    'Marks',
    'Difficulty',
    'Topic / Lesson',
    'Explanation'
  ];

  const sampleRows = [
    [
      'In Domain-Driven Design, what is the primary role of an Aggregate Root?',
      'single_choice',
      'To enforce internal consistency and transactional invariants',
      'To expose direct SQL queries to public clients',
      'To replicate database backup tapes',
      'To act as a reverse proxy for HTTP caching',
      'A',
      '5',
      'medium',
      'Domain-Driven Design',
      'The Aggregate Root is the boundary entity through which external references access internal domain items.'
    ],
    [
      'Which architectural patterns prevent cascading outages in distributed microservices? (Select all that apply)',
      'multiple_choice',
      'Circuit Breakers with fallback responses',
      'Database-per-service pattern',
      'Synchronous hardcoded HTTP call chains',
      'Idempotent event consumer handlers',
      'A,B,D',
      '10',
      'hard',
      'Resiliency Patterns',
      'Circuit breakers, database isolation, and idempotence ensure resilience. Synchronous chains worsen cascading failure.'
    ],
    [
      'In Apache Kafka, a single partition within a topic can be actively read by multiple consumers belonging to the same consumer group.',
      'true_false',
      '',
      '',
      '',
      '',
      'False',
      '5',
      'easy',
      'Kafka Architecture',
      'False. Within a single consumer group, each partition is exclusively assigned to at most one consumer instance.'
    ],
    [
      'What design pattern uses compensating local transactions to handle rollbacks across multiple distributed services?',
      'short_answer',
      '',
      '',
      '',
      '',
      'Saga',
      '5',
      'medium',
      'Distributed Transactions',
      'The Saga pattern orchestrates a series of local transactions with corresponding compensating actions upon failure.'
    ]
  ];

  const escapeCell = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n') || val.includes('\r')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const csvContent = [
    headers.map(escapeCell).join(','),
    ...sampleRows.map((r) => r.map(escapeCell).join(','))
  ].join('\r\n');

  return csvContent;
};

/**
 * Excel compatible XML spreadsheet template
 */
export const generateExcelXmlTemplate = (): string => {
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#4F46E5"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#4F46E5" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="QuestionImportTemplate">
  <Table>
   <Column ss:Width="280"/>
   <Column ss:Width="110"/>
   <Column ss:Width="160"/>
   <Column ss:Width="160"/>
   <Column ss:Width="160"/>
   <Column ss:Width="160"/>
   <Column ss:Width="100"/>
   <Column ss:Width="50"/>
   <Column ss:Width="80"/>
   <Column ss:Width="140"/>
   <Column ss:Width="240"/>
   <Row ss:StyleID="Header" ss:Height="24">
    <Cell><Data ss:Type="String">Question Text</Data></Cell>
    <Cell><Data ss:Type="String">Question Type</Data></Cell>
    <Cell><Data ss:Type="String">Option A</Data></Cell>
    <Cell><Data ss:Type="String">Option B</Data></Cell>
    <Cell><Data ss:Type="String">Option C</Data></Cell>
    <Cell><Data ss:Type="String">Option D</Data></Cell>
    <Cell><Data ss:Type="String">Correct Answer</Data></Cell>
    <Cell><Data ss:Type="String">Marks</Data></Cell>
    <Cell><Data ss:Type="String">Difficulty</Data></Cell>
    <Cell><Data ss:Type="String">Topic / Lesson</Data></Cell>
    <Cell><Data ss:Type="String">Explanation</Data></Cell>
   </Row>
   <Row ss:Height="20">
    <Cell><Data ss:Type="String">In Domain-Driven Design, what is the primary role of an Aggregate Root?</Data></Cell>
    <Cell><Data ss:Type="String">single_choice</Data></Cell>
    <Cell><Data ss:Type="String">To enforce internal consistency and transactional invariants</Data></Cell>
    <Cell><Data ss:Type="String">To expose direct SQL queries to public clients</Data></Cell>
    <Cell><Data ss:Type="String">To replicate database backup tapes</Data></Cell>
    <Cell><Data ss:Type="String">To act as a reverse proxy for HTTP caching</Data></Cell>
    <Cell><Data ss:Type="String">A</Data></Cell>
    <Cell><Data ss:Type="Number">5</Data></Cell>
    <Cell><Data ss:Type="String">medium</Data></Cell>
    <Cell><Data ss:Type="String">Domain-Driven Design</Data></Cell>
    <Cell><Data ss:Type="String">Protects consistency boundaries.</Data></Cell>
   </Row>
   <Row ss:Height="20">
    <Cell><Data ss:Type="String">Which architectural patterns prevent cascading outages in distributed microservices?</Data></Cell>
    <Cell><Data ss:Type="String">multiple_choice</Data></Cell>
    <Cell><Data ss:Type="String">Circuit Breakers with fallback responses</Data></Cell>
    <Cell><Data ss:Type="String">Database-per-service pattern</Data></Cell>
    <Cell><Data ss:Type="String">Synchronous hardcoded HTTP call chains</Data></Cell>
    <Cell><Data ss:Type="String">Idempotent event consumer handlers</Data></Cell>
    <Cell><Data ss:Type="String">A,B,D</Data></Cell>
    <Cell><Data ss:Type="Number">10</Data></Cell>
    <Cell><Data ss:Type="String">hard</Data></Cell>
    <Cell><Data ss:Type="String">Resiliency Patterns</Data></Cell>
    <Cell><Data ss:Type="String">Circuit breakers, database isolation, and idempotence ensure resilience.</Data></Cell>
   </Row>
   <Row ss:Height="20">
    <Cell><Data ss:Type="String">In Apache Kafka, a single partition can be read concurrently by multiple consumers in the same group.</Data></Cell>
    <Cell><Data ss:Type="String">true_false</Data></Cell>
    <Cell><Data ss:Type="String"></Data></Cell>
    <Cell><Data ss:Type="String"></Data></Cell>
    <Cell><Data ss:Type="String"></Data></Cell>
    <Cell><Data ss:Type="String"></Data></Cell>
    <Cell><Data ss:Type="String">False</Data></Cell>
    <Cell><Data ss:Type="Number">5</Data></Cell>
    <Cell><Data ss:Type="String">easy</Data></Cell>
    <Cell><Data ss:Type="String">Kafka Architecture</Data></Cell>
    <Cell><Data ss:Type="String">Each partition is assigned to at most one consumer instance per group.</Data></Cell>
   </Row>
   <Row ss:Height="20">
    <Cell><Data ss:Type="String">What pattern uses compensating transactions to coordinate rollbacks?</Data></Cell>
    <Cell><Data ss:Type="String">short_answer</Data></Cell>
    <Cell><Data ss:Type="String"></Data></Cell>
    <Cell><Data ss:Type="String"></Data></Cell>
    <Cell><Data ss:Type="String"></Data></Cell>
    <Cell><Data ss:Type="String"></Data></Cell>
    <Cell><Data ss:Type="String">Saga</Data></Cell>
    <Cell><Data ss:Type="Number">5</Data></Cell>
    <Cell><Data ss:Type="String">medium</Data></Cell>
    <Cell><Data ss:Type="String">Distributed Transactions</Data></Cell>
    <Cell><Data ss:Type="String">The Saga pattern coordinates local transactions with compensating steps.</Data></Cell>
   </Row>
  </Table>
 </Worksheet>
</Workbook>`;
};

export interface RawParsedQuestionRow {
  rowNumber: number;
  prompt: string;
  type: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  points: string | number;
  difficulty: string;
  topic: string;
  explanation: string;
  errors: string[];
  isDuplicate: boolean;
  isValid: boolean;
}

/**
 * Robust CSV Line Parser taking into account quotes and commas
 */
export const parseCsvLines = (text: string): string[][] => {
  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentVal = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(currentVal.trim());
      currentVal = '';
      if (row.some((cell) => cell.length > 0)) {
        lines.push(row);
      }
      row = [];
    } else {
      currentVal += char;
    }
  }

  if (currentVal.length > 0 || row.length > 0) {
    row.push(currentVal.trim());
    if (row.some((cell) => cell.length > 0)) {
      lines.push(row);
    }
  }

  return lines;
};

/**
 * Validates a parsed row against question requirements and formats QuizQuestionItem
 */
export const validateParsedRow = (
  row: {
    prompt: string;
    type: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctAnswer: string;
    points: any;
    difficulty: string;
    topic: string;
    explanation: string;
  },
  rowNumber: number,
  existingQuestions: QuizQuestionItem[],
  seenPromptsInFile: Set<string>
): RawParsedQuestionRow => {
  const errors: string[] = [];
  const prompt = (row.prompt || '').trim();

  if (!prompt) {
    errors.push('Question text is missing.');
  }

  // Type normalization
  let normalizedType: 'single_choice' | 'multiple_choice' | 'true_false' | 'short_answer' = 'single_choice';
  const rawType = (row.type || '').toLowerCase().replace(/[\s-_]/g, '');

  if (rawType.includes('single') || rawType === 'sc' || rawType === 'mcq' || rawType === 'multiplechoice' && !(row.correctAnswer || '').includes(',')) {
    normalizedType = 'single_choice';
  } else if (rawType.includes('multi') || rawType === 'msq' || (row.correctAnswer || '').includes(',')) {
    normalizedType = 'multiple_choice';
  } else if (rawType.includes('true') || rawType.includes('tf') || rawType === 'boolean') {
    normalizedType = 'true_false';
  } else if (rawType.includes('short') || rawType.includes('fill') || rawType.includes('text')) {
    normalizedType = 'short_answer';
  } else if (prompt) {
    errors.push(`Unrecognized question type: "${row.type}". Must be single_choice, multiple_choice, true_false, or short_answer.`);
  }

  const rawAns = (row.correctAnswer || '').trim();

  // Validate answer & options by type
  if (normalizedType === 'single_choice') {
    if (!row.optionA && !row.optionB) {
      errors.push('Single-choice questions require at least Option A and Option B.');
    }
    if (!rawAns) {
      errors.push('Correct answer must be specified (e.g. "A", "B", or option text).');
    }
  } else if (normalizedType === 'multiple_choice') {
    if (!row.optionA && !row.optionB) {
      errors.push('Multiple-select questions require at least Option A and Option B.');
    }
    if (!rawAns) {
      errors.push('At least one correct answer must be specified (e.g. "A, B" or option text).');
    }
  } else if (normalizedType === 'true_false') {
    const validTf = ['true', 'false', 't', 'f', 'yes', 'no', '1', '0'];
    if (!rawAns || !validTf.includes(rawAns.toLowerCase())) {
      errors.push('True/False questions require Correct Answer to be "True" or "False".');
    }
  } else if (normalizedType === 'short_answer') {
    if (!rawAns) {
      errors.push('Short answer questions require an expected answer keyword/key.');
    }
  }

  // Points check
  const pts = Number(row.points);
  if (isNaN(pts) || pts <= 0) {
    errors.push('Marks must be a positive number (e.g. 5 or 10).');
  }

  // Difficulty normalization
  let difficulty = (row.difficulty || 'medium').toLowerCase();
  if (!['easy', 'medium', 'hard'].includes(difficulty)) {
    difficulty = 'medium';
  }

  // Duplicate detection
  const normalizedPrompt = prompt.toLowerCase();
  const isDuplicateInFile = seenPromptsInFile.has(normalizedPrompt);
  if (prompt) seenPromptsInFile.add(normalizedPrompt);

  const isDuplicateExisting = existingQuestions.some(
    (q) => q.prompt.trim().toLowerCase() === normalizedPrompt
  );

  const isDuplicate = isDuplicateInFile || isDuplicateExisting;

  return {
    rowNumber,
    prompt,
    type: normalizedType,
    optionA: row.optionA || '',
    optionB: row.optionB || '',
    optionC: row.optionC || '',
    optionD: row.optionD || '',
    correctAnswer: rawAns,
    points: isNaN(pts) || pts <= 0 ? 5 : pts,
    difficulty,
    topic: (row.topic || '').trim(),
    explanation: (row.explanation || '').trim(),
    errors,
    isDuplicate,
    isValid: errors.length === 0
  };
};

/**
 * Transforms validated row into a QuizQuestionItem
 */
export const rowToQuizQuestionItem = (row: RawParsedQuestionRow, indexOffset = 0): QuizQuestionItem => {
  const id = `q-imp-${Date.now()}-${row.rowNumber}-${indexOffset}`;
  const points = Number(row.points) || 5;
  const difficulty = (row.difficulty === 'easy' || row.difficulty === 'hard') ? row.difficulty : 'medium';

  if (row.type === 'true_false') {
    const isTrue = ['true', 't', 'yes', '1'].includes(row.correctAnswer.toLowerCase());
    return {
      id,
      prompt: row.prompt,
      type: 'true_false',
      options: [
        { id: `opt-${id}-1`, text: 'True', isCorrect: isTrue },
        { id: `opt-${id}-2`, text: 'False', isCorrect: !isTrue }
      ],
      points,
      difficulty,
      explanation: row.explanation || undefined,
      topic: row.topic || undefined,
      source: 'excel_csv'
    };
  }

  if (row.type === 'short_answer') {
    return {
      id,
      prompt: row.prompt,
      type: 'short_answer',
      options: [],
      correctAnswerText: row.correctAnswer,
      points,
      difficulty,
      explanation: row.explanation || undefined,
      topic: row.topic || undefined,
      source: 'excel_csv'
    };
  }

  // Single choice & Multiple choice
  const rawAns = row.correctAnswer.toLowerCase();
  const ansTokens = rawAns.split(/[,;\s]+/).map((t) => t.trim().toLowerCase());

  const options: QuizOption[] = [];

  const checkCorrect = (letter: string, text: string) => {
    if (!text) return false;
    const l = letter.toLowerCase();
    const t = text.toLowerCase();
    return (
      ansTokens.includes(l) ||
      ansTokens.includes(`option ${l}`) ||
      ansTokens.includes(t) ||
      rawAns === l ||
      rawAns === t
    );
  };

  if (row.optionA) {
    options.push({
      id: `opt-${id}-a`,
      text: row.optionA,
      isCorrect: checkCorrect('A', row.optionA)
    });
  }
  if (row.optionB) {
    options.push({
      id: `opt-${id}-b`,
      text: row.optionB,
      isCorrect: checkCorrect('B', row.optionB)
    });
  }
  if (row.optionC) {
    options.push({
      id: `opt-${id}-c`,
      text: row.optionC,
      isCorrect: checkCorrect('C', row.optionC)
    });
  }
  if (row.optionD) {
    options.push({
      id: `opt-${id}-d`,
      text: row.optionD,
      isCorrect: checkCorrect('D', row.optionD)
    });
  }

  // If no option matched correctly, default to first option
  if (options.length > 0 && !options.some((o) => o.isCorrect)) {
    options[0].isCorrect = true;
  }

  return {
    id,
    prompt: row.prompt,
    type: row.type as 'single_choice' | 'multiple_choice',
    options,
    points,
    difficulty,
    explanation: row.explanation || undefined,
    topic: row.topic || undefined,
    source: 'excel_csv'
  };
};

/**
 * Exports current questions to CSV format
 */
export const exportQuestionsToCsv = (questions: QuizQuestionItem[], filename = 'assessment_questions.csv') => {
  const headers = [
    'Question Text',
    'Question Type',
    'Option A',
    'Option B',
    'Option C',
    'Option D',
    'Correct Answer',
    'Marks',
    'Difficulty',
    'Topic / Lesson',
    'Explanation'
  ];

  const escapeCell = (val: string) => {
    if (!val) return '';
    if (val.includes(',') || val.includes('"') || val.includes('\n') || val.includes('\r')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const rows = questions.map((q) => {
    let optA = '';
    let optB = '';
    let optC = '';
    let optD = '';
    let correct = '';

    if (q.type === 'true_false') {
      const trueOpt = q.options.find((o) => o.text.toLowerCase() === 'true');
      correct = trueOpt && trueOpt.isCorrect ? 'True' : 'False';
    } else if (q.type === 'short_answer') {
      correct = q.correctAnswerText || '';
    } else {
      optA = q.options[0]?.text || '';
      optB = q.options[1]?.text || '';
      optC = q.options[2]?.text || '';
      optD = q.options[3]?.text || '';

      const letters: string[] = [];
      q.options.forEach((opt, idx) => {
        if (opt.isCorrect) {
          letters.push(['A', 'B', 'C', 'D'][idx] || `Opt${idx + 1}`);
        }
      });
      correct = letters.join(', ');
    }

    return [
      escapeCell(q.prompt),
      escapeCell(q.type),
      escapeCell(optA),
      escapeCell(optB),
      escapeCell(optC),
      escapeCell(optD),
      escapeCell(correct),
      String(q.points || 5),
      escapeCell(q.difficulty || 'medium'),
      escapeCell(q.topic || ''),
      escapeCell(q.explanation || '')
    ].join(',');
  });

  const csvString = [headers.join(','), ...rows].join('\r\n');
  downloadFile(filename, csvString, 'text/csv;charset=utf-8;');
};
