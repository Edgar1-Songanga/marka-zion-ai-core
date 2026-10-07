import { Global, Module } from '@nestjs/common';
import { ModelLayerModule } from '../model-layer/model-layer.module';
import { EvaluationService } from './evaluation.service';

@Global()
@Module({
  imports: [ModelLayerModule],
  providers: [EvaluationService],
  exports: [EvaluationService],
})
export class EvaluationModule {}
