# AGENTS.md - BuenaPro

## Regla principal

Cada vez que un agente complete una tarea del proyecto, debe marcar el checkbox correspondiente en `tasks/`.

No se considera terminada una tarea si el checkbox no fue actualizado.

## Flujo obligatorio

1. Antes de trabajar, revisar `tasks/README.md`.
2. Identificar el archivo de tareas correspondiente:
   - `tasks/01-database.md`
   - `tasks/02-worker.md`
   - `tasks/03-backend-web.md`
   - `tasks/04-qa.md`
   - `tasks/05-frontend.md`
3. Implementar la tarea.
4. Validar con prueba manual o automatizada.
5. Marcar el checkbox de la tarea completada.
6. Si aparece una tarea nueva necesaria, agregarla al archivo adecuado.

## Uso de subagentes

Usar subagentes cuando una tarea sea repetitiva, paralelizable o requiera revisar muchos elementos similares.

Casos esperados:

- probar varios endpoints o variantes de payload
- revisar multiples PDFs, JSONs o golden cases
- auditar varios archivos de tareas o documentacion
- validar varias rutas/API endpoints
- comparar modulos similares del worker, backend o UI

Reglas:

- el agente principal sigue siendo responsable de integrar resultados
- el agente principal valida antes de marcar checkboxes
- no delegar decisiones de arquitectura sin revisar el resultado
- no marcar una tarea como completa solo porque un subagente reporto avance

## Criterios de done

Una tarea solo puede marcarse como completa si:

- el cambio esta implementado
- se verifico que funciona
- no rompe el flujo existente
- se actualizo documentacion si aplica
- no quedan secretos hardcodeados

## Seguridad

- No guardar API keys en el repo.
- Usar `.env.local` para secretos.
- No loggear datos personales innecesarios.
- No indexar DNIs salvo que sea estrictamente necesario para un requisito.

## Arquitectura

Principio tecnico:

```text
LLM para leer y estructurar.
Reglas para comparar.
LLM opcional para explicar.
```

PostgreSQL es la fuente de verdad. R2 guarda previews/documentos auxiliares. SEACE conserva el PDF original descargable por URL.

## Alcance MVP de ingesta

El worker inicial no debe intentar procesar todo SEACE.

Alcance operativo inicial:

- estado SEACE: solo `Vigente` (`lista_estado_contrato=2`)
- objeto SEACE: solo `Servicio` (`lista_codigo_objeto=2`)
- segmentos CUBSO: solo los configurados para tecnologia, transporte y legal

Los segmentos CUBSO no deben quedar hardcodeados en la logica. Deben salir de configuracion, base de datos o una lista versionada facil de cambiar.

## Desarrollo frontend

Antes de crear o modificar una vista, leer:

- `docs/design-patterns.md`
- las imagenes de referencia en `docs/brand/generated/`
- `docs/frontend/README.md`
- el documento especifico de la vista en `docs/frontend/`
- `tasks/05-frontend.md`
- `.agents/skills/frontend-design/SKILL.md` cuando la tarea cambie UI, layout, colores, tipografia, componentes visuales o experiencia de usuario
- `.agents/skills/web-design-guidelines/SKILL.md` cuando la tarea implique auditar, revisar o cerrar una vista frontend
- `~/.codex/skills/ui-ux-pro-max/SKILL.md` cuando se vaya a planear, rediseñar, revisar o mejorar UI/UX de producto
- `~/.codex/skills/impeccable/SKILL.md` cuando se vaya a diseñar, rediseñar, auditar, pulir o criticar cualquier interfaz frontend

Reglas:

- trabajar por dominios dentro de `apps/web/features`
- mantener `apps/web/app/*/page.tsx` delgado
- cada componente no trivial debe tener carpeta propia
- cada componente debe tener `Component.tsx`, `Component.module.css` e `index.ts`
- no crear estilos globales para componentes nuevos
- conectar cada vista contra los endpoints documentados en su spec
- marcar checkboxes en `tasks/05-frontend.md` al completar

## Estándar visual obligatorio

La UI de BuenaPro debe tratarse como producto serio, no como maqueta funcional. Una vista que compila pero se ve cruda, generica o improvisada no esta terminada.

Mentalidad obligatoria para trabajo frontend:

