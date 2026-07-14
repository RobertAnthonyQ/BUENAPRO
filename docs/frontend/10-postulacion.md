# Vista 10 - Workspace de postulación

## Objetivo

Convertir una oportunidad decidida en un expediente operativo rápido: oferta, RTM, contacto y archivos en una sola mesa.

## Ruta

```text
/postulaciones/[matchId]
```

## Flujo

1. `Comenzar postulación` crea o reutiliza match y borrador.
2. Sincroniza ítems, RTM y documentos desde SEACE.
3. Navega a una sola mesa de preparación, sin pasos de lectura.
4. Guarda cambios y adjuntos como borrador; no realiza envío oficial.

## Secciones

- Oferta: selección de ítems, precio, vigencia y contacto.
- RTM: respuestas dinámicas en la misma página.
- Tu propuesta: carga directa de PDF, Word o Excel al borrador.
- Formatos de la entidad: descarga opcional bajo demanda desde SEACE; leerlos no es un paso de avance.
- Rail compacto: responsable con guardado automático, avance de oferta, RTM y propuesta adjunta.

## Backend

```text
POST /api/contracts/:id/applications
GET /api/applications/:matchId
PATCH /api/applications/:matchId
PATCH /api/applications/:matchId/items
PATCH /api/applications/:matchId/requirements
POST /api/applications/:matchId/attachments
GET /api/applications/:matchId/attachments/:attachmentId
DELETE /api/applications/:matchId/attachments/:attachmentId
```

## Seguridad

- Autorización siempre por tenant y match.
- Los snapshots SEACE son trazabilidad, no autorización de envío.
- Los adjuntos se validan por tipo/tamaño y pertenecen al tenant del borrador.
- No existe endpoint de envío oficial en esta fase.
