'use client';
import { useState, useCallback, useRef, type ChangeEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEditor, EditorContent, type Editor as TiptapEditor } from '@tiptap/react';
import Document from '@tiptap/extension-document';
import Heading from '@tiptap/extension-heading';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { BulletList, ListItem, OrderedList } from '@tiptap/extension-list';
import Link from '@tiptap/extension-link';
import type {
  PressRelease,
  PressReleaseTemplate,
  PressReleaseTemplateSummary,
} from '@/lib/types';
import styles from './page.module.css';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Underline from '@tiptap/extension-underline';
import { Toolbar, ToolbarGroup, ToolbarSeparator } from '@/components/tiptap-ui-primitive/toolbar';
import { Button } from '@/components/tiptap-ui-primitive/button';
import Image from '@tiptap/extension-image';

import { BoldIcon, ItalicIcon, UnderlineIcon, ListIcon, ListOrderedIcon, ImageIcon, LinkIcon } from 'lucide-react';
import { IMPORT_ACCEPT, importDocumentFile } from './import-utils';



const PRESS_RELEASE_ID = 1;
const queryKey = ['press-release', PRESS_RELEASE_ID];
const templateListQueryKey = ['press-release-templates'];
const DEFAULT_API_BASE_URL = 'http://localhost:8080';
// 文字数制限の定数
const MAX_TITLE_LENGTH = 100;
const MAX_CONTENT_LENGTH = 500;

type JsonNode = Record<string, unknown>;

function getApiBaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  return value && /^https?:\/\//i.test(value) ? value : DEFAULT_API_BASE_URL;
}

const API_BASE_URL = getApiBaseUrl();
const API_ORIGIN = new URL(API_BASE_URL).origin;

function buildApiUrl(path: string): string {
  const normalizedBase = API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`;
  const normalizedPath = path.replace(/^\//, '');
  return new URL(normalizedPath, normalizedBase).toString();
}

function resolveAssetUrl(path: string): string {
  if (!path.startsWith('/uploads/')) {
    return path;
  }

  return new URL(path, `${API_ORIGIN}/`).toString();
}

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

function syncImageSrcs(node: JsonNode): JsonNode {
  const content = Array.isArray(node.content)
    ? (node.content as JsonNode[]).map(syncImageSrcs)
    : node.content;

  const attrsObject =
    node.attrs && typeof node.attrs === 'object' ? (node.attrs as Record<string, unknown>) : null;
  const attrs =
    node.type === 'image' && attrsObject && typeof attrsObject.src === 'string'
      ? { ...attrsObject, src: resolveAssetUrl(attrsObject.src) }
      : node.attrs;

  return { ...node, content, attrs };
}

function getImageFiles(files: Iterable<File>): File[] {
  return Array.from(files).filter((file) => file.type.startsWith('image/'));
}

function hasImageFileTransfer(dataTransfer: DataTransfer | null): boolean {
  if (!dataTransfer) {
    return false;
  }

  if (dataTransfer.items.length > 0) {
    return Array.from(dataTransfer.items).some(
      (item) => item.kind === 'file' && item.type.startsWith('image/')
    );
  }

  return Array.from(dataTransfer.files).some((file) => file.type.startsWith('image/'));
}

function usePressReleaseQuery() {
  return useQuery({
    queryKey,
    queryFn: async (): Promise<PressRelease> => {
      const response = await fetch(buildApiUrl(`/press-releases/${PRESS_RELEASE_ID}`));
      if (!response.ok) throw new Error(`HTTPエラー: ${response.status}`);
      return response.json();
    },
  });
}

function useSaveMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { title: string; content: string }) => {
      const response = await fetch(buildApiUrl(`/press-releases/${PRESS_RELEASE_ID}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error('保存に失敗しました');
      }
      return response.json();
    },
    onSuccess: () => {
      alert('保存しました');
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: Error) => alert(`エラー: ${error.message}`),
  });
}

