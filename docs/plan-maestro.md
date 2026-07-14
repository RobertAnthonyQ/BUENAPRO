# BuenaPro - plan maestro

Fecha: 2026-07-08.

## 1. Vision

BuenaPro es una plataforma de inteligencia para contrataciones publicas. El objetivo no es solo encontrar licitaciones, sino responder rapidamente:

- Puedo postular?
- Que me falta?
- Me conviene?
- Que documentos/requisitos debo preparar?

Foco inicial:

```text
Contrataciones menores o iguales a 8 UIT en SEACE.
Solo oportunidades vigentes para el MVP.
Solo objeto Servicio para el MVP.
Solo segmentos CUBSO configurados para tecnologia, transporte y legal.
```

El alcance del worker debe ser configurable. No hardcodear los segmentos en la logica: primero se sincroniza el catalogo CUBSO por anio y luego se eligen los segmentos habilitados para el MVP.

## 2. Tesis del producto

Las plataformas comunes muestran licitaciones por palabra clave. BuenaPro debe leer el TDR, extraer requisitos y cruzarlos contra el perfil real de una empresa.

La diferenciacion esta en:

- extraccion estructurada de TDRs
- matching contra perfil de empresa
- semaforo accionable
- gaps claros: "te falta un ingeniero mecanico", "te falta SCTR", "no tienes experiencia economica suficiente"
- seguimiento de oportunidad

## 3. Stack recomendado

```text
Frontend: Next.js + TypeScript
Backend web: Next.js server/API al inicio
Worker: Python
DB: PostgreSQL
Storage: Cloudflare R2
IA: Gemini 3.1 Flash-Lite + fallback Gemini 2.5 Flash
Deploy inicial: Docker Compose
Jobs MVP: tabla worker_jobs en PostgreSQL
Jobs futuro: Redis + Dramatiq/Celery/RQ
Alertas MVP: Telegram/email/in-app
Alertas fase 2: WhatsApp Business API
```

Estructura creada:

```text
apps/web/          Next.js
workers/seace/     Python worker
infra/docker/      Docker Compose y Dockerfiles
packages/shared/   tipos/esquemas compartidos
docs/              documentacion
```

## 4. Endpoints SEACE confirmados

Base:

```text
https://prod6.seace.gob.pe/v1/s8uit-services
```

### Buscador

```text
GET /buscadorpublico/contrataciones/buscador
```

Parametros importantes:

```text
anio
segmento
lista_codigo_objeto
lista_codigo_cubso
lista_estado_contrato
codigo_departamento
codigo_provincia
codigo_distrito
codigo_entidad
palabra_clave
orden
page
page_size
```

Campos importantes:

```text
idContrato
desContratacion
desObjetoContrato
nomEntidad
fecPublica
fecIniCotizacion
fecFinCotizacion
idEstadoContrato
nomEstadoContrato
cotizar
pageable.totalElements
```

`cotizar` indica si la UI muestra/permite cotizacion para esa oportunidad.

### Detalle completo

```text
GET /buscadorpublico/contrataciones/listar-completo?id_contrato={idContrato}
```

Trae:

- ficha completa
- entidad
- area usuaria
- etapas/cronograma
- items CUBSO
- lugar
- cantidad/unidad

### Listar archivos

```text
GET /archivo/archivos-publico/listar-archivos-contrato/{idContrato}/{codCategoria}
```

Categoria probada:

```text
1 = anexo/requerimiento/TDR
```

### Descargar archivo

```text
GET /archivo/archivos-publico/descargar-archivo-contrato/{idContratoArchivo}
```

Descarga directa sin login en pruebas.

## 5. Catalogos confirmados

### Objeto

```text
1 = Bien
2 = Servicio
3 = Obra
4 = Consultoria de Obra
```

### Estado

```text
2 = Vigente
3 = En Evaluacion
4 = Culminado
```

### Segmentos CUBSO

Endpoint:

```text
GET /buscadorpublico/contrataciones/listar-segmentos-cubso?anio={anio}
```

Hallazgo:

```text
anio=2024 -> 31 segmentos
anio=2026 -> 56 segmentos
```

No asumir catalogo fijo. Sincronizar por anio.

