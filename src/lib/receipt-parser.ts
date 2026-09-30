/**
 * Utility for extracting tracking numbers and customer names from receipts (PDF / Images)
 * Supports Flash Express (both Columnar Table and List/Compact formats), Kerry, J&T, Thailand Post.
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

// Header labels and metadata that should NEVER be treated as customer names
const HEADER_OR_LABEL_PATTERNS = [
  /^(customer(\s*no)?|address|tax\s*id|tel|e-mail|email|date|time|branch|สาขา|ผู้ส่ง|sender|cashier|staff|pos|bill\s*no|receipt\s*no|เลขที่|วันที่)\s*[:：\-]/i,
  /^e-mail\s*[:：\-]?$/i,
  /^tel\s*[:：\-]?/i,
  /^tax\s*id\s*[:：\-]?/i,
  /^customer\s*[:：\-]?/i,
  /^address\s*[:：\-]?/i,
  /^flash\s*express/i,
  /บริษัท\s*แฟลช/i,
  /ใบเสร็จ/i,
  /ใบกำกับ/i,
  /ยูนิลีเวอร์/i,
  /ห้วยขวาง/i,
  /กรุงเทพมหานคร/i,
  /ราคาสินค้า/i,
  /บริการรวมภาษี/i,
  /จํานวนเงินเรียกเก็บ/i,
  /จำนวนเงินเรียกเก็บ/i,
  /paid\s*[:：\-]?/i,
  /ยอดรวม/i,
  /รวมทั้งสิ้น/i,
  /เงินสด/i,
  /เงินทอน/i,
  /ขอบคุณ/i,
  /thank\s*you/i,
  /^[=\-_*#]{3,}$/,
  /^(tracking\s*number|consignee|weight|dimension|packaging|flash\s*care|box\s*shield|on-time|cod\s*fee|freight|fuel|surcharge|charges)\b/i,
  /^(เลขพัสดุ|ผู้รับ|น้ำหนัก|ขนาด|ค่าบรรจุภัณฑ์|ประกันพัสดุ|ค่าธรรมเนียม|ค่าขนส่ง|ค่าน้ำมัน|ค่าใช้จ่ายรวม)/i,
  /^(ยอดรวม|total|ภาษีมูลค่าเพิ่ม|ปัดเศษ|จำนวนเงินสุทธิ|net\s*amount)/i,
  /^(ข้อกำหนด|เงื่อนไข|ความรับผิดชอบ|หมายเหตุ|terms?\b|conditions?\b|disclaimer)/i,
  /^\(inc\s*vat\)|\(exc\s*vat\)$/i,
];

// Inline courier metadata tokens to strip from a line
const INLINE_METADATA_STRIP_REGEX =
  /\s*(fuel\s*surcharge|freight\s*charge|weight|size|speed|cod|declared|vat|discount|ค่าขนส่ง|ค่าธรรมเนียม|น้ำหนัก|ขนาด)\s*[:：\-]?\s*[\d,.*a-zA-Z\s\/]*$/i;

export function cleanCustomerName(raw: string): string {
  let text = raw.trim();
  if (!text) return '';

  // Check if entire line is a header/junk label
  for (const pat of HEADER_OR_LABEL_PATTERNS) {
    if (pat.test(text)) return '';
  }

  // Strip prefix like "1.", "2)", "01."
  text = text.replace(/^(\d+[\.\)\-]\s*)+/, '');
  // Strip receiver prefixes like "ผู้รับ :", "ชื่อ:"
  text = text.replace(RECEIVER_PREFIX_REGEX, '');
  text = text.replace(/^(เลขพัสดุ|เลขที่พัสดุ|tracking\s*no|tracking|awb)\s*[:：\-]\s*/i, '');

  // Strip inline courier metadata (repeat to remove chained tokens)
  text = text.replace(INLINE_METADATA_STRIP_REGEX, '');
  text = text.replace(INLINE_METADATA_STRIP_REGEX, '');

  // Strip courier dimensions (e.g. 25×17×9 or 14x10x6 or 17*25*9cm)
  text = text.replace(/\b(size\s*[:：\-]?\s*)?\d+[\s×xX*]\d+[\s×xX*]\d+\s*(cm|mm)?\b/gi, '');
  text = text.replace(/\b\d+[\s×xX*]\d+\b/g, '');

  // Strip weight and measurements (e.g. 1 KG, 1.5 kg, 500 g)
  text = text.replace(/\b(weight\s*[:：\-]?\s*)?\d+(\.\d+)?\s*(kg|g|กิโลกรัม|กรัม)\b/gi, '');
  // Strip standalone unit tokens
  text = text.replace(/\b(cm|mm|m|ซม|มม|kg|g)\b/gi, '');

  // Strip sequences of numbers / prices (e.g. 0.00 0.00 0.00 35.00 3.00 38.00)
  text = text.replace(/(\s*\b\d+\.\d{2}\b)+/g, '');
  text = text.replace(/(\s*\b\d+\b)+$/g, '');

  // Normalize Flash font ligatures
  text = text.replace(/ิϧง/g, 'ิ่ง');
  text = text.replace(/ิϧ/g, 'ิ่');
  text = text.replace(/ีϧ/g, 'ี่');
  text = text.replace(/ืϧ/g, 'ึ่ง');
  text = text.replace(/ϧ/g, '่');
  text = text.replace(/Ϩ/g, '้');

  // Clean extra spaces
  text = text.replace(/\s+/g, ' ').trim();

  // If only digits, symbols or punctuation remain, return empty
  if (/^[0-9.,_\-*#= ]*$/.test(text)) return '';

  return text;
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
    const nameParts: string[] = [];

    // Step 1: Check if the same line contains the name
    let sameLineCleaned = line.replace(match[0], '').trim();
    sameLineCleaned = cleanCustomerName(sameLineCleaned);
    if (sameLineCleaned) {
      nameParts.push(sameLineCleaned);
    }

    // Step 2: Check following lines for name or surname if not already having full name (>= 2 words)
    if (nameParts.length === 0 || sameLineCleaned.split(/\s+/).length < 2) {
      let nextIdx = i + 1;
      while (nextIdx < rawLines.length) {
        const nextLine = rawLines[nextIdx];
        // Stop if next line is another tracking number
        if (TRACKING_REGEX.test(nextLine)) break;

        const nextCleaned = cleanCustomerName(nextLine);
        if (!nextCleaned) {
          // If line contains weights/dimensions/prices, we reached the row data, stop searching ahead
          if (
            /\b\d+(\.\d+)?\s*(kg|cm|mm|บาท)\b/i.test(nextLine) ||
            /\b\d+[\s×xX*]\d+\b/i.test(nextLine) ||
            /^\d+(\.\d{2})?(\s+\d+(\.\d{2})?)+$/.test(nextLine) ||
            /^(size|weight|freight|charges)\s*[:：\-]/i.test(nextLine)
          ) {
            break;
          }
          nextIdx++;
          continue;
        }

        // Valid name part
        nameParts.push(nextCleaned);
        usedLineIndices.add(nextIdx);
        if (nameParts.length >= 2) break;
        nextIdx++;
      }
    }

    // Step 3: If no name found ahead, check preceding line (i-1)
    if (nameParts.length === 0 && i - 1 >= 0 && !usedLineIndices.has(i - 1)) {
      const prevCleaned = cleanCustomerName(rawLines[i - 1]);
      if (prevCleaned && !TRACKING_REGEX.test(rawLines[i - 1])) {
        nameParts.push(prevCleaned);
        usedLineIndices.add(i - 1);
      }
    }

    usedLineIndices.add(i);

    const finalName = nameParts.join(' ').trim();
    const isNameIncomplete = !finalName || finalName === 'ไม่ระบุชื่อ' || finalName === '(ยังไม่ระบุชื่อ)';
    items.push({
      name: finalName || 'ไม่ระบุชื่อ',
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
 * Supports both Multi-column table receipts (Layout 1) and Sequential list receipts (Layout 2).
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
  const allDocLines: string[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const pct = 20 + Math.round((pageNum / numPages) * 60);
    onProgress?.(pct, `กำลังอ่านข้อมูลหน้า ${pageNum}/${numPages}...`);

    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    const items = (textContent.items as any[]) || [];
    const validItems = items.filter((it) => it.str && it.str.trim().length > 0);
    if (validItems.length === 0) continue;

    // ตรวจสอบว่าหน้านี้มี Header คอลัมน์ Consignee / ผู้รับ หรือไม่ (เพื่อแยก Format A กับ Format B)
    const hasConsigneeHeader = validItems.some((it) => /consignee|ผู้รับ/i.test(it.str));

    // รวบรวมหมายเลขพัสดุในหน้านี้
    const trackingItems: Array<{
      tracking: string;
      x: number;
      y: number;
      fullStr: string;
      item: any;
    }> = [];

    for (const it of validItems) {
      const match = it.str.match(TRACKING_REGEX);
      if (match) {
        trackingItems.push({
          tracking: match[1].toUpperCase(),
          x: Math.round(it.transform[4]),
          y: Math.round(it.transform[5]),
          fullStr: it.str,
          item: it,
        });
      }
    }

    if (hasConsigneeHeader && trackingItems.length > 0) {
      // Format A: ตารางหลายคอลัมน์ (เช่น Flash Express Temporary Receipt)
      // เลขพัสดุอยู่คอลัมน์ 1 (x ≈ 45), ชื่อผู้รับอยู่คอลัมน์ 2 (x: 70..145)
      trackingItems.sort((a, b) => b.y - a.y);
      for (let idx = 0; idx < trackingItems.length; idx++) {
        const tItem = trackingItems[idx];
        const prevY = idx > 0 ? trackingItems[idx - 1].y : tItem.y + 35;
        const nextY = idx + 1 < trackingItems.length ? trackingItems[idx + 1].y : tItem.y - 35;

        const topY = Math.min(tItem.y + 14, (tItem.y + prevY) / 2);
        const bottomY = Math.max(tItem.y - 14, (tItem.y + nextY) / 2);

        const nameParts: string[] = [];
        const sameItemRemainder = cleanCustomerName(tItem.fullStr.replace(TRACKING_REGEX, ''));
        if (sameItemRemainder) nameParts.push(sameItemRemainder);

        const rowConsigneeItems = validItems.filter((it) => {
          const x = Math.round(it.transform[4]);
          const y = Math.round(it.transform[5]);
          return y < topY && y >= bottomY && x >= 70 && x < 145 && it !== tItem.item;
        });

        rowConsigneeItems.sort((a, b) => b.transform[5] - a.transform[5]);

        for (const cItem of rowConsigneeItems) {
          const cleaned = cleanCustomerName(cItem.str);
          if (cleaned && !nameParts.includes(cleaned)) {
            nameParts.push(cleaned);
          }
        }

        const finalName = nameParts.join(' ').trim();
        allDocLines.push(`${finalName || 'ไม่ระบุชื่อ'} ${tItem.tracking}`);
      }
    } else {
      // Format B: ใบเสร็จแบบรายการบรรทัดต่อบรรทัด (เช่น Flash Express ใบเสร็จรับเงินอย่างย่อ)
      // เรียงลำดับบรรทัดตาม Y บนลงล่าง, X ซ้ายไปขวา
      validItems.sort((a, b) => {
        const yDiff = b.transform[5] - a.transform[5];
        if (Math.abs(yDiff) > 3) return yDiff;
        return a.transform[4] - b.transform[4];
      });

      const pageLines: string[] = [];
      let currentLine: string[] = [];
      let currentY: number | null = null;

      for (const item of validItems) {
        const y = item.transform[5];
        if (currentY === null || Math.abs(y - currentY) <= 3) {
          currentLine.push(item.str.trim());
          currentY = y;
        } else {
          pageLines.push(currentLine.join(' '));
          currentLine = [item.str.trim()];
          currentY = y;
        }
      }
      if (currentLine.length > 0) {
        pageLines.push(currentLine.join(' '));
      }

      allDocLines.push(...pageLines);
    }
  }

  const combinedText = allDocLines.join('\n').trim();

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
