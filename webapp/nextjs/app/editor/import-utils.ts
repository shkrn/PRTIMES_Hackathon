import mammoth from 'mammoth';

type HtmlImportResult = {
  content: string;
  title: string | null;
};

type ImportedDocument = {
  content: string;
  title: string | null;
};

const HTML_MIME_TYPE = 'text/html';
const WORD_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const IMPORT_ACCEPT = `.html,${HTML_MIME_TYPE},.docx,${WORD_MIME_TYPE}`;

function extractImportableHtml(rawHtml: string): HtmlImportResult {
  const parser = new DOMParser();
  const documentNode = parser.parseFromString(rawHtml, 'text/html');

  documentNode.querySelectorAll('script, style, noscript, iframe').forEach((node) => node.remove());

  const importedTitle =
    documentNode.querySelector('title')?.textContent?.trim() ||
    documentNode.querySelector('h1')?.textContent?.trim() ||
    null;

  const bodyContent = documentNode.body.innerHTML.trim();
  if (!bodyContent) {
    throw new Error('HTML本文が空です');
  }

  return {
    content: bodyContent,
    title: importedTitle && importedTitle.length > 0 ? importedTitle : null,
  };
}

function getFileBaseName(fileName: string): string {
  const trimmed = fileName.trim();
  return trimmed.replace(/\.[^.]+$/, '') || trimmed;
}

export async function importDocumentFile(file: File): Promise<ImportedDocument> {
  const lowerCaseName = file.name.toLowerCase();
  const isHtmlFile = lowerCaseName.endsWith('.html') || file.type === HTML_MIME_TYPE;
  const isWordFile = lowerCaseName.endsWith('.docx') || file.type === WORD_MIME_TYPE;

  if (isHtmlFile) {
    const imported = extractImportableHtml(await file.text());
    return {
      content: imported.content,
      title: imported.title ?? getFileBaseName(file.name),
    };
  }

  if (isWordFile) {
    const result = await mammoth.convertToHtml({
      arrayBuffer: await file.arrayBuffer(),
    });
    const imported = extractImportableHtml(result.value);
    return {
      content: imported.content,
      title: imported.title ?? getFileBaseName(file.name),
    };
  }

  throw new Error('HTMLまたはWord(.docx)ファイルを選択してください');
}
