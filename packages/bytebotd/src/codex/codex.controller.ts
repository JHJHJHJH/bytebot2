import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
} from '@nestjs/common';
import { CodexExecRequest, CodexService } from './codex.service';

@Controller('codex')
export class CodexController {
  constructor(private readonly codexService: CodexService) {}

  @Get('status')
  getStatus() {
    return this.codexService.getStatus();
  }

  @Get('login/session')
  getLoginSession() {
    return this.codexService.getLoginSession();
  }

  @Post('login/device')
  startDeviceLogin() {
    return this.codexService.startDeviceLogin();
  }

  @Post('login/cancel')
  cancelLogin() {
    return this.codexService.cancelLogin();
  }

  @Post('logout')
  logout() {
    return this.codexService.logout();
  }

  @Post('test')
  @HttpCode(200)
  test() {
    return this.codexService.testAuth();
  }

  @Post('exec')
  exec(@Body() request: CodexExecRequest) {
    if (!request?.prompt) {
      throw new BadRequestException('prompt is required');
    }

    return this.codexService.exec(request);
  }
}
