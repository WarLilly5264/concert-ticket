import React, { useState } from 'react';
import styles from './IndieKids3Ticket.module.css';

const FONT = "'Kanit', 'Noto Sans Thai', system-ui, sans-serif";

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// วาดบาร์โค้ด + Mini QR ด้านล่างขวาให้เหมือนหน้าเว็บเป๊ะ
function drawFooterBar(ctx, x, y, w, serialCode) {
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.stroke();

  const qrSize = 88;
  const barW = w - qrSize - 24;
  const barY = y + 22;

  // บาร์โค้ด
  const pattern = [3, 4, 5, 3, 2, 4, 6, 3, 2, 4, 5, 3];
  let bx = x;
  let idx = 0;
  ctx.fillStyle = '#111827';
  while (bx < x + barW) {
    const bw = pattern[idx % pattern.length];
    if (idx % 2 === 0) {
      ctx.fillRect(bx, barY, Math.min(bw, x + barW - bx), 56);
    }
    bx += bw;
    idx++;
  }

  // เลขซีเรียลใต้บาร์โค้ด
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#64748b';
  ctx.font = `700 18px ${FONT}`;
  ctx.fillText(serialCode.split('').join(' '), x + barW / 2, barY + 84);

  // กล่อง Mini QR ข้างบาร์โค้ด
  const qrX = x + w - qrSize;
  const qrY = y + 20;
  roundRect(ctx, qrX, qrY, qrSize, qrSize, 12);
  ctx.fillStyle = '#f1f5f9';
  ctx.fill();

  const pad = 10;
  const inner = qrSize - pad * 2;
  const s = inner / 100;
  ctx.fillStyle = '#1e293b';
  const rects = [
    [0, 0, 30, 30], [70, 0, 30, 30], [0, 70, 30, 30],
    [40, 0, 20, 10], [40, 20, 10, 20], [80, 40, 20, 20],
    [0, 40, 30, 10], [40, 50, 30, 30], [80, 80, 20, 20], [50, 90, 20, 10],
  ];
  rects.forEach(([rx, ry, rw, rh]) => {
    ctx.fillRect(qrX + pad + rx * s, qrY + pad + ry * s, rw * s, rh * s);
  });
  ctx.fillStyle = '#ffffff';
  [[10, 10, 10, 10], [80, 10, 10, 10], [10, 80, 10, 10]].forEach(([rx, ry, rw, rh]) => {
    ctx.fillRect(qrX + pad + rx * s, qrY + pad + ry * s, rw * s, rh * s);
  });
}

