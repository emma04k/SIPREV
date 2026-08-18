# SIPREV — Sistema Protegido de Registro de Violencia

SIPREV es un piloto educativo para demostrar cómo un sistema web protegido podría registrar, consultar y dar trazabilidad a casos de violencia entre instituciones autorizadas. Esta base técnica corresponde a la **Fase 1: Base técnica**.

## Advertencia de demo

- Use únicamente datos sintéticos o ficticios.
- No existe registro público de usuarios; las cuentas institucionales se crearán en fases posteriores por administración/seed controlado.
- Esta versión no promete cumplimiento legal ni operación productiva con datos reales.
- Una versión real requiere revisión jurídica, cifrado de datos sensibles, políticas de retención, auditoría fuerte, monitoreo y acuerdos institucionales.

## Stack de la base

- Next.js App Router + TypeScript
- Tailwind CSS
- Prisma preparado para PostgreSQL/Neon
- PostgreSQL local de demo mediante Docker Compose
- Zod reservado para validación de entradas en fases funcionales
- Vitest para pruebas unitarias ligeras

## Desarrollo local con Docker Compose

Docker Compose es la ruta principal y fuente de verdad para levantar y validar SIPREV localmente. No use `npm` directo en el host como validación final salvo que Docker no esté disponible y lo esté documentando como bloqueo.

### 1. Preparar variables locales

```bash
cp .env.example .env
```

Los valores incluidos son **solo defaults locales de demo** para el servicio PostgreSQL de `docker-compose.yml`. No use esos valores en producción y no suba `.env` al repositorio.

Para despliegues reales, `DATABASE_URL` debe apuntar a Neon/PostgreSQL administrado desde las variables de entorno del proveedor, no desde este archivo local.

### 2. Validar configuración y levantar servicios

```bash
docker compose config
docker compose up -d --build
docker compose ps
```

### 3. Ejecutar checks dentro del contenedor app

```bash
docker compose exec app npm run lint
docker compose exec app npm run test
docker compose exec app npm run build
docker compose exec app npm run prisma:validate
```

### 4. Apagar el entorno local

```bash
docker compose down
```

Use `docker compose down -v` solo si desea borrar también los volúmenes locales (`siprev_postgres_data` y `siprev_node_modules`).

### Bloqueo conocido: Docker Desktop / WSL

Si en WSL aparece un mensaje como:

```text
The command 'docker' could not be found in this WSL 2 distro.
We recommend to activate the WSL integration in Docker Desktop settings.
```

habilite Docker Desktop con integración para esta distribución WSL y vuelva a ejecutar:

```bash
docker compose config
docker compose up -d --build
```

Durante la actualización de soporte Docker Compose, la validación con Docker quedó bloqueada por ese estado; los comandos host `npm run lint`, `npm run test`, `npm run build` y `npm run prisma:validate` solo sirven como comprobación preliminar hasta que Docker esté disponible.

## Variables de entorno

Copie `.env.example` como `.env` para Docker Compose local o configure variables equivalentes en su proveedor de despliegue. No suba credenciales reales al repositorio.

Variables principales:

- `DATABASE_URL`: cadena de conexión PostgreSQL. En Compose local apunta al servicio `db`; en despliegue real debe apuntar a Neon/PostgreSQL administrado.
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`: credenciales locales de demo usadas por el contenedor `db`.
- `APP_PORT`, `POSTGRES_PORT`: puertos locales publicados por Compose.
- `NEXT_PUBLIC_APP_URL`: URL pública de la app para metadata y enlaces.
- `NEXTAUTH_URL` / `AUTH_URL`: reservadas para Auth.js en Fase 3.
- `NEXTAUTH_SECRET` / `AUTH_SECRET`: secretos reservados para Auth.js en Fase 3; genere valores reales solo cuando se implemente autenticación.

## Estado de Fase 1

Incluido:

1. Aplicación Next.js desplegable.
2. Layout/landing SIPREV con framing de seguridad y demo educativa.
3. Configuración de Tailwind, ESLint, Vitest y TypeScript.
4. Prisma configurado para PostgreSQL con enums fundacionales, sin migraciones aplicadas.
5. Plantilla de variables de entorno para Docker Compose local, Neon/Vercel y Auth.js futuro.
6. Entorno local Docker Compose con app Next.js y PostgreSQL de demo.

No incluido todavía:

- Login o flujos Auth.js.
- Modelos/tablas completos de casos, usuarios, instituciones o auditoría.
- Migraciones aplicadas a Neon.
- Datos seed demo.

## Siguiente fase recomendada

Fase 2: definir el modelo mínimo y seed demo sintético para instituciones, usuarios, casos, persona protegida, seguimientos y auditoría, con migraciones versionadas antes de conectar Neon real.
