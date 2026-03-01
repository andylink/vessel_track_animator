import express from 'express';
import path from 'node:path';

const app = express();
const port = Number(process.env.RENDER_VIEW_PORT || 4000);

app.use('/public', express.static(path.join(process.cwd(), 'public')));
app.use(express.static(path.join(process.cwd(), 'pages')));

app.get('/', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'pages/index.html'));
});

app.listen(port, () => {
  console.log(`Render view listening on http://localhost:${port}`);
});
