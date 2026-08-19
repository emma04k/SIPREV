# SIPREV — Sistema Protegido de Registro de Violencia

SIPREV es un piloto educativo para demostrar cómo un sistema web protegido podría registrar, consultar, dar seguimiento y auditar casos de violencia entre instituciones autorizadas. Esta base técnica cubre **Fase 1: Base técnica**, **Fase 2: Modelo de datos mínimo + seed sintético**, **Fase 3: autenticación y autorización inicial**, **Fase 4: registro protegido de casos demo**, **Fase 5: consulta controlada y seguimiento mínimo** y **Fase 6: auditoría administrativa y polish de demo**.

## Advertencia de demo y reserva legal

- Use únicamente datos sintéticos o ficticios. **No use datos reales** de personas, documentos, teléfonos, direcciones, hechos o instituciones.
- No existe registro público de usuarios; las cuentas institucionales se crean por administración/seed controlado.
- Las migraciones, el seed y las credenciales incluidas son **solo para entorno local de demo**.
- La contraseña `SiprevDemo2026!` es un valor local educativo, no una credencial real ni reutilizable.
- La vista `/audit` muestra trazabilidad sanitizada bajo reserva legal; no debe contener cuerpos enviados ni campos personales protegidos.
- Esta versión no promete cumplimiento legal ni operación productiva con datos reales. Una versión real requiere revisión jurídica, cifrado de datos sensibles, políticas de retención, auditoría fuerte, monitoreo, acuerdos institucionales y gestión de incidentes.

## Stack

- Next.js App Router + TypeScript
- Auth.js/NextAuth con Credentials para cuentas institucionales precreadas
- Tailwind CSS
- Prisma 6 + PostgreSQL local por Docker Compose; preparada para Neon
- Zod para validación de entradas
- Vitest para pruebas unitarias y contratos de fuente

## Arquitectura

El diagrama final de arquitectura y flujo está en [`docs/siprev-architecture.html`](docs/siprev-architecture.html). Resume Next.js/Auth.js/Prisma/PostgreSQL, despliegue Vercel + Neon, RBAC, flujo protegido de casos y bitácora `AuditLog`.

## Desarrollo local con Docker Compose

Docker Compose es la fuente de verdad para levantar y validar SIPREV localmente. No use `npm` directo en el host como validación final salvo que Docker no esté disponible y lo documente como bloqueo.

### 1. Preparar variables locales

```bash
cp .env.example .env
```

Los valores incluidos son defaults locales de demo para PostgreSQL y Auth.js en `docker-compose.yml`. No suba `.env` al repositorio.

### 2. Validar configuración y levantar servicios

```bash
docker compose config --quiet
docker compose up -d --build
docker compose ps
```

Verifique que el servicio `app` expone `DATABASE_URL`, `AUTH_URL`, `NEXTAUTH_URL`, `AUTH_SECRET` y `NEXTAUTH_SECRET`.

### 3. Checks dentro del contenedor app

```bash
docker compose exec app npm run test
docker compose exec app npm run lint
docker compose exec app npm run build
docker compose exec app npm run prisma:validate
```

### 4. Migraciones locales y seed sintético

```bash
docker compose exec app npx prisma migrate dev
docker compose exec app npm run db:seed
docker compose exec app npm run db:verify
```

Use `migrate reset` solo en la base local de demo cuando necesite reiniciar datos locales:

```bash
docker compose exec app npx prisma migrate reset --force
docker compose exec app npm run db:seed
docker compose exec app npm run db:verify
```

El seed crea únicamente datos obvios de demo: instituciones `SIPREV-CENTRAL-DEMO`, `COMISARIA-DEMO-NORTE`, `FISCALIA-DEMO-CONTROL`, `AUDITORIA-DEMO`; usuarios con dominio `@siprev.local`; casos `SIPREV-DEMO-CASE-001` y `SIPREV-DEMO-CASE-002`; documentos `DEMO-...`. Los casos usan `nonSensitiveSummary` para evitar narrativas sensibles.

## Credenciales demo locales

Todas las cuentas institucionales seed usan la contraseña local de demo `SiprevDemo2026!`:

| Rol | Correo demo | Institución |
| --- | --- | --- |
| SYSTEM_ADMIN | `admin.demo@siprev.local` | `SIPREV-CENTRAL-DEMO` |
| CASE_WORKER | `comisaria.demo@siprev.local` | `COMISARIA-DEMO-NORTE` |
| PROSECUTOR | `fiscalia.demo@siprev.local` | `FISCALIA-DEMO-CONTROL` |
| AUDITOR | `auditor.demo@siprev.local` | `AUDITORIA-DEMO` |

Estas credenciales son solo para Docker/local educativo. No existe registro público, recuperación pública ni autoalta de usuarios.

## Flujo demo end-to-end

