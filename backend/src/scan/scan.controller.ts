import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';

import { ScanService, ScanResultDto } from './scan.service';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('扫码/公开接口')
@Controller('scan')
export class ScanController {
  constructor(private readonly scanService: ScanService) {}

  /**
   * GET /scan/:token
   *
   * 公开接口，无需登录。
   * 返回物品基本信息，同时在后台异步写入扫码记录（失败不影响主流程）。
   */
  @Get(':token')
  @ApiOperation({
    summary: '获取物品信息',
    description:
      '根据二维码 token 获取物品公开信息，同时自动记录本次扫码行为（IP / User-Agent）。即使扫码记录写入失败也不影响物品信息的正常返回。',
  })
  @ApiParam({ name: 'token', description: '二维码唯一 token', example: 'aB3dEf7gHi' })
  @ApiResponse({ status: 200, description: '成功返回物品信息' })
  @ApiResponse({ status: 404, description: '二维码不存在' })
  async getItemInfo(
    @Param('token') token: string,
    @Req() req: Request,
  ): Promise<ScanResultDto> {
    // 优先从代理头获取真实客户端 IP
    const rawForwarded = req.headers['x-forwarded-for'];
    const ip =
      (Array.isArray(rawForwarded) ? rawForwarded[0] : rawForwarded) ||
      req.socket.remoteAddress ||
      '';

    const userAgent = (req.headers['user-agent'] as string) || '';

    // 后台写扫码记录；即使失败也不阻塞物品信息返回
    try {
      await this.scanService.recordScan(token, ip, userAgent);
    } catch {
      // 静默忽略，扫码记录写入失败不影响用户体验
    }

    return this.scanService.getItemInfo(token);
  }

  /**
   * POST /scan/:token/message
   *
   * 公开接口，无需登录。
   * 限流：每个来源 IP 每分钟最多发送 3 条留言，防止恶意刷接口。
   */
  @Post(':token/message')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({
    summary: '向物主发送留言',
    description:
      '拾到物品的人通过此接口向物主发送联系留言。每个 IP 每分钟最多提交 3 次，超出后返回 429。若二维码已被物主停用，返回 400。',
  })
  @ApiParam({ name: 'token', description: '二维码唯一 token', example: 'aB3dEf7gHi' })
  @ApiResponse({ status: 204, description: '留言发送成功' })
  @ApiResponse({ status: 400, description: '该二维码已停用' })
  @ApiResponse({ status: 404, description: '二维码不存在' })
  @ApiResponse({ status: 429, description: '请求过于频繁，请稍后再试' })
  async sendMessage(
    @Param('token') token: string,
    @Body() dto: SendMessageDto,
  ): Promise<void> {
    await this.scanService.sendMessage(token, dto);
  }
}
