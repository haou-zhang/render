# 启动文件说明

- 最近更新时间：2024-11-29 17:29:02
- 我的收藏
- 本页目录：
  - [启动文件作用](#启动文件作用)
  - [使用前提](#使用前提)
  - [创建方式](#创建方式)
  - [标准语言环境绝对路径](#标准语言环境绝对路径)
  - [常见 Web Server 启动命令模板](#常见-web-server-启动命令模板)

Web 函数基于函数内置的标准语言镜像环境中，您需要创建一个可执行文件 `scf_bootstrap` 以启动 Web Server，并将该文件和代码一起打包部署。实际处理请求时，Web Server 监听指定的 `9000` 端口接收 HTTP 请求，并转发给后端服务完成逻辑处理并返回给用户。

## 启动文件作用

`scf_bootstrap` 为 Web Server 的启动文件，保证您的 Web 服务正常启动并监听请求。除此之外，您还可以根据需要在 `scf_bootstrap` 中自定义实现更多个性化操作：

- 设定运行时依赖库的路径及环境变量等。
- 加载自定义语言及版本依赖的库文件及扩展程序，如仍有依赖文件需要实时拉取，可下载至 `/tmp` 目录。
- 解析函数文件，并执行函数调用前所需的全局操作或初始化程序（如 HTTP Client、数据库连接池创建等），便于调用阶段复用。
- 启动安全、监控等插件。

> **注意**
>
> - 云函数 SCF 仅支持读取 `scf_bootstrap` 作为启动文件名称，其他名称将无法正常启动服务。
> - 在腾讯云标准环境下，仅 `/tmp` 目录可读可写，输出文件时请注意选择 `/tmp` 路径，否则会导致服务因缺少写权限而异常退出。

## 使用前提

1. 需具有可执行权限，请确保 `scf_bootstrap` 文件具备 `755` 或 `777` 权限，否则会因为权限不足而无法执行。
2. 能够在 SCF 系统环境（CentOS 7.6）中运行。
3. 如果启动命令文件是 shell 脚本，第一行需有 `#!/bin/bash`。
4. 启动命令必须为绝对路径 `/var/lang/${specific_lang}${version}/bin/${specific_lang}`，否则无法正常调用，详见下文。
5. 建议使用监听地址 `0.0.0.0`，不可使用内部回环地址 `127.0.0.1`。
6. 文件结尾必须以 LF（\n）回车结束。

## 创建方式

1. 在项目根目录创建文件 `scf_bootstrap`。
2. 以脚本形式编写启动逻辑，例如：
   ```bash
   #!/bin/bash
   export NODE_ENV=production
   export FONT_CDN_BASE="https://cdn.jsdelivr.net/..."
   /var/lang/node16/bin/node server.js
   ```
3. 赋予执行权限：`chmod 755 scf_bootstrap`。
4. 与代码一起打包并上传到 SCF Web 函数。

## 标准语言环境绝对路径

| 语言 | 版本 | 绝对路径示例 |
| --- | --- | --- |
| Node.js | 16 | `/var/lang/node16/bin/node` |
| Node.js | 18 | `/var/lang/node18/bin/node` |
| Python | 3.8 | `/var/lang/python3/bin/python3` |
| PHP | 8.0 | `/var/lang/php8/bin/php` |

> 实际可用版本以腾讯云 SCF 提供的语言镜像为准。

## 常见 Web Server 启动命令模板

- **Node.js (Next.js/Express)：**
  ```bash
  #!/bin/bash
  cd /var/user
  export PORT=9000
  /var/lang/node18/bin/node server.js
  ```

- **Python (Flask/FastAPI via Gunicorn)：**
  ```bash
  #!/bin/bash
  cd /var/user
  export PORT=9000
  /var/lang/python3/bin/python3 -m pip install -r requirements.txt -t /tmp/pydeps
  PYTHONPATH=/tmp/pydeps /var/lang/python3/bin/gunicorn app:app -b 0.0.0.0:9000
  ```

- **Go (自编译二进制)：**
  ```bash
  #!/bin/bash
  cd /var/user
  chmod +x server
  ./server -port 9000
  ```

确保以上脚本遵循“监听 0.0.0.0:9000、使用绝对路径、以 LF 结尾”等要求，即可在 SCF Web 函数环境中成功启动 Web Server。
