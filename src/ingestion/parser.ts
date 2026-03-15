/**
 * Document parser. Converts raw PDFs and markdown files into a structured
 * ParsedDocument with section titles and body text. Later stages (chunker)
 * operate on these sections.
 */

import pdfParse from 'pdf-parse';

export interface Section {
  title: string;
  body: string;
  pageNumber?: number;
}

export interface ParsedDocument {
  sections: Section[];
}

export interface ParseInput {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}

const MARKDOWN_HEADING_REGEX = /^(#{1,6})\s+(.*)$/;

export async function parseDocument(input: ParseInput): Promise<ParsedDocument> {
  if (input.mimeType === 'application/pdf' || input.filename.toLowerCase().endsWith('.pdf')) {
    return parsePdf(input.buffer);
  }

  // Treat everything else as UTF-8 markdown / text for now
  const text = input.buffer.toString('utf8');
  return parseMarkdown(text);
}

async function parsePdf(buffer: Buffer): Promise<ParsedDocument> {
  const data = await pdfParse(buffer, { pagerender: renderPagePreservingLayout });

  // pdf-parse returns text with page breaks as '\f'
  const pages = data.text.split('\f').map((page: string) => page.trim()).filter(Boolean);

  const sections: Section[] = [];

  pages.forEach((pageText: string, pageIndex: number) => {
    const lines = pageText.split('\n');
    let currentTitle = `Page ${pageIndex + 1}`;
    let currentBodyLines: string[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trimEnd();
      if (!line) {
        currentBodyLines.push('');
        continue;
      }

      if (looksLikeHeading(line)) {
        // Flush previous section if it has content
        if (currentBodyLines.join('\n').trim().length > 0) {
          sections.push({
            title: currentTitle,
            body: currentBodyLines.join('\n').trim(),
            pageNumber: pageIndex + 1,
          });
          currentBodyLines = [];
        }
        currentTitle = line;
      } else {
        currentBodyLines.push(line);
      }
    }

    if (currentBodyLines.join('\n').trim().length > 0) {
      sections.push({
        title: currentTitle,
        body: currentBodyLines.join('\n').trim(),
        pageNumber: pageIndex + 1,
      });
    }
  });

  return { sections };
}

function looksLikeHeading(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length === 0) {
    return false;
  }
  if (trimmed.length > 120) {
    return false;
  }

  const noPunctuation = trimmed.replace(/[^A-Z0-9\s]/g, '');
  const isAllCaps = noPunctuation === noPunctuation.toUpperCase();

  return isAllCaps && /[A-Z]/.test(noPunctuation);
}

function parseMarkdown(text: string): ParsedDocument {
  const lines = text.split('\n');
  const sections: Section[] = [];

  let currentTitle = 'Introduction';
  let currentBodyLines: string[] = [];

  for (const rawLine of lines) {
    const headingMatch = rawLine.match(MARKDOWN_HEADING_REGEX);

    if (headingMatch) {
      if (currentBodyLines.join('\n').trim().length > 0) {
        sections.push({
          title: currentTitle,
          body: currentBodyLines.join('\n').trim(),
        });
        currentBodyLines = [];
      }

      currentTitle = headingMatch[2].trim() || currentTitle;
    } else {
      currentBodyLines.push(rawLine);
    }
  }

  if (currentBodyLines.join('\n').trim().length > 0) {
    sections.push({
      title: currentTitle,
      body: currentBodyLines.join('\n').trim(),
    });
  }

  if (sections.length === 0 && text.trim().length > 0) {
    sections.push({
      title: 'Document',
      body: text.trim(),
    });
  }

  return { sections };
}

// Preserve layout reasonably so heading detection via lines still works.
function renderPagePreservingLayout(page: unknown): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyPage = page as any;
  return anyPage.getTextContent().then((content: { items: Array<{ str: string }> }) => {
    const strings = content.items.map((item) => item.str);
    return strings.join('\n');
  });
}

