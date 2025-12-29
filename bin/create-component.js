#!/usr/bin/env node

const { Command } = require('commander');
const fs = require('fs');
const path = require('path');

const program = new Command();

program
  .name('create-component')
  .description('🚀 快速生成 Vue/React 组件或页面')
  .argument('<name>', '组件或页面名称（支持 kebab-case，如 user-profile）')
  .option('-t, --type <type>', '类型: component | page', 'component')
  .action((name, options) => {
    createFile(name, options.type);
  });

program.parse();

function createFile(componentName, type) {
  // 输入校验
  if (!['component', 'page'].includes(type)) {
    console.error('❌ 类型必须是 "component" 或 "page"');
    process.exit(1);
  }

  // 转换为 PascalCase（UserCard）
  const pascalName = componentName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

  // 检测项目框架（Vue / React）
  const pkgPath = path.join(process.cwd(), 'package.json');
  let framework = 'vue';
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if ((pkg.dependencies && pkg.dependencies.react) || 
          (pkg.devDependencies && pkg.devDependencies.react)) {
        framework = 'react';
      }
    } catch (e) {
      console.warn('⚠️ 无法解析 package.json，使用默认模板 (Vue)');
    }
  }

  // 确定输出目录
  const baseDir = type === 'page' ? 'views' : 'components';
  const outDir = path.join(process.cwd(), 'src', baseDir, pascalName);
  const fileName = framework === 'react' 
    ? `${pascalName}.jsx` 
    : `${pascalName}.vue`;

  // 安全检查：避免覆盖
  const filePath = path.join(outDir, fileName);
  if (fs.existsSync(filePath)) {
    console.warn(`⚠️ 文件已存在，跳过: ${filePath}`);
    return;
  }

  // 生成模板内容
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

  // 创建目录并写入文件
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(filePath, template);

  // 成功提示
  const typeName = type === 'page' ? '页面' : '组件';
  console.log(`✅ 成功创建 ${framework.toUpperCase()} ${typeName}:`);
  console.log(`   ${path.relative(process.cwd(), filePath)}`);
}