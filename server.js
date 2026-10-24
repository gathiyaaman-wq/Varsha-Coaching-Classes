const http = require('http');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');

// Har mobile ka alag ID aur password. Badalna ho to yahin badlein
// (ya Render mein USERS naam ka Environment Variable JSON mein daalein)
const USERS = process.env.USERS ? JSON.parse(process.env.USERS) : {
  mahi:      { name: 'Mahi',      pass: 'Mahi@2026',    role: 'viewer' },
  kavya:     { name: 'Kavya',     pass: 'Kavya@2026',   role: 'viewer' },
  yuvraj:    { name: 'Yuvraj',    pass: 'Yuvraj@2026',  role: 'viewer' },
  purvi:     { name: 'Purvi',     pass: 'Purvi@2026',   role: 'viewer' },
  classroom: { name: 'Classroom', pass: 'Class@2026',   role: 'camera' },
};
const pub = path.join(__dirname, 'public');

const srv = http.createServer((req, res) => {
  if (req.url.startsWith('/logo.png') && fs.existsSync(path.join(pub, 'logo.png'))) {
    res.writeHead(200, { 'Content-Type': 'image/png' });
    return fs.createReadStream(path.join(pub, 'logo.png')).pipe(res);
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  fs.createReadStream(path.join(pub, 'index.html')).pipe(res);
});

const io = new Server(srv);
const ROOM = 'varsha';

io.on('connection', (s) => {
  s.on('join', async ({ id, pass, role }) => {
    const key = String(id || '').trim().toLowerCase();
    const u = USERS[key];
    if (!u || u.pass !== pass || u.role !== role) return s.emit('denied');
    const old = await io.in(ROOM).fetchSockets();
    old.filter((x) => x.data.user === key).forEach((x) => { x.emit('kicked'); x.disconnect(true); });
    s.join(ROOM);
    s.data = { role, user: key };
    s.emit('joined', u.name);
    if (role === 'viewer') {
      s.to(ROOM).emit('viewer-joined', s.id);
    } else {
      const all = await io.in(ROOM).fetchSockets();
      all.filter((x) => x.data.role === 'viewer').forEach((v) => s.emit('viewer-joined', v.id));
    }
  });
  s.on('signal', ({ to, data }) => io.to(to).emit('signal', { from: s.id, data }));
  s.on('disconnect', () => s.to(ROOM).emit('peer-left', s.id));
});

srv.listen(process.env.PORT || 3000);
