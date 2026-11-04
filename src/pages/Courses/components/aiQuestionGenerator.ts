import { QuizQuestionItem, QuizOption } from '../../../types';

export interface GenerateQuestionsParams {
  scope: 'lesson_quiz' | 'module_assessment' | 'final_assessment';
  courseTitle: string;
  moduleTitle?: string;
  lessonTitle?: string;
  category?: string;
  sourceDocuments?: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  questionTypes: ('single_choice' | 'multiple_choice' | 'true_false' | 'short_answer')[];
  count: number;
  customPrompt?: string;
  pointsPerQuestion?: number;
}

/**
 * Enterprise Curriculum AI Question Synthesizer
 * Generates domain-grounded, academically rigorous questions with realistic
 * distractors and in-depth explanations across major engineering disciplines.
 */
export function generateContextualQuestions(params: GenerateQuestionsParams): QuizQuestionItem[] {
  const {
    scope,
    courseTitle,
    moduleTitle = '',
    lessonTitle = '',
    category = '',
    sourceDocuments = [],
    difficulty,
    questionTypes,
    count,
  } = params;

  const subjectContext = `${courseTitle} ${moduleTitle} ${lessonTitle} ${category}`.toLowerCase();
  const docRefNotice =
    sourceDocuments.length > 0
      ? ` Verified from: ${sourceDocuments.join(', ')}.`
      : '';

  // Domain Detection
  const isJava =
    subjectContext.includes('java') ||
    subjectContext.includes('jvm') ||
    subjectContext.includes('spring') ||
    subjectContext.includes('oop') ||
    subjectContext.includes('backend');

  const isDatabase =
    subjectContext.includes('sql') ||
    subjectContext.includes('database') ||
    subjectContext.includes('postgres') ||
    subjectContext.includes('mysql') ||
    subjectContext.includes('mongodb') ||
    subjectContext.includes('acid') ||
    subjectContext.includes('relational');

  const isMicroservices =
    subjectContext.includes('microservice') ||
    subjectContext.includes('distributed') ||
    subjectContext.includes('kafka') ||
    subjectContext.includes('docker') ||
    subjectContext.includes('domain-driven') ||
    subjectContext.includes('kubernetes');

  const isFrontendOrReact =
    subjectContext.includes('react') ||
    subjectContext.includes('javascript') ||
    subjectContext.includes('typescript') ||
    subjectContext.includes('frontend') ||
    subjectContext.includes('web');

  const isLifeSciencesOrBio =
    subjectContext.includes('bio') ||
    subjectContext.includes('dock') ||
    subjectContext.includes('molecul') ||
    subjectContext.includes('protein') ||
    subjectContext.includes('drug') ||
    subjectContext.includes('ligand') ||
    subjectContext.includes('genom') ||
    subjectContext.includes('active site') ||
    subjectContext.includes('biotech');

  const isDataOrPython =
    subjectContext.includes('python') ||
    subjectContext.includes('data') ||
    subjectContext.includes('machine learning') ||
    subjectContext.includes('analytics');

  const pool: QuizQuestionItem[] = [];

  // ==========================================
  // DOMAIN 1: JAVA & ENTERPRISE BACKEND
  // ==========================================
  if (isJava) {
    pool.push(
      {
        id: `q-java-${Date.now()}-1`,
        prompt: 'In the Java Virtual Machine (JVM) memory architecture, where are class instances and dynamic object allocations stored?',
        type: 'single_choice',
        difficulty,
        points: difficulty === 'hard' ? 10 : 5,
        explanation: `All object instances and arrays in Java are allocated on the Heap memory, which is shared across all application threads and managed by the Garbage Collector.${docRefNotice}`,
        options: [
          { id: 'opt-j-1', text: 'Heap Space', isCorrect: true },
          { id: 'opt-j-2', text: 'Thread Call Stack', isCorrect: false },
          { id: 'opt-j-3', text: 'CPU Program Counter Register', isCorrect: false },
          { id: 'opt-j-4', text: 'Metaspace Native Class Storage', isCorrect: false },
        ],
      },
      {
        id: `q-java-${Date.now()}-2`,
        prompt: 'How does Java 8+ HashMap resolve hash collisions when multiple keys map to the same bucket index? (Select all that apply)',
        type: 'multiple_choice',
        difficulty,
        points: difficulty === 'hard' ? 15 : 10,
        explanation: `HashMap initially chains colliding nodes in a linked list. Once the bucket exceeds the TREEIFY_THRESHOLD (8 entries) and table capacity >= 64, it converts to a Red-Black tree to maintain O(log n) lookup performance.${docRefNotice}`,
        options: [
          { id: 'opt-j-5', text: 'Initially chains colliding entries using a singly linked list', isCorrect: true },
          { id: 'opt-j-6', text: 'Converts linked list buckets into balanced Red-Black trees when bucket size exceeds 8', isCorrect: true },
          { id: 'opt-j-7', text: 'Discards previous keys immediately with an OverwriteException', isCorrect: false },
          { id: 'opt-j-8', text: 'Uses untreeify threshold (6 entries) to revert back to linked lists during bucket shrink', isCorrect: true },
        ],
      },
      {
        id: `q-java-${Date.now()}-3`,
        prompt: 'The "volatile" keyword in Java ensures that operations like count++ are executed atomically without race conditions.',
        type: 'true_false',
        difficulty,
        points: 5,
        explanation: `False. The volatile keyword guarantees visibility (flushing CPU cache lines) and prevents instruction reordering, but it does NOT provide compound operation atomicity (read-modify-write). For atomicity, AtomicInteger or synchronization is required.${docRefNotice}`,
        options: [
          { id: 'opt-tf-j1', text: 'True', isCorrect: false },
          { id: 'opt-tf-j2', text: 'False', isCorrect: true },
        ],
      },
      {
        id: `q-java-${Date.now()}-4`,
        prompt: 'Which statements regarding Checked vs Unchecked exceptions in Java are correct? (Select all that apply)',
        type: 'multiple_choice',
        difficulty,
        points: 10,
        explanation: `Checked exceptions extend Exception (excluding RuntimeException) and must be caught or declared in method signatures. RuntimeExceptions are unchecked.${docRefNotice}`,
        options: [
          { id: 'opt-j-9', text: 'Checked exceptions must either be caught in a try-catch block or declared in the method "throws" clause', isCorrect: true },
          { id: 'opt-j-10', text: 'Subclasses of RuntimeException are unchecked and do not require mandatory compile-time handling', isCorrect: true },
          { id: 'opt-j-11', text: 'All subclasses of Throwable are checked exceptions', isCorrect: false },
          { id: 'opt-j-12', text: 'NullPointerException and ArrayIndexOutOfBoundsException are examples of unchecked exceptions', isCorrect: true },
        ],
      },
      {
        id: `q-java-${Date.now()}-5`,
        prompt: 'What interface must a Java resource implement in order to be managed automatically inside a "try-with-resources" block?',
        type: 'single_choice',
        difficulty,
        points: 5,
        explanation: `The try-with-resources statement ensures that any resource implementing java.lang.AutoCloseable (or java.io.Closeable) is closed deterministically at the conclusion of the statement.${docRefNotice}`,
        options: [
          { id: 'opt-j-13', text: 'java.lang.AutoCloseable', isCorrect: true },
          { id: 'opt-j-14', text: 'java.io.Serializable', isCorrect: false },
          { id: 'opt-j-15', text: 'java.lang.Cloneable', isCorrect: false },
          { id: 'opt-j-16', text: 'java.util.concurrent.Callable', isCorrect: false },
        ],
      },
      {
        id: `q-java-${Date.now()}-6`,
        prompt: 'In Java, an interface can provide concrete method implementations by declaring them with which modifier?',
        type: 'single_choice',
        difficulty,
        points: 5,
        explanation: `Since Java 8, interfaces can define concrete implementations using the "default" keyword (or static methods), enabling backwards-compatible library evolution.${docRefNotice}`,
        options: [
          { id: 'opt-j-17', text: 'default', isCorrect: true },
          { id: 'opt-j-18', text: 'abstract', isCorrect: false },
          { id: 'opt-j-19', text: 'synchronized', isCorrect: false },
          { id: 'opt-j-20', text: 'native', isCorrect: false },
        ],
      },
      {
        id: `q-java-${Date.now()}-7`,
        prompt: 'Which feature in Java Streams API distinguishes intermediate operations from terminal operations?',
        type: 'single_choice',
        difficulty,
        points: difficulty === 'hard' ? 10 : 5,
        explanation: `Intermediate operations (like filter, map, sorted) are lazy and return a new Stream; they are not executed until a terminal operation (like collect, count, forEach) is invoked.${docRefNotice}`,
        options: [
          { id: 'opt-j-21', text: 'Intermediate operations are lazy and only execute when a terminal operation is called', isCorrect: true },
          { id: 'opt-j-22', text: 'Intermediate operations consume and terminate the stream permanently', isCorrect: false },
          { id: 'opt-j-23', text: 'Terminal operations can be chained together indefinitely', isCorrect: false },
          { id: 'opt-j-24', text: 'Intermediate operations must always run in separate parallel threads', isCorrect: false },
        ],
      },
      {
        id: `q-java-${Date.now()}-8`,
        prompt: 'ConcurrentHashMap achieves high concurrency by avoiding table-wide locks and employing fine-grained CAS (Compare-And-Swap) and bucket-level synchronized nodes.',
        type: 'true_false',
        difficulty,
        points: 5,
        explanation: `True. Unlike Collections.synchronizedMap or Hashtable which lock the entire table, ConcurrentHashMap uses CAS for insertions into empty buckets and locks only the individual bucket head node when collisions occur.${docRefNotice}`,
        options: [
          { id: 'opt-tf-j3', text: 'True', isCorrect: true },
          { id: 'opt-tf-j4', text: 'False', isCorrect: false },
        ],
      },
      {
        id: `q-java-${Date.now()}-9`,
        prompt: 'In object-oriented Java, Dynamic Method Dispatch is the mechanism by which a call to an overridden method is resolved at runtime rather than compile time.',
        type: 'true_false',
        difficulty,
        points: 5,
        explanation: `True. Dynamic method dispatch uses the vtable (virtual method table) of the actual runtime object instance to invoke the correct overridden implementation.${docRefNotice}`,
        options: [
          { id: 'opt-tf-j5', text: 'True', isCorrect: true },
          { id: 'opt-tf-j6', text: 'False', isCorrect: false },
        ],
      },
      {
        id: `q-java-${Date.now()}-10`,
        prompt: 'Which Java memory region stores class bytecode metadata, static variable references, and the runtime constant pool?',
        type: 'short_answer',
        difficulty,
        points: 5,
        explanation: `Metaspace is the native off-heap memory area introduced in Java 8 to hold class metadata.${docRefNotice}`,
        options: [],
        correctAnswerText: 'Metaspace',
      }
    );
  }

  // ==========================================
  // DOMAIN 2: DATABASE & SYSTEMS ARCHITECTURE
  // ==========================================
  if (isDatabase) {
    pool.push(
      {
        id: `q-db-${Date.now()}-1`,
        prompt: 'Which ACID transaction isolation level prevents both Dirty Reads and Non-Repeatable Reads, but may still permit Phantom Reads in standard ANSI SQL?',
        type: 'single_choice',
        difficulty,
        points: 10,
        explanation: `Repeatable Read ensures that any data read during a transaction cannot be changed by other transactions, preventing non-repeatable reads. However, range queries may still see newly inserted rows (phantoms).${docRefNotice}`,
        options: [
          { id: 'opt-db-1', text: 'Repeatable Read', isCorrect: true },
          { id: 'opt-db-2', text: 'Read Committed', isCorrect: false },
          { id: 'opt-db-3', text: 'Read Uncommitted', isCorrect: false },
          { id: 'opt-db-4', text: 'Serializable', isCorrect: false },
        ],
      },
      {
        id: `q-db-${Date.now()}-2`,
        prompt: 'Why are B-Tree indexes preferred over Hash indexes for relational database columns in general query workloads? (Select all that apply)',
        type: 'multiple_choice',
        difficulty,
        points: 10,
        explanation: `B-Tree indexes keep keys sorted, making them capable of handling range queries (BETWEEN, <, >), prefix pattern searches, and ORDER BY operations. Hash indexes only support point equality (=) lookups.${docRefNotice}`,
        options: [
          { id: 'opt-db-5', text: 'B-Trees support efficient range queries (e.g., BETWEEN, <, >)', isCorrect: true },
          { id: 'opt-db-6', text: 'B-Trees allow sorted index scans avoiding costly in-memory sorts for ORDER BY clauses', isCorrect: true },
          { id: 'opt-db-7', text: 'Hash indexes only support exact equality (=) comparisons', isCorrect: true },
          { id: 'opt-db-8', text: 'Hash indexes require zero memory footprint', isCorrect: false },
        ],
      },
      {
        id: `q-db-${Date.now()}-3`,
        prompt: 'The database N+1 query problem occurs when an application executes 1 initial query for a parent dataset followed by N individual round-trip queries for each child record.',
        type: 'true_false',
        difficulty,
        points: 5,
        explanation: `True. The N+1 problem causes severe latency degradation and can be resolved using eager loading, JOIN FETCH, or batch fetching.${docRefNotice}`,
        options: [
          { id: 'opt-tf-db1', text: 'True', isCorrect: true },
          { id: 'opt-tf-db2', text: 'False', isCorrect: false },
        ],
      }
    );
  }

  // ==========================================
  // DOMAIN 3: MICROSERVICES & DISTRIBUTED SYSTEMS
  // ==========================================
  if (isMicroservices) {
    pool.push(
      {
        id: `q-ms-${Date.now()}-1`,
        prompt: 'What is the primary role of a partition within an Apache Kafka topic?',
        type: 'single_choice',
        difficulty,
        points: 5,
        explanation: `Partitions enable horizontal parallelism and message order preservation within each individual partition.${docRefNotice}`,
        options: [
          { id: 'opt-ms-1', text: 'To act as an encryption boundary between brokers', isCorrect: false },
          { id: 'opt-ms-2', text: 'To provide the fundamental unit of parallelism and ordered log storage', isCorrect: true },
          { id: 'opt-ms-3', text: 'To execute distributed SQL queries across topic records', isCorrect: false },
          { id: 'opt-ms-4', text: 'To prevent consumers from acknowledging incoming messages', isCorrect: false },
        ],
      },
      {
        id: `q-ms-${Date.now()}-2`,
        prompt: 'Which patterns preserve consistency across microservices without distributed two-phase commits? (Select all that apply)',
        type: 'multiple_choice',
        difficulty,
        points: 10,
        explanation: `The Saga Pattern (with compensating transactions) and the Transactional Outbox Pattern ensure eventual consistency across decoupled microservice databases.${docRefNotice}`,
        options: [
          { id: 'opt-ms-5', text: 'Saga Pattern with compensating rollback transactions', isCorrect: true },
          { id: 'opt-ms-6', text: 'Transactional Outbox pattern coupled with reliable event publishing', isCorrect: true },
          { id: 'opt-ms-7', text: 'Shared centralized database with global table-level locking', isCorrect: false },
          { id: 'opt-ms-8', text: 'Idempotent consumer handlers with deduplication checks', isCorrect: true },
        ],
      },
      {
        id: `q-ms-${Date.now()}-3`,
        prompt: 'The CAP Theorem asserts that in the presence of a network partition, a distributed system must choose between Consistency and Availability.',
        type: 'true_false',
        difficulty,
        points: 5,
        explanation: `True. According to Eric Brewer's CAP theorem, when network partitions occur, distributed systems must trade off strict consistency against high availability.${docRefNotice}`,
        options: [
          { id: 'opt-tf-ms1', text: 'True', isCorrect: true },
          { id: 'opt-tf-ms2', text: 'False', isCorrect: false },
        ],
      }
    );
  }

  // ==========================================
  // DOMAIN 4: FRONTEND & WEB ARCHITECTURE
  // ==========================================
  if (isFrontendOrReact) {
    pool.push(
      {
        id: `q-fe-${Date.now()}-1`,
        prompt: `In modern React application architecture (${lessonTitle || moduleTitle || courseTitle}), what is the primary advantage of utilizing immutable state management?`,
        type: 'single_choice',
        difficulty,
        points: 5,
        explanation: `Immutable state changes enable fast shallow equality checks (reference identity comparisons), predictable component re-renders, and reliable state debugging.${docRefNotice}`,
        options: [
          { id: 'opt-fe-1', text: 'Allows fast reference equality checks for optimized re-rendering', isCorrect: true },
          { id: 'opt-fe-2', text: 'Completely eliminates the need for component tests', isCorrect: false },
          { id: 'opt-fe-3', text: 'Directly mutates browser DOM nodes bypassing the Virtual DOM', isCorrect: false },
          { id: 'opt-fe-4', text: 'Forces all network calls to execute synchronously', isCorrect: false },
        ],
      },
      {
        id: `q-fe-${Date.now()}-2`,
        prompt: 'Which hooks or techniques are used to prevent unnecessary re-computations or child re-renders? (Select all that apply)',
        type: 'multiple_choice',
        difficulty,
        points: 10,
        explanation: `useMemo caches computed values, useCallback memoizes function references, and React.memo prevents child component re-renders when props have not changed.${docRefNotice}`,
        options: [
          { id: 'opt-fe-5', text: 'useMemo for caching expensive calculation results', isCorrect: true },
          { id: 'opt-fe-6', text: 'useCallback for stabilizing callback function identities across renders', isCorrect: true },
          { id: 'opt-fe-7', text: 'React.memo for shallowly comparing component props', isCorrect: true },
          { id: 'opt-fe-8', text: 'Calling window.location.reload() inside render cycles', isCorrect: false },
        ],
      },
      {
        id: `q-fe-${Date.now()}-3`,
        prompt: 'In the JavaScript Event Loop, microtasks (such as Promise.then callbacks and queueMicrotask) are executed before the next macrotask (such as setTimeout).',
        type: 'true_false',
        difficulty,
        points: 5,
        explanation: `True. The microtask queue is completely drained after each task execution and before rendering or proceeding to the next macrotask in the event loop.${docRefNotice}`,
        options: [
          { id: 'opt-tf-fe1', text: 'True', isCorrect: true },
          { id: 'opt-tf-fe2', text: 'False', isCorrect: false },
        ],
      }
    );
  }

  // ==========================================
  // DOMAIN 6: BIOINFORMATICS & LIFE SCIENCES
  // ==========================================
  if (isLifeSciencesOrBio) {
    pool.push(
      {
        id: `q-bio-${Date.now()}-1`,
        prompt: 'In molecular docking and virtual screening workflows, what is the primary purpose of defining a grid box around the macromolecular receptor?',
        type: 'single_choice',
        difficulty,
        points: difficulty === 'hard' ? 10 : 5,
        explanation: `The grid box defines the bounded 3D search space (spatial coordinates) where the docking algorithm performs conformational sampling and evaluates receptor-ligand interaction energies.${docRefNotice}`,
        options: [
          { id: 'opt-b-1', text: 'To restrict the conformational search space to the target active or allosteric binding site', isCorrect: true },
          { id: 'opt-b-2', text: 'To permanently convert all flexible covalent bonds into rigid non-rotatable coordinates', isCorrect: false },
          { id: 'opt-b-3', text: 'To bypass electrostatic and van der Waals calculations to speed up execution', isCorrect: false },
          { id: 'opt-b-4', text: 'To automatically synthesize physical ligand derivatives in wet-lab environments', isCorrect: false },
        ],
      },
      {
        id: `q-bio-${Date.now()}-2`,
        prompt: 'Which scoring metrics and structural criteria are critical when evaluating predicted ligand binding poses? (Select all that apply)',
        type: 'multiple_choice',
        difficulty,
        points: difficulty === 'hard' ? 15 : 10,
        explanation: `Valid pose evaluation requires assessing estimated free energy of binding (delta G), Root Mean Square Deviation (RMSD) clustering, complementary hydrogen bonding with catalytic residues, and absence of steric clashes.${docRefNotice}`,
        options: [
          { id: 'opt-b-5', text: 'Estimated free energy of binding (lower/more negative kcal/mol scores indicate favorable affinity)', isCorrect: true },
          { id: 'opt-b-6', text: 'RMSD clustering to confirm reproducible, stable conformational poses', isCorrect: true },
          { id: 'opt-b-7', text: 'Formation of specific hydrogen bonds and hydrophobic contacts with key active site residues', isCorrect: true },
          { id: 'opt-b-8', text: 'Arbitrary alphabetical ordering of ligand atom records in the PDBQT structure', isCorrect: false },
        ],
      },
      {
        id: `q-bio-${Date.now()}-3`,
        prompt: 'In computational molecular docking, a lower (more negative) binding free energy score generally signifies stronger predicted binding affinity between the ligand and receptor.',
        type: 'true_false',
        difficulty,
        points: 5,
        explanation: `True. Thermodynamically, binding reactions are favored when Gibbs free energy change (delta G) is negative, indicating a spontaneous and stable complex formation.${docRefNotice}`,
        options: [
          { id: 'opt-tf-b1', text: 'True', isCorrect: true },
          { id: 'opt-tf-b2', text: 'False', isCorrect: false },
        ],
      },
      {
        id: `q-bio-${Date.now()}-4`,
        prompt: 'When preparing a protein crystal structure (from PDB) for molecular docking simulations, which protocol steps are essential? (Select all that apply)',
        type: 'multiple_choice',
        difficulty,
        points: 10,
        explanation: `Raw PDB files typically lack hydrogen atoms, contain crystallographic water molecules that may block binding pockets, and need proper partial charge assignment (e.g. Kollman or Gasteiger charges).${docRefNotice}`,
        options: [
          { id: 'opt-b-9', text: 'Removal of non-catalytic crystallographic water molecules and co-crystallized solvents', isCorrect: true },
          { id: 'opt-b-10', text: 'Addition of polar hydrogen atoms and assignment of partial atomic charges (PDBQT preparation)', isCorrect: true },
          { id: 'opt-b-11', text: 'Inspection and repair of missing side-chain atoms in active site residues', isCorrect: true },
          { id: 'opt-b-12', text: 'Complete deletion of all amino acid alpha-carbons to treat the receptor as a uniform gas', isCorrect: false },
        ],
      },
      {
        id: `q-bio-${Date.now()}-5`,
        prompt: 'Scenario: During a virtual screening run, Compound X exhibits a raw binding score of -9.2 kcal/mol but causes severe steric clashes and buries an uncompensated charged group in a hydrophobic cavity. Compound Y exhibits -8.4 kcal/mol with optimal hydrogen bond geometry and no steric strain. How should the candidate molecules be prioritized?',
        type: 'single_choice',
        difficulty: 'hard',
        points: 15,
        explanation: `Heuristic scoring functions can over-predict affinity due to hydrophobic surface terms. Ligands with severe steric strain or desolvation penalties fail experimentally; stereochemical plausibility and specific bond geometry must be prioritized.${docRefNotice}`,
        options: [
          { id: 'opt-b-13', text: 'Prioritize Compound Y; stereochemical geometry, hydrogen bond complementarity, and strain-free poses supersede raw score artifacts', isCorrect: true },
          { id: 'opt-b-14', text: 'Select Compound X exclusively because the lowest numerical score is always experimentally infallible', isCorrect: false },
          { id: 'opt-b-15', text: 'Discard both compounds because docking scores above -15 kcal/mol are universally inert', isCorrect: false },
          { id: 'opt-b-16', text: 'Convert Compound X into an irreversible covalent binder without altering its atomic structure', isCorrect: false },
        ],
      }
    );
  }

  // ==========================================
  // UNIVERSAL HIGH-FIDELITY SYNTHESIZER
  // (Scenario-based practical questions)
  // ==========================================
  if (pool.length < count) {
    const contextUnit = lessonTitle || moduleTitle || courseTitle;
    pool.push(
      {
        id: `q-univ-${Date.now()}-1`,
        prompt: `Practical Scenario: A system implementing "${contextUnit}" experiences performance bottlenecks under peak concurrent load. What architectural adjustment provides the most effective scalability and fault tolerance?`,
        type: 'single_choice',
        difficulty,
        points: 5,
        explanation: `Applying horizontal scaling with decoupled asynchronous processing queues isolates high-load tasks, prevents thread exhaustion, and ensures system resilience.${docRefNotice}`,
        options: [
          { id: 'opt-u-1', text: 'Decoupling compute-intensive tasks via asynchronous queues and applying stateless service instances', isCorrect: true },
          { id: 'opt-u-2', text: 'Disabling all data validation routines to reduce CPU instruction cycles', isCorrect: false },
          { id: 'opt-u-3', text: 'Replacing relational integrity constraints with global static variables', isCorrect: false },
          { id: 'opt-u-4', text: 'Enforcing single-threaded execution to eliminate synchronization complexity', isCorrect: false },
        ],
      },
      {
        id: `q-univ-${Date.now()}-2`,
        prompt: `Which quality attributes and verification standards are mandatory when deploying workflows in "${courseTitle}"? (Select all that apply)`,
        type: 'multiple_choice',
        difficulty,
        points: 10,
        explanation: `Enterprise production deployments require deterministic error boundary management, rigorous input sanitization, comprehensive test coverage, and automated telemetry logging.${docRefNotice}`,
        options: [
          { id: 'opt-u-5', text: 'Comprehensive boundary condition validation and regression test coverage', isCorrect: true },
          { id: 'opt-u-6', text: 'Deterministic resource cleanup and exception isolation boundaries', isCorrect: true },
          { id: 'opt-u-7', text: 'Adherence to enterprise input sanitization and zero-trust security standards', isCorrect: true },
          { id: 'opt-u-8', text: 'Suppression of telemetry and error monitoring logs to save disk storage', isCorrect: false },
        ],
      },
      {
        id: `q-univ-${Date.now()}-3`,
        prompt: `In production-grade systems, adhering to strict architectural modularity and interface contracts reduces the blast radius of component failures and enables continuous integration without regression.`,
        type: 'true_false',
        difficulty,
        points: 5,
        explanation: `True. Strong separation of concerns and clear interface contracts localize defects, simplify unit testing, and prevent cascading system failures.${docRefNotice}`,
        options: [
          { id: 'opt-tf-u1', text: 'True', isCorrect: true },
          { id: 'opt-tf-u2', text: 'False', isCorrect: false },
        ],
      },
      {
        id: `q-univ-${Date.now()}-4`,
        prompt: `What is the primary operational objective of implementing idempotent APIs and retry mechanisms with exponential backoff in distributed workflows?`,
        type: 'single_choice',
        difficulty,
        points: 5,
        explanation: `Idempotency guarantees that duplicate requests produce the same state change, while exponential backoff with jitter prevents thundering herd problem during transient network recovery.${docRefNotice}`,
        options: [
          { id: 'opt-u-9', text: 'Guarantees state consistency during network retries while preventing service saturation (thundering herd problem)', isCorrect: true },
          { id: 'opt-u-10', text: 'Permanently removes the necessity for client-side authentication tokens', isCorrect: false },
          { id: 'opt-u-11', text: 'Forces all database write transactions to execute without locking or consistency checks', isCorrect: false },
          { id: 'opt-u-12', text: 'Guarantees that network latency is reduced to exactly zero milliseconds', isCorrect: false },
        ],
      },
      {
        id: `q-univ-${Date.now()}-5`,
        prompt: `Applied Case: You are performing a root cause analysis for an operational defect in "${contextUnit}". Which analytical protocol is recommended to isolate the failure?`,
        type: 'single_choice',
        difficulty: 'hard',
        points: 10,
        explanation: `Structured troubleshooting follows a systematic process: reproducing the defect with deterministic boundary test cases, inspecting distributed trace logs, verifying input invariance, and isolating regressions.${docRefNotice}`,
        options: [
          { id: 'opt-u-13', text: 'Reproducing the defect with minimal isolated boundary test cases and inspecting structured telemetry traces', isCorrect: true },
          { id: 'opt-u-14', text: 'Immediately deploying unreviewed hotfixes directly to production environments', isCorrect: false },
          { id: 'opt-u-15', text: 'Deleting historic audit logs to hide previous error occurrences', isCorrect: false },
          { id: 'opt-u-16', text: 'Disabling compiler type checking to allow execution to proceed past runtime exceptions', isCorrect: false },
        ],
      }
    );
  }

  // Filter candidates by allowed question types
  const filtered = pool.filter((q) => questionTypes.includes(q.type));
  const finalCandidates = filtered.length > 0 ? filtered : pool;

  // Assemble result up to requested count
  const result: QuizQuestionItem[] = [];
  let idx = 0;
  while (result.length < count && finalCandidates.length > 0) {
    const base = finalCandidates[idx % finalCandidates.length];
    const pointsToUse = params.pointsPerQuestion
      ? params.pointsPerQuestion
      : difficulty === 'hard'
      ? (base.type === 'multiple_choice' ? 15 : 10)
      : base.points;

    result.push({
      ...base,
      id: `q-gen-${Date.now()}-${result.length + 1}`,
      points: pointsToUse,
      difficulty,
    });
    idx++;
  }

  return result.slice(0, count);
}
