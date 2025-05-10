const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const SECRET_KEY = process.env.SECRET_KEY; // 替换为你的密钥
console.log('SECRET_KEY:', SECRET_KEY);
const port = 3001;

const dataFilePath = path.join(__dirname, 'data.json');

// 读取数据
function readData() {
  const data = fs.readFileSync(dataFilePath, 'utf-8');
  const parsedData = JSON.parse(data);
  return [parsedData.notes || [], parsedData.user]; // 确保返回的是数组
}
// console.log('读取数据:', readData());
const [notes, user] = readData();
console.log('读取user:', user);
// 写入数据
function writeData(data) {
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('写入数据失败:', error);
  }
}

// 设置CORS头信息
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*'); // 允许所有来源
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE'); // 允许的请求方法
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Authorization'); // 允许的请求头
  res.setHeader('Access-Control-Allow-Credentials', true); // 允许携带凭据
}

// 过滤游记
function filterNotesByStatus(notes, status) {
  return status ? notes.filter((note) => note.status === status) : notes;
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

// 游标分页
function paginateByCursor(notes, cursor, limit) {
  const noteIndexMap = new Map(notes.map((note, index) => [note.id, index]));
  const startIndex = cursor ? noteIndexMap.get(cursor) + 1 : 0;
  const paginatedNotes = notes.slice(startIndex, startIndex + limit);
  const nextCursor =
    startIndex + limit < notes.length ? paginatedNotes[paginatedNotes.length - 1]?.id : null;

  return {
    data: paginatedNotes,
    nextCursor,
    hasMore: nextCursor !== null,
    total: notes.length,
    currentPageSize: paginatedNotes.length,
  };
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  console.log('处理路径:', pathname);
  setCorsHeaders(res);

  if (pathname === '/api/notes') {
    let filteredNotes = filterNotesByStatus(notes, query.status);

    // 支持两种分页方式
    let result;
    if (query.type === 'cursor') {
      // 游标分页
      const cursor = query.cursor || null;
      const limit = parseInt(query.limit) || 5;
      result = paginateByCursor(filteredNotes, cursor, limit);
    } else if (query.type === 'page') {
      // 页码分页
      const page = parseInt(query.page) || 1;
      const limit = parseInt(query.limit) || 5;
      result = paginateByPage(filteredNotes, page, limit);
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return; // 确保结束逻辑
  } else if (pathname === '/api/user') {
    const userId = query.id;
    if (!userId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '缺少用户ID参数' }));
      return;
    }

    const foundUser = user.find((u) => u.id === userId);
    if (foundUser) {
      const userDetails = {
        ...foundUser,
        notes: notes.filter((note) => note.user_id === userId), // 返回用户的游记
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(userDetails));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '用户未找到' }));
    }
  } else if (pathname === '/api/notedetail') {
    const noteId = query.id;
    if (!noteId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '缺少推文ID参数' }));
      return;
    }

    const foundNote = notes.find((note) => note.id === noteId && !note.isDeleted);
    if (foundNote) {
      // 添加评论的用户信息
      const commentsWithUserInfo = foundNote.comments.map((comment) => {
        const commentUser = user.find((u) => u.id === comment.user_id);
        return {
          ...comment,
          user_info: commentUser ? commentUser.user_info : null,
        };
      });

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
  } else if (pathname === '/api/search') {
    const keyword = query.keyword?.toLowerCase();
    if (!keyword) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '缺少关键词参数' }));
      return;
    }

    // 根据用户昵称查找
    const foundUser = user.find((u) => u['user_info'].nickname.toLowerCase().includes(keyword));
    let filteredNotes = [];

    if (foundUser) {
      const userId = foundUser.id;
      filteredNotes = notes.filter((note) => note.user_id === userId && !note.isDeleted);
    }

    // 根据游记标题查找
    const titleFilteredNotes = notes.filter(
      (note) => note.title.toLowerCase().includes(keyword) && !note.isDeleted
    );

    // 合并结果，去重
    const uniqueNotes = [
      ...new Map([...filteredNotes, ...titleFilteredNotes].map((note) => [note.id, note])).values(),
    ];

    if (uniqueNotes.length === 0) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '未找到匹配的结果' }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(uniqueNotes));
  } else if (pathname === '/api/comment') {
    // 处理预检请求
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      res.end();
      return; // 确保结束逻辑
    }

    // 发布评论
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '仅支持POST方法' }));
      return; // 确保结束逻辑
    }

    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const { noteId, userId, comment } = JSON.parse(body);

        if (!noteId || !userId || !comment) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '缺少必要参数' }));
          return;
        }

        const foundNote = notes.find((note) => note.id === noteId && !note.isDeleted);
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

        foundNote.comments = foundNote.comments || [];
        foundNote.comments.push(newComment);

        writeData({ notes, user });

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(newComment));
      } catch (error) {
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
      return; // 确保结束逻辑
    }

    if (req.method === 'POST') {
      // 关注用户
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });

      req.on('end', () => {
        try {
          const { userId, followId } = JSON.parse(body);

          console.log('收到的请求参数:', { userId, followId });

          if (!userId || !followId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '缺少必要参数' }));
            return;
          }

          const foundUser = user.find((u) => u.id === userId);
          const followUser = user.find((u) => u.id === followId);

          console.log('找到的用户:', foundUser);
          console.log('找到的关注用户:', followUser);

          if (!foundUser || !followUser) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '用户未找到' }));
            return;
          }

          if (!foundUser.user_info.follow.includes(followId)) {
            foundUser.user_info.follow.push(followId);
          }

          if (!followUser.user_info.fans.includes(userId)) {
            followUser.user_info.fans.push(userId);
          }

          writeData({ notes, user });

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: '关注成功' }));
        } catch (error) {
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

      req.on('end', () => {
        try {
          const { userId, followId } = JSON.parse(body);

          console.log('收到的请求参数:', { userId, followId });

          if (!userId || !followId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '缺少必要参数' }));
            return;
          }

          const foundUser = user.find((u) => u.id === userId);
          const followUser = user.find((u) => u.id === followId);

          console.log('找到的用户:', foundUser);
          console.log('找到的关注用户:', followUser);

          if (!foundUser || !followUser) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '用户未找到' }));
            return;
          }

          foundUser.user_info.follow = foundUser.user_info.follow.filter((id) => id !== followId);
          followUser.user_info.fans = followUser.user_info.fans.filter((id) => id !== userId);

          writeData({ notes, user });

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: '取消关注成功' }));
        } catch (error) {
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '服务器错误' }));
          }
        }
      });
    } else if (req.method === 'GET') {
      // 查询用户是否关注
      const { userId, followId } = query;

      console.log('查询关注状态的请求参数:', { userId, followId });

      if (!userId || !followId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '缺少必要参数' }));
        return;
      }

      const foundUser = user.find((u) => u.id === userId);

      if (!foundUser) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '用户未找到' }));
        return;
      }

      const isFollowing = foundUser.user_info.follow.includes(followId);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ isFollowing }));
    } else {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '不支持的请求方法' }));
    }
  } else if (pathname === '/api/travelogues') {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*', // 允许所有来源
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', // 允许的请求方法
        'Access-Control-Allow-Headers': 'Content-Type, Authorization', // 允许的请求头
      });
      res.end();
      return; // 确保结束逻辑
    } else if (req.method === 'GET') {
      // 获取所有游记
      const status = query.status;
      let filteredTravelogues = notes.filter((note) => !note.is_deleted);

      if (status) {
        filteredTravelogues = filteredTravelogues.filter((note) => note.status === status);
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(filteredTravelogues));
    } else if (req.method === 'POST') {
      // 批准游记
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });

      req.on('end', () => {
        try {
          const { id } = JSON.parse(body);

          if (!id) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '缺少游记ID参数' }));
            return;
          }

          const index = notes.findIndex((note) => note.id === id);
          if (index !== -1) {
            notes[index].status = 'approved';
            notes[index].updated_at = new Date().toISOString();
            writeData({ notes, user });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: '游记已批准' }));
          } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '游记未找到' }));
          }
        } catch (error) {
          console.error('处理批准游记时发生错误:', error);
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '服务器错误' }));
          }
        }
      });
    } else if (req.method === 'PUT') {
      // 拒绝游记
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });

      req.on('end', () => {
        try {
          const { id, rejection_reason } = JSON.parse(body);

          if (!id || !rejection_reason) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '缺少必要参数' }));
            return;
          }

          const index = notes.findIndex((note) => note.id === id);
          if (index !== -1) {
            notes[index].status = 'rejected';
            notes[index].rejection_reason = rejection_reason;
            notes[index].updated_at = new Date().toISOString();
            writeData({ notes, user });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: '游记已拒绝' }));
          } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '游记未找到' }));
          }
        } catch (error) {
          console.error('处理拒绝游记时发生错误:', error);
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '服务器错误' }));
          }
        }
      });
    } else if (req.method === 'DELETE') {
      // 删除游记
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });

      req.on('end', () => {
        try {
          const { id } = JSON.parse(body);

          if (!id) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '缺少游记ID参数' }));
            return;
          }

          const index = notes.findIndex((note) => note.id === id);
          if (index !== -1) {
            notes[index].is_deleted = true; // 标记为已删除
            notes[index].updated_at = new Date().toISOString(); // 更新修改时间
            writeData({ notes, user }); // 写入数据

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: '游记已删除' }));
          } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '游记未找到' }));
          }
        } catch (error) {
          console.error('处理删除游记时发生错误:', error);
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '服务器错误' }));
          }
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
  return; // 确保结束逻辑
}
    // 用户注册
    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });

      req.on('end', () => {
        try {
          const { email, nickname, password } = JSON.parse(body);

          if (!email || !nickname || !password) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '缺少邮箱、昵称或密码' }));
            return;
          }

          const existingUser = user.find(
            (u) => u.user_info.nickname === nickname || u.email === email
          );
          if (existingUser) {
            res.writeHead(409, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '邮箱或昵称已存在' }));
            return;
          }

          const newUser = {
            id: `user_${Date.now()}`,
            email,
            password, // 注意：实际项目中应对密码进行加密存储
            name:'',
            user_info: {
              avatar: `https://picsum.photos/360/460?random=${Math.floor(Math.random() * 1000)}`,
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

          user.push(newUser);
          writeData({ notes, user });

          res.writeHead(201, { 'Content-Type': 'application/json' });
          // res.end(JSON.stringify({ message: '注册成功', user_id: newUser.id }));
          res.end( JSON.stringify({
              code: 200,
              data: {
                user_id: newUser.id
              },
              message: '注册成功',
              success: true,
            }))
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '服务器错误' }));
        }
      });
    } else {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '不支持的请求方法' }));
    }
  }  else if (pathname === '/api/login') {
    if (req.method === 'OPTIONS') {
  setCorsHeaders(res);
  res.writeHead(204); // No Content
  res.end();
  return; // 确保结束逻辑
}
  // 用户登录
  if (req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const { nickname, password } = JSON.parse(body);

        if (!nickname || !password) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ code: 400, message: '缺少昵称或密码', success: false }));
          return;
        }

        const foundUser = user.find(
          (u) => u.user_info.nickname === nickname && u.password === password
        );

        if (!foundUser) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ code: 401, message: '昵称或密码错误', success: false }));
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
          res.end(JSON.stringify({ code: 500, message: '生成 Token 时出错', success: false }));
        }
      } catch (error) {
        console.error('解析请求体时出错:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ code: 500, message: '服务器错误', success: false }));
      }
    });
  } else {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ code: 405, message: '不支持的请求方法', success: false }));
  }
} else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});
server.listen(port, () => {
  console.log(`服务器正在运行在 http://localhost:${port}`);
});
