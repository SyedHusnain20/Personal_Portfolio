// Copy that rarely changes lives here. Projects, certificates and experience come from the database.

export function siteUrl(): string {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "https://hasnainzainulabdin.vercel.app";
}

export const SITE = {
  name: "Hasnain Zainulabdin",
  title: "Hasnain Zainulabdin | AI Developer & Software Engineer, Hyderabad",
  description:
    "Hasnain Zainulabdin is an AI developer and software engineer in Hyderabad, Sindh. I build RAG chatbots, LLM apps and FastAPI backends for clients worldwide.",
  email: "hasnainzainulabdin@gmail.com",
  whatsapp: "https://wa.me/923126641281",
  linkedin: "https://www.linkedin.com/in/hasnain-zainulabdin-65a33638b",
  github: "https://github.com/SyedHusnain20",
  portrait: "/assets/hasnain-portrait.png",
  portraitAlt: "Hasnain Zainulabdin, AI developer and software engineer from Hyderabad, Sindh",
};

export const NAV_LINKS: Array<[id: string, label: string]> = [
  ["work", "Work"],
  ["services", "Services"],
  ["about", "About"],
  ["experience", "Experience"],
  ["certifications", "Certifications"],
];

export const MARQUEE = [
  "RAG Pipelines",
  "LLM Apps",
  "Voice AI",
  "FastAPI Backends",
  "Vector Search",
  "NLP",
  "WhatsApp Bots",
  "Docker Deploys",
  "Prompt Engineering",
];

// [text, emphasised]
export const MANIFESTO: Array<Array<[string, boolean]>> = [
  [
    ["I turn scattered documents into ", false],
    ["assistants that answer with sources.", true],
  ],
  [
    ["I put LLMs on WhatsApp, on the web, and behind ", false],
    ["APIs that don't fall over.", true],
  ],
  [
    ["And I ship. ", false],
    ["Demos you can click,", true],
    [" not decks you have to believe.", false],
  ],
];

export const SERVICES = [
  {
    num: "01",
    title: "RAG chatbots & knowledge assistants",
    body: 'Turn your documents into an assistant that answers with sources. Semantic retrieval, grounded responses, and an honest "I don\'t know" instead of confident nonsense.',
    tech: "FAISS · LangChain · Llama 3 · Groq",
  },
  {
    num: "02",
    title: "LLM apps & AI chatbots",
    body: "Conversational products on WhatsApp, web, and voice. Everything from prompt design and guardrails to speech-to-text and text-to-speech pipelines.",
    tech: "WhatsApp API · Whisper · edge-tts · LangGraph",
  },
  {
    num: "03",
    title: "FastAPI backend APIs & deployment",
    body: "FastAPI services with auth, validation, and Docker deploys. The unglamorous plumbing of shipping AI, done right so your product stays up.",
    tech: "FastAPI · Pydantic · JWT · Docker",
  },
];

export const ABOUT_PARAGRAPHS = [
  "I'm a Software Engineering graduate from the University of Sindh, specialized in AI and data science. I got into this field to solve real problems with language models, retrieval systems, and automation. Not to make demos that die in a notebook.",
  "That's why everything I build is production-shaped from day one: proper APIs, proper error handling, deployed where you can actually use it.",
  "I'm based in Hyderabad, Sindh, Pakistan, and work as a software engineer and AI developer with local businesses and remote clients worldwide. If you're looking for an AI developer or software engineer in Hyderabad, get in touch below.",
];

export const ABOUT_CHECKS = [
  "Advanced RAG and vector search optimization with FAISS and semantic retrieval.",
  "High-performance APIs with FastAPI, Pydantic, and Python.",
  "Hands-on with Llama 3, Groq inference, Hugging Face, spaCy, and scikit-learn.",
  "Multi-model conversational AI for practical, real-world workflows.",
];

export const PROCESS = [
  ["Scope", 'A short call, a clear written plan, and an honest estimate. No vague "AI magic" promises.'],
  ["Build", "Weekly demos you can click, not status reports. You see the thing working, not slides about it."],
  ["Ship", "Deployed, documented, and handed over. You own the code and know how to run it."],
];

export const NAINI_SUGGESTIONS = [
  "What projects has Hasnain built?",
  "What tech stack does he use?",
  "How can I hire him?",
  "Tell me about ShariahEase",
];
