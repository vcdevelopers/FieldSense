const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const original = content;

      // Replace common patterns
      content = content.replace(/\$\{import\.meta\.env\.VITE_API_URL \|\| `http:\/\/\$\{window\.location\.hostname\}:8000`\}/g, '${API_ROOT}');
      content = content.replace(/const API = import\.meta\.env\.VITE_API_URL \|\| `http:\/\/\$\{window\.location\.hostname\}:8000`;\n?/g, '');
      content = content.replace(/const API = envApi \|\| `http:\/\/\$\{window\.location\.hostname\}:8000`;\n?/g, '');
      content = content.replace(/\$\{API\}\//g, '${API_ROOT}/');
      
      if (content !== original) {
        if (content.includes('API_ROOT') && !content.includes('import { API_ROOT }')) {
          content = 'import { API_ROOT } from "@/config";\n' + content;
        }
        fs.writeFileSync(fullPath, content);
        console.log('Updated', fullPath);
      }
    }
  }
}
processDir('src');
