import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PostgresService } from '../infrastructure/postgres/postgres.service';
import { ModelProviderRegistry } from '../model-layer/model-provider.registry';

interface EvalCase {
  readonly id: string;
  readonly name: string;
  readonly space: string;
  readonly input: string;
  readonly expected_contains: readonly string[];
}

@Injectable()
export class EvaluationService {
  constructor(
    private readonly db: PostgresService,
    private readonly providers: ModelProviderRegistry,
  ) {}

  async run(caseId: string): Promise<{
    id: string;
    passed: boolean;
    output: string;
    durationMs: number;
  }> {
    if (!process.env.DATABASE_URL) {
      throw new ServiceUnavailableException('Evaluation storage is not configured');
    }

    const result = await this.db.query<EvalCase>(
      `SELECT id, name, space, input, expected_contains
       FROM ai_eval_cases
       WHERE id = $1 AND enabled = TRUE`,
      [caseId],
    );

    const testCase = result.rows[0];

    if (!testCase) {
      throw new ServiceUnavailableException('Evaluation case not found');
    }

    const startedAt = Date.now();
    const provider = this.providers.resolve();
    const generation = await provider.generate({
      space: testCase.space,
      input: testCase.input,
      tenantId: 'evaluation',
      correlationId: `evaluation:${caseId}`,
    });

    const output = generation.text;
    const normalized = output.toLowerCase();
    const missing = testCase.expected_contains.filter(
      (expected) => !normalized.includes(expected.toLowerCase()),
    );
    const passed = missing.length === 0;
    const durationMs = Date.now() - startedAt;
    const id = randomUUID();

    await this.db.query(
      `INSERT INTO ai_eval_runs
        (id, case_id, model, output, passed, details, duration_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id,
        caseId,
        generation.model,
        output,
        passed,
        JSON.stringify({ missing }),
        durationMs,
      ],
    );

    return { id, passed, output, durationMs };
  }
}
