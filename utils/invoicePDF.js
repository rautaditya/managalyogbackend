const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

/* ---------- Helpers ---------- */
function fmtNum(n) {
  return Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function fmtDate(d) {
  if (!d) return 'N/A';
  const dt = new Date(d);
  return `${dt.getDate()}-${dt.getMonth() + 1}-${dt.getFullYear()}`;
}

function numberToWords(num) {
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num === 0) return 'Zero';
  if (num < 20) return a[num];
  if (num < 100) return (b[Math.floor(num / 10)] + ' ' + a[num % 10]).trim();
  if (num < 1000) return (a[Math.floor(num / 100)] + ' Hundred ' + numberToWords(num % 100)).trim();
  if (num < 100000) return (numberToWords(Math.floor(num / 1000)) + ' Thousand ' + numberToWords(num % 1000)).trim();
  if (num < 10000000) return (numberToWords(Math.floor(num / 100000)) + ' Lakh ' + numberToWords(num % 100000)).trim();

  return num.toString();
}

const ORANGE = '#EA580C';
const BLACK = '#000000';
const LGRAY = '#E8E8E8';

/* ---------- Main Function ---------- */
const generatePDF = (doc_data, type = 'Invoice') => {

  console.log("PDF FILE RUNNING:", __filename);
  console.log("ADVANCE AMOUNT:", doc_data.advance_amount);

  const doc = new PDFDocument({ margin: 0, size: 'A4', autoFirstPage: true });

  const PW = doc.page.width;
  const PH = doc.page.height;
  const L = 36;
  const R = PW - 36;

  // WATERMARK
  const watermarkPath = path.join(__dirname, '../assets/logo.png');

  if (fs.existsSync(watermarkPath)) {
    doc.save();
    doc.opacity(0.08);
    doc.image(watermarkPath, PW / 2 - 250, PH / 2 - 250, { width: 500 });
    doc.restore();
  } else {
    console.log('Watermark file not found at:', watermarkPath);
  }

  drawHeader(doc, doc_data, type, PW, PH, L, R);
  const y = drawToFrom(doc, doc_data, L, R);
  drawTable(doc, doc_data, y + 10, L, R);

  return doc;
};

/* ---------- Header ---------- */
function drawHeader(doc, data, type, PW, PH, L, R) {
  doc.rect(0, 0, PW, 10).fill(ORANGE);

  const T = 18;

  doc.fillColor(BLACK)
    .font('Helvetica-Bold')
    .fontSize(14)
    .text('MangalYog Enterprise', L, T, { lineBreak: false });

  const addrLines = [
    'Near Virbhadreshwar mandir, Ringroad,',
    'Latur - 413512',
    'Mob. No - ' + (data.phone || '9970874042'),
    'E-Mail ID - mangalyogentp@gmail.com',
    'GSTIN-' + (data.gst_number || '27CVTPP0520Q1ZU')
  ];

  let ay = T + 16;
  doc.font('Helvetica').fontSize(9);

  addrLines.forEach(line => {
    doc.fillColor(BLACK).text(line, L, ay, { lineBreak: false });
    ay += 13;
  });

  const rawNum = type === 'Invoice' ? data.invoice_number : data.quotation_number;
  const docNum = rawNum ? rawNum.replace('QUO', 'MYE').replace('INV', 'MYE') : '';

  const docLabel = type === 'Invoice'
    ? `INVOICE NO. ${docNum}`
    : `QUOTE NO. ${docNum}`;

  const rxL = 358;

  doc.font('Helvetica')
    .fontSize(10)
    .fillColor(BLACK)
    .text(`DATE- ${fmtDate(data.date)}`, rxL, T, {
      width: R - rxL,
      align: 'right',
      lineBreak: false
    });

  doc.moveTo(rxL, T + 22).lineTo(R, T + 22).lineWidth(0.8).strokeColor(BLACK).stroke();

  doc.font('Helvetica-Bold')
    .fontSize(10)
    .fillColor(BLACK)
    .text(docLabel, rxL, T + 30, {
      width: R - rxL,
      align: 'right',
      lineBreak: false
    });

  doc.moveTo(rxL, T + 50).lineTo(R, T + 50).lineWidth(0.8).strokeColor(BLACK).stroke();

  // ✅ STATUS BADGE — invoice only
  if (type === 'Invoice' && data.status) {
    const statusStyles = {
  'Tax Invoice':      { bg: '#dcfce7', border: '#16a34a', text: '#166534' },
  'Proforma Invoice': { bg: '#fee2e2', border: '#dc2626', text: '#991b1b' },
};

const style = statusStyles[data.status] || { bg: '#f1f5f9', border: '#94a3b8', text: '#1e293b' };
    const label = data.status.toUpperCase();

    const badgeW = 72;
    const badgeH = 18;
    const badgeX = R - badgeW;
    const badgeY = T + 56;

    // Badge background
    doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 4)
      .fillAndStroke(style.bg, style.border);

    // Badge text
    doc.font('Helvetica-Bold')
      .fontSize(8)
      .fillColor(style.text)
      .text(label, badgeX, badgeY + 5, {
        width: badgeW,
        align: 'center',
        lineBreak: false,
      });
  }

  doc.moveTo(L, 112).lineTo(R, 112).lineWidth(0.5).strokeColor('#BBBBBB').stroke();

  doc.rect(0, PH - 12, PW, 12).fill(ORANGE);
}

