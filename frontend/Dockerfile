# 构建阶段
FROM node:18-alpine as builder

WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制源代码
COPY . .

# 构建应用
ARG VITE_BACKEND_URL=http://localhost:5000
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
RUN npm run build

# 运行阶段
FROM node:18-alpine

WORKDIR /app

# 安装serve用于提供静态文件
RUN npm install -g serve

# 从构建阶段复制dist目录
COPY --from=builder /app/dist ./dist

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["serve", "-s", "dist", "-l", "3000"]