## 6. Rutina del worker

Frecuencia recomendada MVP:

```text
cada 30 minutos
solo estado vigente
```

Concurrencia inicial:

```text
SEACE fetch: 3 workers
PDF download: 2 workers
Gemini extraction: 1-2 workers
OCR local: apagado o 1 worker solo fallback
```

Pipeline:

```text
poll_seace
  -> save_search_results
  -> fetch_detail
  -> list_files
  -> download_files
  -> classify_pdf
  -> extract_tdr_json
  -> validate_json
  -> derive_summary
  -> derive_facets
  -> upsert_filter_index
  -> ready_for_matching
```

### Lifecycle worker

No basta con detectar oportunidades vigentes. Las oportunidades ya guardadas deben seguir siendo consultadas por `idContrato` hasta salir del ciclo activo.

Objetivos:

```text
capturar cambio de vigente -> en evaluacion -> culminado
capturar cambios de cronograma
capturar cambios de documentos
capturar resultado/adjudicatario si SEACE lo expone
alimentar seguimiento e historico de precios
```

Rutina:

```text
cada 30-60 min:
  tomar oportunidades no cerradas
  consultar listar-completo?id_contrato
  consultar lista de archivos
  recalcular hashes
  disparar cascada de cambios si aplica
```

Estados:

```text
discovered
detail_fetched
files_listed
downloaded
classified
extracted
validated
normalized
failed
```

## 7. Como detectar nuevas oportunidades eficientemente

No descargar todo cada vez.

Algoritmo:

```text
1. Pedir page=1&page_size=100 de vigentes orden DESC.
2. Para cada resultado:
   - calcular hash_search = sha256(json canonico)
   - si idContrato no existe: insertar y encolar procesamiento completo
   - si existe y hash_search cambio: actualizar y encolar refresh
   - si existe e igual: contar unchanged
3. Si toda la pagina esta igual, parar.
4. Si hay nuevos/cambios, seguir page=2, page=3...
```

Hashes utiles:

```text
hash_search: cambios en listado/card
hash_detail: cambios en ficha/cronograma/items
hash_files: cambios en lista de archivos
sha256_pdf: cambios en documento
hash_summary: cambios en summary operativo
hash_facets: cambios en requisitos/facets
```

Reglas:

```text
nuevo idContrato -> procesar todo
hash_search cambio -> actualizar listado
hash_detail cambio -> refrescar ficha/summary
hash_files cambio -> revisar documentos
sha256_pdf cambio -> re-extraer TDR
hash_facets cambio -> re-match de empresas afectadas
veredicto cambio -> notificar segun preferencias
```

### Cascada de cambios

Evitar spam y evitar silencio ante cambios importantes.

```text
hash cambia
  -> re-extraer si corresponde
  -> comparar summary/facets anteriores vs nuevos
  -> re-match solo empresas afectadas
  -> notificar solo si cambia veredicto o aparece accion relevante
```

Sin diff, cada absolucion o cambio menor puede generar spam. Con diff, solo se alerta cuando cambia algo operativo.

## 8. PDFs y storage

Estrategia MVP:

```text
No guardar PDF original permanente.
Descargar temporalmente.
Usar temporal original para Gemini.
Generar preview optimizado.
Subir solo preview a R2.
Guardar URL original SEACE para descarga.
Borrar temporal local.
```

Campos en BD:

```text
seace_download_url
r2_preview_key
sha256_original
sha256_preview
size_original_bytes
size_preview_bytes
idContratoArchivo
filename
```

Regla de preview:

```text
si comprimido pesa mas que original -> usar original como preview
si comprimido pierde legibilidad -> usar original como preview
si compresion falla -> usar original como preview
```

Para descargar en UI:

```text
redirigir/proxy al endpoint original de SEACE
```

Para preview:

```text
usar R2
```

## 9. Costos IA medidos

Modelo probado:

```text
gemini-3.1-flash-lite
```

5 TDRs reales analizados:

```text
input tokens: 20,740
output tokens: 30,196
total tokens: 50,936
costo total: USD 0.0141524
promedio por TDR: USD 0.00283048
```

Costo aproximado:

```text
menos de 1 centavo USD por TDR
aprox. 1 centimo de sol por TDR, dependiendo tipo de cambio
```

