#!/bin/bash

docker compose pull || exit 1

docker compose build || exit 1

docker compose up -d || { docker compose down --remove-orphans; exit 1; }

docker compose logs -f || { docker compose down --remove-orphans; exit 0; }