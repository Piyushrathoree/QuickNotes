/**
 * Comparison pages. Every statement about another product comes from that product's own pages (listed as sources on
 * each page) and was checked on `compareChecked`. Where a product's pages don't say something, it is left out rather
 * than guessed. Statements about Quick Notes describe what it does today.
 */

export const compareChecked = "2026-11-24";

export interface CompareRow {
  label: string;
  quick: string;
  other: string;
}

export interface CompareFaq {
  question: string;
  answer: string;
}

export interface Comparison {
  slug: string;
  name: string;
  /** One line for the hub card and the footer: what the other product is best at. */
  best: string;
  /** Meta description. */
  description: string;
  /** A neutral paragraph about the other product. */
  summary: string;
  quickPick: string[];
  otherPick: string[];
  rows: CompareRow[];
  faq: CompareFaq[];
  sources: { label: string; url: string }[];
}

const QUICK = {
  account: "Not needed to start. Guest notes save in your browser. A free account (email and password) syncs them.",
  formatting: "Markdown formats as you type: headings, lists, checklists, tables, quotes and code.",
  runs: "In any modern browser, on phone or desktop. An Android app is in testing.",
  export: "Download any note as Markdown (.md) or plain text (.txt).",
  sharing: "A view-only link for any saved note. Turn it off and the link stops working.",
  cost: "Free and open source (MIT).",
  ai: "Connect Claude, Cursor and other MCP apps with a token you can revoke.",
};

