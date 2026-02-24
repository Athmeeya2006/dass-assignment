const QRCode = require('qrcode');

const generateQRCode = async (ticketId) => {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(ticketId, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 1,
      width: 300,
    });
    return qrCodeDataUrl;
  } catch (error) {
    console.error('QR Code generation error:', error);
    throw error;
  }
};

module.exports = { generateQRCode };
