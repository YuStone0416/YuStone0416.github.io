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

    // 如果没有 updated 字段，或者你想每次都更新可以去掉这个判断
    if (!parsed.data.updated) {
      parsed.data.updated = mtimeStr;
      const newContent = matter.stringify(parsed.content, parsed.data);
      fs.writeFileSync(fullPath, newContent);
      console.log(`✅ 添加 updated 字段到 ${file}`);
    } else {
      console.log(`🟡 已有 updated 字段，跳过 ${file}`);
    }
  }
});
