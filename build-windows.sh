#!/bin/bash

# 准备 Windows 打包图标
echo "准备图标文件..."

# 复制 logo256.png 到 build 目录作为主图标
cp resources/logo256.png build/icon.png

# 如果有 neuro-logo.png，也复制一份（它可能尺寸更合适）
if [ -f resources/neuro-logo.png ]; then
  cp resources/neuro-logo.png build/neuro-icon.png
fi

echo "图标文件准备完成！"
echo "开始构建 Windows 应用..."

# 构建 Windows 应用
npm run build:win

echo "构建完成！"
