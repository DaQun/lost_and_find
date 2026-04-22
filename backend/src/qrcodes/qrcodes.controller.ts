import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { QrCodesService } from './qrcodes.service';
import { CreateQrCodeDto } from './dto/create-qrcode.dto';
import { UpdateQrCodeDto } from './dto/update-qrcode.dto';

@ApiTags('二维码管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('qrcodes')
export class QrCodesController {
  constructor(private readonly qrCodesService: QrCodesService) {}

  // ─── 创建 ─────────────────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({
    summary: '创建二维码',
    description: '为当前用户创建一张新的失物二维码，返回二维码信息及 base64 图片数据。',
  })
  @ApiResponse({ status: 201, description: '创建成功，返回二维码记录及 qrImageData' })
  @ApiResponse({ status: 401, description: '未登录或 Token 无效' })
  async create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateQrCodeDto,
  ) {
    return this.qrCodesService.create(user.id, dto);
  }

  // ─── 列表 ─────────────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({
    summary: '获取当前用户所有二维码',
    description: '返回当前登录用户名下的全部二维码列表，按创建时间倒序排列。',
  })
  @ApiResponse({ status: 200, description: '返回二维码数组' })
  @ApiResponse({ status: 401, description: '未登录或 Token 无效' })
  async findAll(@CurrentUser() user: { id: string }) {
    return this.qrCodesService.findAll(user.id);
  }

  // ─── 详情 ─────────────────────────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({
    summary: '获取单个二维码详情',
    description: '返回指定二维码的详细信息，包含实时生成的 qrImageData（base64 PNG）。',
  })
  @ApiParam({ name: 'id', description: '二维码 UUID' })
  @ApiResponse({ status: 200, description: '返回二维码详情及 qrImageData' })
  @ApiResponse({ status: 403, description: '无权访问该二维码' })
  @ApiResponse({ status: 404, description: '二维码不存在' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.qrCodesService.findOne(id, user.id);
  }

  // ─── 更新 ─────────────────────────────────────────────────────────────────────

  @Patch(':id')
  @ApiOperation({
    summary: '更新二维码信息',
    description: '更新指定二维码的标签、描述、图标、颜色或悬赏说明，字段均为可选。',
  })
  @ApiParam({ name: 'id', description: '二维码 UUID' })
  @ApiResponse({ status: 200, description: '更新成功，返回最新二维码记录' })
  @ApiResponse({ status: 403, description: '无权操作该二维码' })
  @ApiResponse({ status: 404, description: '二维码不存在' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateQrCodeDto,
  ) {
    return this.qrCodesService.update(id, user.id, dto);
  }

  // ─── 删除 ─────────────────────────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '删除二维码',
    description: '删除指定二维码及其关联的扫码记录与留言（级联删除）。',
  })
  @ApiParam({ name: 'id', description: '二维码 UUID' })
  @ApiResponse({ status: 204, description: '删除成功，无响应体' })
  @ApiResponse({ status: 403, description: '无权操作该二维码' })
  @ApiResponse({ status: 404, description: '二维码不存在' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ): Promise<void> {
    await this.qrCodesService.delete(id, user.id);
  }

  // ─── 启用 / 停用切换 ──────────────────────────────────────────────────────────

  @Patch(':id/toggle')
  @ApiOperation({
    summary: '切换二维码启用状态',
    description: '将指定二维码的 isActive 字段在 true / false 之间切换。停用后扫码页将提示物主已关闭该码。',
  })
  @ApiParam({ name: 'id', description: '二维码 UUID' })
  @ApiResponse({ status: 200, description: '切换成功，返回最新二维码记录（含最新 isActive 值）' })
  @ApiResponse({ status: 403, description: '无权操作该二维码' })
  @ApiResponse({ status: 404, description: '二维码不存在' })
  async toggle(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.qrCodesService.toggle(id, user.id);
  }
}
