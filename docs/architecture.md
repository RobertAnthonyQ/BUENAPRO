# Arquitectura inicial

```text
SEACE
  -> worker Python
    -> PostgreSQL
    -> Cloudflare R2
    -> Gemini
  -> Next.js web
```

## Responsabilidades

### Web

- Dashboard de oportunidades.
- Filtros y detalle.
- Visualizacion de resumen, facets y documentos.

### Worker

- Polling SEACE cada 30 minutos.
- Upsert de contrataciones vigentes.
- Alcance MVP configurable: estado vigente, objeto servicio y segmentos CUBSO habilitados para tecnologia, transporte y legal.
- Descarga temporal de PDFs.
- Generacion de preview para R2.
- Extraccion con Gemini.
- Normalizacion a summary/facets.

### Base de datos

- Datos SEACE normalizados.
- JSON raw de SEACE.
- JSON raw de extraccion IA.
- Summary y facets para filtros.
