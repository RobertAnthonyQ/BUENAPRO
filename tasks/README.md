# BuenaPro - tareas

Este directorio contiene el backlog tecnico inicial del MVP.

## Documentos

- [01-database.md](./01-database.md): base de datos, migraciones, indices y seeds.
- [02-worker.md](./02-worker.md): worker SEACE, PDFs, Gemini, facets, matching y alertas.
- [03-backend-web.md](./03-backend-web.md): Next.js, auth, APIs, feed, perfil y seguimiento.
- [04-qa.md](./04-qa.md): pruebas, golden set, contract tests y smoke tests.
- [05-frontend.md](./05-frontend.md): sistema visual, vistas, componentes y conexion con backend.

## Orden sugerido

```text
1. Database
2. Worker ingesta basica
3. Backend APIs de lectura
4. Worker IA/facets/matching
5. UI feed/detalle/perfil
6. Alertas email/Telegram
7. QA completo
```

## Definicion de done

Una tarea se considera terminada solo si:

- el codigo esta implementado
- hay validacion minima manual o automatizada
- no rompe tareas anteriores
- la documentacion o README se actualizo si aplica
- el checkbox correspondiente fue marcado

## Regla operativa

Cada vez que se complete una tarea, marcar el checkbox en el archivo correspondiente.
