// lib/relaxContent.ts

export type RelaxContentKey = "safety_trust" | "dignity_worth" | "grief_grounding" | "safety_present";
export type RelaxLanguage = "hi" | "en";

export interface RelaxContent {
  key: RelaxContentKey;
  title: Record<RelaxLanguage, string>;
  prompts: Record<RelaxLanguage, string[]>;
}

export const RELAX_CONTENT_LIBRARY: Record<RelaxContentKey, RelaxContent> = {
  safety_trust: {
    key: "safety_trust",
    title: { hi: "Suraksha ka ek pal", en: "A moment of safety" },
    prompts: {
      hi: [
        "Jahan tum baithe ho, wahan ka support mehsoos karo — chair ya zameen tumhe pura thaam rahi hai.",
        "Apni saans ko utni hi gehri lo jitni tumhe theek lage — koi jaldi nahi hai.",
        "Agar chaho to apni ek haath ko doosre haath ke upar rakho — sirf apna warmth mehsoos karo.",
        "Yeh waqt sirf tumhara hai. Yahan koi tumse kuch nahi maang raha.",
        "Apne kandhon ko thoda dheela chhodo, jitna ho sake utna.",
        "Tum abhi surakshit ho. Isi pal me.",
      ],
      en: [
        "Notice the support beneath you — the chair or the ground is holding you fully.",
        "Let your breath be as deep as feels comfortable — there is no rush.",
        "If it feels okay, rest one hand over the other — just notice the warmth.",
        "This time is only yours. No one is asking anything of you here.",
        "Let your shoulders soften, just a little, as much as feels okay.",
        "You are safe right now, in this moment.",
      ],
    },
  },
  dignity_worth: {
    key: "dignity_worth",
    title: { hi: "Apne liye ek pal", en: "A moment for yourself" },
    prompts: {
      hi: [
        "Apni reedh ko seedha karo — yeh tumhara sharir hai, tumhara stance hai.",
        "Ek gehri saans lo aur socho: main jaisi/jaisa hoon, waisi/waisa kaafi hoon.",
        "Apne aas paas ki teen cheezein dekho jo tumhe apni lagti hain.",
        "Yeh pal tumhara hai — koi tumse yeh nahi cheen sakta.",
        "Apne haathon ko dekho — inhone kitna sambhala hai.",
        "Tumhari kahani tumhari hai, aur tum ismein akele nahi ho.",
      ],
      en: [
        "Let your spine lengthen — this is your body, your stance.",
        "Take a deep breath and think: I am enough, just as I am.",
        "Notice three things around you that feel like yours.",
        "This moment is yours — no one can take it from you.",
        "Look at your hands — think of all they have carried.",
        "Your story is your own, and you are not alone in it.",
      ],
    },
  },
  grief_grounding: {
    key: "grief_grounding",
    title: { hi: "Mehsoos karne ki jagah", en: "Space to feel" },
    prompts: {
      hi: [
        "Jo bhi mehsoos ho raha hai — udaasi, gussa, khaali pan — sab theek hai.",
        "Apni saans lete hue socho: main abhi bhi yahan hoon.",
        "Agar aansoo aayein to unhe aane do. Yeh kamzori nahi hai.",
        "Kisi apne ki yaad ko dil me rakho — woh yaad tumhare saath hai.",
        "Koi jaldi nahi hai kuch bhi mehsoos karne ki ya na karne ki.",
        "Tum akele nahi ho is pal me.",
      ],
      en: [
        "Whatever you're feeling — sadness, anger, emptiness — it's all okay.",
        "As you breathe, remind yourself: I am still here.",
        "If tears come, let them. That is not weakness.",
        "Hold the memory of someone close in your heart — it stays with you.",
        "There's no rush to feel anything in particular, or not feel it.",
        "You are not alone in this moment.",
      ],
    },
  },
  safety_present: {
    key: "safety_present",
    title: { hi: "Abhi, isi pal", en: "Right here, right now" },
    prompts: {
      hi: [
        "Apne aas paas dekho — abhi is pal me tum surakshit ho.",
        "Paanch cheezein dhoondo jo tum dekh sakte ho.",
        "Chaar cheezein jo tum chhoo sakte ho, apne aas paas.",
        "Teen cheezein jo tum abhi sun sakte ho.",
        "Apne paavon ko zameen par mehsoos karo — tum yahan grounded ho.",
        "Har saans ke saath thoda aur relax hone do apne kandhon ko.",
      ],
      en: [
        "Look around you — you are safe right now, in this moment.",
        "Find five things you can see around you.",
        "Notice four things you can touch nearby.",
        "Notice three things you can hear right now.",
        "Feel your feet on the ground — you are grounded here.",
        "With each breath, let your shoulders relax a little more.",
      ],
    },
  },
};

const CASE_TYPE_TO_CONTENT_KEY: Record<string, RelaxContentKey> = {
  "Sexual Assault": "safety_trust",
  "Caste-based Violence": "dignity_worth",
  "Caste-based Discrimination": "dignity_worth",
  "Discrimination": "dignity_worth",
  "Workplace Discrimination": "dignity_worth",
  "Murder of Family Member": "grief_grounding",
  "Threats and Intimidation": "safety_present",
};

const DEFAULT_CONTENT_KEY: RelaxContentKey = "safety_present";

export function getRelaxContentForCaseType(caseType?: string | null): RelaxContent {
  const key = (caseType && CASE_TYPE_TO_CONTENT_KEY[caseType]) || DEFAULT_CONTENT_KEY;
  return RELAX_CONTENT_LIBRARY[key];
}