export const BEST_KEY = "final-sentence:best"; // mejor cantidad de frases superadas

export const COUNTDOWN_LABELS = ["3", "2", "1", "YA"];
export const COUNTDOWN_STEP = 0.75; // seconds
export const MAX_DT = 0.1; // capping delta time to avoid jumps on tab blur

/** El revolver tiene 6 recamaras. Balas cargadas / 6 = probabilidad de morir. */
export const CHAMBERS = 6;
/** Recamara vacia tras una frase perfecta (alivio). Se aplica antes del gatillo. */
export const CLEAN_SENTENCE_RELIEF = 1;
/** Penalidad si se acaba el tiempo con la frase incompleta. */
export const TIMEOUT_BULLETS = 2;

/** Tiempo por frase = (base + chars * porChar) escalado por la presion de la ronda. */
export const TIME_BASE = 2.4;
export const TIME_PER_CHAR = 0.42;
/** Cada ronda aprieta el tiempo un poco (piso en PRESSURE_FLOOR). */
export const ROUND_PRESSURE = 0.028;
export const PRESSURE_FLOOR = 0.58;
export const TIME_MIN = 4;

/** Presos al empezar (ambiente battle royale). Rango tipo sala real. */
export const SURVIVORS_MIN = 58;
export const SURVIVORS_MAX = 99;

/**
 * Puntaje combinado: frases superadas (primario) + PPM (desempate). Se codifica
 * en un solo numero para que el ranking (global y de sala) ordene primero por
 * frases y despues por velocidad, sin necesitar dos columnas. Ej: 7 frases a 62
 * ppm -> 7062. Tope de ppm a 999 para no pisar el siguiente escalon de frases.
 */
export const PPM_CAP = 999;

export function encodeScore(frases: number, ppm: number): number {
  return frases * (PPM_CAP + 1) + Math.min(PPM_CAP, Math.max(0, Math.round(ppm)));
}

export function decodeScore(score: number): { frases: number; ppm: number } {
  const n = Math.max(0, Math.round(score));
  return { frases: Math.floor(n / (PPM_CAP + 1)), ppm: n % (PPM_CAP + 1) };
}

/**
 * Frases objetivo por nivel de dificultad. Sin tildes ni enie ni signos, en
 * minusculas, para que cualquier teclado pueda escribirlas y el modelo de
 * tecleo sea un simple char-a-char. Van creciendo en largo y aspereza; las de
 * los ultimos niveles ocupan dos o tres renglones (la frase se acomoda sola).
 * El tono es el del thriller de supervivencia: hangar, revolver, cuenta atras.
 */
export const SENTENCE_TIERS: readonly (readonly string[])[] = [
  // Nivel 1 (rondas 1-3): cortas, un renglon.
  [
    "te despiertas en el hangar oscuro",
    "hay un arma apuntando a tu cabeza",
    "escribe rapido o vas a morir",
    "el guardia enmascarado no dice nada",
    "una sola bala espera en el tambor",
    "de esta sala no hay salida",
    "cada error carga otra bala",
    "el metal frio toca tu sien",
    "respira hondo y sigue escribiendo",
    "solo uno saldra vivo de aqui",
    "tus dedos tiemblan sobre las teclas",
    "el silencio pesa mas que el plomo",
    "no mires al soldado a los ojos",
    "la maquina espera tu proxima letra",
    "un paso en falso y todo termina",
  ],
  // Nivel 2 (rondas 4-7): medianas.
  [
    "la maquina de escribir cruje bajo la luz amarilla del techo",
    "los disparos lejanos marcan la caida de otro jugador nervioso",
    "no queda tiempo para pensar solo para escribir sin fallar",
    "el sudor cae por tu frente mientras el reloj rojo avanza",
    "un clic seco resuena y por ahora sigues con vida",
    "el hangar huele a aceite oxido y a miedo muy antiguo",
    "manten la calma o el gatillo va a hablar por vos",
    "cada frase es mas larga que la sentencia anterior",
    "los gritos de los demas se apagan uno por uno",
    "no bajes la mirada del papel ni un solo instante",
    "el percutor se tensa cada vez que dudas un segundo",
    "afuera nadie sabe que este lugar existe siquiera",
    "escribe como si tu vida entera dependiera de ello",
  ],
  // Nivel 3 (rondas 8-12): largas, suelen ocupar dos renglones.
  [
    "la unica arma que te queda son las palabras precisas que logres teclear a tiempo",
    "el canon del revolver sigue cada letra que escribes con una paciencia cruel y callada",
    "no hay segundas oportunidades ni vendas ni piedad para el que se equivoca de nuevo",
    "el temporizador rojo late en la pared como un corazon a punto de estallar en pedazos",
    "mientras mas rapido escribes mas cerca suena el metal del percutor detras de tu nuca",
    "los prisioneros que fallan caen al piso frio sin un solo lamento que valga la pena",
    "tu sentencia depende de la velocidad de tus manos y de una suerte que se agota deprisa",
    "el guardia inclina la cabeza y espera con calma el pequeno error que lo justifique todo",
  ],
  // Nivel 4 (rondas 13+): brutales, dos o tres renglones.
  [
    "en un mundo saturado de disparos y explosiones aqui el arma mas peligrosa resulta ser tu propia falta de precision al teclear bajo presion",
    "el eco de cada gatillo vacio te recuerda que la proxima bala podria ser la que termine para siempre con tu larga y silenciosa condena",
    "ninguna zona segura ninguna cura ningun escondite solo estas vos la maquina y el revolver que decide con frialdad si mereces seguir respirando",
    "la atmosfera opresiva del hangar convierte cada tecla que pulsas en una apuesta silenciosa entre la vida rapida y la muerte lenta y segura",
    "cuando creias que ya no quedaba nadie mas para caer una nueva frase aparece frente a tus ojos cansados exigiendo otra vez toda tu atencion",
  ],
];
