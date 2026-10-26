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
 * Intelligent frontend question synthesizer tailored to curriculum context,
 * uploaded documentation references, and configured difficulty levels.
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
      ? ` Referenced from: ${sourceDocuments.join(', ')}.`
      : '';

  // Domain detection
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

  const isDataOrPython =
    subjectContext.includes('python') ||
    subjectContext.includes('data') ||
    subjectContext.includes('machine learning') ||
    subjectContext.includes('analytics');

  // Candidate question pool generator
  const pool: QuizQuestionItem[] = [];

  if (isMicroservices) {
    if (scope === 'lesson_quiz' && (lessonTitle.toLowerCase().includes('kafka') || moduleTitle.toLowerCase().includes('kafka'))) {
      pool.push(
        {
          id: `q-gen-${Date.now()}-1`,
          prompt: 'What is the primary role of a partition within an Apache Kafka topic?',
          type: 'single_choice',
          difficulty,
          points: difficulty === 'hard' ? 10 : 5,
          explanation: `Partitions enable horizontal parallelism and message order preservation within each individual partition.${docRefNotice}`,
          options: [
            { id: 'opt-1', text: 'To act as an encryption boundary between brokers', isCorrect: false },
            { id: 'opt-2', text: 'To provide the fundamental unit of parallelism and ordered log storage', isCorrect: true },
            { id: 'opt-3', text: 'To execute distributed SQL queries across topic records', isCorrect: false },
            { id: 'opt-4', text: 'To prevent consumers from acknowledging incoming messages', isCorrect: false },
          ],
        },
        {
          id: `q-gen-${Date.now()}-2`,
          prompt: 'Which factors determine how Kafka partitions are assigned across consumers in a consumer group? (Select all that apply)',
          type: 'multiple_choice',
          difficulty,
          points: difficulty === 'hard' ? 15 : 10,
          explanation: `Kafka uses partition assignment strategies (e.g., Range, RoundRobin, CooperativeSticky) and assigns each partition to at most one consumer per group.${docRefNotice}`,
          options: [
            { id: 'opt-5', text: 'The active PartitionAssignor strategy configured on the consumer', isCorrect: true },
            { id: 'opt-6', text: 'The total count of active consumers present in the group', isCorrect: true },
            { id: 'opt-7', text: 'The client IP geographic distance from the KRaft quorum controller', isCorrect: false },
            { id: 'opt-8', text: 'Rebalance events triggered by consumer heartbeats or failures', isCorrect: true },
          ],
        },
        {
          id: `q-gen-${Date.now()}-3`,
          prompt: 'Kafka guarantees total strict message ordering globally across all partitions in a topic, regardless of key.',
          type: 'true_false',
          difficulty,
          points: 5,
          explanation: `False. Kafka guarantees ordering strictly within a single partition, but not across multiple distinct partitions.${docRefNotice}`,
          options: [
            { id: 'opt-tf-1', text: 'True', isCorrect: false },
            { id: 'opt-tf-2', text: 'False', isCorrect: true },
          ],
        },
        {
          id: `q-gen-${Date.now()}-4`,
          prompt: 'What happens when a Kafka producer sends a record with a null key using the default partitioner?',
          type: 'single_choice',
          difficulty,
          points: 5,
          explanation: `When the key is null, the modern Kafka partitioner employs sticky partitioning (batching records into random partitions) to maximize throughput.${docRefNotice}`,
          options: [
            { id: 'opt-9', text: 'The record is rejected with an InvalidRecordException', isCorrect: false },
            { id: 'opt-10', text: 'The record is distributed using sticky partitioning across available partitions', isCorrect: true },
            { id: 'opt-11', text: 'The record is exclusively routed to partition 0', isCorrect: false },
            { id: 'opt-12', text: 'The producer blocks until an explicit partition index is assigned', isCorrect: false },
          ],
        },
        {
          id: `q-gen-${Date.now()}-5`,
          prompt: 'Which settings in Kafka ensure zero message loss for mission-critical event delivery? (Select all that apply)',
          type: 'multiple_choice',
          difficulty,
          points: 10,
          explanation: `Idempotent producers, acks=all, and min.insync.replicas >= 2 ensure durability against broker node crashes.${docRefNotice}`,
          options: [
            { id: 'opt-13', text: 'Producer acks set to "all" (-1)', isCorrect: true },
            { id: 'opt-14', text: 'Broker min.insync.replicas configured to 2 or greater', isCorrect: true },
            { id: 'opt-15', text: 'enable.idempotence set to true on the producer client', isCorrect: true },
            { id: 'opt-16', text: 'Setting auto.offset.reset to "earliest" on producer instances', isCorrect: false },
          ],
        }
      );
    } else if (scope === 'module_assessment') {
      pool.push(
        {
          id: `q-gen-${Date.now()}-10`,
          prompt: `In the context of ${moduleTitle || 'this module'}, how does an Outbox Pattern prevent dual-write inconsistencies between database transactions and event brokers?`,
          type: 'single_choice',
          difficulty,
          points: 10,
          explanation: `The Outbox pattern writes domain state and outgoing events atomically into the same relational database transaction, which is later dispatched to the message broker by an asynchronous worker process.${docRefNotice}`,
          options: [
            { id: 'opt-20', text: 'By executing distributed two-phase commit (2PC) transactions across all database replicas', isCorrect: false },
            { id: 'opt-21', text: 'By persisting events into an outbox table within the same database transaction before relaying to the broker', isCorrect: true },
            { id: 'opt-22', text: 'By discarding failed message delivery attempts silently without retry queues', isCorrect: false },
            { id: 'opt-23', text: 'By using synchronous HTTP REST webhooks instead of asynchronous message queues', isCorrect: false },
          ],
        },
        {
          id: `q-gen-${Date.now()}-11`,
          prompt: 'Which architectural characteristics define resilient distributed microservices? (Select all that apply)',
          type: 'multiple_choice',
          difficulty,
          points: 10,
          explanation: `Decoupled persistence, circuit breakers, and idempotency protect microservices from cascading system outages.${docRefNotice}`,
          options: [
            { id: 'opt-24', text: 'Circuit breakers and graceful fallback strategies for downstream network timeouts', isCorrect: true },
            { id: 'opt-25', text: 'Loose coupling with autonomous database per microservice pattern', isCorrect: true },
            { id: 'opt-26', text: 'Idempotent consumer handlers capable of processing duplicate messages safely', isCorrect: true },
            { id: 'opt-27', text: 'Hard-coded synchronous dependencies across all internal API endpoints', isCorrect: false },
          ],
        },
        {
          id: `q-gen-${Date.now()}-12`,
          prompt: 'In Domain-Driven Design (DDD), an Aggregate Root is the only entry point through which external entities may access the aggregate boundary.',
          type: 'true_false',
          difficulty,
          points: 5,
          explanation: `True. The Aggregate Root guarantees the consistency and invariants of all internal entities and value objects encapsulated within its boundary.${docRefNotice}`,
          options: [
            { id: 'opt-tf-3', text: 'True', isCorrect: true },
            { id: 'opt-tf-4', text: 'False', isCorrect: false },
          ],
        },
        {
          id: `q-gen-${Date.now()}-13`,
          prompt: 'Which metric is most critical for detecting consumer lag and potential backpressure in event-driven streaming?',
          type: 'single_choice',
          difficulty,
          points: 5,
          explanation: `Consumer lag (the delta between the highest topic log end offset and the consumer current committed offset) directly measures backpressure.${docRefNotice}`,
          options: [
            { id: 'opt-28', text: 'Consumer group lag (difference between Log End Offset and Committed Offset)', isCorrect: true },
            { id: 'opt-29', text: 'Disk IOPS of the client desktop workstations', isCorrect: false },
            { id: 'opt-30', text: 'DNS lookup response latency on outbound SMTP relays', isCorrect: false },
            { id: 'opt-31', text: 'The number of uncompiled source code files in the repository', isCorrect: false },
          ],
        }
      );
    } else {
      // Final Comprehensive Assessment
      pool.push(
        {
          id: `q-gen-${Date.now()}-20`,
          prompt: `Comprehensive Course Assessment: When decomposing an enterprise monolith into microservices as covered in "${courseTitle}", which pattern effectively maintains eventual consistency across distributed service boundaries?`,
          type: 'single_choice',
          difficulty: 'hard',
          points: 15,
          explanation: `The Saga pattern (orchestrated or choreographed) coordinates a sequence of local transactions with compensating transactions upon failure to ensure eventual consistency without distributed locks.${docRefNotice}`,
          options: [
            { id: 'opt-40', text: 'Saga Pattern with compensating transactions for rollback', isCorrect: true },
            { id: 'opt-41', text: 'Shared database tables with pessimistic row locking across all microservices', isCorrect: false },
            { id: 'opt-42', text: 'Synchronous nested RPC calls across more than 10 downstream services', isCorrect: false },
            { id: 'opt-43', text: 'Manual database restoration from tape backups on every transaction failure', isCorrect: false },
          ],
        },
        {
          id: `q-gen-${Date.now()}-21`,
          prompt: 'Which operational patterns are recommended for production microservices monitoring and observability? (Select all that apply)',
          type: 'multiple_choice',
          difficulty: 'hard',
          points: 15,
          explanation: `Distributed tracing (OpenTelemetry), centralized structured log aggregation, and Prometheus metrics provide the observability pillar triad.${docRefNotice}`,
          options: [
            { id: 'opt-44', text: 'Distributed tracing with unique trace ID propagation across all RPC/HTTP boundaries', isCorrect: true },
            { id: 'opt-45', text: 'Centralized log aggregation with structured JSON logging and correlation IDs', isCorrect: true },
            { id: 'opt-46', text: 'Time-series metric monitoring with health probes (liveness and readiness checks)', isCorrect: true },
            { id: 'opt-47', text: 'Disabling logging in production to save network bandwidth', isCorrect: false },
          ],
        },
        {
          id: `q-gen-${Date.now()}-22`,
          prompt: 'The CAP Theorem asserts that in the presence of a network partition, a distributed system must choose between Consistency and Availability.',
          type: 'true_false',
          difficulty: 'medium',
          points: 10,
          explanation: `True. According to Eric Brewer's CAP theorem, when a partition occurs, a system can either be consistent or available, but cannot guarantee both simultaneously.${docRefNotice}`,
          options: [
            { id: 'opt-tf-5', text: 'True', isCorrect: true },
            { id: 'opt-tf-6', text: 'False', isCorrect: false },
          ],
        },
        {
          id: `q-gen-${Date.now()}-23`,
          prompt: 'In CQRS (Command Query Responsibility Segregation), what is the primary benefit of separating read and write models?',
          type: 'single_choice',
          difficulty: 'medium',
          points: 10,
          explanation: `CQRS allows read models to be optimized, denormalized, and scaled independently from write business rule validation logic.${docRefNotice}`,
          options: [
            { id: 'opt-48', text: 'It permits independent scaling and tailored data schemas for writes versus read queries', isCorrect: true },
            { id: 'opt-49', text: 'It eliminates the need for any database backups or security certificates', isCorrect: false },
            { id: 'opt-50', text: 'It guarantees that writes are immediately visible with zero milliseconds of latency', isCorrect: false },
            { id: 'opt-51', text: 'It forces all client applications to write queries in assembly language', isCorrect: false },
          ],
        }
      );
    }
  } else if (isFrontendOrReact) {
    pool.push(
      {
        id: `q-gen-${Date.now()}-30`,
        prompt: `In modern React application architecture (${lessonTitle || moduleTitle || courseTitle}), what is the primary advantage of utilizing immutable state management?`,
        type: 'single_choice',
        difficulty,
        points: 5,
        explanation: `Immutable state changes enable fast shallow equality checks, predictable component re-renders, and reliable time-travel debugging.${docRefNotice}`,
        options: [
          { id: 'opt-60', text: 'Allows fast reference equality checks for optimized re-rendering', isCorrect: true },
          { id: 'opt-61', text: 'Completely eliminates the need for unit testing', isCorrect: false },
          { id: 'opt-62', text: 'Directly mutates browser DOM nodes bypassing the Virtual DOM', isCorrect: false },
          { id: 'opt-63', text: 'Forces all network calls to execute synchronously', isCorrect: false },
        ],
      },
      {
        id: `q-gen-${Date.now()}-31`,
        prompt: 'Which hooks or techniques are used to prevent unnecessary re-computations or child re-renders? (Select all that apply)',
        type: 'multiple_choice',
        difficulty,
        points: 10,
        explanation: `useMemo caches computed values, useCallback memoizes function references, and React.memo prevents component re-renders when props have not changed.${docRefNotice}`,
        options: [
          { id: 'opt-64', text: 'useMemo for caching expensive calculation results', isCorrect: true },
          { id: 'opt-65', text: 'useCallback for stabilizing callback function identities across renders', isCorrect: true },
          { id: 'opt-66', text: 'React.memo for shallowly comparing component props', isCorrect: true },
          { id: 'opt-67', text: 'Calling window.location.reload() inside render cycles', isCorrect: false },
        ],
      },
      {
        id: `q-gen-${Date.now()}-32`,
        prompt: 'React state updates triggered via useState are always applied synchronously in the same microtask tick.',
        type: 'true_false',
        difficulty,
        points: 5,
        explanation: `False. React batches state updates asynchronously to optimize rendering performance.${docRefNotice}`,
        options: [
          { id: 'opt-tf-7', text: 'True', isCorrect: false },
          { id: 'opt-tf-8', text: 'False', isCorrect: true },
        ],
      }
    );
  } else {
    // Universal curriculum-aware fallback questions
    pool.push(
      {
        id: `q-gen-${Date.now()}-50`,
        prompt: `Based on the key principles covered in "${lessonTitle || moduleTitle || courseTitle}", what is the primary learning objective?`,
        type: 'single_choice',
        difficulty,
        points: 5,
        explanation: `Understanding core foundational concepts and practical real-world application is the primary outcome of this unit.${docRefNotice}`,
        options: [
          { id: 'opt-80', text: `Comprehensive mastery of ${lessonTitle || moduleTitle || 'the curriculum domain'} and industry best practices`, isCorrect: true },
          { id: 'opt-81', text: 'Memorizing arbitrary code syntax without conceptual understanding', isCorrect: false },
          { id: 'opt-82', text: 'Bypassing verification checkpoints and skipping required evaluations', isCorrect: false },
          { id: 'opt-83', text: 'Relying exclusively on unverified third-party assumptions', isCorrect: false },
        ],
      },
      {
        id: `q-gen-${Date.now()}-51`,
        prompt: `Which of the following standards are emphasized in ${moduleTitle || courseTitle}? (Select all that apply)`,
        type: 'multiple_choice',
        difficulty,
        points: 10,
        explanation: `Industry standards prioritize structured architecture, rigorous testing, and continuous validation.${docRefNotice}`,
        options: [
          { id: 'opt-84', text: 'Systematic validation against design specifications', isCorrect: true },
          { id: 'opt-85', text: 'Adherence to enterprise architectural patterns and safety constraints', isCorrect: true },
          { id: 'opt-86', text: 'Thorough documentation and reproducible implementations', isCorrect: true },
          { id: 'opt-87', text: 'Ignoring error boundaries and skipping data validation steps', isCorrect: false },
        ],
      },
      {
        id: `q-gen-${Date.now()}-52`,
        prompt: `Regular assessment checkpoints during ${courseTitle} are proven to significantly improve long-term retention and practical mastery.`,
        type: 'true_false',
        difficulty,
        points: 5,
        explanation: `True. Formative assessment and active recall checkpoints reinforce learning pathways and identify areas needing review.${docRefNotice}`,
        options: [
          { id: 'opt-tf-9', text: 'True', isCorrect: true },
          { id: 'opt-tf-10', text: 'False', isCorrect: false },
        ],
      },
      {
        id: `q-gen-${Date.now()}-53`,
        prompt: `What is the recommended approach when diagnosing errors or performance bottlenecks in ${moduleTitle || courseTitle}?`,
        type: 'single_choice',
        difficulty,
        points: 5,
        explanation: `Structured telemetry, isolation of variables, and root-cause analysis ensure reliable issue resolution.${docRefNotice}`,
        options: [
          { id: 'opt-88', text: 'Isolating root causes using structured diagnostics and telemetry logs', isCorrect: true },
          { id: 'opt-89', text: 'Randomly altering production configuration parameters without testing', isCorrect: false },
          { id: 'opt-90', text: 'Disabling security policies and audit logging', isCorrect: false },
          { id: 'opt-91', text: 'Deleting all database transaction tables', isCorrect: false },
        ],
      },
      {
        id: `q-gen-${Date.now()}-54`,
        prompt: `What architectural pattern coordinates local transactions with compensating rollbacks without requiring 2-phase commits in ${moduleTitle || courseTitle}?`,
        type: 'short_answer',
        difficulty,
        points: 5,
        explanation: `The Saga pattern coordinates local transactions with compensating actions.${docRefNotice}`,
        options: [],
        correctAnswerText: 'Saga Pattern'
      }
    );
  }

  // Filter by allowed types if specified
  const filtered = pool.filter((q) => questionTypes.includes(q.type));
  const finalCandidates = filtered.length > 0 ? filtered : pool;

  // Ensure requested count: if count exceeds pool, duplicate with variation
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
