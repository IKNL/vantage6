#!/usr/bin/env sh

HOST='localhost'
read -rp "username: " USERNAME
read -rsp "password: " PASSWORD
echo
SSHPASS="$PASSWORD" sshpass -e ssh -t "$USER"@"$HOST" ${@}
