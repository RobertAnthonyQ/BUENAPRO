# BuenaPro - Design Patterns

Version: v1.0  
Fecha: Julio 2026  
Objetivo: definir un sistema visual limpio, profesional y propio para BuenaPro.

## 1. Principio de diseño

BuenaPro no debe sentirse como una landing page ni como un dashboard BI pesado. Debe sentirse como una herramienta de trabajo diaria: clara, rapida de escanear y con IA visible solo donde ayuda a decidir.

Reglas base:

- Mostrar primero lo accionable, no todo lo disponible.
- Usar poco texto en listas y tablas; el detalle largo vive dentro del detalle de oportunidad.
- La IA debe resumir y priorizar, no llenar la pantalla.
- El feed principal debe poder leerse en 5 segundos.
- El diseño debe ser minimalista, con aire, bordes suaves y jerarquia clara.
- Nada de gradientes decorativos, blobs, hero sections, ilustraciones genericas o "SaaS azul" por defecto.

Inspiracion de estructura: herramientas limpias tipo licitaLAB, pero con identidad propia de BuenaPro.

## 2. Personalidad visual

Palabras clave:

- limpio
- cercano
- profesional
- operativo
- confiable
- sobrio
- poco ruidoso

No buscamos:

- futurista oscuro
- corporativo azul generico
- dashboard saturado
- marketing visual
- exceso de badges o cards

## 3. Paleta principal

La identidad recomendada es terracota + carbon. El terracota da calidez y diferencia sin copiar el turquesa/coral de otras plataformas. El carbon da seriedad y buena legibilidad.

### Light mode

```text
brand-primary        #C94A3A  Terracota principal
brand-primary-hover  #A93D31
brand-primary-soft   #FFF1EE

accent-sage          #5B8C7A  Acento secundario moderado
accent-sage-soft     #EEF6F2

text-primary         #1F2328
text-secondary       #6B7280
text-muted           #9CA3AF

background-app       #FAFAF9
background-panel     #FFFFFF
background-subtle    #F5F5F4

border-default       #E7E5E4
border-strong        #D6D3D1
```

### Dark mode

Dark mode es alternativo, no default. Debe sentirse sobrio, no gamer ni terminal.

```text
dark-background-app    #111315
dark-background-panel  #181B1F
dark-background-subtle #20242A

dark-border-default    #2A2F35
dark-border-strong     #3A414A

dark-text-primary      #F3F4F6
dark-text-secondary    #9CA3AF
dark-text-muted        #6B7280

dark-brand-primary     #D26454
dark-brand-soft        #321D1A
dark-accent-sage       #7BA291
```

### Semaforo funcional

Estos colores no son marca; son estados funcionales. No usarlos para decorar.

```text
success       #16A34A
success-soft  #EAF7EE

warning       #D97706
warning-soft  #FFF7E6

danger        #DC2626
danger-soft   #FDECEC

review        #64748B
review-soft   #F1F5F9
```

Regla: el terracota de marca no debe usarse para "error". Error real usa `danger`.

## 4. Tipografia

Usar una tipografia sans limpia, legible y no demasiado expresiva.

Recomendacion:

