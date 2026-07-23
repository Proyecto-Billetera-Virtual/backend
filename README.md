# Backend

## Requisitos

- **Docker** y **Docker Compose** instalados.

### Instalar Docker

| Sistema | Comando / instrucción |
|---|---|
| **Linux (Debian/Ubuntu)** | `sudo apt install docker.io docker-compose-v2 && sudo systemctl enable --now docker` |
| **Linux (Arch)** | `sudo pacman -S docker docker-compose` |
| **macOS** | Descargar e instalar [Docker Desktop](https://www.docker.com/products/docker-desktop/) |
| **Windows** | Descargar e instalar [Docker Desktop](https://www.docker.com/products/docker-desktop/) |

Verificar con `docker --version`.

## Docker

### Construir
```bash
docker build -t billetera-backend .
```

### Ejecutar
```bash
docker rm -f backend 2>/dev/null
docker run -d --name backend \
  -v backend-data:/app/data \
  -e DB_PATH=/app/data/database.sqlite \
  -e SMTP_HOST=smtp.gmail.com \
  -e SMTP_PORT=587 \
  -e "SMTP_USER=TU_EMAIL" \
  -e "SMTP_PASS=TU_PASSWORD" \
  -p 5000:5000 \
  billetera-backend
```

Reemplazar `TU_EMAIL` y `TU_PASSWORD` por credenciales SMTP reales. Crear un archivo `.env` a partir de `.env.example` para no exponer datos sensibles.

Para probar todo local, usá `./start.sh` en la raíz del proyecto.

### Variables de entorno
| Variable | Descripción | Default |
|---|---|---|
| `PORT` | Puerto del servidor | `5000` |
| `DB_PATH` | Ruta a la base SQLite | `/app/data/database.sqlite` |
| `SMTP_HOST` | Servidor SMTP | `smtp.gmail.com` |
| `SMTP_PORT` | Puerto SMTP | `587` |
| `SMTP_USER` | Usuario SMTP | *(obligatorio)* |
| `SMTP_PASS` | Contraseña SMTP | *(obligatorio)* |
