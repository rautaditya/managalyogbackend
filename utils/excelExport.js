const ExcelJS = require('exceljs');

const exportTransactionsToExcel = async (transactions, siteName = 'All Sites') => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Mangalyog Enterprise';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(`${siteName} - Transactions`);

 sheet.columns = [
  { header: '', key: 'date',         width: 14 },
  { header: '', key: 'name',         width: 22 },
  { header: '', key: 'note',         width: 30 }, // swapped
  { header: '', key: 'type',         width: 8  },
  { header: '', key: 'amount',       width: 14 },
  { header: '', key: 'payment_mode', width: 14 },
  { header: '', key: 'description',  width: 25 }, // swapped
];

  // ── Row 1: MangalYog Enterprises title ──
  sheet.insertRow(1, ['MangalYog Enterprises', '', '', '', '', '', '']);
  sheet.mergeCells('A1:G1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'MangalYog Enterprises';
  titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFA07A' } }; // faint orange (Light Salmon)
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(1).height = 28;

  // ── Row 2: Column headers ──
const headers = ['Date', 'Name', 'Note', 'Type', 'Amount (Rs.)', 'Payment Mode', 'Description'];
sheet.insertRow(2, headers);
  const headerRow = sheet.getRow(2);
  headerRow.font      = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height    = 22;

  let totalIn = 0, totalOut = 0;

  transactions.forEach((txn) => {
    const row = sheet.addRow({
  date:         new Date(txn.date).toLocaleDateString('en-IN'),
  name:         txn.name,
  note:         txn.description || '',  // swapped
  type:         txn.type,
  amount:       parseFloat(txn.amount),
  payment_mode: txn.payment_mode,
  description:  txn.note || '',         // swapped
});

    row.getCell('type').font = {
      color: { argb: txn.type === 'IN' ? 'FF16A34A' : 'FFDC2626' },
      bold: true,
    };
    row.getCell('amount').numFmt = '#,##0.00';

    if (txn.type === 'IN') totalIn  += parseFloat(txn.amount);
    else                    totalOut += parseFloat(txn.amount);
  });

  // ── Summary rows ──
  sheet.addRow([]);
  const r1 = sheet.addRow(['', '', '', 'Total IN',  totalIn,             '', '']);
  const r2 = sheet.addRow(['', '', '', 'Total OUT', totalOut,            '', '']);
  const r3 = sheet.addRow(['', '', '', 'Balance',   totalIn - totalOut,  '', '']);

  [r1, r2, r3].forEach((r) => {
    r.getCell(5).numFmt = '#,##0.00';
    r.getCell(5).font   = { bold: true };
  });
  r1.getCell(4).font = { bold: true, color: { argb: 'FF16A34A' } };
  r2.getCell(4).font = { bold: true, color: { argb: 'FFDC2626' } };
  r3.getCell(4).font = { bold: true };

  return workbook;
};

module.exports = { exportTransactionsToExcel };