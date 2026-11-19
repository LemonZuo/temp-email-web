import { useEffect, useRef } from 'react'
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BoldIcon,
  CodeIcon,
  Heading1Icon,
  Heading2Icon,
  ImageIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  QuoteIcon,
  Redo2Icon,
  RemoveFormattingIcon,
  StrikethroughIcon,
  UnderlineIcon,
  Undo2Icon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Separator } from '@/components/ui/separator'
import { Toggle } from '@/components/ui/toggle'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { defineMessages, useT } from '@/i18n'

const messages = defineMessages({
  zh: {
    bold: '加粗',
    italic: '斜体',
    underline: '下划线',
    strike: '删除线',
    h1: '标题 1',
    h2: '标题 2',
    bulletList: '无序列表',
    orderedList: '有序列表',
    quote: '引用',
    code: '代码块',
    link: '链接',
    linkPrompt: '输入链接地址（留空移除链接）',
    image: '插入图片',
    imageTooLarge: '图片不能超过 1MB',
    alignLeft: '左对齐',
    alignCenter: '居中',
    alignRight: '右对齐',
    clear: '清除格式',
    undo: '撤销',
    redo: '重做',
    placeholder: '在这里输入正文…',
  },
  en: {
    bold: 'Bold',
    italic: 'Italic',
    underline: 'Underline',
    strike: 'Strikethrough',
    h1: 'Heading 1',
    h2: 'Heading 2',
    bulletList: 'Bullet list',
    orderedList: 'Numbered list',
    quote: 'Quote',
    code: 'Code block',
    link: 'Link',
    linkPrompt: 'Link URL (leave empty to remove)',
    image: 'Insert image',
    imageTooLarge: 'Image must be smaller than 1MB',
    alignLeft: 'Align left',
    alignCenter: 'Align center',
    alignRight: 'Align right',
    clear: 'Clear formatting',
    undo: 'Undo',
    redo: 'Redo',
    placeholder: 'Write your message…',
  },
})

const MAX_IMAGE_BYTES = 1024 * 1024

function ToolButton({
  label,
  active,
  onClick,
  disabled,
  children,
}: {
  label: string
  active?: boolean
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Toggle size="sm" pressed={!!active} onPressedChange={onClick} disabled={disabled} aria-label={label} className="size-7 min-w-7 p-0">
          {children}
        </Toggle>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function Toolbar({ editor }: { editor: Editor }) {
  const t = useT(messages)
  const fileRef = useRef<HTMLInputElement>(null)
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      h1: e.isActive('heading', { level: 1 }),
      h2: e.isActive('heading', { level: 2 }),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      quote: e.isActive('blockquote'),
      code: e.isActive('codeBlock'),
      link: e.isActive('link'),
      left: e.isActive({ textAlign: 'left' }),
      center: e.isActive({ textAlign: 'center' }),
      right: e.isActive({ textAlign: 'right' }),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  })
  const chain = () => editor.chain().focus()
  const setLink = () => {
    const previous = editor.getAttributes('link').href as string | undefined
    const url = window.prompt(t('linkPrompt'), previous || 'https://')
    if (url === null) return
    if (url === '' || url === 'https://') chain().extendMarkRange('link').unsetLink().run()
    else chain().extendMarkRange('link').setLink({ href: url }).run()
  }
  const onPickImage = (file: File | undefined) => {
    if (!file) return
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error(t('imageTooLarge'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => chain().setImage({ src: String(reader.result) }).run()
    reader.readAsDataURL(file)
  }
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/30 p-1">
      <ToolButton label={t('undo')} onClick={() => chain().undo().run()} disabled={!state.canUndo}>
        <Undo2Icon />
      </ToolButton>
      <ToolButton label={t('redo')} onClick={() => chain().redo().run()} disabled={!state.canRedo}>
        <Redo2Icon />
      </ToolButton>
      <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-5" />
      <ToolButton label={t('h1')} active={state.h1} onClick={() => chain().toggleHeading({ level: 1 }).run()}>
        <Heading1Icon />
      </ToolButton>
      <ToolButton label={t('h2')} active={state.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()}>
        <Heading2Icon />
      </ToolButton>
      <ToolButton label={t('bold')} active={state.bold} onClick={() => chain().toggleBold().run()}>
        <BoldIcon />
      </ToolButton>
      <ToolButton label={t('italic')} active={state.italic} onClick={() => chain().toggleItalic().run()}>
        <ItalicIcon />
      </ToolButton>
      <ToolButton label={t('underline')} active={state.underline} onClick={() => chain().toggleUnderline().run()}>
        <UnderlineIcon />
      </ToolButton>
      <ToolButton label={t('strike')} active={state.strike} onClick={() => chain().toggleStrike().run()}>
        <StrikethroughIcon />
      </ToolButton>
      <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-5" />
      <ToolButton label={t('bulletList')} active={state.bullet} onClick={() => chain().toggleBulletList().run()}>
        <ListIcon />
      </ToolButton>
      <ToolButton label={t('orderedList')} active={state.ordered} onClick={() => chain().toggleOrderedList().run()}>
        <ListOrderedIcon />
      </ToolButton>
      <ToolButton label={t('quote')} active={state.quote} onClick={() => chain().toggleBlockquote().run()}>
        <QuoteIcon />
      </ToolButton>
      <ToolButton label={t('code')} active={state.code} onClick={() => chain().toggleCodeBlock().run()}>
        <CodeIcon />
      </ToolButton>
      <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-5" />
      <ToolButton label={t('alignLeft')} active={state.left} onClick={() => chain().setTextAlign('left').run()}>
        <AlignLeftIcon />
      </ToolButton>
      <ToolButton label={t('alignCenter')} active={state.center} onClick={() => chain().setTextAlign('center').run()}>
        <AlignCenterIcon />
      </ToolButton>
      <ToolButton label={t('alignRight')} active={state.right} onClick={() => chain().setTextAlign('right').run()}>
        <AlignRightIcon />
      </ToolButton>
      <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-5" />
      <ToolButton label={t('link')} active={state.link} onClick={setLink}>
        <LinkIcon />
      </ToolButton>
      <ToolButton label={t('image')} onClick={() => fileRef.current?.click()}>
        <ImageIcon />
      </ToolButton>
      <ToolButton label={t('clear')} onClick={() => chain().unsetAllMarks().clearNodes().run()}>
        <RemoveFormattingIcon />
      </ToolButton>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          onPickImage(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </div>
  )
}

/**
 * WYSIWYG HTML editor. `value` is only applied on mount and whenever `resetKey` changes
 * (e.g. reply/forward replaced the draft) to avoid fighting the cursor while typing.
 */
export function RichEditor({
  value,
  onChange,
  resetKey,
  className,
}: {
  value: string
  onChange: (html: string) => void
  resetKey?: unknown
  className?: string
}) {
  const t = useT(messages)
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: { openOnClick: false, autolink: true } }),
      Image.configure({ allowBase64: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: value,
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? '' : e.getHTML()),
    editorProps: {
      attributes: {
        class: 'tiptap-content min-h-[280px] px-4 py-3 outline-none',
        'data-placeholder': t('placeholder'),
      },
    },
  })

  useEffect(() => {
    if (editor && resetKey !== undefined) editor.commands.setContent(value || '', { emitUpdate: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, resetKey])

  if (!editor) return null
  return (
    <div className={cn('overflow-hidden rounded-lg border bg-background focus-within:ring-3 focus-within:ring-ring/30', className)}>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
}
