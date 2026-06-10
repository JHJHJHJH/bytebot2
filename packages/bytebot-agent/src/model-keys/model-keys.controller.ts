import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import {
  ModelKeysService,
  ModelProviderId,
} from './model-keys.service';

@Controller('model-keys')
export class ModelKeysController {
  constructor(private readonly modelKeysService: ModelKeysService) {}

  @Get()
  getModelKeys() {
    return {
      providers: this.modelKeysService.getStatuses(),
    };
  }

  @Post(':providerId')
  setModelKey(
    @Param('providerId') providerId: ModelProviderId,
    @Body('apiKey') apiKey?: string,
  ) {
    if (!apiKey) {
      throw new BadRequestException('apiKey is required');
    }

    try {
      return this.modelKeysService.setApiKey(providerId, apiKey);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(message);
    }
  }

  @Post(':providerId/test')
  @HttpCode(200)
  async testModelKey(@Param('providerId') providerId: ModelProviderId) {
    try {
      return await this.modelKeysService.testApiKey(providerId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(message);
    }
  }

  @Delete(':providerId')
  clearModelKey(@Param('providerId') providerId: ModelProviderId) {
    try {
      return this.modelKeysService.clearApiKey(providerId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(message);
    }
  }
}
