/**
 * Utility for extracting tracking numbers and customer names from receipts (PDF / Images)
 * Supports Flash Express and other couriers (Kerry, J&T, Thailand Post).
 */

export interface ParsedReceiptItem {
  name: string;
  tracking: string;
  isNameIncomplete?: boolean;
  rawSnippet?: string;
}

export interface ParseReceiptResult {
  items: ParsedReceiptItem[];
  rawText: string;
  totalDetected: number;
  incompleteCount: number;
}

export const TRACKING_REGEX =
  /\b(TH[0-9A-Z]{10,16}|KEX[0-9A-Z]{8,14}|KER[0-9A-Z]{8,14}|ED\d{9}TH|EF\d{9}TH|82\d{10,14})\b/i;
export const RECEIVER_PREFIX_REGEX =
  /^(ผู้รับ|receiver|to|ชื่อผู้รับ|ชื่อลูกค้า|cust(omer)?)\s*[:：\-]\s*/i;

const JUNK_PATTERNS = [
  /flash\s*express/i,
  /kerry/i,
  /j&t/i,
  /ไปรษณีย์/i,
  /ใบเสร็จ/i,
  /ใบกำกับ/i,
  /tax\s*invoice/i,
  /abb/i,
  /weight/i,
  /น้ำหนัก/i,
  /freight/i,
  /charge/i,
  /fuel/i,
  /surcharge/i,
  /size/i,
  /ขนาด/i,
  /speed/i,
  /cod/i,
  /vat/i,
  /subtotal/i,
  /total/i,
  /ยอดรวม/i,
  /รวมทั้งสิ้น/i,
  /เงินสด/i,
  /cash/i,
  /change/i,
  /เงินทอน/i,
  /discount/i,
  /ส่วนลด/i,
  /branch/i,
  /สาขา/i,
  /pos/i,
  /bill\s*no/i,
  /receipt\s*no/i,
  /เลขที่/i,
  /วันที่/i,
  /date/i,
  /time/i,
  /staff/i,
  /cashier/i,
  /พนักงาน/i,
  /sender/i,
  /ผู้ส่ง/i,
  /berrypink/i,
  /signature/i,
  /ลายมือชื่อ/i,
  /ขอบคุณ/i,
  /thank\s*you/i,
  /barcode/i,
  /declared/i,
  /insurance/i,
  /ค่าขนส่ง/i,
  /ค่าบริการ/i,
  /รายการพัสดุ/i,
  /^(เลขพัสดุ|เลขที่พัสดุ|tracking|awb|waybill)\s*[:：\-]?$/i,
  /^\s*[\d,.]+\s*(บาท|baht|thb|kg|cm)?\s*$/i,
  /^[=\-_*#]{3,}$/,
];

export function isJunkLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  for (const pat of JUNK_PATTERNS) {
    if (pat.test(trimmed)) return true;
  }
  return false;
}

export function cleanCustomerName(raw: string): string {
  let name = raw.trim();
  name = name.replace(RECEIVER_PREFIX_REGEX, '');
  name = name.replace(/^(เลขพัสดุ|เลขที่พัสดุ|tracking\s*no|tracking|awb)\s*[:：\-]\s*/i, '');
  name = name.replace(/^(\d+[\.\)\-]\s*)+/, '');
  name = name.replace(/\s+[\d,.]+\s*(บาท|baht|thb|kg|cm)?$/i, '');
  return name.trim();
}

/**
 * Parses raw text extracted from a receipt to match customer names with tracking numbers.
 */
export function parseReceiptText(text: string): ParseReceiptResult {
  const rawLines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const items: ParsedReceiptItem[] = [];
  const usedLineIndices = new Set<number>();

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const match = line.match(TRACKING_REGEX);
    if (!match) continue;

    const tracking = match[1].toUpperCase();
    let name = '';

    // Check if the line itself contains the name
    let lineWithoutTracking = line.replace(match[0], '').trim();
    lineWithoutTracking = cleanCustomerName(lineWithoutTracking);

    if (lineWithoutTracking && !isJunkLine(lineWithoutTracking)) {
      name = lineWithoutTracking;
    } else {
      // Step A: Check if immediate adjacent lines (i-1 or i+1) explicitly have receiver prefix
      if (i - 1 >= 0 && RECEIVER_PREFIX_REGEX.test(rawLines[i - 1]) && !usedLineIndices.has(i - 1)) {
        name = cleanCustomerName(rawLines[i - 1]);
        usedLineIndices.add(i - 1);
      } else if (i + 1 < rawLines.length && RECEIVER_PREFIX_REGEX.test(rawLines[i + 1]) && !usedLineIndices.has(i + 1)) {
        name = cleanCustomerName(rawLines[i + 1]);
        usedLineIndices.add(i + 1);
      } else {
        // Step B: Check immediate following line (i+1)
        if (
          i + 1 < rawLines.length &&
          !isJunkLine(rawLines[i + 1]) &&
          !TRACKING_REGEX.test(rawLines[i + 1]) &&
          !usedLineIndices.has(i + 1)
        ) {
          const cand = cleanCustomerName(rawLines[i + 1]);
          if (cand && !isJunkLine(cand)) {
            name = cand;
            usedLineIndices.add(i + 1);
          }
        }
        // Step C: Check immediate preceding line (i-1)
        if (
          !name &&
          i - 1 >= 0 &&
          !isJunkLine(rawLines[i - 1]) &&
          !TRACKING_REGEX.test(rawLines[i - 1]) &&
          !usedLineIndices.has(i - 1)
        ) {
          const cand = cleanCustomerName(rawLines[i - 1]);
          if (cand && !isJunkLine(cand)) {
            name = cand;
            usedLineIndices.add(i - 1);
          }
        }
      }
    }

    usedLineIndices.add(i);

    const isNameIncomplete = !name || name === 'ไม่ระบุชื่อ' || name === '(ยังไม่ระบุชื่อ)';
    items.push({
      name: name || 'ไม่ระบุชื่อ',
      tracking,
      isNameIncomplete,
      rawSnippet: line,
    });
  }

  const incompleteCount = items.filter((it) => it.isNameIncomplete).length;

  return {
    items,
    rawText: text,
    totalDetected: items.length,
    incompleteCount,
  };
}

