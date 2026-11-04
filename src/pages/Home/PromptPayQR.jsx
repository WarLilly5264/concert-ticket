import { useEffect, useRef, useState } from 'react';
import QRCodeStyling from 'qr-code-styling';
import styles from './PromptPayQR.module.css';

const FONT = "'Noto Sans Thai', 'Sarabun', system-ui, sans-serif";

// โลโก้กลาง QR: วงกลมแดงมีสัญลักษณ์ ฿ (ฝังเป็น data URI ไม่ต้องมีไฟล์รูป)
const LOGO =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
       <circle cx="50" cy="50" r="50" fill="#e50914"/>
       <text x="50" y="69" font-size="58" font-weight="800" text-anchor="middle"
             fill="#fff" font-family="Arial, sans-serif">฿</text>
     </svg>`
  );

// ตั้งค่าหน้าตา QR ที่เดียว ใช้ทั้งบนจอและตอนสร้างรูปไว้บันทึก
// เก็บโมดูลเป็นสีเข้มบนพื้นขาว + error correction ระดับ Q เพื่อให้แอปธนาคารสแกนติดง่าย
const makeOptions = (data, size) => ({
  width: size,
  height: size,
  type: 'canvas',
  data,
  margin: 0,
  qrOptions: { errorCorrectionLevel: 'Q' },
  dotsOptions: { type: 'rounded', color: '#111111' },
  cornersSquareOptions: { type: 'extra-rounded', color: '#c4000f' },
  cornersDotOptions: { type: 'dot', color: '#c4000f' },
  backgroundOptions: { color: '#ffffff' },
  image: LOGO,
  imageOptions: {
    hideBackgroundDots: true,
    imageSize: 0.22,
    margin: Math.round(size * 0.015),
  },
});

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// ประกอบ "การ์ดชำระเงิน" เป็นรูป PNG ผ่าน canvas
async function buildCardBlob({ payload, amount, accountName, displayId }) {
  const W = 900;
  const H = 1220;

  const qrBlob = await new QRCodeStyling(makeOptions(payload, 640)).getRawData('png');
  const qrImg = await createImageBitmap(qrBlob);
  if (document.fonts?.ready) await document.fonts.ready;

  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');

  g.fillStyle = '#111';
  g.fillRect(0, 0, W, H);

  // ตัวการ์ด + หัวสีแดง
  g.save();
  roundRect(g, 50, 50, 800, 1120, 36);
  g.clip();
  g.fillStyle = '#fff';
  g.fillRect(50, 50, 800, 1120);
  const grad = g.createLinearGradient(50, 50, 850, 250);
  grad.addColorStop(0, '#ff0f47');
  grad.addColorStop(1, '#e50914');
  g.fillStyle = grad;
  g.fillRect(50, 50, 800, 200);
  g.restore();

  // รอยบากสองข้างแบบตั๋ว
  g.fillStyle = '#111';
  [50, 850].forEach((x) => {
    g.beginPath();
    g.arc(x, 250, 24, 0, Math.PI * 2);
    g.fill();
  });

  g.textAlign = 'center';
  g.fillStyle = '#fff';
  g.font = `800 50px ${FONT}`;
  g.fillText('INDIE KIDS X BAANNAA', W / 2, 140);
  g.fillStyle = '#ffd6d6';
  g.font = `600 30px ${FONT}`;
  g.fillText('ชำระค่าบัตรผ่านพร้อมเพย์', W / 2, 192);

  // QR อยู่บนพื้นขาวล้วน เว้นขอบรอบตัวกว้างพอสำหรับ quiet zone
  g.drawImage(qrImg, 130, 300, 640, 640);

  g.fillStyle = '#111';
  g.font = `800 68px ${FONT}`;
  g.fillText(`${amount} บาท`, W / 2, 1030);
  g.font = `600 36px ${FONT}`;
  g.fillText(accountName, W / 2, 1090);
  g.fillStyle = '#777';
  g.font = `500 28px ${FONT}`;
  g.fillText(`พร้อมเพย์ ${displayId}`, W / 2, 1135);

  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error('สร้างรูปไม่สำเร็จ'))), 'image/png')
  );
}

export default function PromptPayQR({ payload, amount, accountName, displayId }) {
  const boxRef = useRef(null);
  const qrRef = useRef(null);
  const blobRef = useRef(null); // รูปที่สร้างรอไว้ล่วงหน้า กดปุ่มแล้วแชร์ได้ทันที
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // วาด QR บนจอครั้งแรก (สร้างที่ 2 เท่าแล้วย่อด้วย CSS ให้คมบนจอ retina)
  useEffect(() => {
    const qr = new QRCodeStyling(makeOptions(payload, 440));
    qrRef.current = qr;
    boxRef.current.innerHTML = '';
    qr.append(boxRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ยอดเปลี่ยน -> อัปเดต QR
  useEffect(() => {
    qrRef.current?.update({ data: payload });
  }, [payload]);

  // เตรียมรูปไว้ล่วงหน้า (หน่วงนิดหน่อยตอนผู้ใช้กดเปลี่ยนจำนวนบัตรรัว ๆ)
  useEffect(() => {
    let cancelled = false;
    blobRef.current = null;
    const t = setTimeout(async () => {
      try {
        const blob = await buildCardBlob({ payload, amount, accountName, displayId });
        if (!cancelled) blobRef.current = blob;
      } catch (e) {
        console.error(e);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [payload, amount, accountName, displayId]);

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    try {
      const blob =
        blobRef.current ?? (await buildCardBlob({ payload, amount, accountName, displayId }));
      const file = new File([blob], `promptpay-${amount}baht.png`, { type: 'image/png' });

      // มือถือ: เปิดหน้าต่างแชร์ของระบบ เลือก "บันทึกรูปภาพ" ลงอัลบั้มได้เลย
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'QR พร้อมเพย์' });
          return;
        } catch (err) {
          if (err.name === 'AbortError') return; // ผู้ใช้กดปิดเอง
        }
      }

      // เบราว์เซอร์ที่ไม่รองรับ: ดาวน์โหลดไฟล์ตรง ๆ
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setMsg('บันทึกรูปแล้ว ดูได้ในอัลบั้มหรือโฟลเดอร์ดาวน์โหลด');
    } catch (e) {
      console.error(e);
      setMsg('บันทึกรูปไม่สำเร็จ ลองแคปหน้าจอ QR แทน');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.ticket}>
        <div className={styles.head}>
          <span>สแกนจ่ายผ่านพร้อมเพย์</span>
          <strong>{amount} บาท</strong>
        </div>
        <div className={styles.body}>
          <div className={styles.frame}>
            <div ref={boxRef} className={styles.qrCanvas} />
            <span className={styles.scanLine} aria-hidden="true" />
          </div>
          <p className={styles.name}>{accountName}</p>
          <p className={styles.id}>{displayId}</p>
        </div>
      </div>

      <button type="button" className={styles.saveButton} onClick={handleSave} disabled={saving}>
        {saving ? 'กำลังสร้างรูป...' : 'บันทึกรูป QR'}
      </button>
      <p className={styles.hint}>
        {msg || 'บันทึกแล้วเปิดแอปธนาคาร เลือกสแกน แล้วเลือกรูปจากอัลบั้ม'}
      </p>
    </div>
  );
}