const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const POSTS_DIR = path.join(__dirname, 'source/_posts');

function formatDate(d) {
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

fs.readdirSync(POSTS_DIR).forEach(file => {
  const fullPath = path.join(POSTS_DIR, file);
  if (fs.lstatSync(fullPath).isFile() && file.endsWith('.md')) {
    const raw = fs.readFileSync(fullPath, 'utf8');
    const parsed = matter(raw);

    const stat = fs.statSync(fullPath);
    const mtime = stat.mtime;
    const mtimeStr = formatDate(mtime);

    // 这里不判断，直接覆盖更新
    parsed.data.updated = mtimeStr;
    const newContent = matter.stringify(parsed.content, parsed.data);
    fs.writeFileSync(fullPath, newContent);
    console.log(`✅ 更新 updated 字段到 ${file}`);
  }
});
