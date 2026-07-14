# Vista 08 - Admin tecnico

## Objetivo

Dar visibilidad tecnica del pipeline sin que el usuario final tenga que verlo. Sirve para diagnosticar ingesta, workers, fallos de extraccion y cambios de SEACE.

## Usuario

Equipo interno de BuenaPro.

## Ruta

```text
/admin
```

## Secciones

1. Batch status:
   - total esperado
   - procesados
   - fallidos
   - tiempo estimado
2. Worker jobs:
   - pending
   - claimed
   - done
   - failed
   - dead
3. Pipeline events:
   - por contrato
   - por stage
4. Requires review:
   - extracciones con baja calidad
5. Contract checks:
   - salud de API SEACE

## Componentes

```text
features/admin/components/AdminDashboard/
features/admin/components/BatchStatusPanel/
features/admin/components/WorkerJobsTable/
features/admin/components/PipelineEventsTable/
features/admin/components/RequiresReviewTable/
features/admin/components/ContractChecksPanel/
features/admin/components/AdminTokenGate/
```

## Backend

```text
GET  /api/admin/batches/status
POST /api/admin/batches/start
GET  /api/admin/worker_jobs
POST /api/admin/worker_jobs/:id/retry
POST /api/admin/worker_jobs/:id/dead
GET  /api/admin/pipeline_events
GET  /api/admin/tdr_extractions/requires_review
GET  /api/admin/api_contract_checks
```

## UX

- Denso y tecnico, pero limpio.
- No usar colores alarmistas salvo fallos reales.
- Acciones destructivas deben pedir confirmacion.
- Mostrar payload colapsado, no todo expandido.

## Estados

- Token/admin ausente.
- Sin jobs pendientes.
- Fallos con retry disponible.
- Dead-letter visible.

## Criterios de done

- Se puede diagnosticar una corrida sin entrar a BD.
- Se puede reintentar jobs.
- Se ve progreso de batch.
- No se expone a usuario normal.