function useTemplateListQuery() {
  return useQuery({
    queryKey: templateListQueryKey,
    queryFn: async (): Promise<PressReleaseTemplateSummary[]> => {
      const response = await fetch('/api/templates');
      if (!response.ok) throw new Error(`HTTPエラー: ${response.status}`);
      return response.json();
    },
  });
}

function useCreateTemplateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; title: string; content: string }) => {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('テンプレートの保存に失敗しました');
      return (await response.json()) as PressReleaseTemplate;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: templateListQueryKey });
    },
  });
}

function useLoadTemplateMutation() {
  return useMutation({
    mutationFn: async (templateId: number) => {
      const response = await fetch(`/api/templates/${templateId}`);
      if (!response.ok) throw new Error('テンプレートの読み込みに失敗しました');
      return (await response.json()) as PressReleaseTemplate;
    },
  });
}

export default function EditorPage() {
  console.log("initial render");
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

  return <Editor initialTitle={data.title} initialContent={syncImageSrcs(JSON.parse(data.content) as JsonNode)} />;
}

function Editor({ initialTitle, initialContent }: { initialTitle: string; initialContent: object }) {
  const [title, setTitle] = useState(initialTitle);
  const [templateName, setTemplateName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [contentCount, setContentCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [templateStatus, setTemplateStatus] = useState<string | null>(null);
  const { isPending, mutate } = useSaveMutation();
  const { data: templates = [], isPending: isTemplateListPending } = useTemplateListQuery();
  const createTemplateMutation = useCreateTemplateMutation();
  const loadTemplateMutation = useLoadTemplateMutation();
  const importFileInputRef = useRef<HTMLInputElement | null>(null);
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const editorRef = useRef<TiptapEditor | null>(null);
  const dragDepthRef = useRef(0);

  const uploadImage = useCallback(async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(buildApiUrl('/uploads/images'), {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(error?.message ?? '画像のアップロードに失敗しました');
    }

    const result = (await response.json()) as { url: string };
    return result.url;
  }, []);

  const insertImagesFromFiles = useCallback(
    async (files: File[], position?: number) => {
      const imageFiles = getImageFiles(files);
      if (imageFiles.length === 0) {
        return;
      }

      setIsUploadingImage(true);

      try {
        let insertPosition = position;

        for (const file of imageFiles) {
          const url = await uploadImage(file);
          const currentEditor = editorRef.current;
          if (!currentEditor) {
            return;
          }

          if (typeof insertPosition === 'number') {
            currentEditor
              .chain()
              .focus()
              .insertContentAt(insertPosition, { type: 'image', attrs: { src: url } })
              .run();
            insertPosition += 1;
            continue;
          }

          currentEditor.chain().focus().setImage({ src: url }).run();
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : '画像のアップロードに失敗しました';
        alert(message);
      } finally {
        setIsUploadingImage(false);
        setIsDraggingImage(false);
        dragDepthRef.current = 0;
      }
    },
    [uploadImage]
  );

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
      handleDrop: (view, event) => {
        const imageFiles = getImageFiles(Array.from(event.dataTransfer?.files ?? []));
        if (imageFiles.length === 0) {
          return false;
        }

        event.preventDefault();

        const dropPoint = view.posAtCoords({ left: event.clientX, top: event.clientY });
        void insertImagesFromFiles(imageFiles, dropPoint?.pos);
        return true;
      },
    },
    immediatelyRender: false,
    onCreate: ({ editor }) => {
      setContentCount(editor.getText().length);
    },
    onUpdate: ({ editor }) => {
      setContentCount(editor.getText().length);
      console.log("onUpdate");
      if (errorMessage) {
        setErrorMessage('');
      }
    },
  });

  const titleCount = title.length;
  const handleTitleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setTitle(event.target.value);
    if (errorMessage) {
      setErrorMessage('');
    }
  };

  // バリデーション関数
  const validateBeforeSave = (): boolean => {
    const errors: string[] = [];

    if (titleCount > MAX_TITLE_LENGTH) {
      errors.push(`タイトルが${MAX_TITLE_LENGTH}文字を超えています（現在${titleCount}文字）`);
    }

    if (contentCount > MAX_CONTENT_LENGTH) {
      errors.push(`本文が${MAX_CONTENT_LENGTH}文字を超えています（現在${contentCount}文字）`);
    }

    if (errors.length > 0) {
      setErrorMessage(errors.join('\n'));
      return false;
    }

    return true;
  };

  editorRef.current = editor;

  const handleSave = () => {
    if (!editor) return;

    // バリデーションチェック
    // if (!validateBeforeSave()) {
    //   return;
    // }

    // エラーがなければ保存
    setErrorMessage('');
    mutate({
      title,
      content: JSON.stringify(syncLinkHrefs(editor.getJSON() as JsonNode)),
    });
  };

  const handleSaveTemplate = () => {
    if (!editor) return;

    const trimmedTemplateName = templateName.trim();
    if (!trimmedTemplateName) {
      setTemplateStatus('テンプレート名を入力してください');
      return;
    }

    createTemplateMutation.mutate(
      {
        name: trimmedTemplateName,
        title,
        content: JSON.stringify(syncLinkHrefs(editor.getJSON() as JsonNode)),
      },
      {
        onSuccess: (template) => {
          setSelectedTemplateId(String(template.id));
          setTemplateName('');
          setTemplateStatus(`"${template.name}" をテンプレートとして保存しました`);
        },
        onError: (error) => {
          setTemplateStatus(error instanceof Error ? error.message : 'テンプレートの保存に失敗しました');
        },
      }
    );
  };

  const handleLoadTemplate = () => {
    if (!editor) return;

    const templateId = Number.parseInt(selectedTemplateId, 10);
    if (!Number.isInteger(templateId) || templateId <= 0) {
      setTemplateStatus('読み込むテンプレートを選択してください');
      return;
    }

    loadTemplateMutation.mutate(templateId, {
      onSuccess: (template) => {
        try {
          editor.commands.setContent(JSON.parse(template.content));
          setTitle(template.title);
          setTemplateStatus(`"${template.name}" を読み込みました`);
        } catch {
          setTemplateStatus('テンプレート本文の解析に失敗しました');
        }
      },
      onError: (error) => {
        setTemplateStatus(error instanceof Error ? error.message : 'テンプレートの読み込みに失敗しました');
      },
    });
  };

  const openImagePicker = useCallback(() => {
    imageFileInputRef.current?.click();
  }, []);

  const insertImageByUrl = useCallback(() => {
    if (!editor) {
      return;
    }

    const value = window.prompt('画像URLを入力してください');
    if (!value) {
      return;
    }

    const src = normalizeUrl(value);
    if (!src) {
      alert('有効な画像URLを入力してください');
      return;
    }

    editor.chain().focus().setImage({ src }).run();
  }, [editor]);

  const openImportDialog = useCallback(() => {
    importFileInputRef.current?.click();
  }, []);

  const applyImportedContent = useCallback(
    (content: string, nextTitle: string | null, fileName: string) => {
      if (!editor) {
        throw new Error('エディタの初期化後に再試行してください');
      }

      editor.commands.setContent(content);

      if (nextTitle) {
        setTitle(nextTitle);
      }

      setImportStatus(`"${fileName}" をインポートしました`);
    },
    [editor]
  );

  const handleImportFile = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';

      if (!file) {
        return;
      }

      if (!editor) {
        setImportStatus('エディタの初期化後に再試行してください');
        return;
      }

      try {
        const imported = await importDocumentFile(file);
        applyImportedContent(imported.content, imported.title, file.name);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'インポートに失敗しました';
        setImportStatus(message);
      }
    },
    [applyImportedContent, editor]
  );

  const handleImageSelection = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      event.target.value = '';

      if (files.length === 0) {
        return;
      }

      void insertImagesFromFiles(files);
    },
    [insertImagesFromFiles]
  );

  const handleDragEnter = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (!hasImageFileTransfer(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDraggingImage(true);
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (!hasImageFileTransfer(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setIsDraggingImage(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (!hasImageFileTransfer(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);

    if (dragDepthRef.current === 0) {
      setIsDraggingImage(false);
    }
  }, []);

  const handleDropZoneDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (!hasImageFileTransfer(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDraggingImage(false);
  }, []);


  if (!editor) {
    return null;
  }
  const isTitleOverLimit = titleCount > MAX_TITLE_LENGTH;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>プレスリリースエディター</h1>
        <div className={styles.charCounter}>
          タイトル: {titleCount}/{MAX_TITLE_LENGTH}文字 / 本文: {contentCount}/{MAX_CONTENT_LENGTH}文字
        </div>
        <div className={styles.headerActions}>
          <input
            ref={importFileInputRef}
            type="file"
            accept={IMPORT_ACCEPT}
            onChange={handleImportFile}
            className={styles.hiddenFileInput}
          />
          <button type="button" onClick={openImportDialog} className={styles.importButton}>
            HTML/Wordをインポート
          </button>
          <button onClick={handleSave} className={styles.saveButton} disabled={isPending}>
            {isPending ? '保存中...' : '保存'}
          </button>
        </div>
      </header>
      {importStatus ? <div className={styles.importStatus}>{importStatus}</div> : null}
      {errorMessage && (
        <div className={styles.errorMessage}>
          {errorMessage.split('\n').map((msg, index) => (
            <div key={index}>{msg}</div>
          ))}
        </div>
      )}
      <main className={styles.main}>
        <section className={styles.templatePanel}>
          <div className={styles.templateControls}>
            <input
              type="text"
              value={templateName}
              onChange={(event) => setTemplateName(event.target.value)}
              placeholder="テンプレート名"
              className={styles.templateInput}
            />
            <button
              type="button"
              onClick={handleSaveTemplate}
              className={styles.secondaryButton}
              disabled={createTemplateMutation.isPending}
            >
              {createTemplateMutation.isPending ? '保存中...' : 'テンプレート保存'}
            </button>
          </div>
          <div className={styles.templateControls}>
            <select
              value={selectedTemplateId}
              onChange={(event) => setSelectedTemplateId(event.target.value)}
              className={styles.templateSelect}
              disabled={isTemplateListPending || templates.length === 0}
            >
              <option value="">
                {isTemplateListPending ? 'テンプレートを読み込み中...' : 'テンプレートを選択'}
              </option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleLoadTemplate}
              className={styles.secondaryButton}
              disabled={loadTemplateMutation.isPending || templates.length === 0}
            >
              {loadTemplateMutation.isPending ? '読込中...' : 'テンプレート読込'}
            </button>
          </div>
          {templateStatus ? <p className={styles.templateStatus}>{templateStatus}</p> : null}
        </section>
        <div
          className={`${styles.editorWrapper} ${isDraggingImage ? styles.editorWrapperDragging : ''}`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDropZoneDrop}
        >
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
              <Button data-style="ghost" onClick={openImagePicker} disabled={isUploadingImage}>
                <ImageIcon className="tiptap-button-icon" />
              </Button>
              <Button data-style="ghost" onClick={insertImageByUrl} disabled={isUploadingImage}>
                <LinkIcon className="tiptap-button-icon" />
              </Button>
            </ToolbarGroup>
          </Toolbar>

          <input
            ref={imageFileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif"
            className={styles.hiddenInput}
            onChange={handleImageSelection}
          />

          {isUploadingImage ? <p className={styles.uploadingNotice}>画像をアップロード中...</p> : null}
          {isDraggingImage ? <p className={styles.dropNotice}>ここに画像をドロップしてアップロード</p> : null}
          {/* {!isDraggingImage ? <p className={styles.dropHint}>画像をドラッグ&ドロップ、またはツールバーからアップロードできます</p> : null} */}

          <div className={styles.titleInputWrapper}>
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              placeholder="タイトルを入力してください"
              className={`${styles.titleInput} ${isTitleOverLimit ? styles.inputError : ''}`}
            />
          </div>


          <EditorContent editor={editor} />
        </div>
      </main>
    </div>
  );
}
