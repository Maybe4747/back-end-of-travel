const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
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
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
}

// 设置CORS头信息
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  res.setHeader('Access-Control-Allow-Credentials', true);
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
  } else if (pathname === '/api/user') {
    // 根据用户ID查找用户
    const userId = query.id;
    if (!userId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '缺少用户ID参数' }));
      return;
    }
    const foundUser = user.find((u) => u.id === userId);
    if (foundUser) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(foundUser));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '用户未找到' }));
    }
  } else if (pathname === '/api/notedetail') {
    // 根据推文ID查找推文
    const noteId = query.id;
    if (!noteId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '缺少推文ID参数' }));
      return;
    }

    const foundNote = notes.find((note) => note.id === noteId);
    if (foundNote) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(foundNote));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '推文未找到' }));
    }
  } else if (pathname === '/api/search') {
    // 根据关键词筛选推文
    const keyword = query.keyword?.toLowerCase();
    if (!keyword) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '缺少关键词参数' }));
      return;
    }

    // 根据用户昵称查找
    const foundUser = user.find((u) => u['user-info'].nickname.toLowerCase().includes(keyword));
    let filteredNotes = [];

    if (foundUser) {
      const userId = foundUser.id;
      filteredNotes = notes.filter((note) => note.user_id === userId);
    }

    // 根据游记标题查找
    const titleFilteredNotes = notes.filter((note) => note.title.toLowerCase().includes(keyword));

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
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(port, () => {
  console.log(`服务器正在运行在 http://localhost:${port}`);
});
