# SIPREV — Sistema Protegido de Registro de Violencia

SIPREV es un piloto educativo para demostrar cómo un sistema web protegido podría registrar, consultar y dar trazabilidad a casos de violencia entre instituciones autorizadas. Esta base técnica incluye la **Fase 1: Base técnica** y la **Fase 2: Modelo de datos mínimo + seed sintético**.

## Advertencia de demo

- Use únicamente datos sintéticos o ficticios.
- No existe registro público de usuarios; las cuentas institucionales se crean por administración/seed controlado.
- Las migraciones y el seed de Fase 2 son **solo para entorno local de demo**.
- No se requieren credenciales reales de Neon todavía; `DATABASE_URL` de Compose apunta al servicio local `db`.
- Esta versión no promete cumplimiento legal ni operación productiva con datos reales.
- Una versión real requiere revisión jurídica, cifrado de datos sensibles, políticas de retención, auditoría fuerte, monitoreo y acuerdos institucionales.

## Stack de la base

- Next.js App Router + TypeScript
- Tailwind CSS
- Prisma preparado para PostgreSQL/Neon
- PostgreSQL local de demo mediante Docker Compose
- Zod reservado para validación de entradas en fases funcionales
- Vitest para pruebas unitarias y contratos de fuente

## Desarrollo local con Docker Compose

Docker Compose es la ruta principal y fuente de verdad para levantar y validar SIPREV localmente. No use `npm` directo en el host como validación final salvo que Docker no esté disponible y lo esté documentando como bloqueo.

### 1. Preparar variables locales

```bash
cp .env.example .env
```

Los valores incluidos son **solo defaults locales de demo** para el servicio PostgreSQL de `docker-compose.yml`. No use esos valores en producción y no suba `.env` al repositorio.

Para despliegues reales, `DATABASE_URL` debe apuntar a Neon/PostgreSQL administrado desde las variables de entorno del proveedor, no desde este archivo local. En Fase 2 no se necesita Neon real.

### 2. Validar configuración y levantar servicios

```bash
docker compose config
docker compose up -d --build
docker compose ps
```

### 3. Ejecutar checks dentro del contenedor app

```bash
docker compose exec app npm run test
docker compose exec app npm run lint
docker compose exec app npm run build
docker compose exec app npm run prisma:validate
```

### 4. Aplicar migración local de Fase 2 y cargar seed sintético

```bash
docker compose exec app npx prisma migrate reset --force
docker compose exec app npm run db:seed
docker compose exec app npm run db:verify
```

Use `migrate reset` solo en la base local de demo cuando necesite re-aplicar una migración de desarrollo todavía no publicada. El seed crea únicamente datos obvios de demo: instituciones `SIPREV-CENTRAL-DEMO`, `COMISARIA-DEMO-NORTE`, `FISCALIA-DEMO-CONTROL`, `AUDITORIA-DEMO`; usuarios con dominio `@siprev.local`; casos `SIPREV-DEMO-CASE-001` y `SIPREV-DEMO-CASE-002`; documentos `DEMO-...`. Los casos usan `nonSensitiveSummary` para dejar claro que el registro operativo no debe contener narrativa sensible.

### 5. Apagar el entorno local

```bash
docker compose down
```

Use `docker compose down -v` solo si desea borrar también los volúmenes locales (`siprev_postgres_data` y `siprev_node_modules`).

### Scripts de base de datos

- `npm run prisma:validate`: valida `prisma/schema.prisma`.
- `npm run prisma:generate`: regenera Prisma Client.
- `npm run db:migrate -- --name <nombre>`: crea/aplica una migración local de desarrollo.
- `npm run db:seed`: carga el seed sintético local mediante `prisma/seed.mjs`.
- `npm run db:verify`: verifica conteos mínimos y la presencia exacta de instituciones, usuarios y casos demo esperados.
- `npm run db:reset`: reinicia la base local con `prisma migrate reset --force`; úselo solo en desarrollo/demo.

### Nota de permisos en WSL/Docker

El servicio `app` ejecuta comandos dentro del contenedor contra el repositorio montado desde el host. Si un comando como `npx prisma migrate reset`, `npx prisma migrate dev` o `npm run build` deja archivos de `prisma/migrations/**` o `.next/**` con propietario `root:root`, un check posterior en WSL puede fallar con `EACCES`. Revise con `stat -c '%U:%G %a %n' prisma/migrations .next 2>/dev/null || true` y repare desde el host con `uid=$(id -u); gid=$(id -g); docker compose exec app chown -R "$uid:$gid" prisma/migrations .next || true`.

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

## Estado de Fase 2

Incluido:

1. Modelos Prisma para instituciones, usuarios institucionales, casos, persona protegida, referencias de agresor/contexto, eventos, asignaciones y auditoría.
2. Separación explícita entre el registro operativo del caso (`publicCode`, estado, riesgo, instituciones, `nonSensitiveSummary`) y los campos sensibles de triage/persona (`ProtectedPerson`); no se agrega narrativa sensible en `Case`.
3. Enums de roles, estados, tipo de institución, tipo de caso, violencia, riesgo, eventos, asignaciones y acciones de auditoría.
4. Índices PostgreSQL razonables para FKs, `publicCode`, colas por estado/riesgo/fecha y búsqueda de auditoría.
5. Catálogos TypeScript para violencia, riesgo y estados.
6. Seed sintético local con instituciones, usuarios, dos casos, personas protegidas, eventos, asignaciones y audit logs.
7. Tests de contrato para schema, catálogos y seed.

No incluido todavía:

- Login o flujos Auth.js.
- CRUD UI/API de casos.
- Cifrado de campos sensibles.
- Migraciones aplicadas a Neon real.
- Uso de datos reales.

## Siguiente fase recomendada

Fase 3: autenticación institucional con Auth.js, administración controlada de cuentas, sesiones seguras y autorización inicial por roles sin registro público.