/* ---------- To / From ---------- */
function drawToFrom(doc, data, L, R) {
  const site = data.site || {};
  const fromX = 308;
  const startY = 122;

  doc.font('Helvetica-Bold').fontSize(10).fillColor(BLACK)
    .text('TO:', L, startY, { lineBreak: false });

  let toY = startY + 14;

  doc.font('Helvetica-Bold').fontSize(9.5).fillColor(BLACK)
    .text(site.name || '', L, toY, { width: 250 });

  toY = doc.y + 2;

  const toLines = [
    site.address ? `Address - ${site.address}` : '',
    site.owner_name ? `Owner Name - ${site.owner_name}` : '',
    site.phone ? `Phone - ${site.phone}` : '',
    site.gst_number ? `GST Number - ${site.gst_number}` : '',
    site.project_name ? `Project Name - ${site.project_name}` : '',
    site.status ? `Status - ${site.status}` : ''
  ].filter(Boolean);

  doc.font('Helvetica').fontSize(9).fillColor(BLACK);

  toLines.forEach(line => {
    doc.text(line, L, toY, { width: 250 });
    toY = doc.y + 2;
  });

  if (site.notes) {
    doc.font('Helvetica-Bold').fontSize(9).fillColor(BLACK)
      .text('Notes -', L, toY, { lineBreak: false });

    doc.font('Helvetica').fontSize(9).fillColor(BLACK)
      .text(` ${site.notes}`, L + 38, toY, { width: 212 });

    toY = doc.y + 2;
  }

  const toLineY = toY + 8;
  doc.moveTo(L, toLineY).lineTo(240, toLineY).lineWidth(0.7).strokeColor(BLACK).stroke();

  doc.font('Helvetica-Bold').fontSize(10).fillColor(BLACK)
    .text('From', fromX, startY + 6, { lineBreak: false });

  const fromLines = [
    'Name  - Raghuraj Patil',
    'Company Name - Mangalyog Enterprise',
    'Address - Near Virbhadreshwar mandir',
    'Ring road Latur',
    'Phone - 9970874042'
  ];

  let fy = startY + 19;
  doc.font('Helvetica').fontSize(9);

  fromLines.forEach(line => {
    doc.fillColor(BLACK).text(line, fromX, fy, {
      width: R - fromX,
      lineBreak: false
    });
    fy += 13;
  });

  return Math.max(toLineY + 4, fy + 2);
}

