const http = require('http');
const url = require('url');

const port = 3001;

// 模拟数据
const notes = [
  {
    id: '1',
    userId: '1',
    image: ['/src/assets/images/notes/test1.jpeg'],
    title: '游记标题1',
    userAvatar: 'avatar1.jpg',
    userName: '用户1',
    status: 'approved',
  },
  {
    id: '2',
    userId: '2',
    image: ['/src/assets/images/notes/test3.jpeg'],
    title: '游记标题2',
    userAvatar: 'avatar2.jpg',
    userName: '用户2',
    status: 'approved',
  },
  {
    id: '3',
    userId: '3',
    image: ['/src/assets/images/notes/test3.jpeg'],
    title: '游记标题3',
    userAvatar: 'avatar3.jpg',
    userName: '用户3',
    status: 'approved',
  },
  {
    id: '4',
    userId: '4',
    image: ['/src/assets/images/notes/test1.jpeg'],
    title: '游记标题4',
    userAvatar: 'avatar4.jpg',
    userName: '用户4',
    status: 'approved',
  },
  {
    id: '5',
    userId: '5',
    image: ['/src/assets/images/notes/test1.jpeg'],
    title: '游记标题5',
    userAvatar: 'avatar5.jpg',
    userName: '用户5',
    status: 'approved',
  },
  {
    id: '6',
    userId: '6',
    image: ['/src/assets/images/notes/test3.jpeg'],
    title: '游记标题6',
    userAvatar: 'avatar6.jpg',
    userName: '用户6',
    status: 'approved',
  },
  {
    id: '7',
    userId: '7',
    image: ['/src/assets/images/notes/test1.jpeg'],
    title: '游记标题7',
    userAvatar: 'avatar7.jpg',
    userName: '用户7',
    status: 'approved',
  },
  {
    id: '8',
    userId: '8',
    image: ['/src/assets/images/notes/test3.jpeg'],
    title: '游记标题8',
    userAvatar: 'avatar8.jpg',
    userName: '用户8',
    status: 'approved',
  },
  {
    id: '9',
    userId: '9',
    image: ['/src/assets/images/notes/test1.jpeg'],
    title: '游记标题9',
    userAvatar: 'avatar9.jpg',
    userName: '用户9',
    status: 'approved',
  },
  {
    id: '10',
    userId: '10',
    image: ['/src/assets/images/notes/test3.jpeg'],
    title: '游记标题10',
    userAvatar: 'avatar10.jpg',
    userName: '用户10',
    status: 'approved',
  },
  {
    id: '11',
    userId: '11',
    image: ['/src/assets/images/notes/test3.jpeg'],
    title: '游记标题11',
    userAvatar: 'avatar11.jpg',
    userName: '用户11',
    status: 'approved',
  },
  {
    id: '12',
    userId: '12',
    image: ['/src/assets/images/notes/test1.jpeg'],
    title: '游记标题12',
    userAvatar: 'avatar12.jpg',
    userName: '用户12',
    status: 'approved',
  },
  {
    id: '13',
    userId: '13',
    image: ['/src/assets/images/notes/test1.jpeg'],
    title: '游记标题13',
    userAvatar: 'avatar13.jpg',
    userName: '用户13',
    status: 'approved',
  },
  {
    id: '14',
    userId: '14',
    image: ['/src/assets/images/notes/test3.jpeg'],
    title: '游记标题14',
    userAvatar: 'avatar14.jpg',
    userName: '用户14',
    status: 'approved',
  },
  {
    id: '15',
    userId: '15',
    image: ['/src/assets/images/notes/test3.jpeg'],
    title: '游记标题15',
    userAvatar: 'avatar15.jpg',
    userName: '用户15',
    status: 'approved',
  },
  {
    id: '16',
    userId: '16',
    image: ['/src/assets/images/notes/test1.jpeg'],
    title: '游记标题16',
    userAvatar: 'avatar16.jpg',
    userName: '用户16',
    status: 'approved',
  },
  {
    id: '17',
    userId: '17',
    image: ['/src/assets/images/notes/test3.jpeg'],
    title: '游记标题17',
    userAvatar: 'avatar17.jpg',
    userName: '用户17',
    status: 'approved',
  },
  {
    id: '18',
    userId: '18',
    image: ['/src/assets/images/notes/test2.jpeg'],
    title: '游记标题18',
    userAvatar: 'avatar18.jpg',
    userName: '用户18',
    status: 'approved',
  },
  {
    id: '19',
    userId: '19',
    image: ['/src/assets/images/notes/test1.jpeg'],
    title: '游记标题19',
    userAvatar: 'avatar19.jpg',
    userName: '用户19',
    status: 'approved',
  },
  {
    id: '20',
    userId: '20',
    image: ['/src/assets/images/notes/test3.jpeg'],
    title: '游记标题20',
    userAvatar: 'avatar20.jpg',
    userName: '用户20',
    status: 'approved',
  },
  {
    id: '21',
    userId: '21',
    image: ['/src/assets/images/notes/test1.jpeg'],
    title: '游记标题21',
    userAvatar: 'avatar21.jpg',
    userName: '用户21',
    status: 'approved',
  },
  {
    id: '22',
    userId: '22',
    image: ['/src/assets/images/notes/test3.jpeg'],
    title: '游记标题22',
    userAvatar: 'avatar22.jpg',
    userName: '用户22',
    status: 'approved',
  },
  {
    id: '23',
    userId: '23',
    image: ['/src/assets/images/notes/test1.jpeg'],
    title: '游记标题23',
    userAvatar: 'avatar23.jpg',
    userName: '用户23',
    status: 'approved',
  },
  {
    id: '24',
    userId: '24',
    image: ['/src/assets/images/notes/test1.jpeg'],
    title: '游记标题24',
    userAvatar: 'avatar24.jpg',
    userName: '用户24',
    status: 'approved',
  },
  {
    id: '25',
    userId: '25',
    image: ['/src/assets/images/notes/test1.jpeg'],
    title: '游记标题25',
    userAvatar: 'avatar25.jpg',
    userName: '用户25',
    status: 'approved',
  },
  {
    id: '26',
    userId: '26',
    image: ['/src/assets/images/notes/test3.jpeg'],
    title: '游记标题26',
    userAvatar: 'avatar26.jpg',
    userName: '用户26',
    status: 'approved',
  },
  {
    id: '27',
    userId: '27',
    image: ['/src/assets/images/notes/test1.jpeg'],
    title: '游记标题27',
    userAvatar: 'avatar27.jpg',
    userName: '用户27',
    status: 'approved',
  },
  {
    id: '28',
    userId: '28',
    image: ['/src/assets/images/notes/test1.jpeg'],
    title: '游记标题28',
    userAvatar: 'avatar28.jpg',
    userName: '用户28',
    status: 'approved',
  },
  {
    id: '29',
    userId: '29',
    image: ['/src/assets/images/notes/test3.jpeg'],
    title: '游记标题29',
    userAvatar: 'avatar29.jpg',
    userName: '用户29',
    status: 'approved',
  },
  {
    id: '30',
    userId: '30',
    image: ['/src/assets/images/notes/test1.jpeg'],
    title: '游记标题30',
    userAvatar: 'avatar30.jpg',
    userName: '用户30',
    status: 'approved',
  },
];

// 设置CORS头信息
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*'); // 可以根据需要限制来源
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, OPTIONS, PUT, PATCH, DELETE'
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-Requested-With,content-type'
  );
  res.setHeader('Access-Control-Allow-Credentials', true);
}

// 过滤游记
function filterNotesByStatus(notes, status) {
  return status ? notes.filter((note) => note.status === status) : notes;
}

// 分页游记
function paginateNotes(notes, page, limit) {
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  return notes.slice(startIndex, endIndex);
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  setCorsHeaders(res);

  if (pathname === '/api/notes') {
    let filteredNotes = filterNotesByStatus(notes, query.status);

    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 5;
    const paginatedNotes = paginateNotes(filteredNotes, page, limit);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(paginatedNotes));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(port, () => {
  console.log(`服务器正在运行在 http://localhost:${port}`);
});
