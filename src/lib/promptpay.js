function crc16(data) {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) !== 0 ? (crc << 1) ^ 0x1021 : crc << 1;
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, '0');
}

function formatTag(id, value) {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

export function promptPayPayload(targetId, amount) {
  const cleanId = targetId.replace(/[^0-9]/g, '');
  let targetTag = '';

  if (cleanId.length >= 13) {
    // เลขบัตรประชาชน / Tax ID
    targetTag = formatTag('02', cleanId);
  } else {
    // เบอร์โทรศัพท์ (แปลง 08x -> 00668x)
    const phone = '0066' + cleanId.replace(/^0/, '');
    targetTag = formatTag('01', phone);
  }

  const merchantInfo = formatTag(
    '29',
    formatTag('00', 'A000000677010111') + targetTag
  );

  const numAmount = Number(amount);
  const hasAmount = numAmount > 0;

  let payload =
    formatTag('00', '01') +
    formatTag('01', hasAmount ? '12' : '11') + // 12 = ล็อกยอดเงินอัตโนมัติ
    merchantInfo +
    formatTag('53', '764') + // สกุลเงิน THB
    (hasAmount ? formatTag('54', numAmount.toFixed(2)) : '') + // ยัดยอดเงินตรงนี้
    formatTag('58', 'TH') +
    '6304';

  return payload + crc16(payload);
}