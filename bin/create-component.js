#!/usr/bin/env node

const { Command } = require('commander');
const fs = require('fs');
const path = require('path');

const program = new Command();

program
  .name('create-component')
  .description('🚀 生成组件/页面，并自动注册路由（仅页面）')
  .argument('<name>', '名称（如 user-profile）')
  .option('-t, --type <type>', '类型: component | page', 'component')
  .action((name, options) => {
    createFile(name, options.type);
  });

program.parse();

function createFile(componentName, type) {
  if (!['component', 'page'].includes(type)) {
    console.error('❌ 类型必须是 "component" 或 "page"');
    process.exit(1);
  }

  const pascalName = componentName
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');

  // 检测框架
  const pkgPath = path.join(process.cwd(), 'package.json');
  let framework = 'vue';
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if ((pkg.dependencies?.react || pkg.devDependencies?.react)) {
        framework = 'react';
      }
    } catch (e) {
      console.warn('⚠️ 无法解析 package.json，使用默认 (Vue)');
    }
  }

  // 决定目录和文件名
  const baseDir = type === 'page' ? 'views' : 'components';
  const outDir = path.join(process.cwd(), 'src', baseDir, pascalName);
  const fileName = framework === 'react' ? `${pascalName}.jsx` : `${pascalName}.vue`;
  const filePath = path.join(outDir, fileName);

  // 防覆盖
  if (fs.existsSync(filePath)) {
    console.warn(`⚠️ 文件已存在，跳过: ${filePath}`);
    return;
  }

  // 生成组件/页面内容
  let template = '';
  if (framework === 'react') {
    template = `import React from 'react';

const ${pascalName} = () => {
  return (
    <div className="${componentName.toLowerCase()}">
      {/* ${type === 'page' ? '页面' : '组件'}: ${pascalName} */}
    </div>
  );
};

export default ${pascalName};
`;
  } else {
    template = `<template>
  <div class="${componentName.toLowerCase()}">
    <!-- ${type === 'page' ? '页面' : '组件'}: ${pascalName} -->
  </div>
</template>

<script>
export default {
  name: '${pascalName}'
}
</script>

<style scoped>
.${componentName.toLowerCase()} {
  /* 样式 */
}
</style>`;
  }

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(filePath, template);
  console.log(`✅ 创建 ${framework.toUpperCase()} ${type}: ${path.relative(process.cwd(), filePath)}`);

  // 🔥 如果是页面，尝试生成路由
  if (type === 'page') {
    generateRoute(pascalName, componentName, framework);
  }
}

function generateRoute(pascalName, kebabName, framework) {
  // 路由文件路径（可按需调整）
  const routeFilePath = path.join(process.cwd(), 'src', 'router', 'routes.js');

  // 如果路由文件不存在，跳过
  if (!fs.existsSync(routeFilePath)) {
    console.warn('⚠️ 未找到 src/router/routes.js，跳过路由注册');
    return;
  }

  const routeContent = fs.readFileSync(routeFilePath, 'utf8');

  // 检查是否已存在该路由
  if (routeContent.includes(`/${kebabName}`) || routeContent.includes(pascalName)) {
    console.warn(`⚠️ 路由 /${kebabName} 已存在，跳过注册`);
    return;
  }

  // 构建新路由项
  let newRoute = '';
  if (framework === 'react') {
    newRoute = `
  {
    path: '/${kebabName}',
    element: React.lazy(() => import('../views/${pascalName}/${pascalName}'))
  },`;
  } else {
    newRoute = `
  {
    path: '/${kebabName}',
    component: () => import('../views/${pascalName}/${pascalName}.vue')
  },`;
  }

  // 插入到 routes 数组中（在最后一个 ] 之前）
  const updatedContent = routeContent.replace(
    /(\s*\]\s*;?\s*)$/,
    `${newRoute}$1`
  );

  fs.writeFileSync(routeFilePath, updatedContent);
  console.log(`✅ 自动注册路由: /${kebabName}`);
}