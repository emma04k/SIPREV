# SIPREV — Sistema Protegido de Registro de Violencia

SIPREV es un piloto educativo para demostrar cómo un sistema web protegido podría registrar, consultar y dar trazabilidad a casos de violencia entre instituciones autorizadas. Esta base técnica incluye la **Fase 1: Base técnica**, **Fase 2: Modelo de datos mínimo + seed sintético**, **Fase 3: autenticación y autorización inicial**, **Fase 4: registro protegido de casos demo** y **Fase 5: consulta controlada y seguimiento mínimo**.

## Advertencia de demo

- Use únicamente datos sintéticos o ficticios.
- No existe registro público de usuarios; las cuentas institucionales se crean por administración/seed controlado.
- Las migraciones y el seed son **solo para entorno local de demo**.
- La contraseña `SiprevDemo2026!` es un valor local educativo, no una credencial real ni reutilizable.
- No se requieren credenciales reales de Neon todavía; `DATABASE_URL` de Compose apunta al servicio local `db`.
- Esta versión no promete cumplimiento legal ni operación productiva con datos reales.
- Una versión real requiere revisión jurídica, cifrado de datos sensibles, políticas de retención, auditoría fuerte, monitoreo y acuerdos institucionales.

## Stack de la base

- Next.js App Router + TypeScript
- Auth.js/NextAuth con Credentials para cuentas institucionales precreadas
- Tailwind CSS
- Prisma preparado para PostgreSQL/Neon
- PostgreSQL local de demo mediante Docker Compose
- Zod para validación de entradas
- Vitest para pruebas unitarias y contratos de fuente

## Desarrollo local con Docker Compose

Docker Compose es la ruta principal y fuente de verdad para levantar y validar SIPREV localmente. No use `npm` directo en el host como validación final salvo que Docker no esté disponible y lo esté documentando como bloqueo.

### 1. Preparar variables locales

```bash
cp .env.example .env
```

Los valores incluidos son **solo defaults locales de demo** para el servicio PostgreSQL y Auth.js en `docker-compose.yml`. No use esos valores en producción y no suba `.env` al repositorio.

Para despliegues reales, `DATABASE_URL` debe apuntar a Neon/PostgreSQL administrado desde las variables de entorno del proveedor, y `AUTH_SECRET`/`NEXTAUTH_SECRET` deben generarse fuera del repo con valores reales.

### 2. Validar configuración y levantar servicios

```bash
docker compose config
docker compose up -d --build
docker compose ps
```

Verifique en `docker compose config` que el servicio `app` expone `DATABASE_URL`, `AUTH_URL`, `NEXTAUTH_URL`, `AUTH_SECRET` y `NEXTAUTH_SECRET`.

### 3. Ejecutar checks dentro del contenedor app

```bash
docker compose exec app npm run test
docker compose exec app npm run lint
docker compose exec app npm run build
docker compose exec app npm run prisma:validate
```

### 4. Aplicar migraciones locales y cargar seed sintético

```bash
docker compose exec app npx prisma migrate dev
docker compose exec app npm run db:seed
docker compose exec app npm run db:verify
```

Use `migrate reset` solo en la base local de demo cuando necesite re-aplicar una migración de desarrollo todavía no publicada:

```bash
docker compose exec app npx prisma migrate reset --force
docker compose exec app npm run db:seed
docker compose exec app npm run db:verify
```

El seed crea únicamente datos obvios de demo: instituciones `SIPREV-CENTRAL-DEMO`, `COMISARIA-DEMO-NORTE`, `FISCALIA-DEMO-CONTROL`, `AUDITORIA-DEMO`; usuarios con dominio `@siprev.local`; casos `SIPREV-DEMO-CASE-001` y `SIPREV-DEMO-CASE-002`; documentos `DEMO-...`. Los casos usan `nonSensitiveSummary` para dejar claro que el registro operativo no debe contener narrativa sensible.

### 5. Smoke de autenticación, registro, consulta y seguimiento Fase 5

```bash
curl -I http://localhost:3000/auth/login
curl -I http://localhost:3000/dashboard
```

`/dashboard` debe redirigir a `/auth/login?next=/dashboard` cuando no hay sesión. Después de iniciar sesión, el dashboard muestra rol, institución, enlace **Consultar casos**, enlace **Registrar caso** para roles autorizados y un listado mínimo de casos recientes autorizados.

Flujo demo manual:

1. Inicie sesión en `http://localhost:3000/auth/login` con `comisaria.demo@siprev.local` y `SiprevDemo2026!`.
2. Abra `/cases` desde **Consultar casos** y filtre por estado, riesgo, tipo o código/resumen no sensible.
3. Abra `/cases/SIPREV-DEMO-CASE-001`; la consulta registra auditoría VIEW (`AuditLog VIEW`) y muestra la línea de tiempo autorizada.
4. Use el formulario de seguimiento con texto sintético únicamente. No use nombres, documentos, teléfonos, direcciones ni narrativas reales.
5. Si selecciona un estado nuevo válido, el seguimiento crea un evento en la línea de tiempo, actualiza el estado del caso y registra auditoría UPDATE (`AuditLog UPDATE`) sin duplicar datos personales en metadata.
6. Para registrar un caso nuevo, abra `/cases/new`, complete únicamente datos sintéticos/ficticios y confirme que el `publicCode` app-owned aparece luego en `/cases`.

