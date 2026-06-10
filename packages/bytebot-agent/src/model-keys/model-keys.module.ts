import { Global, Module } from '@nestjs/common';
import { ModelKeysController } from './model-keys.controller';
import { ModelKeysService } from './model-keys.service';

@Global()
@Module({
  controllers: [ModelKeysController],
  providers: [ModelKeysService],
  exports: [ModelKeysService],
})
export class ModelKeysModule {}
