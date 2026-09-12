export interface ExerciseItem {
  id: string;
  title: string;
  titleHi: string;
  desc: string;
  descHi: string;
  time: string;
  timeHi: string;
  icon: string;
  tone: string;
  href: string;
}

export const EXERCISE_ITEMS: ExerciseItem[] = [
  {
    id: "breathe",
    title: "Breathe",
    titleHi: "साँस लें",
    desc: "A gentle rhythm to help your body soften.",
    descHi: "अपने शरीर को शांत और स्थिर करने के लिए एक सहज लय।",
    time: "2 min",
    timeHi: "2 मिनट",
    icon: "Wind",
    tone: "bg-[#e5f2ec] text-[#327d70]",
    href: "/survivor/breathe",
  },
  {
    id: "ground",
    title: "Ground",
    titleHi: "ज़मीन से जुड़ें (ग्राउंडिंग)",
    desc: "Notice what is around you, one sense at a time.",
    descHi: "अपने आस-पास क्या है, एक समय में एक इंद्री से महसूस करें।",
    time: "3 min",
    timeHi: "3 मिनट",
    icon: "Leaf",
    tone: "bg-[#f2ecd9] text-[#a47730]",
    href: "/survivor/ground",
  },
  {
    id: "relax",
    title: "Relax",
    titleHi: "विश्राम",
    desc: "A guided pause for a busy or tired mind.",
    descHi: "थके या अशांत मन के लिए एक निर्देशित ठहराव।",
    time: "5 min",
    timeHi: "5 मिनट",
    icon: "Moon",
    tone: "bg-[#eee8f5] text-[#8064a2]",
    href: "/survivor/relax",
  },
  {
    id: "listen",
    title: "Listen",
    titleHi: "सुनें",
    desc: "Soft audio spaces for whenever words feel too much.",
    descHi: "जब शब्द भारी लगें, तब के लिए सौम्य शांत ध्वनियाँ।",
    time: "4 min",
    timeHi: "4 मिनट",
    icon: "Ear",
    tone: "bg-[#f9e9e3] text-[#b26b55]",
    href: "/survivor/listen",
  },
  {
    id: "just-stay",
    title: "Just Stay",
    titleHi: "बस यहीं रहें",
    desc: "You do not have to talk right now.",
    descHi: "आपको अभी कुछ भी बोलने या समझाने की ज़रूरत नहीं है।",
    time: "Open space",
    timeHi: "शांत जगह",
    icon: "Sparkles",
    tone: "bg-[#dcebdd] text-[#0f766e]",
    href: "/survivor/just-stay",
  },
  {
    id: "understand",
    title: "Understand",
    titleHi: "समझें",
    desc: "Small, plain-language guides for hard days.",
    descHi: "मुश्किल दिनों के लिए सरल भाषा में मददगार मार्गदर्शिकाएँ।",
    time: "Read or listen",
    timeHi: "पढ़ें या सुनें",
    icon: "BookOpen",
    tone: "bg-[#e5eef5] text-[#5b8db8]",
    href: "/survivor/understand",
  },
];

export const MY_SPACE_ITEMS = [
  {
    href: "/survivor/case",
    titleEn: "My Case",
    titleHi: "मेरा केस",
    descEn: "Your case context, milestones, and support assignment.",
    descHi: "केस का विवरण, महत्वपूर्ण चरण और सहायता टीम।",
    tone: "bg-[#e4f0eb] text-[#2d7a70]",
    icon: "FileText",
  },
  {
    href: "/survivor/hope-vault",
    titleEn: "Hope Vault",
    titleHi: "उम्मीद की तिजोरी (Hope Vault)",
    descEn: "Keep the little things that remind you what matters.",
    descHi: "वे छोटी-छोटी बातें संभालें जो आपको हिम्मत देती हैं।",
    tone: "bg-[#fff0e5] text-[#b56e4e]",
    icon: "BookHeart",
  },
  {
    href: "/survivor/journey",
    titleEn: "My Journey",
    titleHi: "मेरी यात्रा",
    descEn: "See your check-ins, milestones, and moments of support.",
    descHi: "अपने चेक-इन, प्रगति के पड़ाव और मिले सहयोग को देखें।",
    tone: "bg-[#e8e4f2] text-[#8064a2]",
    icon: "History",
  },
  {
    href: "/survivor/privacy",
    titleEn: "Privacy & Control",
    titleHi: "गोपनीयता और नियंत्रण",
    descEn: "Understand your choices and manage monitoring.",
    descHi: "अपनी पसंद समझें और निगरानी स्थिति को प्रबंधित करें।",
    tone: "bg-[#e8eff4] text-[#5b8db8]",
    icon: "LockKeyhole",
  },
  {
    href: "/survivor/accessibility",
    titleEn: "Accessibility",
    titleHi: "सुलभता (Accessibility)",
    descEn: "Adjust text, contrast, motion, and voice guidance.",
    descHi: "टेक्स्ट साइज़, कंट्रास्ट और आवाज़ मार्गदर्शन बदलें।",
    tone: "bg-[#f1ecd9] text-[#9f7835]",
    icon: "SlidersHorizontal",
  },
  {
    href: "/survivor/taara",
    titleEn: "TAARA",
    titleHi: "तारा (TAARA)",
    descEn: "Open a quiet space with your gentle guide.",
    descHi: "अपनी सौम्य मार्गदर्शिका तारा के साथ शांत बातचीत करें।",
    tone: "bg-[#dff2ec] text-[#0f766e]",
    icon: "SlidersHorizontal",
  },
];

export const SUPPORT_ITEMS = [
  {
    href: "/survivor/support/counsellor",
    titleEn: "Talk to a counsellor",
    titleHi: "परामर्शदाता से बात करें",
    descEn: "Reach the person assigned to support your journey.",
    descHi: "आपकी सहायता के लिए नियुक्त विशेषज्ञ से बात या कॉल करें।",
    tone: "bg-[#e5f2ec] text-[#327d70]",
    icon: "PhoneCall",
  },
  {
    href: "/survivor/support/safe-circle",
    titleEn: "Safe Circle",
    titleHi: "सुरक्षित घेरा (Safe Circle)",
    descEn: "Prepare a trusted person to be there when you need them.",
    descHi: "किसी भरोसेमंद व्यक्ति को जोड़ें जो ज़रूरत पर साथ दे सके।",
    tone: "bg-[#fff0e5] text-[#b56e4e]",
    icon: "HeartHandshake",
  },
  {
    href: "/survivor/support/navigator",
    titleEn: "Support Navigator",
    titleHi: "सहायता नेविगेटर",
    descEn: "Find legal, medical, protection, and rehabilitation resources.",
    descHi: "कानूनी, चिकित्सा, सुरक्षा और पुनर्वास सहायता केंद्र खोजें।",
    tone: "bg-[#e8eef5] text-[#5b8db8]",
    icon: "MapPinned",
  },
  {
    href: "/survivor/support/community",
    titleEn: "You Are Not Alone",
    titleHi: "आप अकेले नहीं हैं",
    descEn: "A moderated anonymous community, off until you choose to enable it.",
    descHi: "सुरक्षित अनाम समुदाय, जो आपकी अनुमति के बिना चालू नहीं होता।",
    tone: "bg-[#eee8f5] text-[#8064a2]",
    icon: "UsersRound",
  },
];