Observacion:

Un PDF requirio reintento con `maxOutputTokens=16384` porque el JSON salio largo. En produccion usar salida compacta y validacion/schema repair.

## 10. Extraccion IA

El LLM debe convertir TDR desordenado en estructura.

No debe usarse como motor principal de matching masivo.

Uso recomendado:

```text
LLM = extraccion y normalizacion inicial del TDR
Reglas = matching contra perfil
LLM opcional = explicacion amigable de gaps
```

Modelo:

```text
Gemini 3.1 Flash-Lite para extracción normal
Gemini 2.5 Flash como fallback
```

PDFs:

- muchos vienen escaneados
- Gemini puede leer PDF multimodal
- OCR local queda como fallback/diagnostico

### Golden set del extractor

El MVP debe tener un golden set minimo desde el inicio.

Base inicial:

```text
los 5 TDRs reales ya analizados
JSON esperado revisado manualmente
script de comparacion
```

Uso:

```text
cada cambio de prompt
cada cambio de modelo
cada cambio de schema
```

Debe correr:

```text
extract -> validate -> compare contra expected
```

Campos obligatorios en `tdr_extractions`:

```text
prompt_version
model
input_tokens
output_tokens
cost_usd
schema_version
quality
requires_human_review
```

Tambien debe existir una cola/vista minima:

```text
requires_review
```

Cada correccion humana importante debe poder convertirse en nuevo caso del golden set.

## 11. Estructura de extraccion

Guardar JSON completo, pero no usarlo directamente para todos los filtros.

Bloques:

```text
contract
execution
payment
requirements.provider
requirements.key_personnel
requirements.equipment
requirements.insurance
requirements.proposal_documents
penalties
contract_management
summary
```

Reglas:

- separar requisitos del proveedor vs personal clave
- separar experiencia economica vs experiencia laboral
- penalidades con formula/tope/base
- no usar flags top-level sesgados por rubro
- usar facets parametrizados

## 12. Summary compacto

Para cards, filtros y alertas:

```json
{
  "summary": {
    "codigo": "",
    "entidad": "",
    "objeto": "",
    "descripcion_corta": "",
    "valor_estimado": {
      "monto": null,
      "moneda": "PEN",
      "no_informado": true
    },
    "ubicacion": {
      "departamento": "",
      "provincia": "",
      "distrito": ""
    },
    "plazo_ejecucion_dias": null,
    "fecha_limite_cotizacion": "",
    "tipo_pago": "pago_unico|armadas|mensual|por_entregable|no_determinado",
    "entregables_count": 0,
    "penalidad_tope_pct": null,
    "roles_requeridos": [],
    "requirement_facets": [],
    "documentos_clave": [],
    "observaciones_clave": []
  }
}
```

No incluir `risk_level` por ahora porque es subjetivo.

## 13. Requirement facets

No crear flags como:

```text
requiere_colegiatura
requiere_licencia
requiere_sctr
```

Mejor:

```json
{
  "facet": "professional_registration",
  "label": "Colegiatura y habilidad",
  "required": true,
  "details": {
    "profession": "Ingenieria Civil",
    "active_status_required": true
  },
  "evidence": []
}
```

Taxonomia inicial:

```text
legal_capacity
ruc_status
rnp
not_disqualified
cci
business_line
economic_experience
general_experience
specific_experience
key_personnel
education
professional_registration
training
license
equipment
insurance
company_certification
proposal_document
payment_condition
penalty_condition
delivery_condition
other
```

Esto permite funcionar para:

- ingenieria: colegiatura/habilidad
- transporte: licencia de conducir
- seguridad: SCTR/equipos/licencias
- TI: certificaciones/experiencia
- limpieza: equipamiento/seguros

## 14. Matching contra empresa

No comparar todas las oportunidades con LLM.

Proceso:

```text
TDR facets + Company profile -> deterministic matcher -> score + gaps
```

Estados por requisito:

```text
cumple
cumple_con_accion
no_cumple
requiere_revision
```

Semaforo:

```text
verde = cumple requisitos criticos
ambar = falta algo accionable
rojo = gap duro/no accionable
gris = falta informacion
```

