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
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import {
  ModelKeysService,
  ModelProviderId,
} from './model-keys.service';

@ApiTags('model-keys')
@Controller('model-keys')
export class ModelKeysController {
  constructor(private readonly modelKeysService: ModelKeysService) {}

  @Get()
  @ApiOperation({ summary: 'Get configuration status for each model provider' })
  getModelKeys() {
    return {
      providers: this.modelKeysService.getStatuses(),
    };
  }

  @Post(':providerId')
  @ApiOperation({ summary: 'Set the API key for a model provider' })
  @ApiParam({ name: 'providerId', description: 'Model provider id' })
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
  @ApiOperation({ summary: 'Test the configured API key for a model provider' })
  @ApiParam({ name: 'providerId', description: 'Model provider id' })
  async testModelKey(@Param('providerId') providerId: ModelProviderId) {
    try {
      return await this.modelKeysService.testApiKey(providerId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(message);
    }
  }

  @Delete(':providerId')
  @ApiOperation({ summary: 'Clear the stored API key for a model provider' })
  @ApiParam({ name: 'providerId', description: 'Model provider id' })
  clearModelKey(@Param('providerId') providerId: ModelProviderId) {
    try {
      return this.modelKeysService.clearApiKey(providerId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(message);
    }
  }
}
