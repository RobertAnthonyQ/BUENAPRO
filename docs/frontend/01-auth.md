# Vista 01 - Auth

## Objetivo

Permitir que el usuario cree o recupere su espacio de trabajo de forma rapida. Para MVP, el login por email existente es suficiente; la UI debe explicar poco y pedir solo lo necesario.

## Usuario

Proveedor o consultor que entra por primera vez. Quiere llegar al feed, no configurar una cuenta compleja.

## Rutas

```text
/login
/registro
```

## Flujo esperado

1. Usuario nuevo ingresa nombre, empresa, email y contraseña en `/registro`.
2. Backend crea usuario, tenant y membresia.
3. Usuario entra a `/onboarding`.
4. Configura empresa, líneas con keywords propias y capacidad mínima.
5. El sistema crea el perfil, encola matching y abre Oportunidades.

El login conserva únicamente email y contraseña. `/registro` no debe reutilizar valores demo ocultos.

## Onboarding inicial

Flujo de 4 pasos:

```text
Empresa y web opcional
  -> lineas de negocio + keywords por linea
  -> monto acreditable + equipo humano + recursos
  -> revision y activacion
```

La web pública es contexto opcional para sugerencias. La IA no guarda directamente: el usuario confirma y edita cada línea, sus segmentos CUBSO y sus keywords. Los códigos se restringen al catálogo 2026 y se muestran con nombre legible; si no tienen cobertura operativa actual, la UI lo indica. Regiones, certificaciones y detalle avanzado permanecen fuera del onboarding inicial.

## Componentes

```text
features/auth/components/AuthLayout/
features/auth/components/AuthForm/
features/auth/components/AuthError/
features/auth/components/TenantNameField/
```

## Formulario

Campos:

- Email.
- Nombre.
- Empresa/workspace.

Reglas:

- Boton principal claro.
- Error visible pero no dramatico.
- No pedir password mientras el backend use credentials simplificado.

## Backend

- `POST /api/auth/signin/email` o flujo NextAuth Credentials.
- Despues de login, verificar:
  - `GET /api/profile`
  - si `data = null`, sugerir completar perfil.

## Estados

- Cargando autenticacion.
- Error de credenciales.
- Usuario sin perfil.
- Redireccion exitosa.

## Criterios de done

- Login funciona con el provider actual.
- No muestra `Sign in failed` sin contexto.
- Mobile usable.
- No expone secretos ni tokens.
