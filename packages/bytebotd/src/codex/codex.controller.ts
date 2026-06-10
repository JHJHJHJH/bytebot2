import {
  BadRequestException,
  Body,
  Controller,
  Get,
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

  @Post('login/access-token')
  loginWithAccessToken(@Body('accessToken') accessToken?: string) {
    if (!accessToken) {
      throw new BadRequestException('accessToken is required');
    }

    return this.codexService.loginWithAccessToken(accessToken);
  }

  @Post('login/api-key')
  loginWithApiKey(@Body('apiKey') apiKey?: string) {
    if (!apiKey) {
      throw new BadRequestException('apiKey is required');
    }

    return this.codexService.loginWithApiKey(apiKey);
  }

  @Post('login/device')
  startDeviceLogin() {
    return this.codexService.startDeviceLogin();
  }

  @Post('login/terminal')
  openTerminalLogin() {
    return this.codexService.openTerminalLogin();
  }

  @Post('login/cancel')
  cancelLogin() {
    return this.codexService.cancelLogin();
  }

  @Post('logout')
  logout() {
    return this.codexService.logout();
  }

  @Post('exec')
  exec(@Body() request: CodexExecRequest) {
    if (!request?.prompt) {
      throw new BadRequestException('prompt is required');
    }

    return this.codexService.exec(request);
  }
}
