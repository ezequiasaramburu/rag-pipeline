/**
 * Semantic chunking. Splits parsed sections into chunks that respect section
 * and sentence boundaries. Never splits mid-sentence unless a single sentence
 * exceeds the token limit.
 */

import type { ParsedDocument, Section } from './parser';

/** Chunk produced by the chunker; documentId, filename, chunkIndex added when storing. */
export interface DocumentChunk {
  text: string;
  sectionTitle?: string;
  pageNumber?: number;
  tokenCount: number;
}

/** ~4 chars per token (common approximation when no tokenizer is used). */
const CHARS_PER_TOKEN = 4;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/** Split text into sentence-like segments (period + space, or newline). */
function splitSentences(text: string): string[] {
  const trimmed = text.trim();
  if (trimmed.length === 0) return [];

  const parts = trimmed.split(/(?<=[.!?])\s+|\n+/);
  return parts.map((p) => p.trim()).filter(Boolean);
}

/**
 * Split a long string by token count (last resort). Returns segments that stay
 * under maxTokens (by character approximation).
 */
function splitByTokenCount(text: string, maxTokens: number): string[] {
  const maxChars = maxTokens * CHARS_PER_TOKEN;
  const chunks: string[] = [];
  let remaining = text.trim();

  while (remaining.length > 0) {
    if (remaining.length <= maxChars) {
      chunks.push(remaining);
      break;
    }
    const slice = remaining.slice(0, maxChars);
    const lastSpace = slice.lastIndexOf(' ');
    const cut = lastSpace > maxChars / 2 ? lastSpace + 1 : maxChars;
    chunks.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }

  return chunks.filter(Boolean);
}

function chunkSection(section: Section, maxChunkTokens: number): DocumentChunk[] {
  const { title, body, pageNumber } = section;
  const result: DocumentChunk[] = [];

  if (estimateTokens(body) <= maxChunkTokens) {
    result.push({
      text: body,
      sectionTitle: title,
      pageNumber,
      tokenCount: estimateTokens(body),
    });
    return result;
  }

  const sentences = splitSentences(body);
  let currentText = '';
  let currentTokens = 0;

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence);

    if (sentenceTokens > maxChunkTokens) {
      if (currentText.trim().length > 0) {
        result.push({
          text: currentText.trim(),
          sectionTitle: title,
          pageNumber,
          tokenCount: estimateTokens(currentText.trim()),
        });
        currentText = '';
        currentTokens = 0;
      }
      for (const sub of splitByTokenCount(sentence, maxChunkTokens)) {
        result.push({
          text: sub,
          sectionTitle: title,
          pageNumber,
          tokenCount: estimateTokens(sub),
        });
      }
      continue;
    }

    if (currentTokens + sentenceTokens > maxChunkTokens && currentText.trim().length > 0) {
      result.push({
        text: currentText.trim(),
        sectionTitle: title,
        pageNumber,
        tokenCount: estimateTokens(currentText.trim()),
      });
      currentText = sentence;
      currentTokens = sentenceTokens;
    } else {
      currentText = currentText ? `${currentText} ${sentence}` : sentence;
      currentTokens = estimateTokens(currentText);
    }
  }

  if (currentText.trim().length > 0) {
    result.push({
      text: currentText.trim(),
      sectionTitle: title,
      pageNumber,
      tokenCount: estimateTokens(currentText.trim()),
    });
  }

  return result;
}

/**
 * Chunk a parsed document by section, then by sentence, then by token count as last resort.
 * Respects MAX_CHUNK_TOKENS; every chunk carries section title and page when available.
 */
export function chunkDocument(
  parsed: ParsedDocument,
  maxChunkTokens: number,
): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];

  for (const section of parsed.sections) {
    chunks.push(...chunkSection(section, maxChunkTokens));
  }

  return chunks;
}
