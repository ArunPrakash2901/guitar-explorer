import type { Source } from "../research/types.js";
import type { SectionId, SourceId } from "./types.js";

export const sources: Readonly<Record<SourceId, Source & { label: string; url: string }>> = {
  recording: {
    id: "recording", type: "studio_audio", realizationId: "led-zeppelin-iv",
    label: "Studio recording",
    url: "https://www.youtube.com/watch?v=2KPEHohJMuw",
    reference: "Led Zeppelin · Black Dog (Remaster), official artist channel",
    locator: "Led Zeppelin IV, track 1",
    scope: "Reference for the audible arrangement, texture and performance.",
  },
  marty: {
    id: "marty", type: "specialist_analysis", realizationId: "marty-2016",
    label: "Marty Music tutorial",
    url: "https://www.youtube.com/watch?v=7Kuny6KGCpY",
    reference: "Marty Music · Led Zeppelin Black Dog Guitar Lesson + Tutorial (2016)",
    locator: "Owner-confirmed main song lesson",
    scope: "A practical interpretation with demonstrated fingering. Its tempo, positions and breakdown are tutorial choices.",
  },
  solo: {
    id: "solo", type: "specialist_analysis", realizationId: "solo-tutorial",
    label: "Outro solo tutorial",
    url: "https://youtu.be/ovFEtygtink",
    reference: "Led Zeppelin · Black Dog outro solo, third-party lesson",
    locator: "Video associated with the separately supplied four-page transcription",
    scope: "A separate performance and transcription reference. Compare its positions, articulations and ending with the studio fade.",
  },
  marin: {
    id: "marin", type: "specialist_analysis", realizationId: "marin-lesson",
    label: "Marin Music Center lesson",
    url: "https://www.youtube.com/watch?v=DnwU3uRjJbE",
    reference: "Marin Music Center · Black Dog guitar lesson",
    locator: "Alternate route near 7:05 and bridge demonstration near 33:00",
    scope: "A separate guitar lesson and a candidate cross-string route. The studio fingering remains unresolved.",
  },
  guitarforce: {
    id: "guitarforce", type: "specialist_analysis", realizationId: "guitarforce-lesson",
    label: "GuitarForce harmony lesson",
    url: "https://www.youtube.com/watch?v=ObgrCIETfxY",
    reference: "GuitarForce · Led Zeppelin Black Dog guitar lesson",
    locator: "Upper line demonstration near 10:35",
    scope: "A tutorial account of the added voice, with studio fingering and exact intervals open to listening review.",
  },
};

const identities = {
  entrance: "Entrance texture",
  response: "Vocal and guitar response",
  contrast: "Chorus contrast",
  bridge: "Bridge and return",
  groove: "Hey Baby groove",
  solo: "Solo and fade",
} as const;

type Section = Readonly<{
  id: SectionId;
  title: string;
  summary: string;
  identity: keyof typeof identities;
  variation: string;
}>;

/** Recording-order editorial map from the owner's implementation brief. */
export const sections: readonly Section[] = [
  { id: "SEC-01", title: "Intro", summary: "Guitar texture before the vocal and riff.", identity: "entrance", variation: "Texture sets up the first exposed entrance." },
  { id: "SEC-02", title: "Verse 1", summary: "The full vocal and guitar exchange.", identity: "response", variation: "The full call-and-response establishes the pattern. Listen for the displaced turnaround." },
  { id: "SEC-03", title: "Chorus 1", summary: "Power chords, bends and contrasting color.", identity: "contrast", variation: "The first chorus establishes the reference for the later return." },
  { id: "SEC-04", title: "Verse 2", summary: "A shortened return to call-and-response.", identity: "response", variation: "The familiar exchange returns in a shorter form before the bridge." },
  { id: "SEC-05", title: "Bridge 1", summary: "A change in space, color and band entrance.", identity: "bridge", variation: "Use this first bridge to hear what the later solo launch borrows." },
  { id: "SEC-06", title: "Chorus 2", summary: "The Hey Baby chordal groove and turnaround.", identity: "groove", variation: "Hear the roots move beneath the vocal. This chorus has its own groove." },
  { id: "SEC-07", title: "Verse 3", summary: "A familiar riff with an added guitar line.", identity: "response", variation: "Follow the familiar line first, then listen for a second voice." },
  { id: "SEC-08", title: "Chorus 3", summary: "Recognize the first chorus gesture on its return.", identity: "contrast", variation: "Compare its approach and exit with Chorus 1." },
  { id: "SEC-09", title: "Verse 4", summary: "A shortened verse leads into the final bridge.", identity: "response", variation: "Compare its abbreviated form with Verse 2 and anticipate the next entrance." },
  { id: "SEC-10", title: "Bridge 2", summary: "The bridge returns and sets up the solo.", identity: "bridge", variation: "The familiar setup now hands the lead role to the guitar." },
  { id: "SEC-11", title: "Outro solo", summary: "Phrases, register changes, articulation and the fade.", identity: "solo", variation: "Hear the guitar take the lead over the outro and compare the fade with a lesson ending." },
];