```text
font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

Escala:

```text
display/page title   24px / 32px / 700
section title        18px / 26px / 700
table header         12px / 16px / 700
body                 14px / 22px / 400
body strong          14px / 22px / 650
caption              12px / 16px / 500
micro                11px / 14px / 600
```

Reglas:

- No usar letter spacing negativo.
- No escalar fuentes con viewport.
- Titulos cortos, no frases largas.
- En tablas truncar texto largo y mostrar detalle al abrir.

## 5. Espaciado

Base de 4px.

```text
space-1   4px
space-2   8px
space-3   12px
space-4   16px
space-5   20px
space-6   24px
space-8   32px
```

Uso:

- Sidebar icon rail: 64px ancho.
- Header superior: 64px alto.
- Padding de pagina: 24px.
- Padding de cards pequenas: 16px.
- Padding de tablas: 12px vertical, 14px horizontal.
- Gap entre secciones: 24px.

## 6. Bordes, radios y sombras

El producto debe verse limpio, no flotante ni decorativo.

```text
radius-sm  4px
radius-md  6px
radius-lg  8px
```

Reglas:

- Usar `8px` como maximo normal.
- No usar cards con esquinas muy redondas.
- No meter cards dentro de cards.
- Sombras muy sutiles solo para header, dropdowns y drawers.

Sombras:

```text
shadow-subtle  0 1px 2px rgb(31 35 40 / 0.06)
shadow-popover 0 8px 24px rgb(31 35 40 / 0.12)
```

## 7. Layout base

Estructura principal:

```text
Top header
Left icon rail
Main content
Optional right drawer
```

### Header

Debe incluir:

- BuenaPro wordmark
- switch/contexto: SEACE / Contratos Menores / futuro PAC
- busqueda global opcional
- estado de alertas
- usuario

Altura: 64px.

### Sidebar

Preferir icon rail angosto, no sidebar textual pesado.

Ancho:

```text
desktop: 64px
expanded optional: 220px
```

Items MVP:

```text
Inicio / Inbox
Oportunidades
Seguimiento
Perfil
Configuracion
Admin
```

El item activo usa `brand-primary-soft` + icono terracota.

### Main content

Max width fluido. No centrar en una columna angosta. Esta es una app operativa.

```text
padding: 24px
background: background-app
```

## 8. Iconografia propia

No depender de favicons ni iconos genericos de sitios externos. BuenaPro necesita una familia visual consistente.

Reglas:

- Usar iconos lineales de 1.75px o 2px de stroke.
- Esquinas y finales redondeados.
- Tamano base: 20px.
- Iconos dentro de botones: 18px.
- Iconos sidebar: 22px.
- Mantener una sola familia visual.

Se puede usar una libreria base como Lucide para implementacion inicial, pero con una capa propia:

- nombres propios de iconos
- stroke consistente
- wrappers de `IconButton`
- no mezclar varias librerias
- no usar iconos coloridos tipo favicon

Iconos recomendados por modulo:

```text
Inbox/Oportunidades  radar o target simple
Seguimiento          columnas o ruta
Perfil               credencial/persona
Configuracion        sliders
Admin                terminal/cuadro tecnico
Documentos           hoja simple
Alertas              campana
IA                   sparkle minimo, no magico/exagerado
```

Logo/imagotipo:

- Evitar simbolos genericos de check, lupa o grafico ascendente.
- Explorar un simbolo propio basado en "buena pro": sello, marca de evaluacion o cursor/documento.
- Debe funcionar en 24px para sidebar y favicon, pero no depender de favicon externo.

## 9. Botones

Variantes:

```text
primary      terracota solido
secondary    blanco con borde
ghost        transparente
danger       rojo funcional
icon         cuadrado 36-40px
```

Reglas:

- Primary solo para accion principal de pantalla.
- No mas de un primary por bloque visual.
- Botones con icono cuando la accion es comun: descargar, abrir, filtrar, guardar.
- Texto corto: `Abrir`, `Evaluar`, `Guardar`, `Descargar`.

## 10. Badges y estados

Badges pequenos, nunca protagonistas gigantes.

Veredictos:

```text
Verde   Cumple
Ambar   Te falta poco
Rojo    No conviene
Gris    Revisar
```

Estados SEACE:

```text
Vigente
En evaluacion
Culminado
Desierto
Adjudicado
```

Regla: en tablas, maximo 2 badges por fila. Si hay mas informacion, va al detalle.

## 11. Tablas

La tabla es la vista principal de oportunidades. Debe ser limpia y escaneable.

Columnas recomendadas para oportunidades:

```text
Codigo
Objeto
Entidad
Score
Falta
Cierre
Estado
Accion
```

Reglas:

- No poner descripcion completa en tabla.
- `Objeto` maximo 2 lineas.
- `Falta` debe ser ultra resumido: `1 perfil`, `SCTR`, `Experiencia`, `OK`.
- `Score` puede ser numero + mini anillo o chip.
- Filas de 64-84px, no mega cards.
- Hover suave con `background-subtle`.
- Fila seleccionada usa borde/linea terracota discreta.

## 12. Cards metricas

Usar solo para resumen superior.

Ejemplo:

```text
Nuevas          24
Te falta poco   8
Cierra hoy      5
Analizadas    247
```

Reglas:

- Cards pequenas.
- Sin parrafos.
- Icono lineal discreto.
- Numero dominante, label corto.

## 13. Detalle de oportunidad

El detalle debe resumir antes de mostrar el documento.

Layout recomendado:

```text
Header: codigo + entidad + estado

