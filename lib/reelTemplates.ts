/**
 * Reel templates. Each one is a recipe: an ordered list of slots the user
 * fills with their own photos, plus the look (filter, transition, text style)
 * that gets applied on playback.
 */

export type TransitionId =
  | "cut"
  | "fade"
  | "zoom"
  | "slide"
  | "flash"
  | "whip"
  | "blur";

export type FilterId =
  | "none"
  | "warm"
  | "cool"
  | "film"
  | "bw"
  | "vivid"
  | "fade"
  | "moody"
  | "golden"
  | "dreamy";

export type TextStyleId =
  | "bold-center"
  | "subtitle"
  | "handwritten"
  | "sticker"
  | "minimal-corner"
  | "counter";

export type CategoryId =
  | "grwm"
  | "recap"
  | "travel"
  | "food"
  | "fitness"
  | "outfit"
  | "aesthetic"
  | "daily"
  | "beforeafter"
  | "dump"
  | "pets"
  | "celebration"
  | "work";

export interface TemplateSlot {
  label: string;
  seconds: number;
  text: string;
}

export interface ReelTemplate {
  id: string;
  name: string;
  category: CategoryId;
  description: string;
  slots: TemplateSlot[];
  transition: TransitionId;
  filter: FilterId;
  textStyle: TextStyleId;
  audioLabel: string;
  accent: string;
}

export const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: "grwm", label: "Get ready with me" },
  { id: "recap", label: "Recaps" },
  { id: "travel", label: "Travel" },
  { id: "food", label: "Food" },
  { id: "fitness", label: "Fitness" },
  { id: "outfit", label: "Outfits" },
  { id: "aesthetic", label: "Aesthetic" },
  { id: "daily", label: "Day in the life" },
  { id: "beforeafter", label: "Before & after" },
  { id: "dump", label: "Photo dumps" },
  { id: "pets", label: "Pets" },
  { id: "celebration", label: "Celebrations" },
  { id: "work", label: "Study & work" },
];

/** CSS filter strings applied to each frame during playback. */
export const FILTERS: Record<FilterId, string> = {
  none: "none",
  warm: "saturate(1.18) sepia(0.14) contrast(1.05)",
  cool: "saturate(1.1) hue-rotate(-12deg) contrast(1.06)",
  film: "contrast(1.16) saturate(0.9) sepia(0.2)",
  bw: "grayscale(1) contrast(1.12)",
  vivid: "saturate(1.55) contrast(1.12)",
  fade: "contrast(0.9) saturate(0.85) brightness(1.09)",
  moody: "contrast(1.28) saturate(0.78) brightness(0.9)",
  golden: "sepia(0.28) saturate(1.35) brightness(1.06)",
  dreamy: "saturate(1.22) brightness(1.12) contrast(0.94)",
};

type SlotTuple = [label: string, seconds: number, text: string];

function tpl(
  id: string,
  name: string,
  category: CategoryId,
  description: string,
  transition: TransitionId,
  filter: FilterId,
  textStyle: TextStyleId,
  audioLabel: string,
  accent: string,
  slots: SlotTuple[]
): ReelTemplate {
  return {
    id,
    name,
    category,
    description,
    transition,
    filter,
    textStyle,
    audioLabel,
    accent,
    slots: slots.map(([label, seconds, text]) => ({ label, seconds, text })),
  };
}