export function relatedSections(section: Section) {
  return sections.filter((other) => other.id !== section.id && other.identity === section.identity);
}

export function identityLabel(section: Section) {
  return identities[section.identity];
}

// FRD v0.1 pp. 5–7. Keep the gaps at 1:27 and 2:03 until a listening review resolves them.
const occurrenceRows = [
  ["EVT-01", "SEC-01", 0, 6, "Intro texture", "texture"],
  ["EVT-02", "SEC-02", 6, 12, "Vocal call 1a", "vocal"],
  ["EVT-03", "SEC-02", 12, 18, "Main riff response 1a", "main-riff"],
  ["EVT-04", "SEC-02", 18, 24, "Vocal call 1b", "vocal"],
  ["EVT-05", "SEC-02", 24, 29, "Main riff response 1b", "main-riff"],
  ["EVT-06", "SEC-02", 29, 35, "Vocal call 1c", "vocal"],
  ["EVT-07", "SEC-02", 35, 41, "Extended main riff 1c", "main-riff"],
  ["EVT-08", "SEC-02", 41, 46, "E-Turnaround 1", "e-turnaround"],
  ["EVT-09", "SEC-02", 46, 52, "Main riff return 1d", "main-riff"],
  ["EVT-10", "SEC-03", 52, 65, "Chorus 1", "chorus"],
  ["EVT-11", "SEC-04", 65, 70, "Vocal call 2a", "vocal"],
  ["EVT-12", "SEC-04", 70, 75, "Riff 2a", "main-riff"],
  ["EVT-13", "SEC-04", 75, 81, "Vocal call 2b", "vocal"],
  ["EVT-14", "SEC-04", 81, 87, "Riff 2b", "main-riff"],
  ["EVT-15", "SEC-05", 88, 99, "Bridge 1", "bridge"],
  ["EVT-16", "SEC-06", 99, 123, "Chordal groove / chorus 2", "groove"],
  ["EVT-17", "SEC-07", 124, 130, "Vocal call 3a", "vocal"],
  ["EVT-18", "SEC-07", 130, 135, "Harmonized riff 3a", "main-riff"],
  ["EVT-19", "SEC-07", 135, 141, "Vocal call 3b", "vocal"],
  ["EVT-20", "SEC-07", 141, 146, "Harmonized riff 3b", "main-riff"],
  ["EVT-21", "SEC-07", 146, 152, "Vocal call 3c", "vocal"],
  ["EVT-22", "SEC-07", 152, 158, "Extended harmonized riff 3c", "main-riff"],
  ["EVT-23", "SEC-07", 158, 163, "E-Turnaround 2", "e-turnaround"],
  ["EVT-24", "SEC-07", 163, 169, "Harmonized riff return", "main-riff"],
  ["EVT-25", "SEC-08", 169, 182, "Chorus 3", "chorus"],
  ["EVT-26", "SEC-09", 182, 187, "Vocal call 4a", "vocal"],
  ["EVT-27", "SEC-09", 187, 192, "Riff 4a", "main-riff"],
  ["EVT-28", "SEC-09", 192, 198, "Vocal call 4b", "vocal"],
  ["EVT-29", "SEC-09", 198, 203, "Riff 4b", "main-riff"],
  ["EVT-30", "SEC-10", 203, 215, "Bridge 2 / solo launch", "bridge"],
  ["EVT-31", "SEC-11", 215, 295, "Outro solo to fade", "solo"],
] as const;

export const occurrences = occurrenceRows.map(([id, sectionId, startSeconds, endSeconds, label, identity]) => ({
  id, sectionId, startSeconds, endSeconds, label, identity,
  timing: "estimated" as const,
}));

export function sectionOccurrences(sectionId: SectionId) {
  return occurrences.filter((occurrence) => occurrence.sectionId === sectionId);
}

export function sectionPosition(sectionId: SectionId) {
  const items = sectionOccurrences(sectionId);
  return { startSeconds: items[0]!.startSeconds, endSeconds: items.at(-1)!.endSeconds };
}

export function formatTimestamp(seconds: number) {
  return Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
}
