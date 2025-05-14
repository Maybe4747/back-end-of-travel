# 旅游社交平台后端服务

这是一个基于 Node.js 和 MongoDB 的旅游社交平台后端服务，提供用户管理、游记发布、评论互动等功能。

## 技术栈

- Node.js
- MongoDB
- JWT 认证
- Multer 文件上传

## 环境要求

- Node.js >= 14.0.0
- MongoDB >= 4.0.0

## 安装步骤

1. 克隆项目

```bash
git clone [项目地址]
cd [项目目录]
```

2. 安装依赖

```bash
npm install
```

3. 配置环境变量
   创建 `.env` 文件，添加以下配置：

```env
SECRET_KEY=你的密钥
```

4. 启动服务

```bash
npm start
```

服务将在 http://localhost:3001 运行

## API 文档

### 用户相关接口

#### 1. 用户注册

- 请求路径：`/api/register`
- 请求方法：`POST`
- 请求参数：

```json
{
  "email": "用户邮箱",
  "nickname": "用户昵称",
  "password": "用户密码"
}
```

- 响应示例：

```json
{
  "code": 200,
  "data": {
    "user_id": "用户ID"
  },
  "message": "注册成功",
  "success": true
}
```

#### 2. 用户登录

- 请求路径：`/api/login`
- 请求方法：`POST`
- 请求参数：

```json
{
  "nickname": "用户昵称",
  "password": "用户密码"
}
```

- 响应示例：

```json
{
  "code": 200,
  "data": {
    "user_id": "用户ID",
    "role": "用户角色",
    "access_token": "访问令牌",
    "refresh_token": "刷新令牌"
  },
  "message": "操作成功",
  "success": true
}
```

#### 3. 获取用户信息

- 请求路径：`/api/user`
- 请求方法：`GET`
- 请求参数：`id`（用户 ID）
- 响应示例：

```json
{
  "id": "用户ID",
  "email": "用户邮箱",
  "user_info": {
    "nickname": "用户昵称",
    "avatar": "头像URL",
    "city": "城市",
    "signature": "个性签名"
  },
  "notes": [
    // 用户的笔记列表
  ]
}
```

#### 4. 更新用户信息

- 请求路径：`/api/user`
- 请求方法：`PUT`
- 请求参数：

```json
{
  "id": "用户ID",
  "user_info": {
    "nickname": "新昵称",
    "city": "新城市",
    "signature": "新签名"
  }
}
```

### 游记相关接口

#### 1. 获取游记列表

- 请求路径：`/api/notes`
- 请求方法：`GET`
- 请求参数：
  - `page`: 页码
  - `limit`: 每页数量
  - `type`: 分页类型（page/cursor）
  - `cursor`: 游标（当 type=cursor 时使用）

#### 2. 获取游记详情

- 请求路径：`/api/notedetail`
- 请求方法：`GET`
- 请求参数：`id`（游记 ID）

### 文件上传

#### 1. 上传文件

- 请求路径：`/api/upload`
- 请求方法：`POST`
- 请求头：
  - `Authorization: Bearer [token]`
- 请求体：`multipart/form-data`
  - `files`: 文件数组（最多 10 个文件）
- 支持的文件类型：
  - 图片：JPEG, PNG, GIF, WebP
  - 视频：MP4, WebM, OGG
- 文件大小限制：50MB

### 评论相关接口

#### 1. 发表评论

- 请求路径：`/api/comment`
- 请求方法：`POST`
- 请求参数：

```json
{
  "noteId": "游记ID",
  "userId": "用户ID",
  "comment": "评论内容"
}
```

### 关注相关接口

#### 1. 关注用户

- 请求路径：`/api/follow`
- 请求方法：`POST`
- 请求参数：

```json
{
  "userId": "当前用户ID",
  "followId": "要关注的用户ID"
}
```

#### 2. 取消关注

- 请求路径：`/api/follow`
- 请求方法：`DELETE`
- 请求参数：

```json
{
  "userId": "当前用户ID",
  "followId": "要取消关注的用户ID"
}
```

## 错误码说明

- 200: 请求成功
- 400: 请求参数错误
- 401: 未授权
- 404: 资源不存在
- 409: 资源冲突
- 500: 服务器错误

## 注意事项

1. 所有需要认证的接口都需要在请求头中携带 `Authorization: Bearer [token]`
2. 文件上传大小限制为 50MB
3. 每个游记最多只能上传一个视频文件
4. 图片支持 JPEG、PNG、GIF、WebP 格式
5. 视频支持 MP4、WebM、OGG 格式


