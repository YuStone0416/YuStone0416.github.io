const POSTS_DIR = path.join(__dirname, 'source/_posts'); 
// 定位博客文章文件夹路径（相对于脚本所在目录）

function formatDate(d) {
  // 格式化时间为 2025-06-28 14:55:22 格式
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

fs.readdirSync(POSTS_DIR).forEach(file => {
  const fullPath = path.join(POSTS_DIR, file);
  if (fs.lstatSync(fullPath).isFile() && file.endsWith('.md')) {
    const raw = fs.readFileSync(fullPath, 'utf8'); // 读文件
    const parsed = matter(raw);                    // 解析 front-matter 和正文

    const stat = fs.statSync(fullPath);
    const mtime = stat.mtime;                      // 文件最后修改时间
    const mtimeStr = formatDate(mtime);           

    if (!parsed.data.updated) {                    // 只有没有updated字段时才添加
      parsed.data.updated = mtimeStr;              // 添加updated字段
      const newContent = matter.stringify(parsed.content, parsed.data); 
      fs.writeFileSync(fullPath, newContent);      // 写回文件
      console.log(`✅ 添加 updated 字段到 ${file}`);
    } else {
      console.log(`🟡 已有 updated 字段，跳过 ${file}`);
    }
  }
});
