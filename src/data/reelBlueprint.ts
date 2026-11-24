export type BeatVisualMode =
  | "vapor_hourglass"
  | "eternity_crowd"
  | "earnest_silhouette"
  | "earnest_closeup"
  | "storm_stillness"
  | "eastern_sky_split"
  | "salvation_black";

export interface ReelBeat {
  id: string;
  index: number;
  title: string;
  startSec: number;
  endSec: number;
  visualMode: BeatVisualMode;
  imageUrl?: string;
  headlineLines: string[];
  highlightWords: string[];
  subline?: string;
  scriptureRef?: string;
  voiceoverText: string;
  voiceDirection: string;
  emotionalKeywords?: string[];
  performanceTip?: string;
  musicLevel: number;
  visualImpact: number;
  intensityLabel: string;
  isClimax?: boolean;
  sfxLabel: string;
  silenceBefore?: boolean;
}

export interface SocialPlatformCopy {
  id: "instagram" | "tiktok" | "youtube" | "facebook";
  name: string;
  recommendedLength: string;
  titleOrHook: string;
  caption: string;
  hashtags: string;
}

export const TOTAL_REEL_DURATION = 52;

export const INITIAL_BEATS: ReelBeat[] = [
  {
    id: "beat-vapor",
    index: 1,
    title: "Life Is But a Vapor",
    startSec: 0,
    endSec: 8,
    visualMode: "vapor_hourglass",
    imageUrl: "/src/assets/images/reel_vapor_hourglass_1795481235636.jpg",
    headlineLines: ["WHAT IS YOUR LIFE?", "IT IS A VAPOR..."],
    highlightWords: ["VAPOR..."],
    scriptureRef: "James 4:14",
    voiceoverText:
      "The Bible says our life is but a vapor that appears for a little time and then vanishes away.",
    voiceDirection: "Solemn, contemplative, unhurried narrator with deep gravity and warmth.",
    emotionalKeywords: ["solemn", "unhurried", "gravity"],
    performanceTip:
      "Begin with a solemn, unhurried cadence and quiet gravity. Let the word 'vapor' linger briefly before moving on.",
    musicLevel: 35,
    visualImpact: 42,
    intensityLabel: "Low Build",
    sfxLabel: "Cold wind & slow heartbeat (58 BPM)",
  },
  {
    id: "beat-eternity",
    index: 2,
    title: "Heaven or Hell",
    startSec: 8,
    endSec: 15,
    visualMode: "eternity_crowd",
    imageUrl: "/src/assets/images/reel_eternity_crowd_1795481236654.jpg",
    headlineLines: ["HEAVEN OR HELL."],
    highlightWords: ["HEAVEN", "HELL."],
    subline: "This life is temporary. Eternity is real.",
    voiceoverText:
      "This life is only temporary. But your soul will live on in one of two places: Heaven or Hell. For eternity.",
    voiceDirection: "Firm, sobering, deliberate pacing with emphasis on 'Heaven or Hell' and 'for eternity'.",
    emotionalKeywords: ["firm", "sobering", "deliberate"],
    performanceTip:
      "Keep your delivery firm and sobering. Take a deliberate half-second pause before 'Heaven or Hell' and 'for eternity'.",
    musicLevel: 62,
    visualImpact: 66,
    intensityLabel: "Rising Tension",
    sfxLabel: "Deep sub-bass eternity drone rising",
  },
  {
    id: "beat-wager",
    index: 3,
    title: "What If I'm Right?",
    startSec: 15,
    endSec: 22,
    visualMode: "earnest_silhouette",
    imageUrl: "/src/assets/images/reel_earnest_silhouette_1795481236096.jpg",
    headlineLines: ["WHAT IF I'M RIGHT...", "AND YOU'RE WRONG?"],
    highlightWords: ["RIGHT...", "WRONG?"],
    subline: "And that day comes, and it's too late?",
    voiceoverText:
      "And if you don't believe God is real, consider this: What if I'm right, and you're wrong? And that day comes, and it's too late?",
    voiceDirection: "Intimate, direct eye-contact tone, earnest and urgent without shouting.",
    emotionalKeywords: ["sincere", "intimate", "urgent"],
    performanceTip:
      "Drop the narrator polish and speak across the room—sincere, intimate, and urgent without raising your volume.",
    musicLevel: 22,
    visualImpact: 58,
    intensityLabel: "Music Drop-Out",
    sfxLabel: "Heartbeat stops; low drone drops away",
  },
  {
    id: "beat-plea",
    index: 4,
    title: "Why Didn't Anyone Tell Me?",
    startSec: 22,
    endSec: 31,
    visualMode: "earnest_closeup",
    imageUrl: "/src/assets/images/reel_earnest_silhouette_1795481236096.jpg",
    headlineLines: ['"WHY DIDN\'T ANYONE', 'TELL ME ABOUT JESUS?!"'],
    highlightWords: ["JESUS?!"],
    subline: "Please help me!",
    voiceoverText:
      "I want to see you in Heaven. I do not want you to turn to me and scream, 'Why didn't anyone tell me about Jesus?! Please help me!'",
    voiceDirection:
      "Soft and tender with love on 'I want to see you in Heaven', breaking into urgent, heartbroken desperation on the quoted cry.",
    emotionalKeywords: ["tender", "grief", "urgent"],
    performanceTip:
      "Soften into tender love on 'I want to see you in Heaven,' then let real grief and urgent pleading break through on 'Please help me!'",
    musicLevel: 8,
    visualImpact: 74,
    intensityLabel: "Raw Emotional Plea",
    sfxLabel: "Dead silence behind raw voice",
  },
  {
    id: "beat-silence-bird",
    index: 5,
    title: "The Stillness & Lone Bird",
    startSec: 31,
    endSec: 35,
    visualMode: "storm_stillness",
    imageUrl: "/src/assets/images/reel_storm_stillness_1795481237515.jpg",
    headlineLines: [],
    highlightWords: [],
    voiceoverText: "",
    voiceDirection: "Complete silence — no spoken voiceover.",
    musicLevel: 12,
    visualImpact: 20,
    intensityLabel: "Dead Silence",
    sfxLabel: "Total silence, then one lone bird chirps in the distance",
    silenceBefore: true,
  },
  {
    id: "beat-horn",
    index: 6,
    title: "The Eastern Sky Splits",
    startSec: 35,
    endSec: 44,
    visualMode: "eastern_sky_split",
    imageUrl: "/src/assets/images/reel_eastern_sky_split_1795481237294.jpg",
    headlineLines: ["THE EASTERN SKY", "SPLITS"],
    highlightWords: ["EASTERN", "SPLITS"],
    subline: "Every eye will see Him.",
    scriptureRef: "Revelation 1:7",
    voiceoverText: "",
    voiceDirection: "No speaking — let the rising Shofar & war horn fill the sky.",
    musicLevel: 100,
    visualImpact: 100,
    intensityLabel: "Peak Climax",
    isClimax: true,
    sfxLabel: "Massive Shofar & brass horn crescendo rising louder and louder",
  },
  {
    id: "beat-salvation",
    index: 7,
    title: "Today Is the Day of Salvation",
    startSec: 44,
    endSec: 52,
    visualMode: "salvation_black",
    headlineLines: ["TODAY IS THE DAY", "OF SALVATION."],
    highlightWords: ["SALVATION."],
    subline: "Seek Him today, while you still can. Jesus saves.",
    scriptureRef: "John 3:16 · 2 Corinthians 6:2",
    voiceoverText: "Today is the day of salvation. Seek Him today, while you still can. Jesus saves.",
    voiceDirection: "Reverent, clear, resolute call to action with lingering peace.",
    emotionalKeywords: ["reverent", "clear", "resolute"],
    performanceTip:
      "Enter reverent, clear, and resolute as the horn fades. Keep 'Jesus saves' steady so the invitation settles into the silence.",
    musicLevel: 30,
    visualImpact: 52,
    intensityLabel: "Reverent Resolve",
    sfxLabel: "Horn echo fading into warm celestial shimmer",
  },
];

