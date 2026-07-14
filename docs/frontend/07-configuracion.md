# Vista 07 - Configuracion

## Objetivo

Permitir controlar preferencias de alertas, miembros y ajustes basicos del tenant sin mezclarlo con el perfil tecnico de la empresa.

## Usuario

Owner/admin que define como quiere recibir alertas y quien participa en el workspace.

## Ruta

```text
/configuracion
```

## Secciones

1. Workspace:
   - nombre
   - plan informativo
2. Miembros:
   - lista
   - rol
   - invitar/agregar
3. Notificaciones:
   - canal: email, telegram, in_app
   - realtime/digest
   - max alertas por dia
   - horario silencioso
4. Lineas de negocio:
   - acceso rapido a configuracion o enlace a Perfil.

## Componentes

```text
features/settings/components/SettingsLayout/
features/settings/components/WorkspaceSettings/
features/settings/components/MembersTable/
features/settings/components/NotificationPreferences/
features/settings/components/QuietHoursEditor/
features/settings/components/ChannelToggle/
```

## Backend

```text
GET /api/tenant
PATCH /api/tenant
GET /api/tenant/members
POST /api/tenant/members
PATCH /api/tenant/members/:userId
DELETE /api/tenant/members/:userId
GET /api/notifications/prefs
PUT /api/notifications/prefs
GET /api/notifications
```

## UX

- Separar configuracion de perfil.
- No pedir datos tecnicos de empresa aqui.
- Mostrar estado de Telegram/email si falta configuracion.
- Guardado claro por seccion.

## Estados

- Usuario sin permisos: solo lectura.
- Sin preferencias: crear defaults.
- Error de canal: explicar que falta token/chat id o email.

## Criterios de done

- Editar preferencias.
- Ver miembros.
- Cambiar rol de miembro.
- No mezclar con onboarding de perfil.