export const comparisons: Comparison[] = [
  {
    slug: "notion",
    name: "Notion",
    best: "Organizing projects, wikis and linked pages",
    description:
      "Quick Notes vs Notion: a free notepad that opens to a blank page versus a full workspace of pages and databases. See what each does and which fits.",
    summary:
      "Notion describes itself as an AI workspace. Its pages are built from blocks, and its databases are collections of pages you can view as a table, board or calendar. It runs on the web, desktop and mobile.",
    quickPick: [
      "You want to write a note right now, with no sign-up and nothing to set up.",
      "You want your notes as plain Markdown or text files you can take anywhere.",
      "You mostly keep scratch notes, drafts and checklists, not a team wiki.",
    ],
    otherPick: [
      "Your notes belong in a workspace with linked pages, databases and several views of the same data.",
      "You collaborate with others on projects and want everything in one place.",
      "You want built-in AI features inside your notes.",
    ],
    rows: [
      { label: "Getting started", quick: QUICK.account, other: "You sign up to use it. There is a free plan." },
      {
        label: "Formatting",
        quick: QUICK.formatting,
        other: "Markdown shortcuts as you type (#, -, [], > and more) inside pages made of blocks.",
      },
      {
        label: "Organizing",
        quick: "A flat list of notes in a sidebar. Simple on purpose.",
        other: "Pages, databases and views. Each database item is its own page.",
      },
      { label: "Where it runs", quick: QUICK.runs, other: "Web, desktop and mobile apps. It can be used offline on desktop and mobile." },
      { label: "Export", quick: QUICK.export, other: "PDF, HTML, and Markdown & CSV." },
      {
        label: "Sharing",
        quick: QUICK.sharing,
        other: "Share with a link, or publish a page to the web. Both are described in its help centre.",
      },
      {
        label: "Cost",
        quick: QUICK.cost,
        other: "A free plan with limits (such as a cap on blocks, 5 MB uploads and 7-day page history). Paid plans add more.",
      },
      { label: "AI access", quick: QUICK.ai, other: "Notion AI and agent features, with a limited trial on the free plan." },
    ],
    faq: [
      {
        question: "Is Quick Notes a Notion alternative?",
        answer:
          "For quick personal notes, yes. Quick Notes is a free notepad for scratch notes, meeting drafts and checklists. It isn't a workspace with databases and linked pages, so teams and projects are better served by Notion.",
      },
      {
        question: "Can I move a Quick Notes note into Notion?",
        answer:
          "Yes. Download the note as Markdown and import or paste it into Notion. Notion also exports pages as Markdown, which you can open in Quick Notes.",
      },
    ],
    sources: [
      { label: "Notion product", url: "https://www.notion.com/product" },
      { label: "Intro to databases", url: "https://www.notion.com/help/intro-to-databases" },
      { label: "Keyboard shortcuts and Markdown", url: "https://www.notion.com/help/keyboard-shortcuts" },
      { label: "Export your content", url: "https://www.notion.com/help/export-your-content" },
      { label: "Public pages and web publishing", url: "https://www.notion.com/help/public-pages-and-web-publishing" },
      { label: "Pricing", url: "https://www.notion.com/pricing" },
    ],
  },
  {
    slug: "obsidian",
    name: "Obsidian",
    best: "A linked Markdown knowledge base on your own files",
    description:
      "Quick Notes vs Obsidian: quick Markdown capture in the browser versus a local vault of linked notes. See how they differ and how to use them together.",
    summary:
      "Obsidian stores your notes locally as plain-text Markdown files in a folder called a vault, so you can use them offline. It has plugins, a graph view and editing modes including Live Preview.",
    quickPick: [
      "You want to capture a note in a browser without installing anything.",
      "You'd like formatting to appear as you type, on any computer or phone.",
      "You want a quick draft you can later drop into a vault as a .md file.",
    ],
    otherPick: [
      "You're building a long-lived knowledge base with links between notes.",
      "You want your notes as files on your own disk, working offline.",
      "You like extending your tools with plugins and themes.",
    ],
    rows: [
      { label: "Getting started", quick: QUICK.account, other: "No sign-up is required to use it." },
      {
        label: "Formatting",
        quick: QUICK.formatting,
        other: "Markdown with Live Preview, Source mode and Reading view. Thousands of plugins and themes.",
      },
      {
        label: "Where notes live",
        quick: "In your browser until you save them to a free account.",
        other: "As plain Markdown files in a vault, a folder on your device. It works offline.",
      },
      {
        label: "Where it runs",
        quick: QUICK.runs,
        other: "Desktop and mobile apps. The pages we read don't mention a web app.",
      },
      { label: "Export", quick: QUICK.export, other: "Your notes are already Markdown files you own." },
      {
        label: "Sharing",
        quick: QUICK.sharing,
        other: "Publish, an optional paid add-on, turns notes into an online site.",
      },
      {
        label: "Cost",
        quick: QUICK.cost,
        other: "Free for personal use. Sync and Publish are optional paid add-ons.",
      },
      { label: "AI access", quick: QUICK.ai, other: "Not covered on the pages we read." },
    ],
    faq: [
      {
        question: "Can I use Quick Notes with Obsidian?",
        answer:
          "Yes. Quick Notes saves a note as Markdown, so you can download it and move the file into an Obsidian vault whenever you're ready.",
      },
      {
        question: "Is Quick Notes a browser version of Obsidian?",
        answer:
          "No. Obsidian is a local app for a linked knowledge base. Quick Notes is a lightweight browser notepad for quick Markdown capture, without links, a graph or plugins.",
      },
    ],
    sources: [
      { label: "Obsidian home", url: "https://obsidian.md/" },
      { label: "How Obsidian stores data", url: "https://obsidian.md/help/Files+and+folders/How+Obsidian+stores+data" },
      { label: "Basic formatting syntax", url: "https://obsidian.md/help/Editing+and+formatting/Basic+formatting+syntax" },
      { label: "Pricing", url: "https://obsidian.md/pricing" },
      { label: "Obsidian Sync", url: "https://obsidian.md/sync" },
      { label: "Obsidian Publish", url: "https://obsidian.md/publish" },
    ],
  },
  {
    slug: "google-keep",
    name: "Google Keep",
    best: "Quick lists, reminders, photos and voice notes",
    description:
      "Quick Notes vs Google Keep: Markdown notes with no sign-up versus Google's notes, lists and reminders. See what each is good at.",
    summary:
      "Google describes Keep as a place to create and share notes, lists, photos, drawings and audio, accessible from anywhere. Its help pages cover checklists, labels, colour, pins, archive and reminders.",
    quickPick: [
      "You write mostly text and want Markdown formatting as you type.",
      "You'd rather not sign in to take a note.",
      "You want a plain .md or .txt file to take with you.",
    ],
    otherPick: [
      "You want reminders, photo notes, drawings or voice notes.",
      "You like colour and labels to sort quick lists.",
      "You already live in Google's apps and want notes alongside them.",
    ],
    rows: [
      { label: "Getting started", quick: QUICK.account, other: "Its pages link to a sign-in." },
      {
        label: "What you can write",
        quick: QUICK.formatting,
        other: "Checklists, image notes, drawings, audio, labels, colour, pins and reminders. Its help pages don't describe Markdown or text styling.",
      },
      { label: "Where it runs", quick: QUICK.runs, other: "In the browser and on phones. Notes sync between your devices." },
      { label: "Offline", quick: "Notes are kept in your browser as you type.", other: "Notes stay updated offline and sync when you reconnect." },
      {
        label: "Export",
        quick: QUICK.export,
        other: "Download your data as an archive, or export notes to Google Docs.",
      },
      {
        label: "Sharing",
        quick: QUICK.sharing,
        other: "Share a note so others can edit it. To share without edit rights, send it with another app.",
      },
      { label: "Cost", quick: QUICK.cost, other: "Not covered on the pages we read." },
    ],
    faq: [
      {
        question: "Is Quick Notes better than Google Keep?",
        answer:
          "They're good at different things. Keep is strong for reminders, photos, drawings and voice notes. Quick Notes is better when you want Markdown formatting as you type, no sign-in, and files you can download as .md or .txt.",
      },
      {
        question: "Does Google Keep support Markdown?",
        answer:
          "Google's Keep help pages describe lists, labels, colour, reminders, drawings and audio, but they don't describe Markdown or text styling. Quick Notes formats Markdown as you type.",
      },
    ],
    sources: [
      { label: "Google Keep (Workspace)", url: "https://workspace.google.com/products/keep/" },
      { label: "What you need to use Keep", url: "https://support.google.com/keep/answer/9050190" },
      { label: "Share a note", url: "https://support.google.com/keep/answer/6101196" },
      { label: "Export your Keep data", url: "https://support.google.com/keep/answer/10017039" },
    ],
  },
  {
    slug: "apple-notes",
    name: "Apple Notes",
    best: "Notes that sync across your Apple devices",
    description:
      "Quick Notes vs Apple Notes: a browser notepad on any device versus Apple's built-in notes app. See formatting, export and sharing side by side.",
    summary:
      "Apple Notes lets you capture quick thoughts or longer notes with checklists, images and web links. Apple's guide covers Mac, iPhone and iPad, and iCloud notes sync across your devices.",
    quickPick: [
      "You use Windows, Linux, Android or a Chromebook, or a mix of devices.",
      "You'd rather not use an Apple account to write a note.",
      "You want Markdown to format as you type.",
    ],
    otherPick: [
      "You use Apple devices and want notes built into them.",
      "You want shared folders and real-time collaboration through iCloud.",
      "You like Heading and Subheading styles, tables and collapsible sections.",
    ],
    rows: [
      { label: "Getting started", quick: QUICK.account, other: "iCloud notes sync across your Apple devices." },
      {
        label: "Formatting",
        quick: QUICK.formatting,
        other: "Heading and Subheading styles, checklists, tables, block quotes and collapsible sections.",
      },
      { label: "Where it runs", quick: QUICK.runs, other: "Mac, iPhone and iPad. Shared notes can also be opened on iCloud.com." },
      {
        label: "Export",
        quick: QUICK.export,
        other: "On the Mac app, export as PDF or Markdown, or copy a note as Markdown.",
      },
      {
        label: "Sharing",
        quick: QUICK.sharing,
        other: "Share a link for real-time collaboration, with access for chosen people or anyone with the link. It needs upgraded iCloud notes.",
      },
      { label: "Cost", quick: QUICK.cost, other: "Not covered on the pages we read." },
    ],
    faq: [
      {
        question: "Is there a way to use Quick Notes instead of Apple Notes on Windows?",
        answer:
          "Yes. Quick Notes runs in any modern browser, so it works on Windows, Linux, Android and Chromebooks as well as on Apple devices.",
      },
      {
        question: "Can I move notes between Apple Notes and Quick Notes?",
        answer:
          "Yes. Apple Notes on the Mac can export Markdown or copy a note as Markdown, and Quick Notes accepts pasted Markdown and downloads notes as .md.",
      },
    ],
    sources: [
      { label: "Get started with Notes", url: "https://support.apple.com/guide/notes/get-started-apd441e46563/mac" },
      { label: "Format notes", url: "https://support.apple.com/guide/notes/format-notes-apd1955d3b21/mac" },
      { label: "Import, export and print", url: "https://support.apple.com/guide/notes/import-export-and-print-notes-not201900c07/mac" },
      { label: "Share and collaborate", url: "https://support.apple.com/guide/notes/share-notes-and-collaborate-apd4e6e2c9a6/mac" },
    ],
  },
  {
    slug: "simplenote",
    name: "Simplenote",
    best: "A plain, free, syncing notepad with tags",
    description:
      "Quick Notes vs Simplenote: no account needed versus a free syncing notes app. See Markdown, sharing and export side by side.",
    summary:
      "Simplenote describes itself as the simplest way to keep notes, and is provided free by Automattic. It runs on the web, iOS, Android, Mac, Windows and Linux. Its help page says it is no longer in active development and that basic functionality is maintained.",
    quickPick: [
      "You want to write without creating an account.",
      "You want formatting to show as you type.",
      "You'd like a view-only link you can turn off at any time.",
    ],
    otherPick: [
      "You want notes that sync automatically across every platform, with tags and version history.",
      "You're happy to have an account and want a long-standing, minimal notes app.",
    ],
    rows: [
      {
        label: "Getting started",
        quick: QUICK.account,
        other: "An account is required. Its help page says there is no way to use it without one.",
      },
      {
        label: "Formatting",
        quick: QUICK.formatting,
        other: "Markdown is supported and switched on per note.",
      },
      { label: "Where it runs", quick: QUICK.runs, other: "Web, iOS, Android, Mac, Windows and Linux." },
      {
        label: "Offline",
        quick: "Notes are kept in your browser as you type.",
        other: "Apps work offline once you're signed in and notes are downloaded. They sync when you reconnect.",
      },
      {
        label: "Export",
        quick: QUICK.export,
        other: "Export notes and tags from settings, as a .zip on desktop or a JSON file on Android.",
      },
      {
        label: "Sharing",
        quick: QUICK.sharing,
        other: "Publish a read-only link, or share one note by email (the other person needs an account).",
      },
      { label: "Cost", quick: QUICK.cost, other: "Free." },
    ],
    faq: [
      {
        question: "Does Simplenote need an account?",
        answer: "Yes. Simplenote's help page says there is no way to use it without creating an account. Quick Notes lets you write as a guest, and an account is optional.",
      },
      {
        question: "Is Quick Notes a Simplenote alternative?",
        answer:
          "It can be, if you want a free, simple notepad that starts without sign-up. Quick Notes formats Markdown as you type and downloads notes as .md or .txt.",
      },
    ],
    sources: [
      { label: "Simplenote", url: "https://simplenote.com/" },
      { label: "Simplenote help", url: "https://simplenote.com/help/" },
    ],
  },
  {
    slug: "evernote",
    name: "Evernote",
    best: "A full note archive with clipping, tasks and scanning",
    description:
      "Quick Notes vs Evernote: a free, no-sign-up notepad versus a full note, task and calendar app. See plans, export and features compared.",
    summary:
      "Evernote presents itself as a second brain for notes, tasks and your schedule in one place, with a web clipper, search, calendar and document scanning. It has apps for iOS, Android, web, Windows and Mac.",
    quickPick: [
      "You want a free notepad with no plans or limits to read before you start.",
      "You'd like Markdown formatting and plain .md or .txt export.",
      "You mostly write notes and checklists, not clip pages or scan documents.",
    ],
    otherPick: [
      "You want a web clipper, document scanning, tasks and a calendar alongside your notes.",
      "You collaborate with others, with real-time editing, comments and assigned tasks.",
      "You want integrations with services like Google, Outlook and Slack.",
    ],
    rows: [
      { label: "Getting started", quick: QUICK.account, other: "Its pages offer \"Get Evernote free\" and a log-in for existing accounts." },
      {
        label: "Features",
        quick: QUICK.formatting,
        other: "Notes, tasks, calendar, web clipper, search, templates, document scanning and AI features.",
      },
      { label: "Where it runs", quick: QUICK.runs, other: "iOS, Android, web, Windows and Mac, plus Web Clipper extensions." },
      {
        label: "Free plan",
        quick: "Free, with no plan tiers.",
        other: "As listed on its plans page: 50 notes, 1 notebook, sync on 1 device and 1 GB of storage. Paid plans raise these.",
      },
      {
        label: "Export",
        quick: QUICK.export,
        other: "Its plans page mentions exporting notes and notebooks as PDFs. It doesn't list other formats there.",
      },
      {
        label: "Sharing",
        quick: QUICK.sharing,
        other: "Real-time editing, comments and assigned tasks for teamwork.",
      },
      { label: "Cost", quick: QUICK.cost, other: "A free plan plus paid plans. See Evernote's plans page for current limits and prices." },
    ],
    faq: [
      {
        question: "Is Quick Notes a free Evernote alternative?",
        answer:
          "For writing and checklists, yes. Quick Notes is free and has no plan tiers. It doesn't have a web clipper, document scanning, tasks or a calendar, so Evernote fits better if you need those.",
      },
      {
        question: "What are Evernote's free plan limits?",
        answer:
          "Evernote's plans page lists 50 notes, 1 notebook, sync on 1 device and 1 GB of storage on the free plan as of our last check. Check Evernote's plans page for current limits.",
      },
    ],
    sources: [
      { label: "Evernote", url: "https://evernote.com/" },
      { label: "Compare plans", url: "https://evernote.com/compare-plans" },
    ],
  },
  {
    slug: "notes-io",
    name: "Notes.io",
    best: "Sharing a one-off note with a short link",
    description:
      "Quick Notes vs Notes.io: a Markdown notepad with downloads versus a note you share with a short URL. See what each does best.",
    summary:
      "Notes.io lets you write a note in your browser and share it with a short URL without creating an account. It suits one-off notes you want to send in a message or email.",
    quickPick: [
      "You want formatting as you type and a downloadable .md or .txt file.",
      "You want your drafts kept in the browser as you write.",
      "You'd like the option of a free account to keep notes on every device.",
    ],
    otherPick: [
      "You want to write a note and send a short link to it right away.",
      "You don't need an account, history or a library of notes.",
    ],
    rows: [
      { label: "Getting started", quick: QUICK.account, other: "You can write and share a note without creating an account." },
      { label: "Formatting", quick: QUICK.formatting, other: "Write a note in your browser." },
      {
        label: "Sharing",
        quick: "A view-only link for a saved note. Sign in, save the note and turn sharing on. You can turn it off later.",
        other: "Share a note with a short URL.",
      },
      { label: "Export", quick: QUICK.export, other: "Not covered on the pages we read." },
      { label: "Cost", quick: QUICK.cost, other: "Not covered on the pages we read." },
    ],
    faq: [
      {
        question: "Can I share a Quick Notes note like a Notes.io link?",
        answer:
          "Yes, with one extra step. Sign in, save the note, and turn on sharing to get a view-only link. You can turn the link off when you're done.",
      },
    ],
    sources: [{ label: "Notes.io", url: "https://notes.io/etN" }],
  },
  {
    slug: "quicknote-io",
    name: "QuickNote.io",
    best: "Sharing formatted notes without signing up",
    description:
      "Quick Notes vs QuickNote.io: Markdown formatting with .md downloads versus shareable notes with links, images and code. See how they compare.",
    summary:
      "QuickNote.io supports links, images, lists and code snippets in notes you can share without signing up. Its My Notes page offers a backup code for transferring notes to another device.",
    quickPick: [
      "You want Markdown to format as you type and a downloadable .md or .txt file.",
      "You want guest drafts saved in the browser, with an optional free account for other devices.",
    ],
    otherPick: [
      "You want to share a note with images and code snippets without signing up.",
      "You like moving notes between devices with a backup code.",
    ],
    rows: [
      { label: "Getting started", quick: QUICK.account, other: "You can write and share notes without signing up." },
      {
        label: "What you can write",
        quick: QUICK.formatting,
        other: "Links, images, lists and code snippets.",
      },
      {
        label: "Moving notes",
        quick: "Sign in to open your saved notes on another device, or download a note as .md or .txt.",
        other: "Its My Notes page offers a backup code to transfer notes to another device.",
      },
      { label: "Sharing", quick: QUICK.sharing, other: "Notes can be shared without signing up." },
      { label: "Cost", quick: QUICK.cost, other: "Not covered on the pages we read." },
    ],
    faq: [
      {
        question: "How do I move Quick Notes between devices?",
        answer:
          "Create a free account, save your notes, and sign in on the other device. You can also download any note as Markdown or plain text.",
      },
    ],
    sources: [
      { label: "About QuickNote.io", url: "https://quicknote.io/about" },
      { label: "QuickNote.io My Notes", url: "https://quicknote.io/mynotes" },
    ],
  },
];

export function getComparison(slug: string): Comparison | undefined {
  return comparisons.find((comparison) => comparison.slug === slug);
}

/** Shown in the footer: the comparisons people look for most. */
export const footerComparisons = ["notion", "obsidian", "google-keep", "apple-notes", "simplenote", "evernote"]
  .map((slug) => getComparison(slug))
  .filter((comparison): comparison is Comparison => comparison !== undefined);
