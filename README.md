# Backend

## Docker

### Construir la imagen
```bash
docker build -t billetera-backend .
```

### Ejecutar en una PC de la LAN
```bash
docker rm -f backend 2>/dev/null
docker run -d --name backend \
  -v backend-data:/app/data \
  -e DB_PATH=/app/data/database.sqlite \
  -e SMTP_USER=tu_email@gmail.com \
  -e SMTP_PASS=tu_contraseña \
  -p 5000:5000 \
  billetera-backend
```

Esta PC debe ser accesible desde las otras en `http://<IP_DEL_BACKEND>:5000`.

### Variables de entorno
| Variable | Descripción | Default |
|---|---|---|
| `PORT` | Puerto del servidor | `5000` |
| `DB_PATH` | Ruta a la base SQLite | `/app/data/database.sqlite` |
| `SMTP_HOST` | Servidor SMTP | `smtp.gmail.com` |
| `SMTP_PORT` | Puerto SMTP | `587` |
| `SMTP_USER` | Usuario SMTP | `billeteravirtu@gmail.com` |
| `SMTP_PASS` | Contraseña SMTP | `okisutfkaqjnuuni` |
