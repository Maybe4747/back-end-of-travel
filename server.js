import http from 'http';
import url from 'url';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

dotenv.config();

// 连接字符串
const uri =
  'mongodb+srv://michieda4747:jCGqch1gokJO7yae@travel.28hubvd.mongodb.net/';
const client = new MongoClient(uri);

// 全局数据库变量
let db;

// 配置文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // 根据文件类型选择不同的存储目录
    const fileType = file.mimetype.startsWith('image/') ? 'images' : 'videos';
    const uploadDir = path.join(process.cwd(), 'uploads', fileType);

    // 确保目录存在
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 生成文件名：时间戳 + 随机数 + 原始扩展名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  // 允许的图片类型
  const allowedImageTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ];
  // 允许的视频类型
  const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg'];

  if (
    file.mimetype.startsWith('image/') &&
    allowedImageTypes.includes(file.mimetype)
  ) {
    cb(null, true);
  } else if (
    file.mimetype.startsWith('video/') &&
    allowedVideoTypes.includes(file.mimetype)
  ) {
    // 检查是否已经上传了视频文件
    const videoCount = req.files
      ? req.files.filter((f) => f.mimetype.startsWith('video/')).length
      : 0;
    if (videoCount >= 1) {
      cb(new Error('只能上传一个视频文件'), false);
      return;
    }
    cb(null, true);
  } else {
    cb(new Error('不支持的文件类型'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 限制文件大小为 50MB
    files: 10, // 最多10个文件
  },
});

async function connect() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    db = client.db('travel');

    // 检查数据库连接
    const collections = await db.listCollections().toArray();
    console.log('数据库中的集合:', collections);

    return db;
  } catch (e) {
    console.error('Connection error', e);
    throw e;
  }
}

// 初始化MongoDB连接并读取数据
async function initialize() {
  try {
    await connect();
    console.log('MongoDB connection completed');
    const [notes, users] = await readData();
    console.log('初始数据读取结果:', {
      notesCount: notes.length,
      usersCount: users.length,
    });
    return [notes, users];
  } catch (err) {
    console.error('初始化失败:', err);
    return [[], []];
  }
}

// 读取数据
async function readData() {
  try {
    if (!db) {
      console.error('数据库未连接');
      return [[], []];
    }
    console.log('开始读取数据...');
    const notes = await db.collection('notes').find({}).toArray();
    console.log('读取到的笔记数量:', notes.length);

    const users = await db.collection('users').find({}).toArray();
    console.log('读取到的用户数量:', users.length);

    return [notes, users];
  } catch (error) {
    console.error('读取数据失败:', error);
    return [[], []];
  }
}

const SECRET_KEY = process.env.SECRET_KEY;
console.log('SECRET_KEY:', SECRET_KEY);
const port = 3001;

// 设置CORS头信息
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*'); // 允许所有来源
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, OPTIONS, PUT, PATCH, DELETE'
  ); // 允许的请求方法
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-Requested-With,content-type,Authorization'
  ); // 允许的请求头
  res.setHeader('Access-Control-Allow-Credentials', true); // 允许携带凭据
}

