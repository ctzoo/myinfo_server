# 1. 安装手册

## 1.1. 上传文件
### 1.1.1. 使用root用户登录
### 1.1.2. 将程序资源包上传到/tmp目录
### 1.1.3. 在tmp目录解压程序资源包
```
cd /tmp
tar -zxzf myinfo.tar.gz -C /tmp
```

## 1.2. 安装程序
### 1.2.1. 执行程序安装脚本
```
cd /tmp/myinfo
./install.sh
```
### 1.2.2. 验证程序是否启动成功
```
ps -ef|grep node
netstat -an|grep 3001
```
### 1.2.3. 删除安装程序资源包
```
cd /tmp
rm -rf myinfo
rm myinfo.tar.gz
```