/* ---------- Table ---------- */
function drawTable(doc, data, tableTop, L, R) {
  const TL = L;
  const TR = R;

  const cSr = TL;
  const cDesc = TL + 38;
  const cQty = cDesc + 218;
  const cRate = cQty + 76;
  const cAmt = cRate + 106;

  const descWidth = cQty - cDesc - 10;
  const headerH = 30;
  const sumRowH = 26;
  const items = data.items || [];

  const itemHeights = items.map(item => {
    const lines = (item.description || '').split('\n');

    const bH = doc.font('Helvetica-Bold').fontSize(9)
      .heightOfString(lines[0] || '', { width: descWidth });

    const rH = lines.length > 1
      ? doc.font('Helvetica').fontSize(9)
        .heightOfString(lines.slice(1).join('\n'), { width: descWidth })
      : 0;

    return Math.max(44, bH + rH + 22);
  });

  const inWordText = numberToWords(Math.floor(data.total || 0)) + ' Rupees Only';
  const inWordBodyW = TR - TL - 82;
  const inWordBodyH = doc.font('Helvetica').fontSize(9)
    .heightOfString(inWordText, { width: inWordBodyW });
  const inWordH = Math.max(28, inWordBodyH + 16);

  const rowY = [];
  let cur = tableTop + headerH;

  itemHeights.forEach(h => {
    rowY.push(cur);
    cur += h;
  });

  const sumStartY = cur;
  const sumRow0Y = cur;
  const sumRow1Y = cur + sumRowH;
  const sumRow2Y = cur + sumRowH * 2;
  const inWordY = cur + sumRowH * 3;
  const tableBottom = inWordY + inWordH;

  // PASS 1 — FILLS
  doc.rect(TL, tableTop, TR - TL, headerH).fill(LGRAY);

  items.forEach((_, i) => {
    if (i % 2 === 1) {
      doc.rect(TL, rowY[i], TR - TL, itemHeights[i]).fill('#F7F7F7');
    }
  });

  doc.rect(TL, sumRow2Y, TR - TL, sumRowH).fill('#FFF4F0');

  // PASS 2 — LINES
  doc.lineWidth(0.7).strokeColor(BLACK);

  const hLines = [tableTop, tableTop + headerH];
  rowY.forEach((y, i) => hLines.push(y + itemHeights[i]));
  [sumRow0Y, sumRow1Y, sumRow2Y, inWordY, tableBottom].forEach(y => hLines.push(y));

  hLines.forEach(y => doc.moveTo(TL, y).lineTo(TR, y).stroke());

  [cSr, cDesc, cQty, cRate, cAmt, TR].forEach(x => {
    doc.moveTo(x, tableTop).lineTo(x, sumStartY).stroke();
  });

  [cSr, cRate, cAmt, TR].forEach(x => {
    doc.moveTo(x, sumStartY).lineTo(x, inWordY).stroke();
  });

  [cSr, TR].forEach(x => {
    doc.moveTo(x, inWordY).lineTo(x, tableBottom).stroke();
  });

  // PASS 3 — TEXT
  const hMid = tableTop + Math.floor((headerH - 9) / 2);

  doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(9);

  doc.text('#', cSr + 2, hMid, {
    width: cDesc - cSr - 4,
    align: 'center',
    lineBreak: false
  });

  doc.text('ITEM DESCRIPTION', cDesc + 5, hMid, {
    width: descWidth,
    align: 'center',
    lineBreak: false
  });

  doc.text('QTY', cQty + 3, hMid, {
    width: cRate - cQty - 6,
    align: 'center',
    lineBreak: false
  });

  doc.text('Rate/Qty', cRate + 4, hMid, {
    width: cAmt - cRate - 8,
    align: 'center',
    lineBreak: false
  });

  doc.text('Total', cAmt + 3, tableTop + 6, {
    width: TR - cAmt - 6,
    align: 'center',
    lineBreak: false
  });

  doc.text('Amount', cAmt + 3, tableTop + 17, {
    width: TR - cAmt - 6,
    align: 'center',
    lineBreak: false
  });

  items.forEach((item, i) => {
    const ry = rowY[i];
    const rowH = itemHeights[i];
    const amount = item.amount !== undefined ? item.amount : Number(item.quantity || 0) * Number(item.rate || 0);
    const midY = ry + Math.floor((rowH - 9) / 2);

    doc.font('Helvetica').fontSize(9).fillColor(BLACK)
      .text(String(i + 1), cSr + 2, midY, {
        width: cDesc - cSr - 4,
        align: 'center',
        lineBreak: false
      });

    const dLines = (item.description || '').split('\n');
    const boldLine = dLines[0] || '';
    const restText = dLines.slice(1).join('\n');

    doc.font('Helvetica-Bold').fontSize(9).fillColor(BLACK)
      .text(boldLine, cDesc + 6, ry + 10, {
        width: descWidth,
        lineBreak: true
      });

    if (restText) {
      const bH = doc.font('Helvetica-Bold').fontSize(9)
        .heightOfString(boldLine, { width: descWidth });

      doc.font('Helvetica').fontSize(9).fillColor(BLACK)
        .text(restText, cDesc + 6, ry + 10 + bH, {
          width: descWidth,
          lineBreak: true
        });
    }

    doc.font('Helvetica').fontSize(9).fillColor(BLACK)
      .text(String(item.quantity), cQty + 3, midY, {
        width: cRate - cQty - 6,
        align: 'center',
        lineBreak: false
      })
      .text(fmtNum(item.rate), cRate + 4, midY, {
        width: cAmt - cRate - 8,
        align: 'right',
        lineBreak: false
      })
      .text(fmtNum(amount), cAmt + 4, midY, {
        width: TR - cAmt - 8,
        align: 'right',
        lineBreak: false
      });
  });

  const sumDefs = [
    { y: sumRow0Y, label: 'Advance Amount', val: data.advance_amount || 0, bold: false },
    { y: sumRow1Y, label: 'GST ' + (data.tax_rate || 0) + '%', val: data.tax_amount || 0, bold: false },
    { y: sumRow2Y, label: 'Grand Total', val: data.total || 0, bold: true },
  ];

  sumDefs.forEach(({ y, label, val, bold }) => {
    const mY = y + Math.floor((sumRowH - 9) / 2);

    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(9)
      .fillColor(BLACK)
      .text(label, cRate + 4, mY, {
        width: cAmt - cRate - 8,
        align: 'left',
        lineBreak: false
      })
      .text(fmtNum(val), cAmt + 4, mY, {
        width: TR - cAmt - 8,
        align: 'right',
        lineBreak: false
      });
  });

  doc.font('Helvetica-Bold').fontSize(9).fillColor(BLACK)
    .text('In Word:', TL + 8, inWordY + 8, { lineBreak: false });

  doc.font('Helvetica').fontSize(9).fillColor(BLACK)
    .text(inWordText, TL + 74, inWordY + 8, {
      width: inWordBodyW,
      lineBreak: true
    });

  let noteY = tableBottom + 16;

  doc.font('Helvetica-Bold').fontSize(9).fillColor(BLACK)
    .text('Note :', L, noteY, { lineBreak: false });

  noteY += 14;

  const notes = Array.isArray(data.notes)
    ? data.notes
    : (data.notes || '').split('\n');

  notes.forEach((note, i) => {
    const t = String(note).trim();
    if (!t) return;

    doc.font('Helvetica').fontSize(9).fillColor(BLACK)
      .text((i + 1) + '. ' + t, L + 10, noteY, { width: R - L - 10 });

    noteY += 14;
  });
}

module.exports = { generatePDF };