Ejemplos accionables:

```text
falta SCTR
falta CCI
falta contratar un especialista
falta documento administrativo
```

Ejemplos duros:

```text
experiencia economica muy por debajo
RNP obligatorio inexistente
facturacion minima alta
licencia/certificacion no obtenible antes del cierre
```

### Re-match selectivo

No recalcular todo para todos si no hace falta.

```text
si cambia una oportunidad -> re-match empresas cuyas lineas de negocio coinciden
si cambia un perfil de empresa -> re-match oportunidades activas relevantes
si cambia solo metadata no operativa -> no notificar
si cambia veredicto o gap accionable -> notificar
```

Guardar historico del match permite saber si el veredicto cambio:

```text
verde -> ambar
ambar -> verde
verde/ambar -> rojo
```

## 15. Perfil de empresa

Debe modelar capacidades comparables:

```text
identidad: RUC, RNP, CCI, estado SUNAT
lineas de negocio: CUBSO/segmentos/keywords/regiones
experiencia economica: montos por rubro
experiencia general/especifica: contratos y conformidades
equipo: personas, grados, carreras, colegiatura, habilitacion, experiencia, capacitaciones, licencias
roles contratables: perfiles que la empresa acepta conseguir
equipos/activos
seguros/certificaciones
```

El punto clave:

```text
si falta un perfil pero la empresa acepta contratarlo -> cumple_con_accion
si falta experiencia economica dura -> no_cumple
```

## 15.1 Usuarios, auth y seguimiento

Debe entrar al MVP aunque billing espere.

Auth inicial:

```text
NextAuth/Auth.js o Better Auth
```

Tablas minimas:

```text
users
tenants
tenant_members
company_profiles
```

En `matches` agregar:

```text
estado_usuario
responsable_id
monto_ofertado
notas
```

Estados de seguimiento:

```text
inbox
en_evaluacion
interesada
en_preparacion
postulada
ganada
perdida
desierta
en_ejecucion
cobrada
```

## 16. Filtros

Base:

```text
objeto
estado
segmento CUBSO
item CUBSO
region/provincia/distrito
entidad
fecha limite
palabra clave
monto
```

Inteligentes:

```text
solo verdes
ambar accionables
requiere personal clave
sin experiencia economica
experiencia economica <= X
requiere licencia
requiere seguro
tipo_pago
plazo_ejecucion_dias
penalidad_tope_pct
```

Estos filtros salen de facets y summary, no de texto libre.

## 16.1 Alertas MVP

WhatsApp no es requisito para el MVP inicial.

Canales iniciales:

```text
email/Gmail
Telegram
in-app
```

WhatsApp Business API queda como fase posterior o tramite paralelo, porque plantillas y aprobaciones pueden tardar.

SLA objetivo:

```text
deteccion -> alerta: <= 45 min peor caso
```

Preferencias:

```text
notification_preferences
```

Campos:

```text
tenant_id
user_id
channel
enabled
min_verdict
digest_enabled
max_alerts_per_day
quiet_hours_json
business_line_ids
```

Regla anti-ruido:

```text
alertar nueva oportunidad relevante
alertar cambio de veredicto
alertar nuevo gap accionable importante
no alertar cambios sin impacto operativo
si supera N alertas/dia -> mandar digest
```

## 17. Tablas sugeridas

### `seace_contracts`

```text
id_contrato
codigo
anio
entidad
objeto
estado
cotizar
fecha_publicacion
fecha_fin_cotizacion
hash_search
hash_detail
raw_search_json
raw_detail_json
```

### `contract_documents`

```text
id
id_contrato
id_contrato_archivo
tipo_archivo
nombre
mime
size_original_bytes
size_preview_bytes
sha256_original
sha256_preview
r2_preview_key
seace_download_url
```

### `tdr_extractions`

```text
id
contract_document_id
model
prompt_version
schema_version
input_tokens
output_tokens
cost_usd
quality
requires_human_review
raw_extraction_json
summary_json
created_at
```

### `requirement_facets`

```text
id
id_contrato
facet
label
required
details_json
evidence_json
```

### `contract_filter_index`

