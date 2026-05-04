const WORDS = [
  // English
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "with", "is", "are", "was", "were",
  "of", "it", "that", "this", "my", "your", "i", "me", "you", "he", "she", "we", "they", "its", "im",
  "omitted", "media", "message", "deleted", "just", "like", "have", "has", "had", "from", "not", "all",
  // German
  "und", "oder", "aber", "ich", "du", "er", "sie", "wir", "ihr", "der", "die", "das", "ein", "eine",
  "ist", "sind", "war", "waren", "mit", "für", "auf", "im", "in", "am", "von", "zu", "nicht", "ja",
  // Spanish
  "y", "o", "pero", "yo", "tu", "el", "ella", "nosotros", "ellos", "de", "la", "las", "los", "un", "una",
  "es", "son", "fue", "eran", "con", "para", "en", "por", "que", "esto", "eso", "mi", "tu", "no", "si",
  // French
  "et", "ou", "mais", "je", "tu", "il", "elle", "nous", "vous", "ils", "de", "la", "le", "les", "un", "une",
  "est", "sont", "avec", "pour", "dans", "sur", "pas", "oui", "que", "ce", "cela", "mon", "ton",
  // Italian
  "e", "o", "ma", "io", "tu", "lui", "lei", "noi", "voi", "loro", "di", "il", "la", "lo", "gli", "le",
  "un", "una", "con", "per", "in", "su", "non", "si", "che", "questo", "quello", "mio", "tuo",
  // Extra filler/slang/noise
  "ok", "okay", "kk", "k", "yo", "yeah", "yep", "nope", "nah", "bro", "bruh", "lol", "lmao", "lmfao",
  "rofl", "haha", "hahaha", "hehe", "omg", "wtf", "idk", "ikr", "tbh", "btw", "thx", "thanks", "thank",
  "pls", "please", "sure", "fine", "cool", "nice", "true", "done", "soon", "later", "today", "tomorrow",
  "yesterday", "thing", "stuff", "text", "chat", "group", "guys", "man", "dude", "ass", "really", "very",
  "maybe", "perhaps", "actually", "literally", "basically", "honestly", "anyway", "alright", "right",
  "well", "also", "still", "even", "already", "again",
  // German filler
  "ok", "okay", "jo", "jap", "ne", "nee", "naja", "halt", "mal", "doch", "bitte", "danke", "gern",
  "heute", "morgen", "gestern", "sache", "zeug", "chat", "gruppe", "leute", "auch", "na", "also", "eben",
  "eigentlich", "wirklich", "schon", "noch", "wieder", "immer", "einfach", "halt", "so", "tja",
  "quasi", "irgendwie", "bisschen", "vielleicht", "klar", "genau",
  // Spanish filler
  "vale", "bueno", "pues", "hola", "gracias", "porfa", "claro", "listo", "hoy", "manana", "ayer",
  "cosa", "cosas", "gente", "chat", "grupo", "tambien", "ya", "todavia", "otra", "otravez", "quizas",
  "igual", "literalmente", "basicamente",
  // French filler
  "salut", "merci", "stp", "svp", "dac", "ok", "aujourdhui", "demain", "hier", "truc", "chose", "gens",
  "chat", "groupe", "aussi", "deja", "encore", "peutetre", "vraiment", "genre", "bref", "alors",
  // Italian filler
  "ciao", "grazie", "prego", "dai", "allora", "oggi", "domani", "ieri", "cosa", "cose", "gente", "chat",
  "gruppo", "anche", "gia", "ancora", "forse", "davvero", "proprio", "tipo", "comunque",
];

export const TOP_WORD_STOP_WORDS = new Set(WORDS);