1. Levante Docker Compose, aplique migraciones y ejecute `docker compose exec app npm run db:seed` + `docker compose exec app npm run db:verify`.
2. Abra `http://localhost:3000/auth/login` e inicie sesión como `comisaria.demo@siprev.local`.
3. Desde `/dashboard`, use **Consultar casos** para abrir `/cases` y filtre por estado, riesgo, tipo o código/resumen no sensible.
4. Abra `/cases/SIPREV-DEMO-CASE-001`; la consulta registra auditoría VIEW (`AuditLog VIEW`) del lado servidor y muestra la línea de tiempo autorizada.
5. En el formulario de seguimiento, escriba solo texto sintético. El seguimiento nuevo aparece en la línea de tiempo tras recargar; si cambia estado, se crea `CaseEvent`, se actualiza el estado del caso y se registra auditoría UPDATE (`AuditLog UPDATE`) sin duplicar datos personales en metadata.
6. Para registrar un caso nuevo, abra `/cases/new` con un rol autorizado, complete únicamente datos sintéticos/ficticios y confirme que el `publicCode` app-owned aparece luego en `/cases`.
7. Inicie sesión como `auditor.demo@siprev.local` o `admin.demo@siprev.local`, abra `/audit`, filtre por `action`, `entityType`, `publicCode` o actor y revise que la bitácora muestra metadatos sanitizados. El auditor puede consultar `/audit` y casos autorizados, pero sigue sin permisos de escritura de seguimiento.
8. Inicie sesión como `fiscalia.demo@siprev.local` o `comisaria.demo@siprev.local` y confirme que `/audit` no expone la vista administrativa.
9. Apague el entorno con `docker compose down`.

Smoke HTTP mínimo:

```bash
curl -I http://localhost:3000/auth/login
curl -I http://localhost:3000/dashboard
curl -I http://localhost:3000/audit
```

`/dashboard` y `/audit` deben redirigir a `/auth/login?next=...` cuando no hay sesión. Después de autenticarse, `/audit` responde 200 para `SYSTEM_ADMIN`/`AUDITOR` activos y 403 o página restringida para roles operativos.

## Smoke JSON opcional dentro de Compose

Use cookie jar temporal y no imprima cookies, tokens ni datos sensibles:

```bash
rm -f /tmp/siprev-cookies.txt
csrf=$(curl -s -c /tmp/siprev-cookies.txt http://localhost:3000/api/auth/csrf | node -e "let data='';process.stdin.on('data',c=>data+=c);process.stdin.on('end',()=>process.stdout.write(JSON.parse(data).csrfToken))")
curl -s -o /dev/null -b /tmp/siprev-cookies.txt -c /tmp/siprev-cookies.txt \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d "csrfToken=$csrf&email=comisaria.demo%40siprev.local&password=SiprevDemo2026%21&callbackUrl=http%3A%2F%2Flocalhost%3A3000%2Fdashboard&json=true" \
  http://localhost:3000/api/auth/callback/credentials

curl -s -o /dev/null -w 'GET /cases -> HTTP %{http_code}\n' -b /tmp/siprev-cookies.txt \
  'http://localhost:3000/cases?status=OPEN&q=SIPREV-DEMO-CASE-001'
curl -s -o /dev/null -w 'GET detail API -> HTTP %{http_code}\n' -b /tmp/siprev-cookies.txt \
  http://localhost:3000/api/cases/SIPREV-DEMO-CASE-001
curl -s -w '\nHTTP %{http_code}\n' -b /tmp/siprev-cookies.txt \
  -H 'Content-Type: application/json' \
  -d '{"category":"FOLLOW_UP","title":"Seguimiento demo smoke","detail":"Nota sintética de seguimiento sin datos reales.","newStatus":"IN_FOLLOW_UP"}' \
  http://localhost:3000/api/cases/SIPREV-DEMO-CASE-001/events
```

## Rutas principales

- `/auth/login`: formulario institucional Auth.js Credentials sin autoalta de usuarios.
- `/dashboard`: ruta privada protegida por middleware y `requireUser`; muestra navegación a consulta, registro autorizado y auditoría cuando corresponde.
- `/cases`: página protegida de consulta autorizada con filtros server-side por `status`, `riskLevel`, `caseType` y búsqueda acotada por código/resumen no sensible.
- `/cases/[publicCode]`: página protegida de detalle con datos demo, línea de tiempo, auditoría `VIEW` fail-closed y formulario de seguimiento/cambio de estado.
- `/cases/new`: formulario institucional protegido para registrar únicamente casos sintéticos de demo.
- `/audit`: vista administrativa protegida para `SYSTEM_ADMIN` y `AUDITOR` activos; lista hasta 100 `AuditLog` recientes con filtros server-side y metadata sanitizada.
- `/api/cases`: endpoint `POST` protegido para crear casos. Deriva usuario/institución desde sesión, valida con Zod, escribe caso/persona/evento/asignación/auditoría en transacción y responde solo datos no sensibles.
- `/api/cases/[publicCode]`: endpoint protegido que aplica `canAccessCase` y registra auditoría `VIEW` al consultar un caso demo.
- `/api/cases/[publicCode]/events`: endpoint `POST` protegido para seguimiento. Deriva actor/institución desde sesión, verifica `canAccessCase`, valida categoría/textos/estado, crea `CaseEvent`, actualiza `Case.status` si corresponde y registra `AuditLog UPDATE`.

