# 天津公职/国企招聘信息汇总部署指南

天津公职/国企招聘信息汇总生产环境推荐用 Node.js 运行，前面再接 Nginx 做域名和 HTTPS。

## 方式一：Docker

在服务器安装 Docker 后执行：

```bash
git clone https://github.com/JokerrWang/gongwuxinxi_spider.git
cd gongwuxinxi_spider
docker build -t gongwuxinxi-spider .
docker run -d --name gongwuxinxi-spider --restart unless-stopped -p 3000:3000 gongwuxinxi-spider
```

访问：

```text
http://服务器IP:3000
```

更新：

```bash
git pull
docker build -t gongwuxinxi-spider .
docker rm -f gongwuxinxi-spider
docker run -d --name gongwuxinxi-spider --restart unless-stopped -p 3000:3000 gongwuxinxi-spider
```

## 方式二：Node.js + systemd

在 Ubuntu/Debian 服务器上安装 Node.js 20 LTS，然后：

```bash
sudo mkdir -p /opt
cd /opt
sudo git clone https://github.com/JokerrWang/gongwuxinxi_spider.git
sudo chown -R $USER:$USER /opt/gongwuxinxi_spider
cd /opt/gongwuxinxi_spider
npm start
```

确认可运行后，配置 systemd：

```bash
sudo cp deploy/gongwuxinxi-spider.service /etc/systemd/system/gongwuxinxi-spider.service
sudo systemctl daemon-reload
sudo systemctl enable --now gongwuxinxi-spider
sudo systemctl status gongwuxinxi-spider
```

查看日志：

```bash
journalctl -u gongwuxinxi-spider -f
```

## Nginx 反向代理

把 `deploy/nginx.conf` 里的 `example.com` 改成你的域名，然后：

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/gongwuxinxi-spider
sudo ln -s /etc/nginx/sites-available/gongwuxinxi-spider /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

HTTPS 可以用 Certbot：

```bash
sudo certbot --nginx -d 你的域名
```

服务启动时会抓取一次考试公告，之后每隔 1 小时自动刷新一次。
