#!/bin/bash
echo "Puxando atualizações do GitHub..."
git pull origin main

echo "Atualização concluída. O Gunicorn detectará as mudanças automaticamente."
systemctl status ndhub --no-pager | grep "Active:"