// 页码分页
function paginateByPage(notes, page, limit) {
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const paginatedNotes = notes.slice(startIndex, endIndex);

  return {
    data: paginatedNotes,
    currentPage: page,
    totalPages: Math.ceil(notes.length / limit),
    totalItems: notes.length,
    itemsPerPage: limit,
  };
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  console.log('处理路径:', pathname);
  setCorsHeaders(res);

  if (pathname === '/api/notes') {
    try {
      let query = {
        is_deleted: false,
        status: 'approved',
      };
      if (parsedUrl.query.status) {
        query.status = parsedUrl.query.status;
      }

      console.log('查询条件:', query);
      console.log('分页参数:', {
        type: parsedUrl.query.type,
        page: parsedUrl.query.page,
        limit: parsedUrl.query.limit,
        cursor: parsedUrl.query.cursor,
      });

      // 支持两种分页方式
      let result;
      if (parsedUrl.query.type === 'cursor') {
        // 游标分页
        const cursor = parsedUrl.query.cursor || null;
        const limit = parseInt(parsedUrl.query.limit) || 5;

        // 构建查询条件
        let findQuery = { ...query };
        if (cursor) {
          findQuery._id = { $gt: new ObjectId(cursor) };
        }

        console.log('游标分页查询条件:', findQuery);

        // 使用 MongoDB 的 skip 和 limit
        const paginatedNotes = await db
          .collection('notes')
          .find(findQuery)
          .sort({ _id: 1 })
          .limit(limit)
          .toArray();

        console.log('游标分页查询结果:', {
          数据条数: paginatedNotes.length,
          第一条数据: paginatedNotes[0],
          最后一条数据: paginatedNotes[paginatedNotes.length - 1],
        });

        const total = await db.collection('notes').countDocuments(query);
        const nextCursor =
          paginatedNotes.length > 0
            ? paginatedNotes[paginatedNotes.length - 1]._id.toString()
            : null;

        result = {
          data: paginatedNotes,
          nextCursor,
          hasMore: nextCursor !== null,
          total,
          currentPageSize: paginatedNotes.length,
        };
      } else {
        // 页码分页
        const page = parseInt(parsedUrl.query.page) || 1;
        const limit = parseInt(parsedUrl.query.limit) || 5;
        const skip = (page - 1) * limit;

        console.log('页码分页参数:', { page, limit, skip });

        // 使用 MongoDB 的 skip 和 limit
        const paginatedNotes = await db
          .collection('notes')
          .find(query)
          .skip(skip)
          .limit(limit)
          .toArray();

        console.log('页码分页查询结果:', {
          数据条数: paginatedNotes.length,
          第一条数据: paginatedNotes[0],
          最后一条数据: paginatedNotes[paginatedNotes.length - 1],
        });

        const total = await db.collection('notes').countDocuments(query);
        console.log('总记录数:', total);

        result = {
          data: paginatedNotes,
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
        };
      }

      console.log('返回结果:', {
        数据条数: result.data.length,
        分页信息: {
          currentPage: result.currentPage,
          totalPages: result.totalPages,
          totalItems: result.totalItems,
          itemsPerPage: result.itemsPerPage,
        },
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (error) {
      console.error('获取笔记列表失败:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '服务器错误' }));
    }
    return;
  } else if (pathname === '/api/user') {
    if (req.method === 'OPTIONS') {
      setCorsHeaders(res);
      res.writeHead(204); // No Content
      res.end();
      return;
    } else if (req.method === 'POST') {
      // 注册新用户
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      req.on('end', async () => {
        try {
          const newUser = JSON.parse(body);
          if (!newUser.id || !newUser.password) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '缺少账号或密码' }));
            return;
          }

          // 检查用户是否已存在
          const existingUser = await db
            .collection('users')
            .findOne({ id: newUser.id });
          if (existingUser) {
            res.writeHead(409, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '账号已存在' }));
            return;
          }

          newUser.created_at = new Date().toISOString();
          newUser.updated_at = new Date().toISOString();

          // 写入MongoDB
          await db.collection('users').insertOne(newUser);

          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(newUser));
        } catch (error) {
          console.error('注册用户失败:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '服务器错误' }));
        }
      });
      return;
    } else if (req.method === 'GET') {
      try {
        const userId = query.id;
        if (!userId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '缺少用户ID参数' }));
          return;
        }

        const foundUser = await db.collection('users').findOne({ id: userId });
        if (foundUser) {
          // 获取用户的笔记
          const userNotes = await db
            .collection('notes')
            .find({ user_id: userId })
            .toArray();
          const userDetails = {
            ...foundUser,
            notes: userNotes,
          };
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(userDetails));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '用户未找到' }));
        }
      } catch (error) {
        console.error('获取用户信息失败:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '服务器错误' }));
      }
    } else if (req.method === 'PUT') {
      // 处理用户信息更新或密码修改
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      req.on('end', async () => {
        try {
          const { id, user_info, oldPassword, newPassword } = JSON.parse(body);
          console.log('收到PUT /api/user参数：', {
            id,
            user_info,
            oldPassword,
            newPassword,
          });

          const foundUser = await db.collection('users').findOne({ id: id });
          if (!foundUser) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '用户未找到' }));
            return;
          }

          // 如果有 oldPassword 和 newPassword 字段，则为修改密码
          if (
            typeof oldPassword === 'string' &&
            typeof newPassword === 'string' &&
            oldPassword.length > 0 &&
            newPassword.length > 0
          ) {
            if (foundUser.password !== oldPassword) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: '原密码错误' }));
              return;
            }

            // 更新密码
            await db.collection('users').updateOne(
              { id: id },
              {
                $set: {
                  password: newPassword,
                  updated_at: new Date().toISOString(),
                },
              }
            );

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: '密码修改成功' }));
            return;
          }

          // 否则为普通信息更新
          if (!id || !user_info) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '缺少用户ID或更新内容' }));
            return;
          }

          // 更新用户信息
          const updatedUser = await db.collection('users').findOneAndUpdate(
            { id: id },
            {
              $set: {
                user_info: { ...foundUser.user_info, ...user_info },
                updated_at: new Date().toISOString(),
              },
            },
            { returnDocument: 'after' }
          );

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(updatedUser.value));
        } catch (error) {
          console.error('更新用户信息失败:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '服务器错误' }));
        }
      });
    } else {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '不支持的请求方法' }));
    }
  } else if (pathname === '/api/notedetail') {
    try {
      const noteId = parsedUrl.query.id;
      if (!noteId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '缺少推文ID参数' }));
        return;
      }

      const foundNote = await db
        .collection('notes')
        .findOne({ id: noteId, is_deleted: { $ne: true } });
      if (foundNote) {
        // 获取评论的用户信息
        const commentsWithUserInfo = await Promise.all(
          foundNote.comments.map(async (comment) => {
            const commentUser = await db
              .collection('users')
              .findOne({ id: comment.user_id });
            return {
              ...comment,
              user_info: commentUser ? commentUser.user_info : null,
            };
          })
        );

        const noteDetails = {
          ...foundNote,
          comments: commentsWithUserInfo,
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(noteDetails));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '推文未找到' }));
      }
    } catch (error) {
      console.error('获取笔记详情失败:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '服务器错误' }));
    }
    return;
  } else if (pathname === '/api/search') {
    try {
      const keyword = parsedUrl.query.keyword?.toLowerCase();
      if (!keyword) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '缺少关键词参数' }));
        return;
      }

      // 根据用户昵称查找
      const foundUsers = await db
        .collection('users')
        .find({
          'user_info.nickname': { $regex: keyword, $options: 'i' },
        })
        .toArray();

      let filteredNotes = [];
      if (foundUsers.length > 0) {
        const userIds = foundUsers.map((user) => user.id);
        filteredNotes = await db
          .collection('notes')
          .find({
            user_id: { $in: userIds },
            is_deleted: { $ne: true },
          })
          .toArray();
      }

      // 根据游记标题查找
      const titleFilteredNotes = await db
        .collection('notes')
        .find({
          title: { $regex: keyword, $options: 'i' },
          is_deleted: { $ne: true },
        })
        .toArray();

      // 合并结果，去重
      const uniqueNotes = [
        ...new Map(
          [...filteredNotes, ...titleFilteredNotes].map((note) => [
            note.id,
            note,
          ])
        ).values(),
      ];

      if (uniqueNotes.length === 0) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '未找到匹配的结果' }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(uniqueNotes));
    } catch (error) {
      console.error('搜索失败:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '服务器错误' }));
    }
    return;
  } else if (pathname === '/api/comment') {
    // 处理预检请求
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      res.end();
      return;
    }

    // 发布评论
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '仅支持POST方法' }));
      return;
    }

    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const { noteId, userId, comment } = JSON.parse(body);

        if (!noteId || !userId || !comment) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '缺少必要参数' }));
          return;
        }

        const foundNote = await db
          .collection('notes')
          .findOne({ id: noteId, is_deleted: { $ne: true } });
        if (!foundNote) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '推文未找到' }));
          return;
        }

        const newComment = {
          id: `comment_${Date.now()}`,
          user_id: userId,
          content: comment,
          created_at: new Date().toISOString(),
        };

        await db
          .collection('notes')
          .updateOne({ id: noteId }, { $push: { comments: newComment } });

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(newComment));
      } catch (error) {
        console.error('发布评论失败:', error);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '服务器错误' }));
        }
      }
    });
  } else if (pathname === '/api/follow') {
    // 处理预检请求
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      res.end();
      return;
    }

    if (req.method === 'POST') {
      // 关注用户
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });

      req.on('end', async () => {
        try {
          const { userId, followId } = JSON.parse(body);

          if (!userId || !followId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '缺少必要参数' }));
            return;
          }

          const foundUser = await db
            .collection('users')
            .findOne({ id: userId });
          const followUser = await db
            .collection('users')
            .findOne({ id: followId });

          if (!foundUser || !followUser) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '用户未找到' }));
            return;
          }

          // 更新关注者的关注列表
          await db
            .collection('users')
            .updateOne(
              { id: userId },
              { $addToSet: { 'user_info.follow': followId } }
            );

          // 更新被关注者的粉丝列表
          await db
            .collection('users')
            .updateOne(
              { id: followId },
              { $addToSet: { 'user_info.fans': userId } }
            );

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: '关注成功' }));
        } catch (error) {
          console.error('关注用户失败:', error);
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '服务器错误' }));
          }
        }
      });
    } else if (req.method === 'DELETE') {
      // 取消关注
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });

      req.on('end', async () => {
        try {
          const { userId, followId } = JSON.parse(body);

          if (!userId || !followId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '缺少必要参数' }));
            return;
          }

          const foundUser = await db
            .collection('users')
            .findOne({ id: userId });
          const followUser = await db
            .collection('users')
            .findOne({ id: followId });

          if (!foundUser || !followUser) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '用户未找到' }));
            return;
          }

          // 更新关注者的关注列表
          await db
            .collection('users')
            .updateOne(
              { id: userId },
              { $pull: { 'user_info.follow': followId } }
            );

          // 更新被关注者的粉丝列表
          await db
            .collection('users')
            .updateOne(
              { id: followId },
              { $pull: { 'user_info.fans': userId } }
            );

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: '取消关注成功' }));
        } catch (error) {
          console.error('取消关注失败:', error);
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '服务器错误' }));
          }
        }
      });
    } else if (req.method === 'GET') {
      // 查询用户是否关注
      try {
        const { userId, followId } = parsedUrl.query;

        if (!userId || !followId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '缺少必要参数' }));
          return;
        }

        const foundUser = await db.collection('users').findOne({ id: userId });

        if (!foundUser) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '用户未找到' }));
          return;
        }

        const isFollowing = foundUser.user_info.follow.includes(followId);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ isFollowing }));
      } catch (error) {
        console.error('查询关注状态失败:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '服务器错误' }));
      }
    } else {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '不支持的请求方法' }));
    }
  } else if (pathname === '/api/travelogues') {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      });
      res.end();
      return;
    } else if (req.method === 'GET') {
      try {
        // 获取所有游记
        const status = parsedUrl.query.status;
        let mongoQuery = { is_deleted: { $ne: true } };

        if (status) {
          mongoQuery.status = status;
        }

        const travelogues = await db
          .collection('notes')
          .find(mongoQuery)
          .toArray();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(travelogues));
      } catch (error) {
        console.error('获取游记列表失败:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '服务器错误' }));
      }
    } else if (req.method === 'POST') {
      // 批准游记
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });

      req.on('end', async () => {
        try {
          const { id } = JSON.parse(body);

          if (!id) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '缺少游记ID参数' }));
            return;
          }

          const result = await db.collection('notes').updateOne(
            { id: id },
            {
              $set: {
                status: 'approved',
                updated_at: new Date().toISOString(),
              },
            }
          );

          if (result.matchedCount === 0) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '游记未找到' }));
            return;
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: '游记已批准' }));
        } catch (error) {
          console.error('处理批准游记时发生错误:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '服务器错误' }));
        }
      });
    } else if (req.method === 'PUT') {
      // 拒绝游记
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });

      req.on('end', async () => {
        try {
          const { id, rejection_reason } = JSON.parse(body);

          if (!id || !rejection_reason) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '缺少必要参数' }));
            return;
          }

          const result = await db.collection('notes').updateOne(
            { id: id },
            {
              $set: {
                status: 'rejected',
                rejection_reason: rejection_reason,
                updated_at: new Date().toISOString(),
              },
            }
          );

          if (result.matchedCount === 0) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '游记未找到' }));
            return;
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: '游记已拒绝' }));
        } catch (error) {
          console.error('处理拒绝游记时发生错误:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '服务器错误' }));
        }
      });
    } else if (req.method === 'DELETE') {
      // 删除游记
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });

      req.on('end', async () => {
        try {
          const { id } = JSON.parse(body);

          if (!id) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '缺少游记ID参数' }));
            return;
          }

          const result = await db.collection('notes').updateOne(
            { id: id },
            {
              $set: {
                is_deleted: true,
                updated_at: new Date().toISOString(),
              },
            }
          );

          if (result.matchedCount === 0) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '游记未找到' }));
            return;
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: '游记已删除' }));
        } catch (error) {
          console.error('处理删除游记时发生错误:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '服务器错误' }));
        }
      });
    } else {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '不支持的请求方法' }));
    }
  } else if (pathname === '/api/register') {
    if (req.method === 'OPTIONS') {
      setCorsHeaders(res);
      res.writeHead(204); // No Content
      res.end();
      return;
    }
    // 用户注册
    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });

      req.on('end', async () => {
        try {
          const { email, nickname, password } = JSON.parse(body);

          if (!email || !nickname || !password) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '缺少邮箱、昵称或密码' }));
            return;
          }

          // 检查用户是否已存在
          const existingUser = await db.collection('users').findOne({
            $or: [{ 'user_info.nickname': nickname }, { email: email }],
          });

          if (existingUser) {
            res.writeHead(409, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '邮箱或昵称已存在' }));
            return;
          }

          const newUser = {
            id: `user_${Date.now()}`,
            email,
            password,
            name: '',
            user_info: {
              avatar: `https://picsum.photos/360/460?random=${Math.floor(
                Math.random() * 1000
              )}`,
              nickname,
              gender: '',
              birthday: '',
              city: '',
              signature: '',
              follow: [],
              fans: [],
              notes: [],
            },
            role: 'user', // 默认角色为 user
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          // 写入MongoDB
          await db.collection('users').insertOne(newUser);

          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              code: 200,
              data: {
                user_id: newUser.id,
              },
              message: '注册成功',
              success: true,
            })
          );
        } catch (error) {
          console.error('注册用户失败:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '服务器错误' }));
        }
      });
    } else {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '不支持的请求方法' }));
    }
  } else if (pathname === '/api/login') {
    if (req.method === 'OPTIONS') {
      setCorsHeaders(res);
      res.writeHead(204); // No Content
      res.end();
      return;
    }
    // 用户登录
    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });

      req.on('end', async () => {
        try {
          const { nickname, password } = JSON.parse(body);

          if (!nickname || !password) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                code: 400,
                message: '缺少昵称或密码',
                success: false,
              })
            );
            return;
          }

          // 从数据库查找用户
          const foundUser = await db.collection('users').findOne({
            'user_info.nickname': nickname,
            password: password,
          });

          if (!foundUser) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                code: 401,
                message: '昵称或密码错误',
                success: false,
              })
            );
            return;
          }

          // 生成 JWT Token
          try {
            const accessToken = jwt.sign(
              { userId: foundUser.id, role: foundUser.role },
              SECRET_KEY,
              { expiresIn: '7d' } // Access Token 有效期 7 天
            );

            const refreshToken = jwt.sign(
              { userId: foundUser.id },
              SECRET_KEY,
              { expiresIn: '30d' } // Refresh Token 有效期 30 天
            );

            // 返回响应
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                code: 200,
                data: {
                  user_id: foundUser.id,
                  role: foundUser.role,
                  access_token: accessToken,
                  refresh_token: refreshToken,
                },
                message: '操作成功',
                success: true,
              })
            );
          } catch (err) {
            console.error('生成 Token 时出错:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                code: 500,
                message: '生成 Token 时出错',
                success: false,
              })
            );
          }
        } catch (error) {
          console.error('解析请求体时出错:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              code: 500,
              message: '服务器错误',
              success: false,
            })
          );
        }
      });
    } else {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          code: 405,
          message: '不支持的请求方法',
          success: false,
        })
      );
    }
  } else if (pathname === '/api/notes/publish') {
    if (req.method === 'OPTIONS') {
      setCorsHeaders(res);
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          code: 405,
          message: '只支持 POST 请求',
          success: false,
        })
      );
      return;
    }

    // 验证 token
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          code: 401,
          message: '未提供认证token',
          success: false,
        })
      );
      return;
    }

    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, SECRET_KEY);

      // 使用 multer 处理文件上传
      upload.array('files', 10)(req, res, async (err) => {
        if (err) {
          console.error('文件上传错误:', err);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              code: 400,
              message: err.message,
              success: false,
            })
          );
          return;
        }

        try {
          const { title, content, location } = req.body;

          if (!title || !content) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                code: 400,
                message: '标题和内容不能为空',
                success: false,
              })
            );
            return;
          }

          // 处理上传的文件
          const files = req.files || [];
          const images = [];
          let video = '';

          files.forEach((file) => {
            const fileUrl = `http://localhost:${port}${file.path
              .replace(process.cwd(), '')
              .replace(/\\/g, '/')}`;

            if (file.mimetype.startsWith('image/')) {
              images.push(fileUrl);
            } else if (file.mimetype.startsWith('video/')) {
              video = fileUrl;
            }
          });

          // 创建游记文档
          const newNote = {
            id: `post${Date.now()}`,
            user_id: decoded.userId,
            title,
            content,
            location: location || '',
            image: images,
            video: video,
            status: 'pending', // 待审核状态
            is_deleted: false,
            comments: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          // 保存到数据库
          const result = await db.collection('notes').insertOne(newNote);

          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              code: 201,
              data: {
                note_id: newNote.id,
                ...newNote,
              },
              message: '游记发布成功，等待审核',
              success: true,
            })
          );
        } catch (error) {
          console.error('发布游记失败:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              code: 500,
              message: '服务器错误',
              success: false,
            })
          );
        }
      });
    } catch (error) {
      console.error('Token验证失败:', error);
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          code: 401,
          message: '无效的token',
          success: false,
        })
      );
    }
    return;
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

// 获取文件类型
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogg': 'video/ogg',
  };
  return contentTypes[ext] || 'application/octet-stream';
}

// 初始化并启动服务器
initialize()
  .then(([notes, users]) => {
    console.log('系统初始化完成');
    server.listen(port, () => {
      console.log(`服务器正在运行在 http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error('服务器启动失败:', err);
  });