export const VOICE_PRESETS = [
  { id: "Charon", label: "Charon", description: "Deep, solemn, commanding" },
  { id: "Fenrir", label: "Fenrir", description: "Urgent, resonant, earnest" },
  { id: "Kore", label: "Kore", description: "Warm, heartfelt, clear" },
  { id: "Puck", label: "Puck", description: "Direct, intimate, steady" },
] as const;

export const SOCIAL_EXPORT_COPY: SocialPlatformCopy[] = [
  {
    id: "instagram",
    name: "Instagram Reels",
    recommendedLength: "9:16 Vertical · 52s · 1080×1920",
    titleOrHook: "What if I'm right, and you're wrong?",
    caption: `"For what is your life? It is even a vapor that appears for a little time and then vanishes away." (James 4:14)

Your breath is temporary, but your soul is forever. There are only two destinations: Heaven or Hell.

If you don't believe in God, I ask you with all my heart: What if God's Word is true? What if I'm right and you're wrong?

I want to see you in Heaven. I don't ever want you standing on the other side of eternity screaming, "Why didn't anyone tell me about Jesus? Please help me!"

I am telling you today.

"Behold, now is the accepted time; behold, now is the day of salvation." (2 Corinthians 6:2)
"For God so loved the world that He gave His only begotten Son, that whoever believes in Him should not perish but have everlasting life." (John 3:16)

Share this with someone you love before time runs out.`,
    hashtags:
      "#JesusSaves #Eternity #SecondComing #John316 #DayOfSalvation #James414 #GospelTruth #ChristianReels #BeReady #JesusIsLord",
  },
  {
    id: "tiktok",
    name: "TikTok",
    recommendedLength: "9:16 Vertical · 52s · High-Contrast Captions",
    titleOrHook: "Wait for the silence before the horn. Will you be ready?",
    caption: `Life is a vapor (James 4:14). Eternity is forever. I want to see you in Heaven — seek Jesus today while you still can. John 3:16.`,
    hashtags:
      "#JesusSaves #ChristianTikTok #SecondComing #John316 #Eternity #Faith #Gospel #DayOfSalvation #BeReady",
  },
  {
    id: "youtube",
    name: "YouTube Shorts",
    recommendedLength: "9:16 Vertical · Under 60s",
    titleOrHook: "What If I'm Right and You're Wrong? | Jesus Saves (John 3:16)",
    caption: `"For what is your life? It is even a vapor that appears for a little time and then vanishes away." — James 4:14

This life is temporary, but your soul lives forever in Heaven or Hell. Today is the day of salvation (2 Corinthians 6:2). Seek Jesus while He may still be found.

"For God so loved the world that He gave His only begotten Son, that whoever believes in Him should not perish but have everlasting life." — John 3:16`,
    hashtags:
      "#Shorts #JesusSaves #John316 #SecondComing #Gospel #ChristianShorts #Eternity #Salvation",
  },
  {
    id: "facebook",
    name: "Facebook Reels",
    recommendedLength: "9:16 Vertical · 52s · Shareable Post",
    titleOrHook: "I want to see you in Heaven. Today is the day of salvation.",
    caption: `"For what is your life? It is even a vapor that appears for a little time and then vanishes away." (James 4:14)

I made this because I care about where you spend eternity. This world passes away quickly, but your soul lives on forever. I never want anyone I love to look back and ask why nobody told them about Jesus.

Today is the day of salvation. Seek Him today while you still can. Jesus saves (John 3:16).

Please share this message with someone who needs to hear it today.`,
    hashtags:
      "#JesusSaves #John316 #DayOfSalvation #GospelMessage #FaithReels #SecondComing #ChristianFaith",
  },
];
