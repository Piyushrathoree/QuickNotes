import type { Faq } from "@/lib/structuredData";

/**
 * Shown on /about and mirrored in its FAQPage JSON-LD and in llms.txt, so the visible text, the structured data and
 * what answer engines read always match. Keep every answer true to how the app behaves.
 */
export const faqs: readonly Faq[] = [
  {
    question: "What is Quick Notes?",
    answer:
      "Quick Notes is a free online notepad. Open the page and start typing: there is no sign-up, notes save automatically, and Markdown formats as you type.",
  },
  {
    question: "Is Quick Notes free?",
    answer:
      "Yes. Quick Notes is completely free to use, and the source code is open under the MIT license on GitHub.",
  },
  {
    question: "Do I need an account to use Quick Notes?",
    answer:
      "No. You can write as many notes as you like without an account; they are saved in your browser on that device. Create a free account with an email and password only if you want your notes to sync across devices.",
  },
  {
    question: "Where are my notes stored?",
    answer:
      "As you type, every note is stored in your browser's local storage on that device, so clearing your browser data removes unsaved notes. If you are signed in, press Save (or Ctrl+S, Cmd+S on Mac) to store the note in your account; saved notes load on any device where you sign in. Notes you wrote before signing in move into your account automatically.",
  },
  {
    question: "Does Quick Notes support Markdown?",
    answer:
      "Yes, live. Typing Markdown formats it in place: bullets and numbered lists, checklists, headings, horizontal rules, quotes, bold, italic, strikethrough, links, inline code and fenced code blocks with syntax highlighting. Notes are saved as plain Markdown text.",
  },
  {
    question: "How do I make a bullet list in Quick Notes?",
    answer:
      "Type a dash and a space (- ) at the start of a line. Press Enter to start the next bullet, press Enter on an empty bullet to end the list, and use Tab or Shift+Tab to indent or outdent.",
  },
  {
    question: "How do I add a code block?",
    answer:
      "Type three backticks followed by the language, for example ```json, and press Enter. Quick Notes adds the closing fence, highlights the code and shows a copy button.",
  },
  {
    question: "Can I download or export my notes?",
    answer:
      "Yes. Use the download button next to the word count to save the current note as a Markdown (.md) file or a plain text (.txt) file.",
  },
  {
    question: "How do I save my notes to my account?",
    answer:
      "Sign in, then press the Save button at the top right of the note, or Ctrl+S (Cmd+S on Mac). Until you press Save, your edits stay on your device; a dot next to a note in the list marks changes that are not saved to your account yet. If you are not signed in, Save asks you to sign in or create a free account.",
  },
  {
    question: "Can I change the font or use dark mode?",
    answer:
      "Yes. Choose a handwritten, sans-serif or serif writing font from the Writing font menu at the bottom of the sidebar, and switch between light and dark themes with the sun and moon button.",
  },
  {
    question: "What if I forget my password?",
    answer:
      "Choose Forgot password on the sign-in page and enter your email. You will get a link to set a new password. Signed-in users can also change their password from the account menu, using either their current password or an emailed link.",
  },
  {
    question: "Does Quick Notes work on my phone?",
    answer:
      "Yes. Quick Notes runs in any modern web browser on phones, tablets and computers, and the layout adapts to small screens.",
  },
];