// วาดรูปบัตร (รองรับทั้ง 'portrait' แนวตั้งทรงมือถือ และ 'landscape' แนวนอน)
async function buildTicketBlob({ booking, poster, serialCode, layout }) {
  if (document.fonts?.ready) await document.fonts.ready;
  const posterImg = await loadImage(poster);

  const isLandscape = layout === 'landscape';
  const W = isLandscape ? 1440 : 760;
  const H = isLandscape ? 880 : 1520;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // พื้นหลังสีเข้ม
  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, W, H);

  const cardX = isLandscape ? 40 : 32;
  const cardY = isLandscape ? 40 : 32;
  const cardW = W - cardX * 2;
  const cardH = H - cardY * 2;

  ctx.save();
  roundRect(ctx, cardX, cardY, cardW, cardH, 44);
  ctx.clip();

  // พื้นการ์ดสีขาว
  ctx.fillStyle = '#fdfdfd';
  ctx.fillRect(cardX, cardY, cardW, cardH);

  // พื้นที่รูปโปสเตอร์ (ซ้ายในแนวนอน / บนในแนวตั้งสัดส่วนเดียวกับหน้าเว็บ)
  const posterBoxW = isLandscape ? Math.round(cardW * 0.38) : cardW;
  const posterBoxH = isLandscape ? cardH : 500;

  ctx.save();
  ctx.beginPath();
  ctx.rect(cardX, cardY, posterBoxW, posterBoxH);
  ctx.clip();
  ctx.fillStyle = '#0f4c81';
  ctx.fillRect(cardX, cardY, posterBoxW, posterBoxH);

  const scale = Math.max(posterBoxW / posterImg.width, posterBoxH / posterImg.height);
  const drawW = posterImg.width * scale;
  const drawH = posterImg.height * scale;
  const drawX = cardX + (posterBoxW - drawW) / 2;
  ctx.drawImage(posterImg, drawX, cardY, drawW, drawH);
  ctx.restore();

  // ป้าย ADMIT สีเหลือง
  ctx.save();
  ctx.translate(cardX + 28, cardY + 28);
  ctx.rotate((-2 * Math.PI) / 180);
  roundRect(ctx, 0, 0, 155, 44, 10);
  ctx.fillStyle = '#facc15';
  ctx.fill();
  ctx.fillStyle = '#000000';
  ctx.font = `900 20px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`ADMIT ${booking.quantity}`, 77.5, 23);
  ctx.restore();

  // เส้นประรอยฉีก
  ctx.save();
  ctx.setLineDash([10, 8]);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 3;
  ctx.beginPath();
  if (isLandscape) {
    ctx.moveTo(cardX + posterBoxW, cardY);
    ctx.lineTo(cardX + posterBoxW, cardY + cardH);
  } else {
    ctx.moveTo(cardX, cardY + posterBoxH);
    ctx.lineTo(cardX + cardW, cardY + posterBoxH);
  }
  ctx.stroke();
  ctx.restore();

  // พื้นที่ฝั่งรายละเอียด
  const infoX = isLandscape ? cardX + posterBoxW + 48 : cardX + 38;
  const infoY = isLandscape ? cardY + 48 : cardY + posterBoxH + 46;
  const infoW = isLandscape ? cardW - posterBoxW - 96 : cardW - 76;

  // หัวข้อชื่องาน (2 บรรทัด)
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#0f4c81';
  ctx.font = `900 ${isLandscape ? 54 : 52}px ${FONT}`;
  ctx.fillText('INDIE KID', infoX, infoY + 42);
  ctx.fillText('PARTY 3', infoX, infoY + 98);

  // วงกลมราคาสีเหลืองมุมขวาบน
  const badgeR = isLandscape ? 52 : 56;
  const badgeCx = infoX + infoW - badgeR;
  const badgeCy = infoY + 54;
  ctx.save();
  ctx.translate(badgeCx, badgeCy);
  ctx.rotate((6 * Math.PI) / 180);
  ctx.beginPath();
  ctx.arc(0, 0, badgeR, 0, Math.PI * 2);
  ctx.fillStyle = '#f5c518';
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  ctx.fillStyle = '#111111';
  ctx.textAlign = 'center';
  ctx.font = `900 34px ${FONT}`;
  ctx.fillText(`${booking.total}`, 0, 5);
  ctx.font = `800 18px ${FONT}`;
  ctx.fillText('THB', 0, 27);
  ctx.restore();

  // รายชื่อวงย่อย
  ctx.fillStyle = '#64748b';
  ctx.font = `600 18px ${FONT}`;
  ctx.fillText('PADMI • SOLITARYN • MOONTAGE • FONGFORD •', infoX, infoY + 138);
  ctx.fillText('IDIN • SVCKNID • SECRET DOOR', infoX, infoY + 164);

  // ข้อมูลผู้ถือบัตร (Grid 2 คอลัมน์)
  const col2X = infoX + Math.round(infoW * (isLandscape ? 0.52 : 0.48));
  const rowGap = isLandscape ? 54 : 62;
  let curY = infoY + (isLandscape ? 216 : 222);

  // แถว 1: ผู้ถือบัตร
  ctx.fillStyle = '#94a3b8';
  ctx.font = `700 17px ${FONT}`;
  ctx.fillText('ผู้ถือบัตร (HOLDER)', infoX, curY);
  curY += 36;
  ctx.fillStyle = '#0f4c81';
  ctx.font = `800 32px ${FONT}`;
  ctx.fillText(booking.name, infoX, curY);

  // แถว 2: เบอร์โทร & จำนวนบัตร
  curY += rowGap;
  ctx.fillStyle = '#94a3b8';
  ctx.font = `700 17px ${FONT}`;
  ctx.fillText('เบอร์โทร (PHONE)', infoX, curY);
  ctx.fillText('จำนวนบัตร (TICKETS)', col2X, curY);

  curY += 36;
  ctx.fillStyle = '#1e293b';
  ctx.font = `700 28px ${FONT}`;
  ctx.fillText(booking.phone, infoX, curY);
  ctx.fillStyle = '#0f4c81';
  ctx.font = `800 29px ${FONT}`;
  ctx.fillText(`${booking.quantity} ใบ`, col2X, curY);

  // แถว 3: วันที่จัดงาน & เวลาที่ทำรายการ
  curY += rowGap;
  ctx.fillStyle = '#94a3b8';
  ctx.font = `700 17px ${FONT}`;
  ctx.fillText('วันที่จัดงาน (DATE)', infoX, curY);
  ctx.fillText('เวลาที่ทำรายการ', col2X, curY);

  curY += 36;
  ctx.fillStyle = '#1e293b';
  ctx.font = `700 28px ${FONT}`;
  ctx.fillText('26 Dec 2026', infoX, curY);
  ctx.font = `600 23px ${FONT}`;
  ctx.fillText(booking.timestamp, col2X, curY);

  // ป้ายสถานะการชำระเงิน
  curY += isLandscape ? 44 : 52;
  const isConfirmed = booking.status === 'confirmed';
  const statusText = isConfirmed ? '✅ ยืนยันการชำระเงินแล้ว' : '⏳ รอตรวจสอบการชำระเงิน';
  roundRect(ctx, infoX, curY, 340, 50, 25);
  ctx.fillStyle = isConfirmed ? '#dcfce7' : '#fef3c7';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = isConfirmed ? '#86efac' : '#fcd34d';
  ctx.stroke();

  ctx.fillStyle = isConfirmed ? '#15803d' : '#b45309';
  ctx.font = `700 21px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(statusText, infoX + 170, curY + 32);

  // ส่วนท้ายบาร์โค้ด + Mini QR
  const footerY = cardY + cardH - 165;
  drawFooterBar(ctx, infoX, footerY, infoW, serialCode);

  ctx.restore();

  // รอยบากวงกลม 2 ฝั่ง
  ctx.fillStyle = '#111111';
  if (isLandscape) {
    [cardY, cardY + cardH].forEach((cy) => {
      ctx.beginPath();
      ctx.arc(cardX + posterBoxW, cy, 22, 0, Math.PI * 2);
      ctx.fill();
    });
  } else {
    [cardX, cardX + cardW].forEach((cx) => {
      ctx.beginPath();
      ctx.arc(cx, cardY + posterBoxH, 24, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('สร้างรูปไม่สำเร็จ'))), 'image/png')
  );
}

