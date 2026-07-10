# Neon Drift (car-race)

Carrera 2D top-down con estilo neon. Modo solo = contrarreloj (mejorar el mejor
tiempo local); modo sala = todos corren el mismo circuito con posiciones en vivo.

## Mecanicas

- **Manejo grip realista** ([Car.ts](game/Car.ts)): la velocidad se guarda como
  vector `(vx, vy)` y cada frame se descompone en avance + lateral. El agarre
  lateral alto (`GRIP_ON`) amortigua rapido el componente transversal (trazada
  limpia); a alta velocidad el grip baja (`GRIP_SPEED_FALLOFF`) y aparece un
  derrape sutil.
- **Paredes en el borde** ([Game.ts](game/Game.ts) `applyWalls`): el asfalto es
  cerrado; si el auto se pasa del ancho (`width/2 - WALL_MARGIN`) se lo reubica al
  borde y se anula la velocidad hacia afuera. No hay pasto: no se puede cortar
  camino ni meterse en el hueco entre dos tramos. El cordon brillante al filo del
  asfalto es la lectura visual de la pared.
  - **Gotcha**: la normal de la pared apunta HACIA AFUERA (del centro al auto),
    convencion OPUESTA a `Car.bounce` (pensada para obstaculos, normal hacia el
    auto). Por eso `applyWalls` maneja la velocidad inline: anula el componente
    solo cuando `vn > 0` (empuja hacia afuera). Usar `Car.bounce` aca pegaba el
    auto a la pared (no podia despegarse) y era la causa del "no puedo avanzar".
- **Geometria de pistas verificada**: los trazados por waypoints estan chequeados
  para que el radio de curvatura minimo sea mayor que el medio ancho (el borde
  interno no colapsa) y sin autointersecciones, y ademas se simulo el manejo real
  (fisica + paredes) para confirmar que ningun circuito atrapa al auto. Al editar
  waypoints o anchos hay que re-verificar (una horquilla mas cerrada que el medio
  ancho vuelve a trabar).
- **Circuitos por spline** ([tracks.ts](game/tracks.ts)): cada `TrackDef` define
  los nodos de control de una spline Catmull-Rom cerrada de dos formas posibles:
  `nodes` polares `[anguloGrados, radio]` con angulos crecientes (no se
  autointersecta; usado por las 3 pistas proceduraes) o `waypoints` cartesianos
  libres `[x, y]` (se auto-centran en su centroide) para reproducir trazados
  reales que se doblan sobre si mismos. 3 circuitos estan **trazados sobre pistas
  de F1**: `monaco` (callejero angosto trazado sobre Montecarlo, con horquilla
  lenta), `silverstone` (sweeps + esses tipo Maggotts/Becketts) y `shanghai`
  (semi-fiel: su recta trasera larga + horquilla; el "snail" de entrada real es
  imposible como loop cerrado sin autointersecarse, asi que va como curva simple).
  6 circuitos en total, cada uno con su `themeId`. La `curvature[]` por punto
  ubica los hazards. Constraint clave: el radio de curva minimo debe superar el
  medio ancho (si no, el borde interno colapsa y las paredes traban al auto).
- **`progressAt` con continuidad**: proyectar la posicion sobre la centerline usa
  un `hint` (el `s` del frame anterior) y busca solo en una ventana alrededor, no
  el global mas cercano. Sin esto, en tramos donde el circuito pasa cerca de si
  mismo (espiral de Shanghai) el progreso saltaria al tramo equivocado y romperia
  la logica de vueltas. Sin hint (largada) hace busqueda global.
- **`trackPreview(index)`**: genera un path SVG normalizado del trazado para la
  miniatura de cada chip del selector.
- **Temas visuales** ([themes.ts](game/themes.ts)): 6 paletas (city, space,
  desert, ice, jungle, volcano) con gradiente de fondo + backdrop decorativo
  (grid, estrellas, dunas, hielo, follaje, brasas). Solo cambian colores/adornos,
  no la geometria.
- **Obstaculos deterministas** ([obstacles.ts](game/obstacles.ts)):
  `buildObstacles(track, seed)` recorre el circuito con **densidad alta** y
  coloca **boost pads** al centro de las rectas, **barreras** parciales a un lado
  (rebote solido), **chicanes** de conos en diagonal cruzando media pista, y
  filas de **conos** sobre el borde interno de las curvas (incluidas las medias). Todo sale de un PRNG mulberry32 sembrado, asi en sala todos ven el
  mismo layout. El **boost** no es un salto instantaneo: `Car.applyBoost` solo
  arranca un timer y `Car.update` aplica `BOOST_ACCEL` sostenido (evita el tiron
  visual que daba el kick de velocidad).
- **Selector de circuito** ([Hud.ts](game/Hud.ts) `buildMapSelector`): en modo
  solo el overlay muestra un chip por circuito con **miniatura SVG del trazado**;
  `onSelectMap` reconstruye la pista y la previsualiza detras del menu.
