export function splitKoreanText(text: string): string[] {
    // Korean sentence endings
    const sentences = text.split(/(?<=[.!?。？！])\s*/);
    // Filter out empty sentences and strip whitespace
    return sentences.map(s => s.trim()).filter(s => s.length > 0);
}
