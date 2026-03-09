'use client';
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEditor, EditorContent } from '@tiptap/react';
import Document from '@tiptap/extension-document';
import Heading from '@tiptap/extension-heading';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { BulletList, ListItem, OrderedList } from '@tiptap/extension-list';
import Link from '@tiptap/extension-link';
import type { PressRelease } from '@/lib/types';
import styles from './page.module.css';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Underline from '@tiptap/extension-underline';
import { Toolbar, ToolbarGroup, ToolbarSeparator } from '@/components/tiptap-ui-primitive/toolbar';
import { Button } from '@/components/tiptap-ui-primitive/button';
import { Spacer } from '@/components/tiptap-ui-primitive/spacer';
import Image from '@tiptap/extension-image'
import { BoldIcon, ItalicIcon, UnderlineIcon, ListIcon, ListOrderedIcon, ImageIcon, CodeIcon } from 'lucide-react';


const PRESS_RELEASE_ID = 1;
const queryKey = ['press-release', PRESS_RELEASE_ID];

type JsonNode = Record<string, unknown>;

function normalizeUrl(text: string): string | null {
  const trimmed = text.trim().replace(/[),.;!?]+$/, '');
  if (!trimmed) return null;
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const { protocol, href } = new URL(candidate);
    return ['http:', 'https:'].includes(protocol) ? href : null;
  } catch {
    return null;
  }
}

function syncLinkHrefs(node: JsonNode): JsonNode {
  const content = Array.isArray(node.content)
    ? (node.content as JsonNode[]).map(syncLinkHrefs)
    : node.content;

  const marks =
    node.type === 'text' && typeof node.text === 'string' && Array.isArray(node.marks)
      ? (node.marks as JsonNode[]).map((mark) => {
          if (mark.type !== 'link') return mark;
          const href = normalizeUrl(node.text as string);
          return href ? { ...mark, attrs: { ...(mark.attrs as object), href } } : mark;
        })
      : node.marks;

  return { ...node, content, marks };
}

function usePressReleaseQuery() {
  return useQuery({
    queryKey,
    queryFn: async (): Promise<PressRelease> => {
      const response = await fetch(`/api/press-releases/${PRESS_RELEASE_ID}`);
      if (!response.ok) throw new Error(`HTTPエラー: ${response.status}`);
      return response.json();
    },
  });
}

function useSaveMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { title: string; content: string }) => {
      const response = await fetch(`/api/press-releases/${PRESS_RELEASE_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('保存に失敗しました');
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: (error: Error) => alert(`エラー: ${error.message}`),
  });
}

export default function EditorPage() {
  const { data, isPending, isError } = usePressReleaseQuery();

  if (isPending) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>読み込み中...</div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>データの読み込みに失敗しました</div>
      </div>
    );
  }

  return <Editor initialTitle={data.title} initialContent={JSON.parse(data.content)} />;
}

function Editor({ initialTitle, initialContent }: { initialTitle: string; initialContent: object }) {
  const [title, setTitle] = useState(initialTitle);
  const { isPending, mutate } = useSaveMutation();

  const editor = useEditor({
    extensions: [
      Document,
      Heading,
      Paragraph,
      Text,
      Bold,
      Italic,
      Underline,
      BulletList,
      OrderedList,
      ListItem,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: false,
        defaultProtocol: 'https',
        protocols: ['http', 'https'],
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
      }),
      Image,
    ],
    content: initialContent,
    editorProps: {
      attributes: { class: styles.tiptap },
      handleClick: (_view, _pos, event) => {
        const anchor = (event.target as HTMLElement).closest('a');
        if (!anchor) return false;

        const destination =
          normalizeUrl(anchor.textContent ?? '') ??
          normalizeUrl(anchor.getAttribute('href') ?? '');
        if (!destination) return false;

        event.preventDefault();
        window.open(destination, '_blank', 'noopener,noreferrer');
        return true;
      },
    },
    immediatelyRender: false,
  });

  const handleSave = () => {
    if (!editor) return;
    mutate({
      title,
      content: JSON.stringify(syncLinkHrefs(editor.getJSON() as JsonNode)),
    });
  };

  

  const addImage = useCallback(() => {
    const url = window.prompt('URL');

    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);


  if (!editor) {
    return null;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>プレスリリースエディター</h1>
        <button onClick={handleSave} className={styles.saveButton} disabled={isPending}>
          {isPending ? '保存中...' : '保存'}
        </button>
      </header>
      <main className={styles.main}>
        <div className={styles.editorWrapper}>
          <Toolbar>
            <ToolbarGroup>
              <Button data-style="ghost" 
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  disabled={!editor.can().chain().focus().toggleBold().run()}
                  className={editor.isActive('bold') ? styles.isActive : ''}
                >
                <BoldIcon className="tiptap-button-icon" />
              </Button>
              <Button data-style="ghost"
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  disabled={!editor.can().chain().focus().toggleItalic().run()}
                  className={editor.isActive('italic') ? styles.isActive : ''}
                >
                <ItalicIcon className="tiptap-button-icon" />
              </Button>
              <Button data-style="ghost"
                  onClick={() => editor.chain().focus().toggleUnderline().run()}
                  disabled={!editor.can().chain().focus().toggleUnderline().run()}
                  className={editor.isActive('underline') ? styles.isActive : ''}
                >
                <UnderlineIcon className="tiptap-button-icon" />
              </Button>
            </ToolbarGroup>

            <ToolbarSeparator />

            <ToolbarGroup>
              <Button data-style="ghost"
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                  disabled={!editor.can().chain().focus().toggleBulletList().run()}
                  className={editor.isActive('bulletList') ? styles.isActive : ''}
                >
                <ListIcon className="tiptap-button-icon" />
              </Button>
              <Button data-style="ghost"
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  disabled={!editor.can().chain().focus().toggleOrderedList().run()}
                  className={editor.isActive('orderedList') ? styles.isActive : ''}
                >
                <ListOrderedIcon className="tiptap-button-icon" />
              </Button>
            </ToolbarGroup>

            <ToolbarSeparator />

            <ToolbarGroup>
              <Button data-style="ghost"  onClick={addImage}>
                <ImageIcon className="tiptap-button-icon" />
              </Button>
            </ToolbarGroup>
          </Toolbar>

          <div className={styles.titleInputWrapper}>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="タイトルを入力してください"
              className={styles.titleInput}
            />
          </div>


          <EditorContent editor={editor} />
        </div>
      </main>
    </div>
  );
}