Resumen compacto:
  Veredicto
  Score
  Cierre
  Falta principal

Tabs:
  Resumen
  Requisitos
  Riesgos
  Documentos
  Chat
```

Primer bloque:

```text
Veredicto: Te falta poco
Score: 78
Falta: especialista GIS
Riesgo: penalidad 10%
```

Reglas:

- No mostrar todo el JSON.
- Evidencia textual expandible.
- PDF preview en tab o panel lateral, no siempre ocupando media pantalla.

## 14. Perfil y configuracion

Estas pantallas deben ser formulario limpio, no dashboard.

Patron:

```text
Tabs horizontales de linea de negocio
Secciones por capacidad
Campos simples
Chips de keywords/segmentos/regiones
Boton "Configurar con IA" como accion secundaria destacada
```

Secciones:

```text
Identidad
Lineas de negocio
Experiencia
Equipo
Equipamiento
Seguros y certificaciones
Alertas
```

## 15. Admin tecnico

Admin puede ser mas denso. No define el estilo comercial del producto.

Reglas:

- Tablas tecnicas permitidas.
- Usar el mismo sistema visual.
- Badges de status claros.
- No mezclar estilos oscuros o terminal salvo logs.

## 16. Microcopy

Textos cortos y utiles.

Preferir:

```text
Te falta poco
Cumples
Revisar
Cierra hoy
Agregar perfil
Descargar TDR
```

Evitar:

```text
Analisis avanzado impulsado por inteligencia artificial
Optimiza tus oportunidades con nuestro motor
Explora todo el potencial de...
```

## 17. Dark mode

Dark mode debe ser opcion de usuario.

Reglas:

- No invertir colores automaticamente.
- Reducir saturacion del terracota.
- Mantener contraste AA.
- Tablas con bordes visibles pero suaves.
- Semaforo funcional igual que light mode, con fondos oscuros suaves.

## 18. Implementacion CSS recomendada

Usar tokens CSS:

```css
:root {
  --color-brand: #c94a3a;
  --color-brand-hover: #a93d31;
  --color-brand-soft: #fff1ee;
  --color-accent: #5b8c7a;
  --color-bg: #fafaf9;
  --color-panel: #ffffff;
  --color-text: #1f2328;
  --color-muted: #6b7280;
  --color-border: #e7e5e4;
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
}
```

Dark mode:

```css
[data-theme="dark"] {
  --color-brand: #d26454;
  --color-brand-soft: #321d1a;
  --color-accent: #7ba291;
  --color-bg: #111315;
  --color-panel: #181b1f;
  --color-text: #f3f4f6;
  --color-muted: #9ca3af;
  --color-border: #2a2f35;
}
```

## 19. Checklist de revision visual

Antes de aceptar una pantalla:

- Se entiende en 5 segundos que accion tomar.
- No hay parrafos largos en tablas/listas.
- No hay mas de un primary button por bloque.
- Los iconos pertenecen a una sola familia.
- Los colores de semaforo no compiten con la marca.
- El texto no se corta mal en mobile.
- Las tablas siguen siendo legibles en 13-14px.
- No hay cards dentro de cards.
- No hay gradientes decorativos.
- No parece una copia de licitaLAB, aunque comparta limpieza estructural.

