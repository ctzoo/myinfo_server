# https://repo.mongodb.org/yum/redhat/7Server/mongodb-org/4.0/x86_64/RPMS/mongodb-org-server-4.0.2-1.el7.x86_64.rpm
rpm -ivh mongodb-org-server-4.0.2-1.el7.x86_64.rpm
# https://repo.mongodb.org/yum/redhat/7Server/mongodb-org/4.0/x86_64/RPMS/mongodb-org-shell-4.0.2-1.el7.x86_64.rpm
rpm -ivh mongodb-org-shell-4.0.2-1.el7.x86_64.rpm
# https://repo.mongodb.org/yum/redhat/7Server/mongodb-org/4.0/x86_64/RPMS/mongodb-org-tools-4.0.2-1.el7.x86_64.rpm
rpm -ivh mongodb-org-tools-4.0.2-1.el7.x86_64.rpm
# https://rpm.nodesource.com/pub_6.x/el/7/x86_64/nodejs-6.9.5-1nodesource.x86_64.rpm
rpm -ivh nodejs-6.9.5-1nodesource.x86_64.rpm

# 解压程序
tar -zxzf myinfo_server.tar.gz -C /opt
mv /opt/myinfo_server /opt/myinfo
chmod 777 /opt/myinfo

# 创建用户
useradd myinfo

# 添加服务
cat > /usr/lib/systemd/system/myinfo.service << EOF
[Unit]
Description=Myinfo Server
After=network.target

[Service]
User=myinfo
WorkingDirectory=/opt/myinfo
Environment=NODE_CONFIG_DIR=/opt/myinfo/config
ExecStart=/usr/bin/node /opt/myinfo/cluster.js
Restart=on-failure
Type=simple

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
# 启动mongod服务
systemctl enable mongod.service
systemctl start mongod.service
# 启动服务
systemctl enable myinfo.service
systemctl start myinfo.service
# 查看服务状态
systemctl status mongod.service
systemctl status myinfo.service