```text
id_contrato
valor_estimado
plazo_ejecucion_dias
tipo_pago
penalidad_tope_pct
entregables_count
roles_requeridos text[]
facets text[]
documentos_clave text[]
```

### `company_profiles`

```text
id
tenant_id
ruc
razon_social
rnp_json
business_lines_json
experience_json
team_json
hireable_roles_json
equipment_json
certifications_json
```

### `matches`

```text
id
company_profile_id
id_contrato
score
verdict
breakdown_json
missing_actions_json
estado_usuario
responsable_id
monto_ofertado
notas
created_at
updated_at
```

### `users`

```text
id
email
name
created_at
updated_at
```

### `tenants`

```text
id
name
created_at
updated_at
```

### `tenant_members`

```text
tenant_id
user_id
role
```

### `notification_preferences`

```text
id
tenant_id
user_id
channel
enabled
min_verdict
max_alerts_per_day
digest_enabled
quiet_hours_json
business_line_ids
```

### `worker_jobs`

```text
id
job_type
payload_json
status
attempts
max_attempts
run_at
locked_at
last_error
created_at
updated_at
```

### `pipeline_events`

```text
id
id_contrato
stage
status
duration_ms
error
metadata_json
created_at
```

### `extractor_golden_cases`

```text
id
name
document_storage_key
expected_json
prompt_version
schema_version
created_at
updated_at
```

## 18. Infra inicial

VM recomendada:

```text
2 vCPU
4 GB RAM
40-80 GB disco
```

Suficiente si:

- Gemini lee PDFs
- OCR local no corre masivo
- concurrencia baja
- R2 guarda documentos

Storage:

```text
Cloudflare R2
```

R2 free tier:

```text
10 GB storage
1M Class A ops/mes
10M Class B ops/mes
egress gratis
```

## 18.1 Observabilidad

MVP minimo:

```text
pipeline_events
job status
errores por etapa
duracion por etapa
ultimo poll exitoso
conteo de nuevas oportunidades
conteo de extracciones fallidas
conteo de requires_review
```

Contract test SEACE:

```text
cada hora:
  llamar buscador con page_size=1
  llamar catalogos clave
  validar shape esperado
  si falla -> alerta tecnica
```

HTTP hygiene:

```text
User-Agent claro
backoff + jitter
timeouts
reintentos limitados
concurrencia baja
```

## 18.2 Timezone

Regla obligatoria:

```text
guardar todo en UTC en BD
renderizar en America/Lima
parsear fechas SEACE como America/Lima
```

Motivo:

```text
evitar countdowns corridos por 5 horas
evitar alertas tarde o temprano
```

## 18.3 Privacidad y datos personales

Politica simple inicial:

```text
no indexar DNIs innecesarios
no exponer DNIs en logs
redactar datos personales si no aportan al matching
guardar solo lo necesario para evidencia/requisito
```

## 18.4 Decisiones diferidas

Fase 2:

```text
WhatsApp Business API como canal principal
backfill historico OECE/CONOSCE
billing
reportes de inteligencia historica
```

El schema debe soportar desde ya:

```text
source
source_dataset
source_year
```

## 19. Desarrollo recomendado

Orden:

```text
1. Convertir scripts SEACE en worker real.
2. Crear schema Postgres.
3. Implementar polling vigente cada 30 min.
4. Implementar upsert + hashes.
5. Implementar lifecycle worker para oportunidades guardadas.
6. Descargar PDFs temporalmente.
7. Comprimir preview y subir a R2.
8. Extraer con Gemini.
9. Validar JSON.
10. Crear golden set inicial.
11. Derivar summary.
12. Derivar facets.
13. Implementar diff summary/facets.
14. Crear UI feed basica.
15. Crear auth/users/tenants.
16. Crear perfil de empresa.
17. Implementar matching deterministico.
18. Mostrar semaforo y gaps.
19. Implementar notification_preferences.
20. Agregar alertas Telegram/email/in-app.
21. Observabilidad minima y contract test SEACE.
```

## 20. Principio tecnico

Mantener este limite claro:

```text
LLM para leer y estructurar.
Reglas para comparar.
LLM opcional para explicar.
```

Esto mantiene el sistema:

- barato
- rapido
- auditable
- escalable
- menos impredecible
