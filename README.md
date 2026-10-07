# Fuera del libreto

Una página web de tarjetas para conversar, sorprenderse y reír. Mil preguntas originales: 300 curiosas, 350 personales y 350 lúdicas, distribuidas en 20 temas.

## Jugar

La página abre directamente con una pregunta. Léesela a quien está contigo y cambien de turno. El botón «Siguiente pregunta» muestra otra carta.

El mazo evita repeticiones hasta agotarse. El avance se guarda localmente en el navegador; si el almacenamiento está bloqueado, el juego sigue funcionando durante la sesión. No hay cuentas, analíticas ni envío de respuestas.

## Desarrollo local

No hay dependencias que instalar ni compilación.

```sh
cd /workspace/Codex
node scripts/check.mjs
python3 -m http.server 4173 --bind 127.0.0.1
```

Abre el puerto 4173 en un navegador local. El servidor solo es necesario para desarrollo; GitHub Pages sirve los archivos directamente. Todos los recursos son locales y sus rutas son relativas para funcionar bajo `/Codex/`.

## Publicación en GitHub Pages

El workflow `.github/workflows/pages.yml` verifica las preguntas y publica la web después de cada push a `main`.

La primera vez, una persona con permisos de administración debe abrir **Settings → Pages → Build and deployment → Source** y elegir **GitHub Actions**. Si el primer workflow se ejecutó antes de activar Pages, vuelve a ejecutarlo desde **Actions → Publicar Fuera del libreto → Run workflow** sobre `main`.

La dirección prevista es **https://simplementehh.github.io/Codex/**. Se considera publicada solo cuando el workflow termine correctamente y esa dirección responda con el juego.

GitHub Pages es gratuito para repositorios públicos en GitHub Free. No hace falta comprar un dominio, configurar claves ni contratar servidores.

## Estructura

- `index.html`: página y diálogo de instrucciones.
- `styles.css`: cartas verticales en azul y durazno, adaptables a pantallas pequeñas.
- `app.js`: cambio animado de preguntas, sorteo sin repetición y persistencia local.
- `data/questions.js`: catálogo completo, sin preguntas generadas al jugar.
- `scripts/check.mjs`: validación del catálogo y los recursos públicos.

Para editar una tarjeta conserva su identificador. Revisa claridad y diferencias de contenido, además de ejecutar la validación. Los controles se pueden utilizar con teclado y las animaciones respetan la preferencia de movimiento reducido.

## Criterio para escribir preguntas

La revisión editorial del 6 de octubre de 2026 cubrió las 1.000 tarjetas y reescribió 727 preguntas. Los identificadores se conservaron para mantener el avance guardado.

- Usa español natural para conversar en Chile: ropa, pieza, celular, arrendar. No agregues modismos a la fuerza.
- Cada tarjeta debe entenderse al leerla en voz alta, sin explicar una metáfora o una regla inventada.
- El humor puede ser absurdo, pero la situación debe ser fácil de imaginar. Prefiere personas, anécdotas y una sola condición hipotética.
- Evita acertijos, situaciones fantásticas encadenadas y objetos que deban declarar, negociar o explicar sus intenciones.
- No repitas la misma pregunta cambiando solo unas palabras. Revisa también los temas cercanos, no únicamente los duplicados exactos.
- Conserva preguntas curiosas y personales que ya sean claras. No hay que convertir todo en un chiste.

Al publicar una revisión, actualiza el parámetro de versión de los recursos en `index.html` para que el navegador descargue el catálogo nuevo.
