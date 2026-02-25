const { PDFDocument, StandardFonts } = require('pdf-lib');
const fs = require('fs');

async function test() {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const dingbatsFont = await pdfDoc.embedFont(StandardFonts.ZapfDingbats);

    try {
        page.drawText('✔', { font: dingbatsFont });
        console.log("Success with '✔'");
    } catch (e) { console.log('✔ failed:', e.message); }

    try {
        page.drawText(String.fromCharCode(52), { font: dingbatsFont });
        console.log("Success with 52");
    } catch (e) { console.log('52 failed:', e.message); }

    try {
        page.drawText('4', { font: dingbatsFont });
        console.log("Success with '4'");
    } catch (e) { console.log('4 failed:', e.message); }

    try {
        page.drawText(String.fromCharCode(0x2714), { font: dingbatsFont });
        console.log("Success with 0x2714");
    } catch (e) { console.log('0x2714 failed:', e.message); }
}

test();