export default function IndieKids3Ticket({ booking, poster }) {
  const [savingLayout, setSavingLayout] = useState(null);
  const [saveMsg, setSaveMsg] = useState('');

  const phoneSuffix = (booking.phone || '0000').slice(-4);
  const serialCode = `IKP3-${phoneSuffix}-${booking.quantity}X-2026`;

  const handleSaveTicket = async (layout) => {
    setSavingLayout(layout);
    setSaveMsg('');
    try {
      const blob = await buildTicketBlob({ booking, poster, serialCode, layout });
      const tag = layout === 'landscape' ? 'Wide' : 'Mobile';
      const file = new File([blob], `ETicket-IndieKids3-${tag}-${phoneSuffix}.png`, {
        type: 'image/png',
      });

      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'E-Ticket อินดี้คิดส์ปาร์ตี้ 3',
          });
          return;
        } catch (err) {
          if (err.name === 'AbortError') return;
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setSaveMsg(`บันทึกรูปบัตร${layout === 'landscape' ? 'แนวนอน' : 'แนวตั้ง'}เรียบร้อยแล้ว!`);
    } catch (err) {
      console.error(err);
      setSaveMsg('บันทึกรูปไม่สำเร็จ ลองแคปหน้าจอแทนได้เลยครับ');
    } finally {
      setSavingLayout(null);
    }
  };

  return (
    <>
      <div className={styles.ticketCard}>
        {/* ฝั่งโปสเตอร์ */}
        <div className={styles.posterCol}>
          <img src={poster} alt={booking.eventName} className={styles.posterImg} />
          <div className={styles.admitBadge}>
            ADMIT {booking.quantity}
          </div>
        </div>

        {/* ฝั่งรายละเอียดตั๋ว */}
        <div className={styles.detailsCol}>
          <div className={styles.cutoutA} aria-hidden="true" />
          <div className={styles.cutoutB} aria-hidden="true" />

          <div>
            {/* หัวบัตร + ป้ายราคา */}
            <div className={styles.headerRow}>
              <div>
                <h2 className={styles.eventTitle}>
                  INDIE KID<br />PARTY 3
                </h2>
                <p className={styles.subLineup}>
                  PADMI • SOLITARYN • MOONTAGE • FONGFORD • IDIN • SVCKNID • SECRET DOOR
                </p>
              </div>

              <div className={styles.priceCircle}>
                <span className={styles.priceNum}>{booking.total}</span>
                <span className={styles.priceUnit}>THB</span>
              </div>
            </div>

            {/* ข้อมูลผู้จองและรายละเอียดงาน */}
            <div className={styles.infoGrid}>
              <div className={styles.fullSpan}>
                <p className={styles.label}>ผู้ถือบัตร (Holder)</p>
                <p className={styles.valueHighlight}>{booking.name}</p>
              </div>

              <div>
                <p className={styles.label}>เบอร์โทร (Phone)</p>
                <p className={styles.value}>{booking.phone}</p>
              </div>

              <div>
                <p className={styles.label}>จำนวนบัตร (Tickets)</p>
                <p className={styles.valueHighlight}>{booking.quantity} ใบ</p>
              </div>

              <div>
                <p className={styles.label}>วันที่จัดงาน (Date)</p>
                <p className={styles.value}>26 Dec 2026</p>
              </div>

              <div>
                <p className={styles.label}>เวลาที่ทำรายการ</p>
                <p className={styles.value} style={{ fontSize: '0.85rem' }}>{booking.timestamp}</p>
              </div>
            </div>

            {/* ป้ายสถานะ */}
            <div className={styles.statusRow}>
              {booking.status === 'confirmed' ? (
                <span className={styles.statusConfirmed}>✅ ยืนยันการชำระเงินแล้ว</span>
              ) : (
                <span className={styles.statusPending}>⏳ รอตรวจสอบการชำระเงิน</span>
              )}
            </div>
          </div>

          {/* ท้ายบัตร: บาร์โค้ด & QR */}
          <div>
            <div className={styles.footerSection}>
              <div className={styles.barcodeWrap}>
                <div className={styles.barcode} />
                <p className={styles.serialText}>{serialCode}</p>
              </div>

              <div className={styles.miniQr} aria-hidden="true">
                <svg viewBox="0 0 100 100" width="100%" height="100%" fill="#1e293b">
                  <rect x="0" y="0" width="30" height="30" />
                  <rect x="70" y="0" width="30" height="30" />
                  <rect x="0" y="70" width="30" height="30" />
                  <rect x="10" y="10" width="10" height="10" fill="#fff" />
                  <rect x="80" y="10" width="10" height="10" fill="#fff" />
                  <rect x="10" y="80" width="10" height="10" fill="#fff" />
                  <rect x="40" y="0" width="20" height="10" />
                  <rect x="40" y="20" width="10" height="20" />
                  <rect x="80" y="40" width="20" height="20" />
                  <rect x="0" y="40" width="30" height="10" />
                  <rect x="40" y="50" width="30" height="30" />
                  <rect x="80" y="80" width="20" height="20" />
                  <rect x="50" y="90" width="20" height="10" />
                </svg>
              </div>
            </div>
            <p className={styles.noteText}>เลือกบันทึกรูปบัตรด้านล่างเก็บไว้แสดงหน้างาน</p>
          </div>
        </div>
      </div>

      {/* ปุ่มเลือกบันทึกรูปบัตรทั้ง 2 แบบ */}
      <div className={styles.saveBtnGroup}>
        <button
          type="button"
          className={styles.saveTicketBtn}
          onClick={() => handleSaveTicket('portrait')}
          disabled={savingLayout !== null}
        >
          {savingLayout === 'portrait' ? 'กำลังสร้าง...' : '📥 บันทึกแนวตั้ง'}
        </button>

        <button
          type="button"
          className={styles.saveTicketBtnAlt}
          onClick={() => handleSaveTicket('landscape')}
          disabled={savingLayout !== null}
        >
          {savingLayout === 'landscape' ? 'กำลังสร้าง...' : '🖼️ บันทึกแนวนอน'}
        </button>
      </div>
      {saveMsg && <p className={styles.saveHint}>{saveMsg}</p>}
    </>
  );
}