sudo rpm -ivh mongodb-org-server-4.0.3-1.el7.x86_64.rpm
sudo rpm -ivh mongodb-org-shell-4.0.3-1.el7.x86_64.rpm
sudo rpm -ivh mongodb-org-tools-4.0.3-1.el7.x86_64.rpm
sudo rpm -ivh nodejs-6.14.4-1nodesource.x86_64.rpm

sudo tar -zxzf myinfo_server.tar.gz -C /opt
sudo mv /opt/myinfo_server /opt/myinfo
chmod 777 /opt/myinfo

useradd myinfo

# 创建服务脚本
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
# 设置开启启动
systemctl enable myinfo.service
# 启动服务
systemctl start myinfo
# 查看服务状态
systemctl status myinfo