export const TEMPLATES: ReelTemplate[] = [
  // ─── Get ready with me ───────────────────────────────────────────────
  tpl("grwm-classic", "GRWM: Classic", "grwm", "The original six-step routine.", "fade", "warm", "bold-center", "soft pop beat", "#e879f9", [
    ["Bare face", 2, "starting from zero"],
    ["Skincare", 2.2, "skincare first"],
    ["Base", 2.4, "base"],
    ["Eyes", 2.6, "eyes"],
    ["Lips", 2, "lips"],
    ["Final look", 3.2, "ready ✨"],
  ]),
  tpl("grwm-5min", "5 Minute Face", "grwm", "Fast cuts for a rushed morning.", "cut", "vivid", "counter", "fast house loop", "#f472b6", [
    ["Start", 1.4, "5:00"],
    ["Concealer", 1.4, "4:00"],
    ["Blush", 1.4, "3:00"],
    ["Brows", 1.4, "2:00"],
    ["Lips", 1.4, "1:00"],
    ["Done", 2.6, "0:00 — out the door"],
  ]),
  tpl("grwm-night-out", "GRWM: Night Out", "grwm", "Dim, glossy, high contrast.", "flash", "moody", "bold-center", "late night bass", "#a855f7", [
    ["Getting started", 2.2, "9pm start"],
    ["The look", 2.6, "going bolder tonight"],
    ["Hair", 2.4, "hair moment"],
    ["Outfit", 2.6, "the fit"],
    ["Final", 3.2, "let's go 🖤"],
  ]),
  tpl("grwm-school", "GRWM for School", "grwm", "Bright and quick before first period.", "slide", "cool", "sticker", "bright indie pop", "#38bdf8", [
    ["Alarm", 1.8, "6:40am 💤"],
    ["Skincare", 2, "quick skincare"],
    ["Makeup", 2.4, "5 min face"],
    ["Outfit", 2.2, "fit of the day"],
    ["Bag", 1.8, "grab everything"],
    ["Out the door", 2.6, "made it 🚌"],
  ]),
  tpl("grwm-work", "GRWM: Office", "grwm", "Clean, neutral, professional.", "fade", "fade", "minimal-corner", "calm lo-fi", "#94a3b8", [
    ["Coffee", 2.2, "coffee first"],
    ["Skincare", 2.2, "SPF always"],
    ["Makeup", 2.6, "keeping it neutral"],
    ["Outfit", 2.6, "office fit"],
    ["Desk", 2.8, "clocked in"],
  ]),
  tpl("grwm-gym", "GRWM: Gym", "grwm", "Energetic pre-workout prep.", "whip", "vivid", "bold-center", "hype gym track", "#22c55e", [
    ["Wake up", 1.8, "5:30am"],
    ["Fit", 2.2, "gym fit on"],
    ["Pre-workout", 2, "fuel"],
    ["Hair up", 1.8, "hair up, focus on"],
    ["Gym", 3, "let's move 💪"],
  ]),
  tpl("grwm-date", "GRWM: Date Night", "grwm", "Warm, soft, romantic pacing.", "blur", "golden", "handwritten", "dreamy r&b", "#fb7185", [
    ["Nervous start", 2.2, "he's picking me up at 8"],
    ["Makeup", 2.6, "soft glam"],
    ["Perfume", 1.8, "the good perfume"],
    ["Outfit", 2.6, "this one"],
    ["Ready", 3.2, "okay I'm ready 🌹"],
  ]),
  tpl("grwm-wedding", "GRWM: Wedding Guest", "grwm", "Elegant build to the full look.", "fade", "golden", "handwritten", "string swell", "#fcd34d", [
    ["Morning", 2.2, "wedding day 🤍"],
    ["Hair", 2.6, "hair set"],
    ["Makeup", 2.6, "soft and glowy"],
    ["Dress", 2.8, "the dress"],
    ["Details", 2.2, "details"],
    ["Full look", 3.4, "ready to celebrate"],
  ]),
  tpl("grwm-concert", "GRWM: Concert", "grwm", "Glitter, colour, fast energy.", "flash", "vivid", "sticker", "crowd anthem", "#c084fc", [
    ["Tickets", 1.8, "tonight's the night 🎟️"],
    ["Glitter", 2.2, "glitter phase"],
    ["Makeup", 2.4, "going all out"],
    ["Outfit", 2.4, "concert fit"],
    ["Arrival", 3, "SEE YOU THERE"],
  ]),
  tpl("grwm-lazy", "Lazy Day GRWM", "grwm", "Slow, soft, barely-there.", "fade", "dreamy", "minimal-corner", "ambient acoustic", "#fda4af", [
    ["Bed", 2.6, "no plans today"],
    ["Skincare", 2.4, "just skincare"],
    ["Hair", 2.2, "bun it is"],
    ["Comfy fit", 2.6, "comfort over everything"],
    ["Couch", 3, "back to bed honestly"],
  ]),
  tpl("grwm-brunch", "GRWM: Brunch", "grwm", "Sunny mid-morning energy.", "slide", "warm", "sticker", "sunny bossa", "#fbbf24", [
    ["Morning", 2, "brunch at 11"],
    ["Makeup", 2.4, "fresh face"],
    ["Outfit", 2.4, "something light"],
    ["Table", 2.6, "we made it"],
    ["Food", 2.8, "worth it 🥞"],
  ]),
  tpl("grwm-holiday", "GRWM: Holiday Party", "grwm", "Sparkle and warm lights.", "flash", "golden", "bold-center", "festive remix", "#ef4444", [
    ["Getting ready", 2.2, "holiday party tonight"],
    ["Sparkle", 2.2, "sequins obviously"],
    ["Makeup", 2.4, "red lip"],
    ["Outfit", 2.6, "the fit"],
    ["Party", 3.2, "cheers 🥂"],
  ]),

  // ─── Recaps ──────────────────────────────────────────────────────────
  tpl("recap-week", "Week Recap", "recap", "Seven frames, one per day.", "slide", "film", "counter", "warm indie loop", "#f97316", [
    ["Monday", 1.8, "mon"],
    ["Tuesday", 1.8, "tue"],
    ["Wednesday", 1.8, "wed"],
    ["Thursday", 1.8, "thu"],
    ["Friday", 1.8, "fri"],
    ["Saturday", 1.8, "sat"],
    ["Sunday", 2.6, "sun — that's the week"],
  ]),
  tpl("recap-month", "Month in Photos", "recap", "A slow scroll through the month.", "fade", "film", "minimal-corner", "mellow piano", "#8b5cf6", [
    ["Opening", 2.4, "this month"],
    ["Highlight 1", 2.2, ""],
    ["Highlight 2", 2.2, ""],
    ["Highlight 3", 2.2, ""],
    ["Highlight 4", 2.2, ""],
    ["Closing", 3, "see you next month"],
  ]),
  tpl("recap-year", "Year in Review", "recap", "Twelve beats, one per month.", "zoom", "golden", "counter", "cinematic build", "#eab308", [
    ["January", 1.4, "jan"],
    ["March", 1.4, "mar"],
    ["May", 1.4, "may"],
    ["July", 1.4, "jul"],
    ["September", 1.4, "sep"],
    ["November", 1.4, "nov"],
    ["December", 3.2, "what a year"],
  ]),
  tpl("recap-summer", "Summer Recap", "recap", "Sun-drenched and nostalgic.", "fade", "golden", "handwritten", "summer guitar", "#fb923c", [
    ["Start of summer", 2.4, "june"],
    ["Beach", 2.2, ""],
    ["Friends", 2.2, ""],
    ["Nights", 2.2, ""],
    ["End", 3.2, "best summer yet ☀️"],
  ]),
  tpl("recap-weekend", "Weekend Dump", "recap", "Loose, unedited weekend frames.", "cut", "film", "sticker", "lo-fi shuffle", "#f43f5e", [
    ["Friday night", 2, "fri"],
    ["Saturday", 2, "sat"],
    ["Saturday night", 2, "sat pt 2"],
    ["Sunday", 2, "sun"],
    ["Recovery", 2.6, "worth it"],
  ]),
  tpl("recap-semester", "Semester Recap", "recap", "Campus life, start to finish.", "slide", "cool", "counter", "upbeat study loop", "#3b82f6", [
    ["Move in", 2.2, "week 1"],
    ["Classes", 2, "week 5"],
    ["Midterms", 2, "week 8"],
    ["Friends", 2, "week 11"],
    ["Finals", 2, "week 15"],
    ["Done", 2.8, "semester done 🎓"],
  ]),
  tpl("recap-trip", "Trip Recap", "recap", "Cinematic travel highlight reel.", "zoom", "vivid", "bold-center", "orchestral travel", "#06b6d4", [
    ["Departure", 2.2, "day 1"],
    ["Arrival", 2.2, ""],
    ["Best day", 2.4, "the best day"],
    ["Food", 2, ""],
    ["Last night", 2.4, "last night"],
    ["Home", 3, "already miss it"],
  ]),
  tpl("recap-90days", "90 Day Glow", "recap", "Three months of progress.", "fade", "warm", "counter", "motivational swell", "#10b981", [
    ["Day 1", 2.6, "day 1"],
    ["Day 30", 2.4, "day 30"],
    ["Day 60", 2.4, "day 60"],
    ["Day 90", 3.4, "day 90 — worth it"],
  ]),
  tpl("recap-birthday-year", "Another Year Around", "recap", "A birthday look-back.", "fade", "golden", "handwritten", "warm nostalgic", "#f472b6", [
    ["Last birthday", 2.4, "one year ago"],
    ["The middle", 2.2, "everything between"],
    ["Growth", 2.2, "grew a lot"],
    ["Today", 3.2, "here's to another 🎂"],
  ]),
  tpl("recap-season", "Season Finale", "recap", "Close out a chapter.", "blur", "moody", "bold-center", "slow cinematic", "#6366f1", [
    ["Opening", 2.6, "that's a wrap on this season"],
    ["Moment 1", 2.2, ""],
    ["Moment 2", 2.2, ""],
    ["Moment 3", 2.2, ""],
    ["End", 3.2, "onto the next"],
  ]),

  // ─── Travel ──────────────────────────────────────────────────────────
  tpl("travel-city", "City Guide", "travel", "Where to go, in order.", "slide", "vivid", "subtitle", "city walk beat", "#0ea5e9", [
    ["The city", 2.4, "48 hours here"],
    ["Stop 1", 2.2, "1. morning coffee"],
    ["Stop 2", 2.2, "2. the museum"],
    ["Stop 3", 2.2, "3. sunset spot"],
    ["Stop 4", 2.2, "4. dinner"],
    ["Wrap", 2.8, "save this one 📍"],
  ]),
  tpl("travel-3-stops", "3 Stops You Can't Miss", "travel", "Punchy three-point guide.", "whip", "vivid", "counter", "punchy travel loop", "#14b8a6", [
    ["Intro", 2, "3 places you can't miss"],
    ["One", 2.6, "1"],
    ["Two", 2.6, "2"],
    ["Three", 2.6, "3"],
    ["Outro", 2.4, "thank me later"],
  ]),
  tpl("travel-airport", "Airport to Arrival", "travel", "The whole journey, compressed.", "cut", "cool", "subtitle", "departure lounge", "#60a5fa", [
    ["Airport", 2, "5am airport run"],
    ["Boarding", 1.8, "boarding"],
    ["Window", 2.2, "window seat"],
    ["Landing", 2, "landed"],
    ["First view", 3, "we're here 🌍"],
  ]),
  tpl("travel-roadtrip", "Road Trip Diary", "travel", "Miles, snacks, and views.", "fade", "film", "handwritten", "open road folk", "#f59e0b", [
    ["Packing", 2, "car packed"],
    ["The road", 2.4, "hour 3"],
    ["Gas stop", 2, "snack run"],
    ["The view", 2.6, "worth the drive"],
    ["Arrival", 2.8, "made it"],
  ]),
  tpl("travel-beach", "Beach Day", "travel", "Sun, salt, and slow zooms.", "zoom", "golden", "minimal-corner", "steel drum chill", "#22d3ee", [
    ["Arriving", 2.2, ""],
    ["The water", 2.4, ""],
    ["Lunch", 2.2, ""],
    ["Golden hour", 2.6, "golden hour"],
    ["Sunset", 3.2, "perfect day 🌊"],
  ]),
  tpl("travel-hidden", "Hidden Gems", "travel", "Places the guidebooks miss.", "blur", "moody", "subtitle", "mysterious pluck", "#8b5cf6", [
    ["Intro", 2.2, "places tourists miss"],
    ["Gem 1", 2.4, ""],
    ["Gem 2", 2.4, ""],
    ["Gem 3", 2.4, ""],
    ["Outro", 2.8, "keep it quiet 🤫"],
  ]),
  tpl("travel-hotel", "Hotel Tour", "travel", "Room reveal, room by room.", "slide", "warm", "subtitle", "luxe lounge", "#d946ef", [
    ["Door", 2, "room tour"],
    ["Bed", 2.2, "the bed"],
    ["Bathroom", 2.2, "the bathroom"],
    ["View", 2.6, "the view 😮"],
    ["Verdict", 2.6, "would book again"],
  ]),
  tpl("travel-packing", "What's In My Bag", "travel", "Item-by-item unpack.", "cut", "none", "sticker", "tidy click track", "#a3a3a3", [
    ["The bag", 2, "what's in my carry on"],
    ["Item 1", 1.8, ""],
    ["Item 2", 1.8, ""],
    ["Item 3", 1.8, ""],
    ["Item 4", 1.8, ""],
    ["Packed", 2.4, "that's everything"],
  ]),
  tpl("travel-sunset", "Golden Hour Abroad", "travel", "One long, slow sunset.", "fade", "golden", "minimal-corner", "ambient warm pad", "#fb923c", [
    ["Before", 3, ""],
    ["Peak", 3.4, "golden hour hits different here"],
    ["After", 3.2, ""],
  ]),
  tpl("travel-food-map", "Eating My Way Through", "travel", "A city told through meals.", "whip", "vivid", "subtitle", "market bustle", "#ef4444", [
    ["City", 2.2, "eating my way through"],
    ["Breakfast", 2.2, "breakfast"],
    ["Lunch", 2.2, "lunch"],
    ["Snack", 2, "snack"],
    ["Dinner", 2.6, "dinner 🍜"],
  ]),

  // ─── Food ────────────────────────────────────────────────────────────
  tpl("food-recipe", "Recipe in 5 Steps", "food", "Numbered cooking steps.", "cut", "warm", "counter", "kitchen clatter beat", "#f59e0b", [
    ["Ingredients", 2.2, "you'll need:"],
    ["Step 1", 2, "1"],
    ["Step 2", 2, "2"],
    ["Step 3", 2, "3"],
    ["Step 4", 2, "4"],
    ["Final dish", 3.2, "done 🍽️"],
  ]),
  tpl("food-restaurant", "Restaurant Review", "food", "Dish by dish, then a rating.", "slide", "vivid", "subtitle", "jazzy bistro", "#dc2626", [
    ["The place", 2.2, "trying this spot"],
    ["Starter", 2.2, "starter — 8/10"],
    ["Main", 2.4, "main — 9/10"],
    ["Dessert", 2.2, "dessert — 10/10"],
    ["Verdict", 2.8, "going back"],
  ]),
  tpl("food-coffee", "Coffee Run", "food", "Small, cosy, satisfying.", "fade", "warm", "handwritten", "cafe acoustic", "#b45309", [
    ["The cafe", 2.2, ""],
    ["Ordering", 2, "same order every time"],
    ["The pour", 2.4, ""],
    ["First sip", 2.8, "perfect ☕"],
  ]),
  tpl("food-bake", "Baking Process", "food", "Batter to golden brown.", "fade", "warm", "subtitle", "soft kitchen pop", "#fbbf24", [
    ["Ingredients", 2.2, "let's bake"],
    ["Mixing", 2.2, "mixing"],
    ["Into the oven", 2.2, "in it goes"],
    ["Rising", 2.2, "waiting…"],
    ["Out", 3.2, "look at that 🥐"],
  ]),
  tpl("food-mealprep", "Meal Prep Sunday", "food", "Five containers, one afternoon.", "cut", "cool", "counter", "productive groove", "#16a34a", [
    ["Groceries", 2.2, "meal prep sunday"],
    ["Chopping", 2, "prep"],
    ["Cooking", 2.2, "cook"],
    ["Portioning", 2.2, "portion"],
    ["Fridge", 2.8, "set for the week ✅"],
  ]),
  tpl("food-tastetest", "Taste Test", "food", "Rank things on camera.", "whip", "vivid", "counter", "game show sting", "#e11d48", [
    ["Setup", 2, "ranking all of these"],
    ["First", 2, ""],
    ["Second", 2, ""],
    ["Third", 2, ""],
    ["Winner", 3, "winner 🏆"],
  ]),
  tpl("food-breakfast", "What I Eat in a Day", "food", "Four meals, honest portions.", "slide", "warm", "subtitle", "morning shuffle", "#f97316", [
    ["Breakfast", 2.4, "breakfast"],
    ["Lunch", 2.4, "lunch"],
    ["Snack", 2, "snack"],
    ["Dinner", 2.6, "dinner"],
    ["Dessert", 2.4, "and dessert obviously"],
  ]),
  tpl("food-plating", "Plating It Up", "food", "Slow, close, chef-y.", "blur", "moody", "minimal-corner", "fine dining ambient", "#78716c", [
    ["Empty plate", 2.2, ""],
    ["Base", 2.2, ""],
    ["Layers", 2.4, ""],
    ["Garnish", 2.4, ""],
    ["Final", 3.2, "service 🍴"],
  ]),

  // ─── Fitness ─────────────────────────────────────────────────────────
  tpl("fit-transform", "Transformation", "fitness", "The classic side-by-side journey.", "fade", "vivid", "counter", "motivational build", "#22c55e", [
    ["Before", 3, "before"],
    ["Month 1", 2.4, "month 1"],
    ["Month 3", 2.4, "month 3"],
    ["Month 6", 3.4, "month 6 💪"],
  ]),
  tpl("fit-workout", "Workout of the Day", "fitness", "Exercise list with counts.", "cut", "moody", "counter", "heavy gym bass", "#ef4444", [
    ["Warm up", 2, "warm up"],
    ["Move 1", 2, "4 x 10"],
    ["Move 2", 2, "4 x 12"],
    ["Move 3", 2, "3 x 15"],
    ["Finisher", 2.2, "finisher"],
    ["Done", 2.6, "session done"],
  ]),
  tpl("fit-run", "Run With Me", "fitness", "Pace, distance, and views.", "slide", "cool", "subtitle", "running tempo", "#0ea5e9", [
    ["Start", 2.2, "km 0"],
    ["Mid", 2.2, "km 3"],
    ["Hard part", 2.2, "km 6 — hurting"],
    ["Finish", 3, "km 10 ✅"],
  ]),
  tpl("fit-gymtour", "Gym Day", "fitness", "Arrive, lift, leave.", "whip", "moody", "bold-center", "hype trap loop", "#7c3aed", [
    ["Arrival", 2, "gym day"],
    ["Warm up", 2, ""],
    ["Main lift", 2.4, "main lift"],
    ["Accessories", 2, ""],
    ["Post gym", 2.6, "earned it"],
  ]),
  tpl("fit-stretch", "Morning Stretch", "fitness", "Calm, slow, restorative.", "fade", "dreamy", "minimal-corner", "sunrise ambient", "#a7f3d0", [
    ["Wake", 2.6, "5 minutes, every morning"],
    ["Stretch 1", 2.4, ""],
    ["Stretch 2", 2.4, ""],
    ["Stretch 3", 2.4, ""],
    ["Finish", 3, "ready for the day"],
  ]),
  tpl("fit-progress", "Progress Check", "fitness", "Honest monthly check-in.", "fade", "none", "counter", "steady beat", "#14b8a6", [
    ["Front", 2.6, "month 1"],
    ["Side", 2.4, "month 2"],
    ["Back", 2.4, "month 3"],
    ["Now", 3.2, "still going"],
  ]),
  tpl("fit-pr", "New PR", "fitness", "Build to the lift.", "flash", "moody", "bold-center", "heavy drop", "#dc2626", [
    ["Setup", 2.2, "going for a PR today"],
    ["Warm up sets", 2, ""],
    ["The attempt", 2.8, "here goes"],
    ["Celebration", 3.2, "NEW PR 🔥"],
  ]),

  // ─── Outfits ─────────────────────────────────────────────────────────
  tpl("fit-check", "Outfit Check", "outfit", "One fit, three angles.", "whip", "vivid", "sticker", "runway beat", "#ec4899", [
    ["Front", 2.2, "fit check"],
    ["Detail", 2, "details"],
    ["Full", 2.6, "rate it /10"],
  ]),
  tpl("outfit-week", "A Week of Outfits", "outfit", "Monday through Friday.", "slide", "film", "counter", "chic loop", "#f472b6", [
    ["Monday", 2, "mon"],
    ["Tuesday", 2, "tue"],
    ["Wednesday", 2, "wed"],
    ["Thursday", 2, "thu"],
    ["Friday", 2.6, "fri — favourite"],
  ]),
  tpl("outfit-transition", "Outfit Transition", "outfit", "Snap from casual to dressed.", "flash", "vivid", "bold-center", "transition snap", "#a855f7", [
    ["Before", 2.4, "from this"],
    ["After", 3.2, "to this ✨"],
  ]),
  tpl("outfit-thrift", "Thrift Haul", "outfit", "Show the finds and the price.", "cut", "film", "sticker", "vintage shuffle", "#84cc16", [
    ["The haul", 2.2, "thrift haul"],
    ["Find 1", 2, "$6"],
    ["Find 2", 2, "$12"],
    ["Find 3", 2, "$8"],
    ["Styled", 2.8, "all under $30"],
  ]),
  tpl("outfit-styling", "One Piece, 3 Ways", "outfit", "Style a single item three ways.", "slide", "warm", "counter", "styling groove", "#f59e0b", [
    ["The piece", 2.4, "one piece, 3 ways"],
    ["Way 1", 2.4, "1 — casual"],
    ["Way 2", 2.4, "2 — work"],
    ["Way 3", 2.8, "3 — night out"],
  ]),
  tpl("outfit-shoes", "Shoe Rotation", "outfit", "The current lineup.", "cut", "none", "sticker", "clean click", "#64748b", [
    ["The lineup", 2.2, "current rotation"],
    ["Pair 1", 1.8, ""],
    ["Pair 2", 1.8, ""],
    ["Pair 3", 1.8, ""],
    ["Favourite", 2.6, "most worn"],
  ]),
  tpl("outfit-seasonal", "Seasonal Wardrobe", "outfit", "Swap the closet over.", "fade", "cool", "subtitle", "cosy transition", "#0891b2", [
    ["Old season", 2.4, "packing summer away"],
    ["Sorting", 2.2, ""],
    ["New season", 2.4, "autumn in"],
    ["Done", 2.8, "closet reset"],
  ]),
  tpl("outfit-mirror", "Mirror Selfie Dump", "outfit", "Nine mirror shots, fast.", "cut", "film", "minimal-corner", "shutter loop", "#d946ef", [
    ["Shot 1", 1.4, ""],
    ["Shot 2", 1.4, ""],
    ["Shot 3", 1.4, ""],
    ["Shot 4", 1.4, ""],
    ["Shot 5", 1.4, ""],
    ["Shot 6", 2.4, "mirror dump 🪞"],
  ]),

  // ─── Aesthetic ───────────────────────────────────────────────────────
  tpl("aes-slowmo", "Slow Motion Dreams", "aesthetic", "Long holds, heavy zoom.", "zoom", "dreamy", "minimal-corner", "slowed reverb", "#c4b5fd", [
    ["Frame 1", 3.4, ""],
    ["Frame 2", 3.4, ""],
    ["Frame 3", 3.6, ""],
  ]),
  tpl("aes-filmgrain", "Shot on Film", "aesthetic", "Grainy, warm, imperfect.", "fade", "film", "handwritten", "tape hiss guitar", "#a16207", [
    ["Frame 1", 2.6, ""],
    ["Frame 2", 2.6, ""],
    ["Frame 3", 2.6, ""],
    ["Frame 4", 3, "shot on film"],
  ]),
  tpl("aes-bw", "Black & White Study", "aesthetic", "Monochrome, high contrast.", "fade", "bw", "minimal-corner", "solo piano", "#404040", [
    ["Frame 1", 3, ""],
    ["Frame 2", 3, ""],
    ["Frame 3", 3, ""],
    ["Frame 4", 3.2, ""],
  ]),
  tpl("aes-golden", "Golden Hour", "aesthetic", "That one hour of light.", "zoom", "golden", "handwritten", "warm strings", "#f59e0b", [
    ["Light 1", 2.8, ""],
    ["Light 2", 2.8, ""],
    ["Light 3", 3.4, "golden hour"],
  ]),
  tpl("aes-blur", "Soft Focus", "aesthetic", "Dreamy blur transitions.", "blur", "dreamy", "minimal-corner", "shoegaze wash", "#f9a8d4", [
    ["Frame 1", 2.8, ""],
    ["Frame 2", 2.8, ""],
    ["Frame 3", 3.2, ""],
  ]),
  tpl("aes-neon", "Neon Nights", "aesthetic", "City lights after dark.", "flash", "moody", "bold-center", "synthwave pulse", "#d946ef", [
    ["Street", 2.4, ""],
    ["Signs", 2.2, ""],
    ["Reflection", 2.4, ""],
    ["Wide", 3, "city nights"],
  ]),
  tpl("aes-minimal", "Minimal Frames", "aesthetic", "Negative space and calm.", "cut", "fade", "minimal-corner", "sparse ambient", "#e5e5e5", [
    ["Frame 1", 3, ""],
    ["Frame 2", 3, ""],
    ["Frame 3", 3, ""],
  ]),
  tpl("aes-vhs", "VHS Memories", "aesthetic", "Retro tape look.", "flash", "film", "counter", "retro synth", "#6366f1", [
    ["Clip 1", 2.4, "▶ PLAY"],
    ["Clip 2", 2.4, ""],
    ["Clip 3", 2.4, ""],
    ["End", 2.8, "■ STOP"],
  ]),
  tpl("aes-polaroid", "Polaroid Stack", "aesthetic", "Photos landing one by one.", "slide", "warm", "handwritten", "gentle ukulele", "#fcd34d", [
    ["Photo 1", 2.2, ""],
    ["Photo 2", 2.2, ""],
    ["Photo 3", 2.2, ""],
    ["Photo 4", 2.8, "keeping these"],
  ]),
  tpl("aes-mirror", "Mirror Edit", "aesthetic", "Symmetry and repetition.", "whip", "vivid", "bold-center", "glitch beat", "#8b5cf6", [
    ["Frame 1", 2, ""],
    ["Frame 2", 2, ""],
    ["Frame 3", 2, ""],
    ["Frame 4", 2.6, ""],
  ]),

  // ─── Day in the life ─────────────────────────────────────────────────
  tpl("dail-morning", "Morning Routine", "daily", "First two hours of the day.", "fade", "warm", "subtitle", "sunrise lo-fi", "#fbbf24", [
    ["Wake up", 2.2, "6:00am"],
    ["Water", 1.8, "6:10"],
    ["Movement", 2.2, "6:30"],
    ["Breakfast", 2.2, "7:15"],
    ["Ready", 2.8, "8:00 — let's go"],
  ]),
  tpl("dail-full", "Day In My Life", "daily", "Sunrise to lights out.", "slide", "film", "subtitle", "day loop", "#3b82f6", [
    ["Morning", 2.2, "morning"],
    ["Work", 2.2, "work"],
    ["Lunch", 2, "lunch"],
    ["Afternoon", 2.2, "afternoon"],
    ["Evening", 2.2, "evening"],
    ["Night", 2.8, "night — same tomorrow"],
  ]),
  tpl("dail-night", "Night Routine", "daily", "Wind down, warm and dim.", "fade", "moody", "minimal-corner", "sleepy keys", "#4c1d95", [
    ["Dinner", 2.2, "8pm"],
    ["Shower", 2, "9pm"],
    ["Skincare", 2.2, "9:30"],
    ["Reading", 2.2, "10pm"],
    ["Lights out", 2.8, "goodnight 🌙"],
  ]),
  tpl("dail-sunday", "Slow Sunday", "daily", "No plans, no rush.", "blur", "dreamy", "handwritten", "lazy acoustic", "#fda4af", [
    ["Late start", 2.6, "no alarm today"],
    ["Coffee", 2.4, ""],
    ["Reading", 2.4, ""],
    ["Walk", 2.4, ""],
    ["Evening", 3, "perfect sunday"],
  ]),
  tpl("dail-productive", "Productive Day", "daily", "Checklist energy.", "cut", "cool", "counter", "focus beat", "#0ea5e9", [
    ["The list", 2.2, "today's list"],
    ["Task 1", 1.8, "✓"],
    ["Task 2", 1.8, "✓"],
    ["Task 3", 1.8, "✓"],
    ["Task 4", 1.8, "✓"],
    ["Done", 2.6, "all done"],
  ]),
  tpl("dail-commute", "Commute Diary", "daily", "The in-between moments.", "slide", "cool", "minimal-corner", "train rhythm", "#64748b", [
    ["Leaving", 2.2, ""],
    ["Platform", 2.2, ""],
    ["Window", 2.4, ""],
    ["Arrival", 2.6, "same route, every day"],
  ]),
  tpl("dail-wfh", "Work From Home", "daily", "Desk, coffee, repeat.", "cut", "fade", "subtitle", "quiet keys", "#94a3b8", [
    ["Desk setup", 2.2, "9am"],
    ["Deep work", 2.2, "11am"],
    ["Lunch break", 2, "1pm"],
    ["Meetings", 2.2, "3pm"],
    ["Log off", 2.6, "5pm — done"],
  ]),

  // ─── Before & after ──────────────────────────────────────────────────
  tpl("ba-room", "Room Makeover", "beforeafter", "Empty to finished.", "fade", "vivid", "bold-center", "transformation build", "#8b5cf6", [
    ["Before", 3, "before"],
    ["Progress", 2.4, "during"],
    ["Details", 2.2, ""],
    ["After", 3.4, "after 🤍"],
  ]),
  tpl("ba-hair", "Hair Transformation", "beforeafter", "The big chop or colour.", "flash", "vivid", "bold-center", "reveal sting", "#f43f5e", [
    ["Before", 2.8, "before"],
    ["In progress", 2.4, "trusting the process"],
    ["After", 3.6, "after ✂️"],
  ]),
  tpl("ba-diy", "DIY Before & After", "beforeafter", "Show the work, then the win.", "slide", "warm", "counter", "workshop beat", "#f59e0b", [
    ["Before", 2.6, "found it like this"],
    ["Step 1", 2, ""],
    ["Step 2", 2, ""],
    ["After", 3.4, "brand new"],
  ]),
  tpl("ba-glowup", "Glow Up", "beforeafter", "Then versus now.", "zoom", "golden", "bold-center", "confidence anthem", "#ec4899", [
    ["Then", 3, "then"],
    ["Now", 3.6, "now ✨"],
  ]),
  tpl("ba-clean", "Clean With Me", "beforeafter", "Mess to spotless.", "cut", "cool", "counter", "satisfying tempo", "#06b6d4", [
    ["The mess", 2.6, "before"],
    ["Clearing", 2, ""],
    ["Wiping", 2, ""],
    ["Organised", 2.2, ""],
    ["Done", 3, "so much better"],
  ]),
  tpl("ba-plant", "Plant Progress", "beforeafter", "Growth over months.", "fade", "vivid", "counter", "gentle green", "#22c55e", [
    ["Week 1", 2.6, "week 1"],
    ["Week 6", 2.4, "week 6"],
    ["Week 12", 2.4, "week 12"],
    ["Now", 3.2, "look at it now 🌿"],
  ]),

  // ─── Photo dumps ─────────────────────────────────────────────────────
  tpl("dump-camera-roll", "Camera Roll Dump", "dump", "Unfiltered, straight from the roll.", "cut", "none", "minimal-corner", "shuffle loop", "#a855f7", [
    ["1", 1.5, ""],
    ["2", 1.5, ""],
    ["3", 1.5, ""],
    ["4", 1.5, ""],
    ["5", 1.5, ""],
    ["6", 2.4, "camera roll dump"],
  ]),
  tpl("dump-month", "Monthly Dump", "dump", "The month, unsorted.", "slide", "film", "handwritten", "warm shuffle", "#f97316", [
    ["1", 1.8, ""],
    ["2", 1.8, ""],
    ["3", 1.8, ""],
    ["4", 1.8, ""],
    ["5", 2.6, "that was the month"],
  ]),
  tpl("dump-friends", "Friends Dump", "dump", "The people, not the places.", "cut", "warm", "sticker", "feel good pop", "#fbbf24", [
    ["1", 1.8, ""],
    ["2", 1.8, ""],
    ["3", 1.8, ""],
    ["4", 1.8, ""],
    ["5", 2.6, "my people 💛"],
  ]),
  tpl("dump-random", "Random Nine", "dump", "Nine unrelated frames.", "cut", "vivid", "counter", "quick shuffle", "#e11d48", [
    ["1", 1.3, "1"],
    ["2", 1.3, "2"],
    ["3", 1.3, "3"],
    ["4", 1.3, "4"],
    ["5", 1.3, "5"],
    ["6", 1.3, "6"],
    ["7", 2.2, "…and more"],
  ]),
  tpl("dump-blurry", "Blurry & Happy", "dump", "The out-of-focus good ones.", "blur", "dreamy", "handwritten", "hazy indie", "#f9a8d4", [
    ["1", 2.2, ""],
    ["2", 2.2, ""],
    ["3", 2.2, ""],
    ["4", 2.8, "blurry but happy"],
  ]),
  tpl("dump-film", "Film Dump", "dump", "A developed roll, in order.", "fade", "film", "minimal-corner", "analog warmth", "#a16207", [
    ["Frame 1", 2.2, ""],
    ["Frame 2", 2.2, ""],
    ["Frame 3", 2.2, ""],
    ["Frame 4", 2.2, ""],
    ["Frame 5", 2.8, "roll 01"],
  ]),

  // ─── Pets ────────────────────────────────────────────────────────────
  tpl("pet-intro", "Meet My Pet", "pets", "An introduction with stats.", "slide", "vivid", "sticker", "playful bounce", "#fb923c", [
    ["Hello", 2.4, "meet my best friend"],
    ["Name", 2.2, "name:"],
    ["Age", 2, "age:"],
    ["Favourite thing", 2.2, "loves:"],
    ["Portrait", 2.8, "that's him 🐾"],
  ]),
  tpl("pet-day", "A Day With My Dog", "pets", "Their whole schedule.", "cut", "warm", "subtitle", "happy trot", "#f59e0b", [
    ["Wake up", 2, "6am — already awake"],
    ["Walk", 2.2, "8am — walk"],
    ["Nap", 2, "11am — nap"],
    ["Play", 2.2, "3pm — zoomies"],
    ["Sleep", 2.6, "9pm — out cold"],
  ]),
  tpl("pet-growth", "Growing Up", "pets", "Puppy to full size.", "fade", "warm", "counter", "sentimental piano", "#fcd34d", [
    ["Day one", 2.8, "8 weeks"],
    ["6 months", 2.4, "6 months"],
    ["1 year", 2.4, "1 year"],
    ["Now", 3.2, "still my baby"],
  ]),
  tpl("pet-zoomies", "Zoomies", "pets", "Fast cuts, chaotic energy.", "whip", "vivid", "bold-center", "frantic fun", "#22c55e", [
    ["Calm", 2, "he was calm"],
    ["Trigger", 1.6, "then…"],
    ["Chaos 1", 1.6, ""],
    ["Chaos 2", 1.6, ""],
    ["Exhausted", 2.6, "and now he's asleep"],
  ]),
  tpl("pet-nap", "Professional Napper", "pets", "Slow and very sleepy.", "fade", "dreamy", "handwritten", "lullaby keys", "#c4b5fd", [
    ["Spot 1", 2.6, ""],
    ["Spot 2", 2.6, ""],
    ["Spot 3", 2.6, ""],
    ["Best spot", 3, "certified professional 😴"],
  ]),

  // ─── Celebrations ────────────────────────────────────────────────────
  tpl("cel-birthday", "Birthday Recap", "celebration", "Cake, people, confetti.", "flash", "vivid", "bold-center", "party anthem", "#ec4899", [
    ["Setup", 2.2, "birthday 🎂"],
    ["People", 2.2, ""],
    ["Cake", 2.4, "cake time"],
    ["Dancing", 2.2, ""],
    ["End", 2.8, "best day"],
  ]),
  tpl("cel-graduation", "Graduation Day", "celebration", "Cap, gown, and the walk.", "zoom", "golden", "bold-center", "triumphant swell", "#eab308", [
    ["Getting ready", 2.2, "graduation day 🎓"],
    ["The walk", 2.6, ""],
    ["Diploma", 2.4, "we did it"],
    ["Family", 2.4, ""],
    ["Cap toss", 3, "finally"],
  ]),
  tpl("cel-wedding", "Wedding Day", "celebration", "Slow, warm, cinematic.", "fade", "golden", "handwritten", "string quartet", "#fda4af", [
    ["Morning", 2.6, "the morning of"],
    ["Details", 2.4, ""],
    ["Ceremony", 2.8, "i do"],
    ["Reception", 2.6, ""],
    ["First dance", 3.4, "forever 🤍"],
  ]),
  tpl("cel-newyear", "New Year", "celebration", "Countdown to midnight.", "flash", "moody", "counter", "countdown drop", "#8b5cf6", [
    ["Getting ready", 2.2, "nye"],
    ["Party", 2.2, "11:30"],
    ["Countdown", 2, "10…9…8…"],
    ["Midnight", 3.2, "happy new year 🎆"],
  ]),
  tpl("cel-anniversary", "Anniversary", "celebration", "Then and now, side by side.", "fade", "golden", "handwritten", "romantic acoustic", "#f43f5e", [
    ["First photo", 2.6, "year one"],
    ["Middle", 2.4, "the years between"],
    ["Recent", 2.4, ""],
    ["Today", 3.2, "still choosing you"],
  ]),
  tpl("cel-party", "Party Night", "celebration", "Loud, bright, fast.", "flash", "vivid", "sticker", "club mix", "#d946ef", [
    ["Pre drinks", 2, ""],
    ["Arrival", 2, ""],
    ["Dance floor", 2.2, ""],
    ["Late", 2, "3am"],
    ["Taxi home", 2.6, "worth it"],
  ]),

  // ─── Study & work ────────────────────────────────────────────────────
  tpl("work-studywithme", "Study With Me", "work", "Pomodoro blocks on screen.", "cut", "fade", "counter", "quiet lo-fi", "#3b82f6", [
    ["Setup", 2.2, "study with me"],
    ["Block 1", 2, "25:00"],
    ["Break", 1.8, "5 min break"],
    ["Block 2", 2, "25:00"],
    ["Done", 2.6, "2 hours in ✅"],
  ]),
  tpl("work-desk", "Desk Setup", "work", "Tour the workspace.", "slide", "cool", "subtitle", "clean tech beat", "#0ea5e9", [
    ["Wide shot", 2.4, "desk setup 2025"],
    ["Monitor", 2, ""],
    ["Keyboard", 2, ""],
    ["Details", 2.2, ""],
    ["Lit up", 2.8, "finally finished"],
  ]),
  tpl("work-notes", "Notes Aesthetic", "work", "Neat pages, close up.", "fade", "warm", "handwritten", "paper and pen", "#f59e0b", [
    ["Blank page", 2.2, ""],
    ["Writing", 2.4, ""],
    ["Colour coding", 2.4, ""],
    ["Finished page", 3, "notes done ✍️"],
  ]),
  tpl("work-finals", "Finals Week", "work", "The grind, honestly.", "cut", "moody", "counter", "tense focus", "#6366f1", [
    ["Day 1", 2, "day 1 — motivated"],
    ["Day 3", 2, "day 3 — struggling"],
    ["Day 5", 2, "day 5 — running on coffee"],
    ["Last exam", 2.4, "last exam"],
    ["Freedom", 2.8, "IT'S OVER"],
  ]),
  tpl("work-launch", "Project Launch", "work", "Build up to shipping.", "zoom", "vivid", "bold-center", "build and drop", "#10b981", [
    ["The idea", 2.2, "started with an idea"],
    ["Building", 2.2, "months of work"],
    ["Testing", 2.2, "almost there"],
    ["Launch", 3.2, "it's live 🚀"],
  ]),
];

export function getTemplate(id: string): ReelTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export function templateDuration(t: ReelTemplate): number {
  return t.slots.reduce((n, s) => n + s.seconds, 0);
}
