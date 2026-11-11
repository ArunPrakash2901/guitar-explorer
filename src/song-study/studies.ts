import type { Event, SectionId, Study } from "./types.js";

const turnaround: readonly Event[] = [
  { at: 0, length: 1, notes: ["E3"], click: "muted" },
  { at: 1, length: 1, notes: ["B3"] },
  { at: 2, length: 1, notes: ["F#3"] },
  { at: 3, length: 1, notes: ["A3"] },
  { at: 4, length: 1, notes: ["G3"] },
  { at: 5, length: 2, notes: ["D3"] },
  { at: 7, length: 2, notes: ["E3"] },
];

const slideEndpoints: readonly Event[] = [
  { at: 0, length: 2, notes: ["D4"], gesture: "G string, fret 7" },
  { at: 2, length: 4, notes: ["E4"] },
];

const fadeFigure: readonly Event[] = [
  { at: 0, length: 2, notes: ["C5"] },
  { at: 2, length: 2, notes: ["E5"] },
  { at: 4, length: 4, notes: ["D5"] },
];

export const studies: Readonly<Record<SectionId, readonly Study[]>> = {
  "SEC-01": [
    {
      title: "Texture before the entrance",
      question: "What makes the opening sound like preparation for something?",
      listen: "Notice when you can hum a stable pitch and when the sound is closer to a scrape, tap, or rush of noise.",
      context: "A fretted note has a pitch you can match. A lightly muted string gives a short percussive attack. Alternate those sounds to change the character of an entrance.",
      uncertainty: "The exact studio gesture and effects behind the opening texture remain open.",
      sources: ["recording"],
      play: "At a comfortable volume, lay a finger lightly across the strings without fretting and make two gentle strokes. Then fret and pluck the marked A. Let it ring.",
      transfer: "Make a two-second entrance for a riff of your own. Try one muted stroke and one pitched pickup, then swap their order.",
      examples: [
        {
          label: "Muted lead-in",
          description: "Two muted strokes leave space around a sustained A.",
          fretRange: [0, 7],
          events: [
            { at: 0, length: 1, click: "muted" }, { at: 2, length: 1, click: "muted" },
            { at: 4, length: 4, notes: ["A3"] },
          ],
        },
        {
          label: "Pitched lead-in",
          description: "Two fretted notes lead to the same A at the same time.",
          fretRange: [0, 7],
          events: [
            { at: 0, length: 1, notes: ["D3"] }, { at: 2, length: 1, notes: ["E3"] },
            { at: 4, length: 4, notes: ["A3"] },
          ],
        },
      ],
    },
  ],
  "SEC-02": [
    {
      title: "Approach A by a semitone",
      question: "What does G♯ add to the guitar's answer?",
      listen: "Listen for the guitar answer after the voice, then use Marty's lesson to locate the short chromatic climb.",
      context: "The research identifies the short E3, G3, G♯3, A3 cell. Under an explicit A reference, the engine can calculate its scale degrees. The two demos use newly authored timings and differ only in whether G♯ sounds before the target.",
      uncertainty: "A is the reference for this analysis. Locations are standard-tuning options. Marty's video provides evidence for his own demonstration.",
      sources: ["recording", "marty"],
      play: "Play the four pitches on the D string at frets 2, 5, 6 and 7. Try the same registered A on the G string at fret 2. Play the comparison without the approach and keep the target in the same place.",
      transfer: "Choose a new target. Approach it from a semitone below, leave room for an imaginary singer, and make up a guitar answer.",
      examples: [
        {
          label: "With G♯",
          description: "G♯ sounds one eighth before A. Sing the A before you play it.",
          bpm: 84, phrase: true, referenceRoot: "A", scale: "minorPentatonic", fretRange: [0, 8],
          events: [
            { at: 0, length: 2, notes: ["E3"] }, { at: 4, length: 2, notes: ["G3"] },
            { at: 7, length: 1, notes: ["G#3"] }, { at: 8, length: 4, notes: ["A3"] },
          ],
        },
        {
          label: "Without G♯",
          description: "E, G and A stay in place. The eighth before A is silent.",
          bpm: 84, phrase: true, referenceRoot: "A", scale: "minorPentatonic", fretRange: [0, 8],
          events: [
            { at: 0, length: 2, notes: ["E3"] }, { at: 4, length: 2, notes: ["G3"] },
            { at: 8, length: 4, notes: ["A3"] },
          ],
        },
      ],
    },
    {
      title: "Keep beat one through the call and response",
      question: "Can the guitar answer begin before beat one and still land on it?",
      listen: "Tap through a vocal-to-guitar handoff. Compare the guitar's first attack with the pulse of the returning band.",
      context: "A pickup starts before the beat or bar it leads into. The original examples keep the same pitches in order while moving the first attack from three eighths before the barline to the next downbeat.",
      uncertainty: "The demos make their own 4/4 alignment explicit. Vocal gaps and guitar re-entries in the recording need to be heard in context.",
      sources: ["recording", "marty"],
      play: "Count 1 and 2 and 3 and 4 and. In the pickup example, start the reply on the and of 3 and land on the last note at the next 1.",
      transfer: "Use the same reply twice in your own call-and-response. Start it before beat one the first time and directly on beat one the second.",
      examples: [
        {
          label: "Three-eighth pickup",
          description: "Three short notes lead into B on beat one.",
          bpm: 84, beats: 4, phrase: true, fretRange: [0, 7],
          events: [
            { at: 5, length: 1, notes: ["E3"] }, { at: 6, length: 1, notes: ["F#3"] },
            { at: 7, length: 1, notes: ["A3"] }, { at: 8, length: 4, notes: ["B3"] },
          ],
        },
        {
          label: "Start on beat one",
          description: "Wait for the barline before playing the same notes.",
          bpm: 84, beats: 4, phrase: true, fretRange: [0, 7],
          events: [
            { at: 8, length: 1, notes: ["E3"] }, { at: 9, length: 1, notes: ["F#3"] },
            { at: 10, length: 1, notes: ["A3"] }, { at: 11, length: 4, notes: ["B3"] },
          ],
        },
      ],
    },
    {
      title: "Hear the E-Turnaround against the pulse",
      question: "Where does a nine-eighth figure restart against 4/4?",
      listen: "Find the early turnaround. Tap the quarter-note pulse while listening to where the guitar figure restarts.",
      context: "A 4/4 bar contains eight eighths. Nine eighths equal four and a half quarter-note beats. The reported analysis proposes launches at 0, 9, 18 and 27 eighths in a 32-eighth window. The demo uses newly written pitches and a muted stroke marks each launch. The reported pickup sits three eighths before that window.",
      uncertainty: "The turnaround alignment, pickup offset and seven-note duration grouping are research interpretations. The quarter/eighth conversion and resulting offsets follow from that model.",
      sources: ["recording", "marty"],
      play: "Count eighths slowly over a steady foot tap. Play just the first note of each group to hear how the group starts move against the barline.",
      transfer: "Make a nine-eighth figure on one string. Shorten the last note by one eighth and see whether the repeat then starts with the bar.",
      examples: [
        {
          label: "Nine-eighth launches",
          description: "Starts at 0, 9, 18 and 27. The last group ends at the boundary of the four-bar comparison.",
          bpm: 88, beats: 4, group: 9, phrase: true, fretRange: [0, 8],
          events: [
            ...[0, 9, 18].flatMap((at) => turnaround.map((event) => ({ ...event, at: at + event.at }))),
            ...turnaround.slice(0, 5).map((event) => ({ ...event, at: 27 + event.at })),
          ],
        },
        {
          label: "Eight-eighth launches",
          description: "Shorten the last note by one eighth. Starts at 0, 8, 16 and 24 coincide with barlines.",
          bpm: 88, beats: 4, group: 8, phrase: true, fretRange: [0, 8],
          events: [0, 8, 16, 24].flatMap((at) => turnaround.map((event) => ({
            ...event, at: at + event.at, length: event.at === 7 ? 1 : event.length,
          }))),
        },
      ],
    },
    {
      title: "Play the same pitches by two routes",
      question: "What changes when the arrival moves to another string?",
      listen: "Compare the guitar demonstration around 3:06 in Marty Music with the alternative fingering around 7:05 in Marin Music Center. Focus on how the arrival is made.",
      context: "In standard tuning, G-string fret 7 sounds D4. G-string fret 9 and B-string fret 5 both sound E4. The audio gives pitch references for comparing the physical routes on your guitar.",
      uncertainty: "The slide and cross-string routes are attributed teaching choices. The studio fingering remains open.",
      sources: ["recording", "marty", "marin"],
      play: "Slide from G-string fret 7 to fret 9. Then pick G-string fret 7 and move to B-string fret 5. Match the final pitch and compare how much of the movement you hear.",
      transfer: "Find two locations for a different target note. Play one route as a connected gesture and the other as separate attacks.",
      examples: [
        {
          label: "Same-string slide",
          description: "Start on D4 and arrive at E4 along the G string.",
          phrase: true, fretRange: [5, 10], technique: "G string, slide from fret 7 to fret 9.",
          events: [slideEndpoints[0]!, { ...slideEndpoints[1]!, gesture: "G string, fret 9" }],
        },
        {
          label: "Cross-string arrival",
          description: "Use the same sounding pitches. Arrive at E4 on the B string.",
          phrase: true, fretRange: [5, 10], technique: "G string fret 7, then B string fret 5.",
          events: [slideEndpoints[0]!, { ...slideEndpoints[1]!, gesture: "B string, fret 5" }],
        },
      ],
    },
  ],
  "SEC-03": [
    {
      title: "A chord punch and an expressive target",
      question: "How does the same chord feel under a minor third or a major third?",
      listen: "Listen for the contrast between short chord attacks and flexible single-note gestures. Try to sing the pitch an expressive gesture aims for.",
      context: "A5 contains A and E. It leaves the third open, so C and C♯ give different colors against the same accompaniment. The two pitches are reference points for a bend you play on your guitar.",
      uncertainty: "The reported blues color leaves the studio bend's intonation and fingering open.",
      sources: ["recording", "marty"],
      play: "On the G string, compare C at fret 5 and C♯ at fret 6. If comfortable, fret C and bend gently toward the pitch you heard at fret 6.",
      transfer: "Choose another power chord and find both third colors. Write a short response that passes through one and ends on the other.",
      examples: [
        {
          label: "Minor-third color",
          description: "C holds over the same A and E that support the other example.",
          referenceRoot: "A", harmony: { tonic: "A", chord: "power5" }, fretRange: [0, 7],
          events: [
            { at: 0, length: 2, notes: ["A2", "E3"] },
            { at: 2, length: 4, notes: ["A2", "E3", "C4"] },
          ],
        },
        {
          label: "Major-third target",
          description: "Hear C and C♯ against A5. Use the two pitches to compare a bend you play in one position.",
          technique: "Bend from C toward C♯. The target describes the resulting pitch. The fretted position describes where your finger starts.",
          referenceRoot: "A", harmony: { tonic: "A", chord: "power5" }, fretRange: [0, 7],
          events: [
            { at: 0, length: 2, notes: ["A2", "E3"] },
            { at: 2, length: 1, notes: ["A2", "E3", "C4"], gesture: "Bend origin" },
            { at: 3, length: 3, notes: ["A2", "E3", "C#4"], gesture: "Sounding target" },
          ],
        },
      ],
    },
  ],
  "SEC-04": [
    {
      title: "Anticipate the shorter answer",
      question: "Can you cue the change when an expected reply drops out?",
      listen: "Compare with Verse 1. Count the exchanges and locate the first place where the shortened verse takes a different turn.",
      context: "The original examples use muted calls, short guitar replies, and a higher transition cue. The shorter version keeps the first exchange and leaves out the second reply.",
      uncertainty: "The examples model the idea of shortening with original pitches and timings.",
      sources: ["recording"],
      play: "Play the low reply after each muted call in the longer example. In the shorter one, keep your foot going and play the high transition note in place of the second reply.",
      transfer: "Make two versions of your own call-and-response. Omit one reply from the shorter version and give a partner a clear entrance cue.",
      examples: [
        {
          label: "Two replies",
          description: "The transition cue comes after two complete exchanges.",
          bpm: 92, beats: 4, fretRange: [0, 8],
          events: [
            { at: 0, length: 1, click: "muted" }, { at: 2, length: 2, notes: ["E3"] },
            { at: 4, length: 1, click: "muted" }, { at: 6, length: 2, notes: ["E3"] },
            { at: 8, length: 4, notes: ["G4"] },
          ],
        },
        {
          label: "Shortened exchange",
          description: "The higher transition note takes the place of the second reply.",
          bpm: 92, beats: 4, fretRange: [0, 8],
          events: [
            { at: 0, length: 1, click: "muted" }, { at: 2, length: 2, notes: ["E3"] },
            { at: 4, length: 1, click: "muted" }, { at: 6, length: 4, notes: ["G4"] },
          ],
        },
      ],
    },
  ],
  "SEC-05": [
    {
      title: "Make space for the band to return",
      question: "What do voice, guitar and silence each contribute to the return?",
      listen: "Listen for where the texture thins, what carries the line and when the ensemble returns. Keep tapping through the space before the entrance.",
      context: "The single note and the two-note arrival stay the same in the original comparison. The length of the gap changes how much space you hear before the arrival.",
      uncertainty: "Marin Music Center supplies a separate teaching reference. The proposed F♯m6 reading remains unresolved. Focus on changes in texture before assigning chord names.",
      sources: ["recording", "marin"],
      play: "Play the first note and stop it with a gentle touch. Count quietly until the A and E entrance. Repeat while letting the first note carry across the count.",
      transfer: "Make a band entrance with one sustained pitch and a power chord. Compare long and short silences before the chord.",
      examples: [
        {
          label: "An audible gap",
          description: "A single E gives way to silence before the dyad.",
          events: [{ at: 0, length: 2, notes: ["E4"] }, { at: 6, length: 4, notes: ["A2", "E3"] }],
          fretRange: [0, 7],
        },
        {
          label: "A sustained lead-in",
          description: "The E fills the same span up to the dyad.",
          events: [{ at: 0, length: 6, notes: ["E4"] }, { at: 6, length: 4, notes: ["A2", "E3"] }],
          fretRange: [0, 7],
        },
      ],
    },
  ],
  "SEC-06": [
    {
      title: "Follow the chordal groove",
      question: "Can you keep the pulse while the roots change at different rates?",
      listen: "Find the groove after Bridge 1. Listen for the A, G and C-related movement and G-to-D turnaround. Tap the pulse and listen for each root change.",
      context: "Harmonic rhythm is the rate at which harmony changes. These two original grooves use the same power chords with different time allocations.",
      uncertainty: "A5, G- and C-related movement, and G5 to D5 are reported listening guides. The original voicings and durations are demonstration choices.",
      sources: ["recording", "marty"],
      play: "Play only the roots while counting eighths. Then add fifths and count through G5 to D5. Compare which version makes the turnaround easier to anticipate.",
      transfer: "Make a two-bar groove using different roots. Place a chord change at two different times and notice which gives the ending more momentum.",
      examples: [
        {
          label: "Long first chord",
          description: "A5 gets four quarter-note beats before shorter moves through G5 and C5.",
          bpm: 92, beats: 4, fretRange: [0, 7],
          events: [
            { at: 0, length: 8, notes: ["A2", "E3"] }, { at: 8, length: 2, notes: ["G2", "D3"] },
            { at: 10, length: 2, notes: ["C3", "G3"] }, { at: 12, length: 2, notes: ["G2", "D3"] },
            { at: 14, length: 2, notes: ["D3", "A3"] },
          ],
        },
        {
          label: "Earlier root changes",
          description: "G5 comes one quarter-note beat earlier. C5 gets that extra beat.",
          bpm: 92, beats: 4, fretRange: [0, 7],
          events: [
            { at: 0, length: 6, notes: ["A2", "E3"] }, { at: 6, length: 2, notes: ["G2", "D3"] },
            { at: 8, length: 4, notes: ["C3", "G3"] }, { at: 12, length: 2, notes: ["G2", "D3"] },
            { at: 14, length: 2, notes: ["D3", "A3"] },
          ],
        },
        {
          label: "Follow the roots with a melody",
          description: "Hear the same early changes with a new lead line. The upper notes move through E, G, C, D and A.",
          bpm: 92, beats: 4, fretRange: [0, 7],
          events: [
            { at: 0, length: 6, notes: ["A2", "E3", "E4"], harmony: { tonic: "A", chord: "power5" } },
            { at: 6, length: 2, notes: ["G2", "D3", "G4"], harmony: { tonic: "G", chord: "power5" } },
            { at: 8, length: 4, notes: ["C3", "G3", "C4"], harmony: { tonic: "C", chord: "power5" } },
            { at: 12, length: 2, notes: ["G2", "D3", "D4"], harmony: { tonic: "G", chord: "power5" } },
            { at: 14, length: 2, notes: ["D3", "A3", "A4"], harmony: { tonic: "D", chord: "power5" } },
          ],
        },
      ],
    },
    {
      title: "Choose a target as the root moves",
      question: "How does the same note change jobs when the chord changes?",
      listen: "Listen for which guitar notes stay in place and which seem to travel with the harmony.",
      context: "D is the fifth over G5 and the root over D5. Keep the upper pitch fixed while changing the bass. A fuller D-major chord would also contain F♯.",
      sources: ["recording"],
      play: "Find D on the B string at fret 3. Play it over G5 and then D5. Try the A at the end of the second example, then use the roots from the groove.",
      transfer: "Use the groove above as accompaniment. Make a line that holds one note through a change and moves to a chord tone for the last arrival.",
      examples: [
        {
          label: "D over G5",
          description: "The upper D shares the fifth's pitch class.",
          harmony: { tonic: "G", chord: "power5" }, fretRange: [0, 7],
          events: [{ at: 0, length: 4, notes: ["G2", "D3"] }, { at: 4, length: 4, notes: ["G2", "D3", "D4"] }],
        },
        {
          label: "D over D5",
          description: "The same upper D now shares the root's pitch class. A is available as a fifth.",
          harmony: { tonic: "D", chord: "power5" }, fretRange: [0, 7],
          events: [
            { at: 0, length: 4, notes: ["D3", "A3"] }, { at: 4, length: 2, notes: ["D3", "A3", "D4"] },
            { at: 6, length: 2, notes: ["D3", "A3", "A4"] },
          ],
        },
      ],
    },
  ],
  "SEC-07": [
    {
      title: "Hear a second guitar line",
      question: "What changes when a moving line sounds above the riff?",
      listen: "Compare with Verse 1. Sing or play the line you know, then listen for a separate upper part and the point where it joins.",
      context: "The lower line stays the same in the original comparison. Isolate the upper part, then play both and compare the vertical intervals.",
      uncertainty: "A separate upper line does not establish which studio strings or frets produced it. The paired notes here are original.",
      sources: ["recording", "guitarforce"],
      play: "Play each line separately. Pair them on the D and G strings, or play one line while the demo supplies the other.",
      transfer: "Keep the lower line. Find an upper pitch for the middle attack that makes a fourth. Compare the character with the original pair.",
      examples: [
        {
          label: "Lower line", description: "Hear the direction and rhythm on its own.",
          phrase: true, fretRange: [0, 7],
          events: [
            { at: 0, length: 2, notes: ["E3"] }, { at: 2, length: 2, notes: ["F#3"] },
            { at: 4, length: 4, notes: ["G3"] },
          ],
        },
        {
          label: "Upper line", description: "Hear the part that can travel with the lower line.",
          phrase: true, fretRange: [0, 7],
          events: [
            { at: 0, length: 2, notes: ["G3"] }, { at: 2, length: 2, notes: ["A3"] },
            { at: 4, length: 4, notes: ["B3"] },
          ],
        },
        {
          label: "Both lines", description: "Hear two minor thirds followed by a major third.",
          fretRange: [0, 7],
          events: [
            { at: 0, length: 2, notes: ["E3", "G3"] }, { at: 2, length: 2, notes: ["F#3", "A3"] },
            { at: 4, length: 4, notes: ["G3", "B3"] },
          ],
        },
      ],
    },
  ],
  "SEC-08": [
    {
      title: "Recognize a chorus on its return",
      question: "Which detail identifies the returning chorus before you hear the whole passage?",
      listen: "In Chorus 1, choose an identifying gesture by ear. Listen for that cue here and check the ending and surrounding context for differences.",
      context: "The original examples start with the same chord and next attack. Their endings show how a recognizable opening can lead somewhere new.",
      uncertainty: "The exact differences between the studio occurrences are an open listening question.",
      sources: ["recording"],
      play: "Play the shared opening gesture twice. Before each ending, sing the note you expect. Try the second ending and see how long you can delay your choice.",
      transfer: "Write your own two-attack cue. Give it two endings and change the articulation of a single note in the second one.",
      examples: [
        {
          label: "Return to the root", description: "The shared D5 opening ends on the root.",
          fretRange: [0, 7],
          events: [
            { at: 0, length: 1, notes: ["D3", "A3"] }, { at: 2, length: 2, notes: ["F4"] },
            { at: 4, length: 4, notes: ["D4"] },
          ],
        },
        {
          label: "Leave the line open", description: "The shared opening ends on E, which can lead into a continuation.",
          fretRange: [0, 7],
          events: [
            { at: 0, length: 1, notes: ["D3", "A3"] }, { at: 2, length: 2, notes: ["F4"] },
            { at: 4, length: 4, notes: ["E4"] },
          ],
        },
      ],
    },
  ],
  "SEC-09": [
    {
      title: "Lead out of a shortened verse",
      question: "How early can the final answer point toward the bridge?",
      listen: "Compare the last shortened verse with Verse 2. Find an early cue for the bridge and check your prediction at the transition.",
      context: "A short response can settle on its own center or use a note that pulls toward the following section. Both original phrases keep the same timing and arrival. One moves early toward the next root.",
      uncertainty: "The early lead-in is a compositional option for your own response.",
      sources: ["recording"],
      play: "Play the upper notes while counting through the downbeat. In the second example, listen for E as a shared pitch before the next chord takes over.",
      transfer: "Choose a verse chord and an incoming chord. End a short response on a shared note, then try delaying that note until the new chord. Compare the cues in two-call and three-call versions.",
      examples: [
        {
          label: "Stay with the verse", description: "The upper line settles on A until E5 enters.",
          beats: 4, fretRange: [0, 7],
          events: [
            { at: 4, length: 2, notes: ["A2", "E3", "C4"] }, { at: 6, length: 2, notes: ["A2", "E3", "A3"] },
            { at: 8, length: 4, notes: ["E2", "B2", "E4"] },
          ],
        },
        {
          label: "Foreshadow the change", description: "The upper E sounds before E5. Listen for the link across the barline.",
          beats: 4, fretRange: [0, 7],
          events: [
            { at: 4, length: 2, notes: ["A2", "E3", "C4"] }, { at: 6, length: 2, notes: ["A2", "E3", "E4"] },
            { at: 8, length: 4, notes: ["E2", "B2", "E4"] },
          ],
        },
      ],
    },
  ],
  "SEC-10": [
    {
      title: "Change from support to lead",
      question: "Where does the guitar stop framing the voice and take the foreground?",
      listen: "Compare the returning bridge with Bridge 1. Listen through the handoff to the outro and sing the first lead gesture.",
      context: "An open-fifth accompaniment underpins these original examples. A high pickup puts the lead in the foreground before the downbeat in one version. In the other, the lead waits until after it.",
      uncertainty: "The bridge boundaries and lead entry are listening landmarks. The solo lesson and studio track can frame that entrance differently.",
      sources: ["recording", "solo"],
      play: "Keep the lower rhythm going with your foot while you play the high phrase. Compare entering before the downbeat with entering just after it.",
      transfer: "Ask a partner to hold a chord, or use the demo as a cue. Make two different lead entrances with the same notes at different starting points.",
      examples: [
        {
          label: "Lead pickup", description: "The first upper note sounds an eighth before the chord change.",
          beats: 4, fretRange: [3, 12],
          events: [
            { at: 0, length: 7, notes: ["A2", "E3"] },
            { at: 7, length: 1, notes: ["A2", "E3", "D5"], gesture: "Lead pickup" },
            { at: 8, length: 2, notes: ["G2", "D3", "C5"] }, { at: 10, length: 4, notes: ["G2", "D3", "G4"] },
          ],
        },
        {
          label: "Lead after the downbeat", description: "The accompaniment changes first and the upper part enters an eighth later.",
          beats: 4, fretRange: [3, 12],
          events: [
            { at: 0, length: 8, notes: ["A2", "E3"] }, { at: 8, length: 1, notes: ["G2", "D3"] },
            { at: 9, length: 1, notes: ["G2", "D3", "D5"], gesture: "Lead entrance" },
            { at: 10, length: 2, notes: ["G2", "D3", "C5"] }, { at: 12, length: 4, notes: ["G2", "D3", "G4"] },
          ],
        },
      ],
    },
  ],
  "SEC-11": [
    {
      title: "Follow an idea into another region",
      question: "Can you recognize the same contour when it moves an octave?",
      listen: "Hum a short figure from the studio outro. Listen farther into the fade for a similar shape at a different height. Use the solo lesson to look for possible positions.",
      context: "The supplied PDF moves from open and low frets toward frets 5–10 and 13–15 on page 1. Page 2, bars 18–26, includes high-position bends around frets 17–20. The lower and upper demos keep their intervals and timing as the figure moves an octave higher. The high-position answer keeps the direction and changes the intervals.",
      uncertainty: "The ranges describe the PDF's fingering. A recognizable studio contour can recur without an exact transposition.",
      sources: ["recording", "solo"],
      play: "Play the lower phrase, then find one pitch on another string at the same register. Sing the shape while you move to the upper phrase. Then play the high-position answer around frets 15–22.",
      transfer: "Write a new answer in a higher register using only the contour. Change at least two intervals while keeping the direction of each move.",
      examples: [
        {
          label: "Lower region", description: "The line rises from A to C to D and opens out to G.",
          phrase: true, fretRange: [0, 7],
          events: [
            { at: 0, length: 2, notes: ["A3"] }, { at: 2, length: 1, notes: ["C4"] },
            { at: 3, length: 1, notes: ["D4"] }, { at: 4, length: 4, notes: ["G4"] },
          ],
        },
        {
          label: "Upper region", description: "The same figure moves up an octave. Find nearby notes on the high E and B strings.",
          phrase: true, fretRange: [8, 17],
          events: [
            { at: 0, length: 2, notes: ["A4"] }, { at: 2, length: 1, notes: ["C5"] },
            { at: 3, length: 1, notes: ["D5"] }, { at: 4, length: 4, notes: ["G5"] },
          ],
        },
        {
          label: "High-position answer", description: "The rise continues around frets 15–22. Hear how changing the intervals alters the same rising direction.",
          phrase: true, fretRange: [15, 24],
          events: [
            { at: 0, length: 2, notes: ["G5"] }, { at: 2, length: 1, notes: ["A5"] },
            { at: 3, length: 1, notes: ["C6"] }, { at: 4, length: 4, notes: ["D6"] },
          ],
        },
      ],
    },
    {
      title: "Develop a phrase through two blues colors",
      question: "How much can one changed third affect a figure with the same rhythm and contour?",
      listen: "Listen to the outro twice. On the first pass, hum a phrase's shape. On the second, notice which pitches give it a brighter or darker color.",
      context: "The supplied PDF presents a recurring figure around frets 5–8 in bars 27–29, and a repeated chromatic figure in bars 34–36. For your own variation, compare C from A minor pentatonic with C♯ from A major pentatonic. A and E belong to both collections.",
      uncertainty: "The colors describe the original example under an A reference. The repeated figures in the PDF remain evidence for that arrangement.",
      sources: ["recording", "solo"],
      play: "Play both variants at one tempo. Sing the changed third before you move your finger. Repeat your preferred version with a different last note.",
      transfer: "Write two phrases over an A5 vamp. Use one third color to ask a question and the other to answer, keeping their rhythm or contour related.",
      examples: [
        {
          label: "C in the answer", description: "A to C is a minor third. The shape rises to E and descends to A.",
          phrase: true, referenceRoot: "A", scale: "minorPentatonic", fretRange: [5, 12],
          events: [
            { at: 0, length: 1, notes: ["A4"] }, { at: 1, length: 1, notes: ["C5"] },
            { at: 2, length: 2, notes: ["E5"] }, { at: 5, length: 3, notes: ["A4"] },
          ],
        },
        {
          label: "C♯ in the answer", description: "A to C♯ is a major third. The timing, contour and ending match the first example.",
          phrase: true, referenceRoot: "A", scale: "majorPentatonic", fretRange: [5, 12],
          events: [
            { at: 0, length: 1, notes: ["A4"] }, { at: 1, length: 1, notes: ["C#5"] },
            { at: 2, length: 2, notes: ["E5"] }, { at: 5, length: 3, notes: ["A4"] },
          ],
        },
      ],
    },
    {
      title: "Match the pitch, then change the articulation",
      question: "What can stay the same when you change how a note is produced?",
      listen: "Pick an expressive detail in the studio solo. Listen for its start and arrival pitches, then compare with a gesture from the separate solo lesson.",
      context: "The PDF marks bends of different sizes, releases, slides, and ties or slurs. A bend changes tension. A slide moves the fretting finger along a string. Hammer-ons and pull-offs let you connect pitches without a second picked attack.",
      uncertainty: "The synth plays endpoint pitches. Your guitar supplies the motion. Interpret the PDF's slurs with the teaching video where the gesture is unclear.",
      sources: ["recording", "solo"],
      play: "Pick each endpoint. On the B string, try a half-step bend from fret 12 toward fret 13, a slide from fret 10 to 13, and a hammer-on from fret 10 to 12 followed by a pull-off. Stop if the movement strains your hand.",
      transfer: "Keep a pair of pitches from your own phrase. Try them picked, slid and legato where the fingering allows. Choose the articulation that suits the phrase.",
      examples: [
        {
          label: "Half-step bend targets", description: "Match B and C. Use C as the target for a bend from B.",
          phrase: true, technique: "B string, fret 12 origin. Match the pitch at fret 13.", fretRange: [10, 15],
          events: [
            { at: 0, length: 2, notes: ["B4"], gesture: "Bend origin" },
            { at: 2, length: 4, notes: ["C5"], gesture: "Sounding target" },
          ],
        },
        {
          label: "Slide endpoints", description: "Hear A and C. Play the continuous connection yourself.",
          phrase: true, technique: "B string, slide from fret 10 to fret 13.", fretRange: [10, 15],
          events: [
            { at: 0, length: 2, notes: ["A4"], gesture: "Slide origin" },
            { at: 2, length: 4, notes: ["C5"], gesture: "Slide arrival" },
          ],
        },
        {
          label: "Hammer-on and pull-off", description: "Hear A, B and A. Use your fretting hand for the second and third attacks.",
          phrase: true, technique: "B string, pick fret 10, hammer to 12 and pull off to 10.", fretRange: [10, 15],
          events: [
            { at: 0, length: 2, notes: ["A4"], gesture: "Pick" },
            { at: 2, length: 2, notes: ["B4"], gesture: "Hammer-on" },
            { at: 4, length: 2, notes: ["A4"], gesture: "Pull-off" },
          ],
        },
      ],
    },
    {
      title: "Hear what the fade leaves open",
      question: "How does a fade feel different from a deliberately played final cadence?",
      listen: "Follow the studio outro as it recedes. Compare with the solo lesson and listen for where the teaching version gives you a stopping point.",
      context: "Page 4 of the supplied PDF contains a written chordal ending with meter changes and a final sustained chord. The studio mix fades. In this original comparison, one phrase recedes over three passes while the other adds an explicit A landing.",
      uncertainty: "The fade is synthesized from an original phrase. It models receding dynamics without recreating the studio mix or the PDF ending.",
      sources: ["recording", "solo"],
      play: "Repeat the open ending with lighter picking each time. Then play the tonic ending once and stop. Notice how pitch and dynamics affect closure.",
      transfer: "Arrange one phrase of your own both as a fade and as a final cadence. Choose which ending serves the music.",
      examples: [
        {
          label: "Line left in motion", description: "The same phrase gets quieter over three passes and keeps its open D ending.",
          phrase: true, fretRange: [5, 12],
          events: [1, 0.55, 0.24].flatMap((gain, index) => fadeFigure.map((event) => ({
            ...event, at: index * 8 + event.at, gain,
          }))),
        },
        {
          label: "Played resolution", description: "The same first three pitches gain an A landing.",
          phrase: true, fretRange: [5, 12],
          events: [
            { at: 0, length: 2, notes: ["C5"] }, { at: 2, length: 2, notes: ["E5"] },
            { at: 4, length: 2, notes: ["D5"] }, { at: 6, length: 4, notes: ["A4"] },
          ],
        },
      ],
    },
  ],
};