- **Votacion de circuito en sala** ([Game.ts](game/Game.ts) `startMapVote`):
  antes de largar, todos votan el circuito. Los votos viajan por
  [RaceChannel](game/RaceChannel.ts) (eventos `vote`/`map`, broadcast efimero, sin
  DB). El **anfitrion** (por `host` de la sala) cierra cuando votaron todos o al
  vencer el tope (`MAP_VOTE_MS`), computa el ganador (`tallyWinner`: mas votos,
  empate/0 votos al azar por `seed`) y lo anuncia con `sendMap`; el resto lo
  aplica al recibir `map`. Fallback del no-host si no llega el anuncio: recomputa
  el mismo `tallyWinner()` (determinista, mismos votos + seed), no un mapa
  arbitrario. El `obstacleSeed` sigue saliendo de `hashStr(code:round)`, asi el
  layout de hazards es igual para todos sobre el circuito votado. Gotcha: un
  jugador que entra **tarde** (mitad de carrera / espectador) no tiene los votos
  y cae al mapa por defecto por seed, que puede no ser el votado.
- **Flechas de direccion** ([Renderer.ts](game/Renderer.ts) `drawDirectionArrows`):
  chevrons sutiles repartidos por distancia sobre la centerline (`track.pointAt`),
  apuntando en el sentido de avance (tangente de la spline), para que se lea hacia
  donde correr. Se saltan cerca de la meta para no pisar la grilla de largada.
- **Ranking por circuito**: cada pista tiene su propia tabla global. `car-race`
  declara `variants` (los 6 `id` de pista) en [meta.ts](meta.ts);
  `finishRace` llama `hud.showRanking("car-race", ms, track.def.id)` y la landing
  ofrece el selector de variante automaticamente. En el overlay, el ranking
  **sigue al circuito elegido en el selector**: `onSelectMap` re-renderiza el
  ranking de esa pista (solo lectura, salvo el circuito recien corrido, que
  muestra el puntaje via `lastResult`). El **mejor tiempo local** tambien es por
  circuito (`car-race:best:<id>`, ver `bestKey()`).
- **Colisiones y derrape** ([Game.ts](game/Game.ts)): `handleCollisions` maneja
  boost (envion en el flanco de entrada), barreras (capsula: empuje fuera +
  `Car.bounce`) y conos (`Car.slowDown` con cooldown + golpe visual).
  `recordSkids` deja marcas de goma cuando `car.slip` es alto, que se desvanecen.

## Seed

`setupTrack(idx, seed)` recibe el indice de pista y deriva el layout de
obstaculos (`hashStr("obs:"+seed)`). Solo: idx elegido en el menu, seed aleatorio
por carrera. Sala: el `seed` es `hashStr(code + ":" + round)` (determinista para
todos, fija los hazards y el mapa por defecto), pero el **indice de pista sale de
la votacion**, no del seed.

## Camara y render

Camara **suavizada** con estado propio en el Renderer (`this.cam`): persigue al
auto con un ease y un look-ahead minimo (`v * 0.09`), en vez de saltar con la
velocidad cruda; asi los envones del boost no producen tirones. `snapCamera()`
reencuadra sin paneo cuando el auto se reposiciona en la grilla. Leve zoom-out a
alta velocidad, tambien interpolado. Minimapa con la traza, los boosts y todos
los autos. Autos con brillo neon, faros, aleron y llama de boost.

## Tuning (constants.ts)

`ENGINE_ACCEL`, `MAX_SPEED`, `GRIP_ON/OFF`, `GRIP_SPEED_FALLOFF`, `TURN_RATE`,
`BOOST_*`, `CONE_SLOW`, `BARRIER_RESTITUTION`. El umbral de derrape para las
marcas (`car.slip > 45`) esta en `recordSkids`.

## Countdown

Cumple el patron obligatorio Enter-para-empezar 3/2/1/YA (estado `countdown` +
`Hud.showCountdown`). En sala arranca solo tras cerrarse la votacion de circuito
(estado `mapvote` -> `countdown`), sin que cada jugador tenga que tocar Enter.

## Modo sala: F5 no reinicia la carrera

La carrera (circuito votado, vuelta, instante de largada) se persiste en
`sessionStorage` via `src/shared/room/roomRun.ts`, al largar (`go`) y en cada
vuelta. El resume se engancha donde el loop larga la votacion (estado `loading` +
sala en `playing`): si hay snapshot, se saltea la votacion (ya paso) y se retoma.

- **El reloj no se reinicia**: `startEpoch` es reloj de pared, y al retomar
  `startTime = performance.now() - (Date.now() - startEpoch)`. Sin esto, recargar
  medía el tiempo desde la recarga y **mejoraba** el resultado, porque el ranking
  es `direction: "lower"`. Recargar ahora cuesta el tiempo real que tardo.
- **El auto vuelve a la grilla** y hay que rehacer los sectores de la vuelta en
  curso: recargar es castigo, no atajo. No se serializa posicion ni velocidad.
- **Gotcha:** `setupTrack` -> `placeAtGrid` ya deja `lap` en 0, `sectors` limpios y
  `prevS` **justo antes de la meta** (~0.98). `resumeSavedRun` solo pisa `lap`: si
  ademas pusiera `prevS = 0`, la deteccion de cruce de meta
  (`prevS > 0.9 && s < 0.1`) no dispararia y la vuelta no cerraria nunca.
- `finishRace` limpia el snapshot.
