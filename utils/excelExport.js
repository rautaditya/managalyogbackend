const ExcelJS = require('exceljs');

const exportTransactionsToExcel = async (
  transactions,
  siteName = 'All Sites',
  filterSummary = 'No filters applied'
) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Mangalyog Enterprise';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(`${siteName} - Transactions`);

  // ── Set column widths WITHOUT triggering a blank row ──
  // Do this AFTER adding rows, or use getColumn() which doesn't add rows
  const colWidths = [14, 22, 30, 13, 16, 14, 25];

  // ── Row 1: Company title ──
  const titleRow = sheet.addRow(['MangalYog Enterprises', '', '', '', '', '', '']);
  sheet.mergeCells('A1:G1');
  const titleCell    = sheet.getCell('A1');
  titleCell.value    = 'MangalYog Enterprises';
  titleCell.font     = { bold: true, size: 14, color: { argb: 'FFFFA07A' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  titleRow.height    = 28;

  // ── Row 2: Filter summary ──
  const subtitleRow = sheet.addRow([filterSummary, '', '', '', '', '', '']);
  sheet.mergeCells('A2:G2');
  const subtitleCell     = sheet.getCell('A2');
  subtitleCell.value     = filterSummary;
  subtitleCell.font      = { italic: true, size: 10, color: { argb: 'FF6B7280' } };
  subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  subtitleCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
  subtitleRow.height     = 18;

  // ── Row 3: Column headers ──
  const headerRow = sheet.addRow([
    'Date', 'Name', 'Note', 'Type', 'Amount (Rs.)', 'Payment Mode', 'Description'
  ]);
  headerRow.font      = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height    = 22;

  let totalIn = 0, totalOut = 0;

  // ── Data rows ──
  transactions.forEach((txn) => {
    const row = sheet.addRow([
      new Date(txn.date).toLocaleDateString('en-IN'),
      txn.name         || '',
      txn.description  || '',   // Note column
      txn.type,
      parseFloat(txn.amount),
      txn.payment_mode || '',
      txn.note         || '',   // Description column
    ]);

    row.getCell(4).font = {
      color: { argb: txn.type === 'IN' ? 'FF16A34A' : 'FFDC2626' },
      bold: true,
    };
    row.getCell(5).numFmt = '#,##0.00';

    if (txn.type === 'IN') totalIn  += parseFloat(txn.amount);
    else                    totalOut += parseFloat(txn.amount);
  });

  // ── Summary rows ──
  const r1 = sheet.addRow(['', '', '', 'Total IN',  totalIn,            '', '']);
  const r2 = sheet.addRow(['', '', '', 'Total OUT', totalOut,           '', '']);
  const r3 = sheet.addRow(['', '', '', 'Balance',   totalIn - totalOut, '', '']);

  [r1, r2, r3].forEach((r) => {
    r.getCell(5).numFmt = '#,##0.00';
    r.getCell(5).font   = { bold: true };
  });
  r1.getCell(4).font = { bold: true, color: { argb: 'FF16A34A' } };
  r2.getCell(4).font = { bold: true, color: { argb: 'FFDC2626' } };
  r3.getCell(4).font = { bold: true };

  // ── Apply column widths AFTER all rows added ──
  colWidths.forEach((width, i) => {
    sheet.getColumn(i + 1).width = width;
  });

  return workbook;
};

module.exports = { exportTransactionsToExcel };