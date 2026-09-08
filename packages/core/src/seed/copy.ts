import type { Locale } from "../actor.ts";

type PostCopy = { title: string; body: string };
type PlanCopy = { happening: string; bring: string };

const posts: Record<string, Record<Locale, PostCopy>> = {
  post_garden: {
    en: {
      title: "Garden morning",
      body: "We planted herbs and watered the boxes. The class sang while they worked.",
    },
    "pt-PT": {
      title: "Manha no jardim",
      body: "Plantamos ervas e regamos as caixas. A turma cantou enquanto trabalhava.",
    },
  },
  post_oak: {
    en: {
      title: "Reading corner",
      body: "Oak P. read the weather chart to the group. Quiet, clear, and kind.",
    },
    "pt-PT": {
      title: "Canto da leitura",
      body: "Oak P. leu o mapa do tempo ao grupo. Calmo, claro e amavel.",
    },
  },
  post_assembly: {
    en: {
      title: "Friday assembly",
      body: "Short assembly on Friday morning. Thumbs up when you have read this. We will sing one song, share the garden note, and send everyone home on time. Bring a calm voice and your library bag if it is Thursday.",
    },
    "pt-PT": {
      title: "Assembleia de sexta",
      body: "Assembleia curta na sexta de manha. Polegar para cima quando leres isto. Vamos cantar uma cancao, partilhar a nota do jardim e sair a horas. Traz uma voz calma e o saco da biblioteca se for quinta.",
    },
  },
  post_music: {
    en: {
      title: "Music circle",
      body: "River R. kept a quiet beat on a wood block. The class listened.",
    },
    "pt-PT": {
      title: "Canto da musica",
      body: "River R. manteve um ritmo calmo no bloco de madeira. A turma ouviu.",
    },
  },
  post_boxes: {
    en: {
      title: "Garden boxes",
      body: "Garden boxes after watering. Caption only. No faces close up.",
    },
    "pt-PT": {
      title: "Caixas do jardim",
      body: "Caixas do jardim depois de regar. So a legenda. Sem caras ao perto.",
    },
  },
  post_voice: {
    en: {
      title: "Garden listen",
      body: "We stood still and heard the water on the boxes.",
    },
    "pt-PT": {
      title: "Ouvir o jardim",
      body: "Ficamos quietos e ouvimos a agua nas caixas.",
    },
  },
};

const plan: Record<Locale, PlanCopy> = {
  en: {
    happening: "Garden visit after snack. If it rains we stay in the art room.",
    bring: "Hat, water bottle, and a change of socks.",
  },
  "pt-PT": {
    happening:
      "Visita ao jardim depois do lanche. Se chover ficamos na sala de artes.",
    bring: "Chapeu, garrafa de agua e um par de meias extra.",
  },
};

const updates: Record<string, Record<Locale, string>> = {
  upd_road: {
    en: "The road by the gate is closed. Leave ten minutes early.",
    "pt-PT": "A estrada do portao esta fechada. Sai dez minutos mais cedo.",
  },
  upd_library: {
    en: "Thursday: bring the library bag.",
    "pt-PT": "Quinta: leva o saco da biblioteca.",
  },
};

export function localizeSeedPost(
  id: string,
  locale: Locale,
  fallback: { title: string | null; body: string },
): { title: string | null; body: string } {
  const copy = posts[id]?.[locale];
  if (!copy) {
    return fallback;
  }
  return copy;
}

export function localizeSeedPlan(
  locale: Locale,
  fallback: { happening: string | null; bring: string | null },
): { happening: string | null; bring: string | null } {
  const copy = plan[locale];
  if (!copy) {
    return fallback;
  }
  return copy;
}

export function localizeSeedUpdate(
  id: string,
  locale: Locale,
  fallback: string,
): string {
  return updates[id]?.[locale] ?? fallback;
}

const excursions: Record<string, Record<Locale, string>> = {
  exc_garden: {
    en: "Garden visit after snack. One tap if your child may go.",
    "pt-PT":
      "Visita ao jardim depois do lanche. Um toque se o teu filho pode ir.",
  },
};

export function localizeSeedExcursion(
  id: string,
  locale: Locale,
  fallback: string,
): string {
  return excursions[id]?.[locale] ?? fallback;
}
