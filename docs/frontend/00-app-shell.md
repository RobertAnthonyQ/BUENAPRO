# Vista 00 - App Shell

## Objetivo

Definir la estructura permanente de BuenaPro: header, navegacion lateral, contexto del usuario y area principal. Todas las vistas privadas deben sentirse parte del mismo producto.

## Usuario

El usuario entra varias veces al dia para revisar oportunidades y dar seguimiento. Necesita ubicarse rapido, sin menus grandes ni ruido.

## Layout

```text
Header superior fijo
Sidebar icon rail
Main content con ancho fluido
Drawer lateral opcional
```

## Elementos

- Wordmark BuenaPro.
- Selector/contexto: `Contratos menores`.
- Busqueda global opcional.
- Accesos: Inicio, Oportunidades, Seguimiento, Perfil, Configuracion.
- Acceso admin solo si el usuario tiene rol tecnico/admin.
- Usuario actual con iniciales.
- Indicador simple de alertas/notificaciones.

## Componentes

```text
features/shell/components/AppShell/
features/shell/components/TopBar/
features/shell/components/IconRail/
features/shell/components/NavIconButton/
features/shell/components/UserMenu/
features/shell/components/NotificationBell/
```

Cada carpeta:

```text
ComponentName.tsx
ComponentName.module.css
index.ts
```

## Comportamiento

- Sidebar activa la ruta actual.
- En mobile, sidebar se convierte en bottom nav o drawer compacto.
- Header no debe tapar contenido.
- El main debe tener padding consistente: `24px` desktop, `16px` mobile.
- No usar cards alrededor de toda la pagina.

## Datos backend

- Puede usar sesion NextAuth.
- `GET /api/notifications?status=queued` para contador si se decide mostrar alertas.
- `GET /api/tenant` para nombre del workspace.

## Estados

- Sin sesion: redirigir a `/login`.
- Tenant ausente: mostrar estado de onboarding.
- Error de tenant: mensaje corto con accion de reintentar.

## Criterios de done

- Todas las vistas privadas usan el mismo shell.
- Navegacion activa funciona.
- Mobile no rompe contenido.
- Cumple [Design Patterns](../design-patterns.md): sin sidebar textual pesado ni decoracion innecesaria.
