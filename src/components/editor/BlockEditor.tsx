"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { NodeSelection } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import { TextStyle, Color } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import { CharacterCount } from "@tiptap/extensions";
import ImageLightbox from "../notebook/ImageLightbox";
import {
  ListBulletIcon,
  ListOrderedIcon,
  ChecklistIcon,
  QuoteIcon,
  CodeBlockIcon,
  MinusIcon,
  LinkIcon,
  ImageIcon,
} from "../icons";

export interface BlockEditorHandle {
  getJSON: () => object;
  setContent: (content: object | string) => void;
  // Append a paragraph of text at the end (used by voice transcription).
  insertText: (text: string) => void;
}

// Downscale + compress an image File to a JPEG data URL so it can be embedded
// in the document content (kept self-contained).
async function compressImage(file: File, max = 1280, quality = 0.82): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new window.Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

interface SlashItem {
  title: string;
  desc: string;
  keywords: string;
  icon: React.ReactNode;
  run?: (e: Editor) => void;
  image?: boolean;
  emoji?: boolean;
}

const HLabel = (n: number) => <span className="text-[13px] font-bold">H{n}</span>;

const SLASH_ITEMS: SlashItem[] = [
  { title: "Text", desc: "Plain paragraph", keywords: "text paragraph body", icon: <span className="text-[13px]">P</span>, run: (e) => e.chain().focus().setParagraph().run() },
  { title: "Heading 1", desc: "Big section heading", keywords: "h1 title heading", icon: HLabel(1), run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run() },
  { title: "Heading 2", desc: "Medium heading", keywords: "h2 heading subtitle", icon: HLabel(2), run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { title: "Heading 3", desc: "Small heading", keywords: "h3 heading", icon: HLabel(3), run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run() },
  { title: "Bullet list", desc: "Simple bulleted list", keywords: "bullet unordered list ul", icon: <ListBulletIcon size={16} />, run: (e) => e.chain().focus().toggleBulletList().run() },
  { title: "Numbered list", desc: "Ordered list", keywords: "numbered ordered list ol", icon: <ListOrderedIcon size={16} />, run: (e) => e.chain().focus().toggleOrderedList().run() },
  { title: "To-do list", desc: "Checkbox tasks", keywords: "todo task checkbox check", icon: <ChecklistIcon size={16} />, run: (e) => e.chain().focus().toggleTaskList().run() },
  { title: "Quote", desc: "Capture a quote", keywords: "quote blockquote", icon: <QuoteIcon size={16} />, run: (e) => e.chain().focus().toggleBlockquote().run() },
  { title: "Code block", desc: "Code with syntax", keywords: "code block pre", icon: <CodeBlockIcon size={16} />, run: (e) => e.chain().focus().toggleCodeBlock().run() },
  { title: "Emoji", desc: "Insert an emoji", keywords: "emoji emoticon icon smiley face react sticker", icon: <span className="text-[15px] leading-none">🙂</span>, emoji: true },
  { title: "Image", desc: "Upload or paste a picture", keywords: "image picture photo upload", icon: <ImageIcon size={16} />, image: true },
  { title: "Divider", desc: "Horizontal rule", keywords: "divider rule hr line separator", icon: <MinusIcon size={16} />, run: (e) => e.chain().focus().setHorizontalRule().run() },
];

interface SlashState {
  query: string;
  range: { from: number; to: number };
  top: number;
  left: number;
}

// Text colors (Notion-style palette). null = default ink.
const TEXT_COLORS: { label: string; value: string | null }[] = [
  { label: "Default", value: null },
  { label: "Gray", value: "#6d7480" },
  { label: "Brown", value: "#8b5a2b" },
  { label: "Red", value: "#e23b3b" },
  { label: "Orange", value: "#d9650a" },
  { label: "Yellow", value: "#b88600" },
  { label: "Green", value: "#0d9d66" },
  { label: "Blue", value: "#0ea5e9" },
  { label: "Purple", value: "#5b4ef5" },
  { label: "Pink", value: "#ec4899" },
];

// Highlight tints. null = remove highlight.
const HIGHLIGHTS: { label: string; value: string | null }[] = [
  { label: "None", value: null },
  { label: "Yellow", value: "#fef3c7" },
  { label: "Green", value: "#dcfce7" },
  { label: "Blue", value: "#dbeafe" },
  { label: "Purple", value: "#ede9fe" },
  { label: "Pink", value: "#fce7f3" },
  { label: "Red", value: "#fee2e2" },
  { label: "Orange", value: "#ffedd5" },
  { label: "Gray", value: "#e9ebef" },
];

const EMOJIS = [
  "📈", "📉", "🎯", "🔥", "✅", "🚫", "🧠", "💡", "⚠️", "📝",
  "📌", "💰", "⭐", "🚀", "🏆", "💪", "🟢", "🔴", "🔵", "🟡",
  "➡️", "↗️", "↘️", "⏰", "📅", "❗", "💎", "☕",
];

type BubbleMenuKind = "text" | "highlight" | "emoji" | null;

function BubbleBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 text-[13px] transition-colors ${
        active ? "bg-accent-bg text-accent" : "text-ink-soft hover:bg-black/[0.06]"
      }`}
    >
      {children}
    </button>
  );
}

const BlockEditor = forwardRef<
  BlockEditorHandle,
  {
    initialContent: object | string | null;
    onUpdate?: () => void;
    placeholder?: string;
    contentClassName?: string;
  }
>(function BlockEditor(
  { initialContent, onUpdate, placeholder, contentClassName },
  ref,
) {
  const [, forceUpdate] = useReducer((x) => x + 1, 0);
  const [slash, setSlash] = useState<SlashState | null>(null);
  const [slashIndex, setSlashIndex] = useState(0);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [bubbleMenu, setBubbleMenu] = useState<BubbleMenuKind>(null);
  const [emojiAt, setEmojiAt] = useState<{ top: number; left: number } | null>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  const editorRef = useRef<Editor | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const insertImage = useCallback(async (file: File, pos?: number) => {
    if (!file.type.startsWith("image/")) return;
    const editor = editorRef.current;
    if (!editor) return;
    const src = await compressImage(file);
    if (pos != null) {
      editor.chain().focus().insertContentAt(pos, { type: "image", attrs: { src } }).run();
    } else {
      editor.chain().focus().setImage({ src }).run();
    }
  }, []);

  const detectSlash = useCallback((e: Editor) => {
    const { state } = e;
    const { from, empty } = state.selection;
    if (!empty) return setSlash(null);
    const $from = state.doc.resolve(from);
    const before = $from.parent.textBetween(0, $from.parentOffset, "\n", "￼");
    const m = /(?:^|\s)\/([a-zA-Z]*)$/.exec(before);
    if (!m) return setSlash(null);
    const slashPos = from - (m[1].length + 1);
    const coords = e.view.coordsAtPos(from);
    setSlash({ query: m[1], range: { from: slashPos, to: from }, top: coords.bottom + 6, left: coords.left });
    setSlashIndex(0);
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: { openOnClick: false } }),
      Placeholder.configure({
        placeholder: placeholder ?? "Write something, or press '/' for commands…",
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image.configure({ allowBase64: true }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      CharacterCount,
    ],
    content: initialContent ?? "",
    editorProps: {
      attributes: { class: `tiptap-content ${contentClassName ?? ""}`.trim() },
      handleKeyDown: (view, event) => {
        if (event.key !== " ") return false;
        const sel = view.state.selection;
        if (sel instanceof NodeSelection && sel.node.type.name === "image") {
          event.preventDefault();
          setLightbox(sel.node.attrs.src as string);
          return true;
        }
        return false;
      },
      handleDoubleClickOn: (_view, _pos, node) => {
        if (node.type.name === "image") {
          setLightbox(node.attrs.src as string);
          return true;
        }
        return false;
      },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []).filter((f) =>
          f.type.startsWith("image/"),
        );
        if (files.length === 0) return false;
        event.preventDefault();
        files.forEach((f) => insertImage(f));
        return true;
      },
      handleDrop: (view, event) => {
        const files = Array.from((event as DragEvent).dataTransfer?.files ?? []).filter((f) =>
          f.type.startsWith("image/"),
        );
        if (files.length === 0) return false;
        event.preventDefault();
        const pos = view.posAtCoords({
          left: (event as DragEvent).clientX,
          top: (event as DragEvent).clientY,
        })?.pos;
        files.forEach((f) => insertImage(f, pos));
        return true;
      },
    },
    onUpdate: ({ editor }) => {
      onUpdateRef.current?.();
      detectSlash(editor);
    },
    onSelectionUpdate: ({ editor }) => {
      detectSlash(editor);
      if (editor.state.selection.empty) setBubbleMenu(null);
    },
    onTransaction: () => forceUpdate(),
  });
  editorRef.current = editor;

  useImperativeHandle(
    ref,
    () => ({
      getJSON: () => editor?.getJSON() ?? {},
      setContent: (content) => editor?.commands.setContent(content ?? ""),
      insertText: (text) =>
        editor
          ?.chain()
          .focus("end")
          .insertContent({ type: "paragraph", content: [{ type: "text", text }] })
          .run(),
    }),
    [editor],
  );

  const filtered = useMemo(() => {
    if (!slash) return SLASH_ITEMS;
    const q = slash.query.toLowerCase();
    if (!q) return SLASH_ITEMS;
    return SLASH_ITEMS.filter(
      (i) => i.title.toLowerCase().includes(q) || i.keywords.includes(q),
    );
  }, [slash]);

  const runSlash = useCallback(
    (item: SlashItem) => {
      if (!editor || !slash) return;
      const coords = { top: slash.top, left: slash.left };
      editor.chain().focus().deleteRange(slash.range).run();
      setSlash(null);
      if (item.image) imageInputRef.current?.click();
      else if (item.emoji) setEmojiAt(coords);
      else item.run?.(editor);
    },
    [editor, slash],
  );

  // Close the emoji picker on outside click or Escape.
  useEffect(() => {
    if (!emojiAt) return;
    const onDown = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setEmojiAt(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setEmojiAt(null);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [emojiAt]);

  useEffect(() => {
    if (!slash) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "ArrowDown") {
        ev.preventDefault();
        ev.stopPropagation();
        setSlashIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (ev.key === "ArrowUp") {
        ev.preventDefault();
        ev.stopPropagation();
        setSlashIndex((i) => Math.max(i - 1, 0));
      } else if (ev.key === "Enter") {
        if (filtered[slashIndex]) {
          ev.preventDefault();
          ev.stopPropagation();
          runSlash(filtered[slashIndex]);
        }
      } else if (ev.key === "Escape") {
        ev.preventDefault();
        setSlash(null);
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [slash, slashIndex, filtered, runSlash]);

  const words = editor?.storage.characterCount?.words() ?? 0;

  return (
    <div>
      {editor && (
        <BubbleMenu
          editor={editor}
          className="relative flex items-center gap-0.5 rounded-lg border border-line bg-surface p-1 shadow-lg shadow-black/10"
        >
          <BubbleBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
            <span className="font-bold">B</span>
          </BubbleBtn>
          <BubbleBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <span className="italic">I</span>
          </BubbleBtn>
          <BubbleBtn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
            <span className="underline">U</span>
          </BubbleBtn>
          <BubbleBtn active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
            <span className="line-through">S</span>
          </BubbleBtn>
          <BubbleBtn active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>
            <span className="font-mono text-[12px]">{"<>"}</span>
          </BubbleBtn>
          <BubbleBtn
            active={editor.isActive("link")}
            onClick={() => {
              const prev = editor.getAttributes("link").href as string | undefined;
              const url = window.prompt("Link URL", prev ?? "https://");
              if (url === null) return;
              if (url === "") editor.chain().focus().extendMarkRange("link").unsetLink().run();
              else editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
            }}
          >
            <LinkIcon size={15} />
          </BubbleBtn>

          <span className="mx-0.5 h-5 w-px bg-line" />

          {/* Text color */}
          <BubbleBtn
            active={bubbleMenu === "text" || editor.isActive("textStyle")}
            onClick={() => setBubbleMenu((m) => (m === "text" ? null : "text"))}
          >
            <span
              className="font-semibold"
              style={{ color: (editor.getAttributes("textStyle").color as string) || undefined }}
            >
              A
            </span>
          </BubbleBtn>
          {/* Highlight */}
          <BubbleBtn
            active={bubbleMenu === "highlight" || editor.isActive("highlight")}
            onClick={() => setBubbleMenu((m) => (m === "highlight" ? null : "highlight"))}
          >
            <span className="rounded-sm bg-[#fde68a] px-1 font-semibold text-ink">A</span>
          </BubbleBtn>
          {/* Emoji */}
          <BubbleBtn
            active={bubbleMenu === "emoji"}
            onClick={() => setBubbleMenu((m) => (m === "emoji" ? null : "emoji"))}
          >
            <span className="text-[15px] leading-none">🙂</span>
          </BubbleBtn>

          {bubbleMenu && (
            <div
              className="absolute left-0 top-full z-10 mt-1.5 rounded-xl border border-line bg-surface p-2 shadow-xl shadow-black/10"
              onMouseDown={(e) => e.preventDefault()}
            >
              {bubbleMenu === "text" && (
                <div className="w-52">
                  <div className="kicker mb-1.5 px-1">Text color</div>
                  <div className="grid grid-cols-5 gap-1">
                    {TEXT_COLORS.map((c) => (
                      <button
                        key={c.label}
                        title={c.label}
                        onClick={() => {
                          if (c.value) editor.chain().focus().setColor(c.value).run();
                          else editor.chain().focus().unsetColor().run();
                          setBubbleMenu(null);
                        }}
                        className="flex h-8 items-center justify-center rounded-md border border-line text-[13px] font-semibold hover:bg-black/[0.04]"
                        style={{ color: c.value ?? "var(--color-ink)" }}
                      >
                        A
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {bubbleMenu === "highlight" && (
                <div className="w-52">
                  <div className="kicker mb-1.5 px-1">Highlight</div>
                  <div className="grid grid-cols-5 gap-1">
                    {HIGHLIGHTS.map((c) => (
                      <button
                        key={c.label}
                        title={c.label}
                        onClick={() => {
                          if (c.value)
                            editor.chain().focus().setHighlight({ color: c.value }).run();
                          else editor.chain().focus().unsetHighlight().run();
                          setBubbleMenu(null);
                        }}
                        className="flex h-8 items-center justify-center rounded-md border border-line text-[12px] text-ink-soft hover:ring-2 hover:ring-accent/30"
                        style={{ backgroundColor: c.value ?? "transparent" }}
                      >
                        {c.value ? "A" : "—"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {bubbleMenu === "emoji" && (
                <div className="w-60">
                  <div className="kicker mb-1.5 px-1">Emoji</div>
                  <div className="grid grid-cols-7 gap-0.5">
                    {EMOJIS.map((em) => (
                      <button
                        key={em}
                        onClick={() => {
                          // Insert at the selection end so we never replace text.
                          const at = editor.state.selection.to;
                          editor.chain().focus().insertContentAt(at, em).run();
                          setBubbleMenu(null);
                        }}
                        className="flex h-8 items-center justify-center rounded-md text-[16px] hover:bg-black/[0.05]"
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </BubbleMenu>
      )}

      <EditorContent editor={editor} />

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          Array.from(e.target.files ?? []).forEach((f) => insertImage(f));
          e.target.value = "";
        }}
      />

      {slash && (
        <div
          className="fixed z-30 max-h-72 w-72 overflow-y-auto rounded-xl border border-line bg-surface p-1.5 shadow-xl shadow-black/10"
          style={{ top: slash.top, left: slash.left }}
        >
          <div className="kicker px-2 py-1">Basic blocks</div>
          {filtered.length === 0 ? (
            <p className="px-2 py-2 text-[12px] text-faint">No matching blocks</p>
          ) : (
            filtered.map((item, i) => (
              <button
                key={item.title}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setSlashIndex(i)}
                onClick={() => runSlash(item)}
                className={`flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left ${
                  i === slashIndex ? "bg-accent-bg" : "hover:bg-black/[0.03]"
                }`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line text-ink-soft">
                  {item.icon}
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium text-ink">{item.title}</span>
                  <span className="block truncate text-[11.5px] text-faint">{item.desc}</span>
                </span>
              </button>
            ))
          )}
        </div>
      )}

      {emojiAt && (
        <div
          ref={emojiRef}
          className="fixed z-30 w-64 rounded-xl border border-line bg-surface p-2 shadow-xl shadow-black/10"
          style={{ top: emojiAt.top, left: emojiAt.left }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="kicker mb-1.5 px-1">Emoji</div>
          <div className="grid grid-cols-7 gap-0.5">
            {EMOJIS.map((em) => (
              <button
                key={em}
                onClick={() => {
                  editor?.chain().focus().insertContent(em).run();
                  setEmojiAt(null);
                }}
                className="flex h-8 items-center justify-center rounded-md text-[16px] hover:bg-black/[0.05]"
              >
                {em}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 border-t border-line pt-3 text-[11.5px] text-faint">
        {words} {words === 1 ? "word" : "words"} · type{" "}
        <kbd className="rounded border border-line px-1 font-mono">/</kbd> for blocks · paste or
        drop images · select an image and press{" "}
        <kbd className="rounded border border-line px-1 font-mono">space</kbd> to zoom
      </div>

      {lightbox && <ImageLightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
});

export default BlockEditor;