Smoke JSON opcional para `POST /api/cases` y `POST /api/cases/[publicCode]/events` dentro de Compose, sin imprimir cookies ni tokens:

```bash
# 1) Autenticarse con Auth.js en un cookie jar local temporal.
rm -f /tmp/siprev-cookies.txt
csrf=$(curl -s -c /tmp/siprev-cookies.txt http://localhost:3000/api/auth/csrf | node -e "let data='';process.stdin.on('data',c=>data+=c);process.stdin.on('end',()=>process.stdout.write(JSON.parse(data).csrfToken))")
curl -s -o /dev/null -b /tmp/siprev-cookies.txt -c /tmp/siprev-cookies.txt \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d "csrfToken=$csrf&email=comisaria.demo%40siprev.local&password=SiprevDemo2026%21&callbackUrl=http%3A%2F%2Flocalhost%3A3000%2Fdashboard&json=true" \
  http://localhost:3000/api/auth/callback/credentials

# 2) Crear un caso sintético y verificar que devuelve HTTP 201 + publicCode.
curl -s -w '\nHTTP %{http_code}\n' -b /tmp/siprev-cookies.txt \
  -H 'Content-Type: application/json' \
  -d '{"caseType":"INITIAL_REPORT","violenceTypes":["PHYSICAL"],"riskLevel":"HIGH","nonSensitiveSummary":"Resumen sintético sin datos reales para smoke Fase 5.","protectedPerson":{"demoFullName":"Persona Demo Smoke","demoDocumentNumber":"DEMO-SMOKE-001","demoBirthYear":1990},"initialEvent":{"title":"Recepción inicial demo","detail":"Evento sintético creado por smoke Docker."}}' \
  http://localhost:3000/api/cases

# 3) Consultar listado/detalle autorizado y registrar seguimiento sintético.
curl -s -o /dev/null -w 'GET /cases -> HTTP %{http_code}\n' -b /tmp/siprev-cookies.txt \
  'http://localhost:3000/cases?status=IN_FOLLOW_UP&q=SIPREV-DEMO-CASE-001'
curl -s -o /dev/null -w 'GET detail -> HTTP %{http_code}\n' -b /tmp/siprev-cookies.txt \
  http://localhost:3000/api/cases/SIPREV-DEMO-CASE-001
curl -s -w '\nHTTP %{http_code}\n' -b /tmp/siprev-cookies.txt \
  -H 'Content-Type: application/json' \
  -d '{"category":"FOLLOW_UP","title":"Seguimiento demo smoke","detail":"Nota sintética de seguimiento sin datos reales.","newStatus":"IN_FOLLOW_UP"}' \
  http://localhost:3000/api/cases/SIPREV-DEMO-CASE-001/events
```

### 6. Apagar el entorno local

```bash
docker compose down
```

Use `docker compose down -v` solo si desea borrar también los volúmenes locales (`siprev_postgres_data` y `siprev_node_modules`).

## Credenciales demo locales

Todas las cuentas institucionales seed usan la contraseña local de demo `SiprevDemo2026!`:

| Rol | Correo demo | Institución |
| --- | --- | --- |
| SYSTEM_ADMIN | `admin.demo@siprev.local` | `SIPREV-CENTRAL-DEMO` |
| CASE_WORKER | `comisaria.demo@siprev.local` | `COMISARIA-DEMO-NORTE` |
| PROSECUTOR | `fiscalia.demo@siprev.local` | `FISCALIA-DEMO-CONTROL` |
| AUDITOR | `auditor.demo@siprev.local` | `AUDITORIA-DEMO` |

Estas credenciales son solo para Docker/local educativo. No existe registro público, recuperación pública ni autoalta de usuarios.

## Rutas Fase 3 a Fase 5

