import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MessagesService } from './messages.service';

@ApiTags('消息管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  // ─── GET /messages ────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({
    summary: '获取所有留言',
    description:
      '返回当前用户旗下所有二维码收到的留言，按创建时间倒序排列。' +
      '传入 ?unreadOnly=true 时只返回未读留言。',
  })
  @ApiQuery({
    name: 'unreadOnly',
    required: false,
    type: Boolean,
    description: '为 true 时只返回未读留言',
    example: false,
  })
  @ApiResponse({ status: 200, description: '成功返回留言列表' })
  @ApiResponse({ status: 401, description: '未登录或 Token 无效' })
  findAll(
    @CurrentUser() user: { id: string },
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    const onlyUnread = unreadOnly === 'true' || unreadOnly === '1';
    return this.messagesService.findAll(user.id, onlyUnread);
  }

  // ─── GET /messages/unread-count ───────────────────────────────────────────────

  @Get('unread-count')
  @ApiOperation({
    summary: '获取未读留言数量',
    description: '统计当前用户所有二维码下尚未阅读的留言总数，常用于消息角标。',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回未读数量',
    schema: {
      example: { success: true, data: { count: 3 }, timestamp: '2024-01-01T00:00:00.000Z' },
    },
  })
  @ApiResponse({ status: 401, description: '未登录或 Token 无效' })
  async getUnreadCount(@CurrentUser() user: { id: string }) {
    const count = await this.messagesService.getUnreadCount(user.id);
    return { count };
  }

  // ─── GET /messages/:id ────────────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({
    summary: '获取单条留言详情',
    description: '获取指定 ID 的留言详情，包含关联的二维码基本信息。仅物主可访问。',
  })
  @ApiParam({ name: 'id', description: '留言 UUID', type: String })
  @ApiResponse({ status: 200, description: '成功返回留言详情' })
  @ApiResponse({ status: 401, description: '未登录或 Token 无效' })
  @ApiResponse({ status: 403, description: '无权访问此留言' })
  @ApiResponse({ status: 404, description: '留言不存在' })
  findOne(
    @Param('id', new ParseUUIDPipe({ version: '4', errorHttpStatusCode: 400 }))
    id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.messagesService.findOne(id, user.id);
  }

  // ─── PATCH /messages/:id/read ─────────────────────────────────────────────────

  @Patch(':id/read')
  @ApiOperation({
    summary: '标记留言为已读',
    description: '将指定留言的 isRead 字段置为 true。仅物主可操作。',
  })
  @ApiParam({ name: 'id', description: '留言 UUID', type: String })
  @ApiResponse({ status: 200, description: '标记成功，返回更新后的留言' })
  @ApiResponse({ status: 401, description: '未登录或 Token 无效' })
  @ApiResponse({ status: 403, description: '无权操作此留言' })
  @ApiResponse({ status: 404, description: '留言不存在' })
  markAsRead(
    @Param('id', new ParseUUIDPipe({ version: '4', errorHttpStatusCode: 400 }))
    id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.messagesService.markAsRead(id, user.id);
  }
}
