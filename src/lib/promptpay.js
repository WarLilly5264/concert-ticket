const tlv = (id, value) => id + String(value.length).padStart(2, '0') + value;

function crc16(str) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// id = เบอร์โทร (10 หลัก) หรือเลขบัตรประชาชน (13 หลัก)
export function promptPayPayload(id, amount) {
  const digits = id.replace(/\D/g, '');
  const target = digits.length <= 10
    ? tlv('01', '0066' + digits.replace(/^0/, ''))
    : tlv('02', digits);
  const hasAmount = amount > 0;

  const body =
    tlv('00', '01') +
    tlv('01', hasAmount ? '12' : '11') +
    tlv('29', tlv('00', 'A000000677010111') + target) +
    tlv('53', '764') +
    (hasAmount ? tlv('54', amount.toFixed(2)) : '') +
    tlv('58', 'TH') +
    '6304';

  return body + crc16(body);
}