## Scripts de base de datos

- `npm run prisma:validate`: valida `prisma/schema.prisma`.
- `npm run prisma:generate`: regenera Prisma Client.
- `npm run db:migrate -- --name <nombre>`: crea/aplica una migración local de desarrollo.
- `npx prisma migrate deploy`: aplica migraciones existentes en un entorno desplegado; úselo para Vercel + Neon, no `migrate dev`.
- `npm run db:seed`: carga el seed sintético local mediante `prisma/seed.mjs`.
- `npm run db:verify`: verifica conteos mínimos, usuarios credential-enabled y la presencia exacta de instituciones, usuarios y casos demo esperados.
- `npm run db:reset`: reinicia la base local con `prisma migrate reset --force`; úselo solo en desarrollo/demo.

## Preparación de despliegue Vercel + Neon free tier

No se desplegó desde este repositorio. Para preparar un despliegue de demo controlada:

1. Cree un proyecto Neon de prueba y una base dedicada a SIPREV demo. No cargue datos reales.
2. Configure en Vercel el preset **Next.js**, build command `npm run build` y no sobrescriba el output directory (`.next`).
3. Variables de entorno en Vercel, con placeholders fuera del repositorio:

```env
DATABASE_URL="postgresql://<NEON_USER>:<NEON_PASSWORD>@<NEON_HOST>/<NEON_DATABASE>?sslmode=require"
NEXT_PUBLIC_APP_URL="https://<VERCEL_PROJECT>.vercel.app"
NEXTAUTH_URL="https://<VERCEL_PROJECT>.vercel.app"
AUTH_URL="https://<VERCEL_PROJECT>.vercel.app"
NEXTAUTH_SECRET="<GENERATE_WITH_NPX_AUTH_SECRET>"
AUTH_SECRET="<SAME_GENERATED_VALUE_OR_PROVIDER_SECRET>"
```

4. Ejecute migraciones existentes contra Neon con `prisma migrate deploy` desde un entorno controlado que tenga `DATABASE_URL` configurado. No use `migrate dev` en producción.
5. Si carga seed para una demo pública, revise que siga siendo sintético y etiquetado como `DEMO`. No despliegue datos reales ni conexión Neon real en `.env.example`, README, logs o capturas.
6. Valide login, `/dashboard`, `/cases`, detalle, seguimiento y `/audit` después del despliegue.

## Checklist de seguridad / reserva legal para demo

- [ ] No use datos reales; todo ejemplo debe ser sintético, ficticio y marcado como demo.
- [ ] No existe registro público ni autoalta ciudadana.
- [ ] Autenticación y autorización se validan del lado servidor; middleware es solo una compuerta UX.
- [ ] `/audit` solo para `SYSTEM_ADMIN` y `AUDITOR` activos en instituciones activas.
- [ ] El auditor mantiene lectura amplia pero no puede crear seguimientos ni cambiar estados.
- [ ] La metadata de auditoría se sanitiza antes de renderizar y no muestra cuerpos enviados ni campos personales protegidos.
- [ ] No registre secretos, cookies, tokens ni payloads de sesión en logs o UI.
- [ ] Antes de uso real: revisión jurídica, cifrado de campos sensibles, rotación/revocación de sesiones, monitoreo, retención, backups y respuesta a incidentes.

## Nota de permisos en WSL/Docker

El servicio `app` ejecuta comandos dentro del contenedor contra el repositorio montado desde el host. Si `npx prisma migrate reset`, `npx prisma migrate dev` o `npm run build` dejan `prisma/migrations/**` o `.next/**` con propietario `root:root`, repare con:

```bash
stat -c '%U:%G %a %n' prisma/migrations .next 2>/dev/null || true
uid=$(id -u); gid=$(id -g); docker compose exec app chown -R "$uid:$gid" prisma/migrations .next || true
```

## Bloqueo conocido: Docker Desktop / WSL

Si WSL muestra `The command 'docker' could not be found in this WSL 2 distro`, habilite Docker Desktop con integración WSL para esta distribución y vuelva a ejecutar:

```bash
docker compose config --quiet
docker compose up -d --build
```

Los comandos host `npm run lint`, `npm run test`, `npm run build` y `npm run prisma:validate` solo son comprobación preliminar hasta que Docker esté disponible.

## Estado de Fase 6

Incluido:

1. Vista `/audit` protegida para auditor/admin activo con filtros server-side y consulta acotada a 100 registros.
2. Helper reusable `src/lib/audit/audit-log-query.ts` para permisos, filtros, query Prisma mínima y sanitización recursiva.
3. Copy profesional de reserva legal/demo en superficies principales.
4. Diagrama final `docs/siprev-architecture.html`.
5. README con flujo demo end-to-end, Docker validation y preparación Vercel + Neon.

No incluido:

- Registro público, importación de datos reales, notificaciones productivas, SIEM completo o administración completa de usuarios.
- Despliegue real a Vercel/Neon.
- Cambios de schema o migraciones nuevas.
