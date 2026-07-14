# Vista 02 - Inicio

## Objetivo

Dar una vista de control simple: que hay nuevo, que cierra pronto y que requiere accion. No debe convertirse en BI ni llenar la pantalla de graficos.

## Usuario

El usuario abre BuenaPro y necesita saber donde actuar primero.

## Ruta

```text
/
```

## Jerarquia

1. Estado del perfil: completo, incompleto o sin perfil.
2. Oportunidades relevantes:
   - nuevas
   - cierran pronto
   - en preparacion
3. Seguimiento pendiente.
4. Estado tecnico discreto si hay ingesta reciente.

## Componentes

```text
features/dashboard/components/ProfileStatusStrip/
features/dashboard/components/MetricTile/
features/dashboard/components/ClosingSoonList/
features/dashboard/components/PreparationQueue/
features/dashboard/components/RecentOpportunities/
```

## Backend

Usar:

```text
GET /api/profile
GET /api/contracts?estado=2&page_size=5&has_extraction=true
GET /api/feed?page_size=5
GET /api/tracking
```

Si no hay perfil o matches, mostrar contratos crudos desde `/api/contracts` para que la app no quede vacia.

## Acciones

- Completar perfil.
- Ver oportunidades.
- Abrir oportunidad.
- Continuar postulacion.

## Estados

- Sin perfil: card/strip de accion, no modal bloqueante.
- Sin oportunidades: mensaje corto.
- Backend parcial: mostrar lo que exista.

## Criterios de done

- En menos de 5 segundos el usuario entiende que hacer.
- No hay parrafos largos.
- Los numeros son accionables, no decorativos.
