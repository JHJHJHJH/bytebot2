import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CodexService } from './codex.service';

@Module({
  imports: [ConfigModule],
  providers: [CodexService],
  exports: [CodexService],
})
export class CodexModule {}