- ser perfeccionista con jerarquia, espaciado, tipografia, ritmo, estados y densidad visual
- no aceptar el primer resultado funcional como resultado final
- hacer una segunda pasada de diseño despues de conectar datos reales
- reducir ruido visible: si una vista tiene demasiados controles, colapsar, agrupar o priorizar
- evitar tablas administrativas crudas cuando el usuario necesita decidir rapido
- cuidar la primera pantalla: debe comunicar producto, prioridad y accion sin parecer un panel tecnico
- los componentes deben sentirse parte de un sistema propio, no de un template SaaS generico
- usar iconografia consistente y con intencion; no depender de iconos o estilos por defecto que hagan la app indistinguible
- usar el sistema visual definido en `docs/design-patterns.md`; si el resultado no se parece a la direccion aprobada, corregir antes de cerrar
- tomar como referencia visual principal las imagenes aprobadas en `docs/brand/generated/`, especialmente:
  - `ref-login-premium-minimal.png`
  - `ref-opportunities-premium-minimal.png`
  - `ref-detail-premium-minimal.png`
- si una vista nueva no se parece en espiritu a esas referencias (premium, minimal, poco texto, mucho aire, controles precisos), no esta lista
- aplicar las prohibiciones de Impeccable: no `border-radius` exagerados en cards/inputs/sections, no ghost-cards de borde + sombra blanda grande, no gradient text, no decorative grid backgrounds, no glassmorphism decorativo, no stripes de fondo, no side-stripe borders como acento, no cards repetidas sin criterio
- para producto/dashboard, preferir familiaridad excelente sobre rareza sin proposito: el usuario debe confiar en la interfaz como herramienta de trabajo

Checklist de cierre visual para cualquier vista:

- layout revisado en desktop amplio, laptop y mobile
- textos largos probados con datos reales
- estados empty/loading/error contemplados
- filtros y acciones principales no saturan la pantalla
- contraste y foco de teclado revisados
- no hay cards dentro de cards ni bordes innecesarios
- no hay texto cortado, solapado o botones deformados
- la vista se compara contra el brief visual y se ajusta si se siente generica

## Capturas obligatorias para frontend

Toda tarea frontend que modifique una vista, layout o componente visual debe terminar con captura de pantalla.

Reglas:

- abrir la app local despues de implementar
- tomar al menos una captura desktop de la vista modificada
- si la vista es responsive o publica informacion densa, tomar tambien una captura mobile
- revisar la captura antes de marcar el checkbox
- si la captura evidencia una UI pobre, desbalanceada, saturada o distinta al diseño esperado, corregir y repetir captura
- guardar o referenciar la evidencia de QA cuando aplique en `tasks/05-frontend.md` o `tasks/04-qa.md`
- si el entorno no permite capturas, no marcar QA visual como completo; documentar explicitamente el bloqueo

Herramientas esperadas para capturas:

- Browser Plugin / navegador interno si esta disponible
- Playwright si esta instalado o si el proyecto ya lo usa
- screenshot manual del navegador como fallback

## Uso de skills de UI/UX

Para crear o rediseñar UI:

1. Leer y aplicar `.agents/skills/frontend-design/SKILL.md`.
2. Leer y aplicar `~/.codex/skills/ui-ux-pro-max/SKILL.md`.
3. Leer y aplicar `~/.codex/skills/impeccable/SKILL.md`; para BuenaPro usar su registro `reference/product.md` por tratarse de app/dashboard.
4. Ejecutar `context.mjs` de Impeccable una vez por sesion para recoger contexto del proyecto; si falta `PRODUCT.md`, continuar con codigo existente y sugerir inicializar contexto despues.
5. Generar o consultar una referencia de diseño con `ui-ux-pro-max/scripts/search.py` antes de codear cuando la tarea sea rediseño, nueva vista o sistema visual.
6. Definir una direccion visual concreta antes de codear: paleta, tipografia, layout, elemento distintivo y reglas de densidad.
7. Construir contra esa direccion, no solo contra funcionalidad.
8. Criticar el resultado con captura y ajustar.

Para revisar UI antes de cerrar:

1. Leer `.agents/skills/web-design-guidelines/SKILL.md`.
2. Leer `~/.codex/skills/ui-ux-pro-max/SKILL.md` si la revision es visual/UX.
3. Leer `~/.codex/skills/impeccable/SKILL.md` y aplicar su slop test sobre los archivos modificados.
4. Aplicar sus reglas sobre los archivos modificados.
5. Reportar o corregir hallazgos relevantes antes de marcar la tarea como completa.