- `/auth/login`: formulario institucional Auth.js Credentials sin autoalta de usuarios.
- `/dashboard`: ruta privada protegida por middleware y `requireUser` del lado servidor; muestra acceso a consulta, registro y casos recientes autorizados.
- `/cases`: página protegida de consulta autorizada con filtros server-side por `status`, `riskLevel`, `caseType` y búsqueda acotada por código/resumen no sensible.
- `/cases/[publicCode]`: página protegida de detalle con datos demo, línea de tiempo, auditoría `VIEW` fail-closed y formulario de seguimiento/cambio de estado.
- `/cases/new`: formulario institucional protegido para registrar únicamente casos sintéticos de demo, con advertencia fuerte de no usar datos reales y confirmación por `publicCode`.
- `/api/cases`: endpoint `POST` protegido para crear casos. Deriva usuario/institución desde sesión, valida con Zod, escribe caso/persona/evento/asignación/auditoría en transacción y responde solo datos no sensibles.
- `/api/cases/[publicCode]`: endpoint protegido que aplica `canAccessCase` y registra auditoría `VIEW` al consultar un caso demo.
- `/api/cases/[publicCode]/events`: endpoint `POST` protegido para seguimiento. Deriva actor/institución desde sesión, verifica `canAccessCase`, valida categoría/textos/estado con Zod, crea `CaseEvent`, opcionalmente actualiza `Case.status` y registra `AuditLog UPDATE` sin datos personales en metadata.

## Scripts de base de datos

- `npm run prisma:validate`: valida `prisma/schema.prisma`.
- `npm run prisma:generate`: regenera Prisma Client.
- `npm run db:migrate -- --name <nombre>`: crea/aplica una migración local de desarrollo.
- `npm run db:seed`: carga el seed sintético local mediante `prisma/seed.mjs`.
- `npm run db:verify`: verifica conteos mínimos, usuarios credential-enabled y la presencia exacta de instituciones, usuarios y casos demo esperados.
- `npm run db:reset`: reinicia la base local con `prisma migrate reset --force`; úselo solo en desarrollo/demo.

## Nota de permisos en WSL/Docker

El servicio `app` ejecuta comandos dentro del contenedor contra el repositorio montado desde el host. Si un comando como `npx prisma migrate reset`, `npx prisma migrate dev` o `npm run build` deja archivos de `prisma/migrations/**` o `.next/**` con propietario `root:root`, revise con:

```bash
stat -c '%U:%G %a %n' prisma/migrations .next 2>/dev/null || true
uid=$(id -u); gid=$(id -g); docker compose exec app chown -R "$uid:$gid" prisma/migrations .next || true
```

## Bloqueo conocido: Docker Desktop / WSL

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

Los comandos host `npm run lint`, `npm run test`, `npm run build` y `npm run prisma:validate` solo sirven como comprobación preliminar hasta que Docker esté disponible.

## Variables de entorno

Copie `.env.example` como `.env` para Docker Compose local o configure variables equivalentes en su proveedor de despliegue. No suba credenciales reales al repositorio.

Variables principales:

- `DATABASE_URL`: cadena de conexión PostgreSQL. En Compose local apunta al servicio `db`; en despliegue real debe apuntar a Neon/PostgreSQL administrado.
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`: credenciales locales de demo usadas por el contenedor `db`.
- `APP_PORT`, `POSTGRES_PORT`: puertos locales publicados por Compose.
- `NEXT_PUBLIC_APP_URL`: URL pública de la app para metadata y enlaces.
- `NEXTAUTH_URL` / `AUTH_URL`: URL canónica usada por Auth.js.
- `NEXTAUTH_SECRET` / `AUTH_SECRET`: secretos de Auth.js; los valores del repo son placeholders demo-only.
- `SIPREV_DEMO_PASSWORD`: referencia local de la contraseña seed demo; no es un override de runtime y no debe tratarse como secreto productivo.

## Estado de Fase 5

Incluido:

1. Formulario protegido `/cases/new` en español con advertencia fuerte de demo local y prohibición de datos reales.
2. Consulta protegida `/cases` con filtros autorizados server-side (`status`, `riskLevel`, `caseType`, `q`) sin ampliar RBAC.
3. Detalle protegido `/cases/[publicCode]` con datos demo, timeline de `CaseEvent` y auditoría `VIEW` fail-closed.
4. Endpoint `/api/cases/[publicCode]/events` y formulario de seguimiento con validación Zod, categorías permitidas y cambio de estado a valores existentes de `CaseStatus`.
5. Escrituras transaccionales para seguimiento: `CaseEvent` + `AuditLog UPDATE` y, si corresponde, `Case.status`/`closedAt`, derivando actor e institución desde la sesión autenticada.
6. Auditoría sin duplicar datos personales protegidos en metadata; errores genéricos para usuario/API.
7. Dashboard con enlaces a consulta, detalle y registro autorizado.

No incluido todavía:

- Administración de usuarios institucionales.
- UI administrativa de auditoría agregada; Fase 5 solo escribe `AuditLog VIEW`/`UPDATE`.
- Cifrado de campos sensibles.
- Migraciones aplicadas a Neon real.
- Uso de datos reales.
- Rehidratación/revocación completa de JWT contra base de datos en cada request; para producción, evolucionar `requireUser`/callbacks para validar estado vigente y revocaciones sin confiar solo en claims del token.

## Siguiente fase recomendada

Fase 6: administración institucional y vista controlada de auditoría para responsables autorizados, manteniendo datos sintéticos hasta revisión legal/productiva.
