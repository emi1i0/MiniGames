/**
 * Palabras extra que se suman al diccionario base (`an-array-of-spanish-words`,
 * ~636k palabras). Editar ESTE array para agregar palabras que el diccionario
 * base no tiene: jerga, regionalismos (voseo, lunfardo), terminos nuevos, etc.
 *
 * - Se normalizan igual que el resto (minuscula, se sacan acentos de vocales y la
 *   dieresis pero se conserva la ñ), asi que podes escribirlas con o sin tilde.
 * - Solo cuenta que sean >= 3 letras y solo letras [a-zñ] (frases con espacios o
 *   con simbolos se ignoran). Los verbos van en infinitivo.
 * - Sumar palabras las hace VALIDAS como respuesta; no cambia que fragmentos
 *   (silabas) se ofrecen como reto (eso depende de `MIN_WORDS_PER_FRAGMENT` en
 *   `dictionary.ts`; una lista corta no alcanza para crear un fragmento nuevo).
 * - Duplicados con el diccionario base son inofensivos (se deduplican), pero esta
 *   lista ya fue filtrada contra el base para dejar solo lo que faltaba.
 *
 * Tras editar, hay que **redeployar el server en Railway** para que tome los
 * cambios (el diccionario se arma al arrancar el proceso).
 */
export const EXTRA_WORDS: string[] = [
  // --- Regionalismos argentinos (filtrados contra el diccionario base) ---

  // Comida y bebida
  "birra",
  "fernet",
  "gancia",
  "hesperidina",
  "milanga",
  "morfi",
  "fugazza",
  "fugazzeta",
  "muzza",
  "muzzarella",
  "pastelito",
  "provoleta",
  "pochoclo",

  // Objetos y lugares
  "bondi",
  "bondazo",
  "kiosco",
  "kiosquero",
  "remis",

  // Lunfardo / jerga (sustantivos y adjetivos)
  "chabon",
  "chabona",
  "choborra",
  "chupi",
  "escabio",
  "escabiado",
  "flashero",
  "gede",
  "gedienta",
  "gilastrun",
  "groncho",
  "mamerto",
  "morfon",
  "ortiba",
  "patovica",
  "peda",
  "ranchada",
  "after",
  "garca",
  "fiacon",

  // Insultos / lunfardo fuerte
  "sorete",

  // Verbos (solo infinitivo)
  "apoliyar",
  "atorrar",
  "bardear",
  "buchonear",
  "cirujear",
  "escabiar",
  "flashar",
  "garcar",
  "junar",
];
