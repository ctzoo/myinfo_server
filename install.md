# 1. 安装手册

## 1.1. 安装nodeJs
### 1.1.1. 拷贝nodeJs
  1. root登录  
  2. 上传node-v6.9.5-linux-x64.tar.xz到/opt目录  
  3. tar -xvf node-v6.9.5-linux-x64.tar.xz  
  4. ln -s /opt/node-v6.9.5-linux-x64/bin/node /usr/local/bin/node  
  5. ln -s /opt/node-v6.9.5-linux-x64/bin/npm /usr/local/bin/npm  
### 1.1.2. 编辑环境变量  
  1. .vi /etc/profile  
  2. export NODE_HOME=/opt/node-v6.9.5-linux-x64/  
  3. export PATH=$PATH:$NODE_HOME/bin  
  4. export NODE_PATH=$NODE_HOME/lib/node_modules  
  5. 保存并退出编辑  
  6. 验证安装结果：输入 node -v  （如正确安装会出现nodeJs版本号)
## 1.2. 安装mongodb
### 1.2.1. 拷贝mongodb
  1. root登录  
  2. 上传 mongodb-linux-x86_64-4.0.2.tgz 到/usr/local  
  3. tar -xvf mongodb-linux-x86_64-4.0.2.tgz  
  4. mv mongodb-linux-x86_64-4.0.2 mongodb  
  5. cd /usr/local/mongodb  

### 1.2.2. 添加环境变量 
  1. vi /etc/profile  
  1. export PATH=$PATH:/usr/local/mongodb/bin  
  *修改在当前生效*  
  1. cd /etc/  
  1. vi mongod.conf  
  1. 添加如下内容  
      ```
      verbose = true  
      port = 27017  
      logpath = /var/log/mongodb/logs/mongodb.log  
      logappend = true  
      dbpath = /data/db/  
      directoryperdb = true  
      auth = false  
      fork = true  
      quiet = true  
      ```
  1.  保存并退出  
  *创建配置文件中提到的用来保存文件的数据库目录，日志目录,日志文件：*  
  1. mkdir -p /data/db/    数据库文件目录  
  1. mkdir -p /var/log/mongodb/logs/   日志文件目录  
  1. touch /var/log/mongodb/logs/mongodb.log  
  1. cd /usr/local/mongodb/bin/  
  1. mongod &   
  1. mongo   
  1. use myinfo  
  1. Ctrl+c退出
### 1.2.3. 创建数据库  
  1. 执行mongo
  2. 执行use myingo
## 1.3. 部署myinfo_server
### 1.3.1. 创建用户
  1. 创建用户  
      ``` 
      useradd myinfosgp
      ```
  2. 设置密码   
      ```
      passwd  myinfosgp
      ```
### 1.3.2. 上传程序  
  1. 使用myinfosgp用户上传myinfo_server-ubuntu.zip文件到/home/myinfosgp  
  2. unzip myinfo_server-ubuntu.zip  
### 1.3.3. 执行程序
  1. cd /home/myinfosgp/myinfo_server  
  2. cd logs  
  3. rm *  
  4. cd /home/myinfosgp/myinfo_server   
  5.  chmod +x start.sh  
  6.  执行 ./start.sh  
