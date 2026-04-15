const ExcelJS = require('exceljs');

const exportTransactionsToExcel = async (transactions, siteName = 'All Sites') => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Mangalyog Enterprise';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(`${siteName} - Transactions`);

  sheet.columns = [
    { header: 'Date',         key: 'date',         width: 14 },
    { header: 'Name',         key: 'name',         width: 22 },
    { header: 'Description',  key: 'description',  width: 30 },
    { header: 'Type',         key: 'type',         width: 8  },
    { header: 'Amount (Rs.)', key: 'amount',       width: 14 },
    { header: 'Payment Mode', key: 'payment_mode', width: 14 },
    { header: 'Note',         key: 'note',         width: 25 },
  ];

  // Style header
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
  sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(1).height = 22;

  let totalIn = 0, totalOut = 0;

  transactions.forEach((txn) => {
    const row = sheet.addRow({
      date:         new Date(txn.date).toLocaleDateString('en-IN'),
      name:         txn.name,
      description:  txn.description || '',
      type:         txn.type,
      amount:       parseFloat(txn.amount),
      payment_mode: txn.payment_mode,
      note:         txn.note || '',
    });

    row.getCell('type').font = {
      color: { argb: txn.type === 'IN' ? 'FF16A34A' : 'FFDC2626' },
      bold: true,
    };
    row.getCell('amount').numFmt = '#,##0.00';

    if (txn.type === 'IN') totalIn  += parseFloat(txn.amount);
    else                    totalOut += parseFloat(txn.amount);
  });

  // Summary
  sheet.addRow([]);
  const r1 = sheet.addRow(['', '', '', 'Total IN',  totalIn,          '', '']);
  const r2 = sheet.addRow(['', '', '', 'Total OUT', totalOut,         '', '']);
  const r3 = sheet.addRow(['', '', '', 'Balance',   totalIn - totalOut, '', '']);

  [r1, r2, r3].forEach((r) => {
    r.getCell(5).numFmt = '#,##0.00';
    r.getCell(5).font = { bold: true };
  });
  r1.getCell(4).font = { bold: true, color: { argb: 'FF16A34A' } };
  r2.getCell(4).font = { bold: true, color: { argb: 'FFDC2626' } };
  r3.getCell(4).font = { bold: true };

  return workbook;
};

module.exports = { exportTransactionsToExcel };
