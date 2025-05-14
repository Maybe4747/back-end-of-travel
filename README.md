# 携程旅游社交平台后端服务

## 项目简介

这是一个基于 Node.js 和 MongoDB 开发的旅游社交平台后端服务，提供用户管理、游记发布、评论互动等功能。

## 技术栈

- Node.js
- MongoDB
- JWT 认证
- Multer 文件上传
- HTTP 模块

## 环境要求

- Node.js >= 14.0.0
- MongoDB >= 4.0.0
- npm >= 6.0.0

## 安装步骤

1. 克隆项目

```bash
git clone [项目地址]
cd server
```

2. 安装依赖

```bash
npm install
```

3. 配置环境变量
   创建 `.env` 文件并配置以下内容：

```
SECRET_KEY=your_jwt_secret_key
MONGODB_URI=your_mongodb_connection_string
PORT=3001
```

4. 启动服务

```bash
npm start
```

## API 文档

### 用户相关接口

#### 1. 用户注册

- 请求路径：`/api/register`
- 请求方法：POST
- 请求参数：

```json
{
  "email": "user@example.com",
  "nickname": "用户名",
  "password": "密码"
}
```

- 响应示例：

```json
{
  "code": 200,
  "data": {
    "user_id": "user_1234567890"
  },
  "message": "注册成功",
  "success": true
}
```

#### 2. 用户登录

- 请求路径：`/api/login`
- 请求方法：POST
- 请求参数：

```json
{
  "nickname": "用户名",
  "password": "密码"
}
```

- 响应示例：

```json
{
  "code": 200,
  "data": {
    "user_id": "user_1234567890",
    "role": "user",
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
  },
  "message": "操作成功",
  "success": true
}
```

### 游记相关接口

#### 1. 发布游记

- 请求路径：`/api/notes/publish`
- 请求方法：POST
- 请求头：需要携带 `Authorization: Bearer <token>`
- 请求参数：multipart/form-data
  - title: 标题
  - content: 内容
  - location: 地点
  - files: 图片或视频文件（最多 10 个文件，单个文件最大 50MB）
- 响应示例：

```json
{
  "code": 201,
  "data": {
    "note_id": "post1234567890",
    "title": "巴厘岛游记",
    "content": "游记内容...",
    "location": "巴厘岛",
    "image": ["图片URL数组"],
    "video": "视频URL",
    "status": "pending"
  },
  "message": "游记发布成功，等待审核",
  "success": true
}
```

#### 2. 获取游记列表

- 请求路径：`/api/notes`
- 请求方法：GET
- 查询参数：
  - type: 分页类型（cursor/page）
  - page: 页码（type=page 时使用）
  - limit: 每页数量
  - cursor: 游标（type=cursor 时使用）
  - status: 状态筛选
- 响应示例：

```json
{
  "data": [游记列表],
  "nextCursor": "下一页游标",
  "hasMore": true,
  "total": 100,
  "currentPageSize": 10
}
```

### 评论相关接口

#### 1. 发表评论

- 请求路径：`/api/comment`
- 请求方法：POST
- 请求参数：

```json
{
  "noteId": "游记ID",
  "userId": "用户ID",
  "comment": "评论内容"
}
```

- 响应示例：

```json
{
  "id": "comment_1234567890",
  "user_id": "user_1234567890",
  "content": "评论内容",
  "created_at": "2024-03-01T10:00:00Z"
}
```

### 关注相关接口

#### 1. 关注用户

- 请求路径：`/api/follow`
- 请求方法：POST
- 请求参数：

```json
{
  "userId": "当前用户ID",
  "followId": "要关注的用户ID"
}
```

#### 2. 取消关注

- 请求路径：`/api/follow`
- 请求方法：DELETE
- 请求参数：同上

## 错误码说明

| 错误码 | 说明                |
| ------ | ------------------- |
| 200    | 请求成功            |
| 201    | 创建成功            |
| 400    | 请求参数错误        |
| 401    | 未授权或 token 无效 |
| 403    | 权限不足            |
| 404    | 资源不存在          |
| 409    | 资源冲突            |
| 500    | 服务器内部错误      |

## 文件上传说明

1. 支持的文件类型：

   - 图片：JPEG、PNG、GIF、WebP
   - 视频：MP4、WebM、OGG

2. 上传限制：

   - 单个文件大小：最大 50MB
   - 总文件数量：最多 10 个
   - 视频文件：每个游记只能上传 1 个视频

3. 文件存储：
   - 图片文件存储在 `uploads/images` 目录
   - 视频文件存储在 `uploads/videos` 目录

## 开发说明

1. 开发环境配置

```bash
npm install -D nodemon
```

2. 修改 package.json 的 scripts：

```json
{
  "scripts": {
    "dev": "nodemon server.js",
    "start": "node server.js"
  }
}
```

3. 启动开发服务器

```bash
npm run dev
```

## 注意事项

1. 安全性

   - 所有敏感信息（如数据库连接字符串、JWT 密钥）应通过环境变量配置
   - 文件上传应限制文件类型和大小
   - 用户密码应进行加密存储

2. 性能优化

   - 使用游标分页优化大数据量查询
   - 文件上传使用流式处理
   - 合理设置数据库索引

3. 错误处理
   - 所有接口都应进行适当的错误处理
   - 返回统一的错误响应格式
   - 记录关键错误日志

## 贡献指南

1. Fork 项目
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request