/**
 * Format parsed items into bulk input text format: "Name Tracking" per line
 */
export function formatItemsToBulkText(items: ParsedReceiptItem[]): string {
  return items.map((item) => `${item.name} ${item.tracking}`).join('\n');
}

/**
 * Extract text from an image file (.png, .jpg, .jpeg, .webp) using tesseract.js
 */
export async function extractTextFromImage(
  file: File | Blob | HTMLCanvasElement,
  onProgress?: (progress: number, message: string) => void
): Promise<string> {
  onProgress?.(10, 'กำลังโหลดระบบ OCR ภาษาไทยและอังกฤษ...');

  const { createWorker } = await import('tesseract.js');

  const worker = await createWorker(['tha', 'eng'], 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        const pct = Math.min(98, 20 + Math.round((m.progress || 0) * 75));
        onProgress?.(pct, `กำลังสแกนตัวอักษรจากภาพ (${pct}%)...`);
      } else if (m.status === 'loading language traineddata') {
        onProgress?.(15, 'กำลังโหลดฐานข้อมูลภาษาไทย/อังกฤษ...');
      }
    },
  });

  try {
    const { data } = await worker.recognize(file);
    return data.text;
  } finally {
    await worker.terminate();
  }
}

/**
 * Extract text from a PDF file using pdfjs-dist.
 * If the PDF is scanned (contains no text layer), it automatically falls back to OCR.
 */
export async function extractTextFromPdf(
  file: File,
  onProgress?: (progress: number, message: string) => void
): Promise<string> {
  onProgress?.(10, 'กำลังโหลดโปรแกรมอ่าน PDF...');

  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  }

  onProgress?.(20, 'กำลังเปิดไฟล์เอกสาร PDF...');
  const arrayBuffer = await file.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    cMapPacked: true,
  });

  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const pct = 20 + Math.round((pageNum / numPages) * 60);
    onProgress?.(pct, `กำลังอ่านข้อมูลหน้า ${pageNum}/${numPages}...`);

    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Reconstruct text lines based on Y and X coordinates
    const items = (textContent.items as any[]) || [];
    const validItems = items.filter((it) => it.str && it.str.trim().length > 0);

    if (validItems.length > 0) {
      // Sort by Y descending (top to bottom), then X ascending (left to right)
      validItems.sort((a, b) => {
        const yA = a.transform[5];
        const yB = b.transform[5];
        if (Math.abs(yA - yB) > 4) {
          return yB - yA;
        }
        return a.transform[4] - b.transform[4];
      });

      const lines: string[] = [];
      let currentLine: string[] = [];
      let currentY: number | null = null;

      for (const item of validItems) {
        const y = item.transform[5];
        if (currentY === null || Math.abs(y - currentY) <= 4) {
          currentLine.push(item.str);
          currentY = y;
        } else {
          lines.push(currentLine.join(' '));
          currentLine = [item.str];
          currentY = y;
        }
      }

      if (currentLine.length > 0) {
        lines.push(currentLine.join(' '));
      }

      pageTexts.push(lines.join('\n'));
    }
  }

  const combinedText = pageTexts.join('\n').trim();

  // If PDF has embedded text with tracking numbers or sufficient text, return it
  if (combinedText.length > 20 && TRACKING_REGEX.test(combinedText)) {
    onProgress?.(95, 'กำลังประมวลผลข้อความทั้งหมด...');
    return combinedText;
  }

  // Fallback: If no text was found (scanned PDF), render pages to canvas and perform OCR
  if (typeof window !== 'undefined') {
    onProgress?.(30, 'ไม่พบเลเยอร์ข้อความใน PDF กำลังสแกนด้วย OCR...');
    const ocrPageTexts: string[] = [];

    for (let pageNum = 1; pageNum <= Math.min(numPages, 5); pageNum++) {
      onProgress?.(
        30 + Math.round((pageNum / Math.min(numPages, 5)) * 60),
        `กำลังทำ OCR จากหน้า ${pageNum}/${numPages}...`
      );
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        await (page.render as any)({
          canvasContext: ctx,
          viewport,
          canvas,
        }).promise;
        const pageOcr = await extractTextFromImage(canvas);
        ocrPageTexts.push(pageOcr);
      }
    }

    return ocrPageTexts.join('\n');
  }

  return combinedText;
}
