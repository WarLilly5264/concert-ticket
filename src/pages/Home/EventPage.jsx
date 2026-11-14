import React, { useState, useEffect } from 'react';
import styles from './Home.module.css';
import { supabase } from '../../lib/supabase';
import { promptPayPayload } from '../../lib/promptpay';
import PromptPayQR from './PromptPayQR';
import IndieKids3Ticket from './IndieKids3Ticket';

const PROMPTPAY_ID = '0801650551';
const ACCOUNT_NAME = 'ภูมินทร์ สุรินโยธา';

// 🧮 คำนวณราคา: โปร 250฿ เฉพาะตอนเลือก 2 ใบเท่านั้น ที่เหลือใบละ 150฿
function calculateTotal(qty, event) {
  if (event.promoPairPrice && qty === 2) {
    return event.promoPairPrice;
  }
  return qty * event.onlinePrice;
}

function EventPage({ event }) {
  const [ticketsLeft, setTicketsLeft] = useState('กำลังโหลด...');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [slipFile, setSlipFile] = useState(null);

  const [isCheckModalOpen, setIsCheckModalOpen] = useState(false);
  const [checkPhone, setCheckPhone] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [slipPreview, setSlipPreview] = useState(null);

  // ยอดรวมสุทธิของจำนวนบัตรที่กำลังเลือก
  const totalAmount = calculateTotal(quantity, event);

  useEffect(() => {
    if (!slipFile) {
      setSlipPreview(null);
      return;
    }
    const url = URL.createObjectURL(slipFile);
    setSlipPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [slipFile]);

  useEffect(() => {
    setTicketsLeft('กำลังโหลด...');
    setBookingSuccess(null);

    const fetchEventData = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('total_tickets, tickets_sold')
        .eq('id', event.dbId)
        .single();

      if (error || !data) {
        console.error('เชื่อมต่อ Supabase พลาด:', error?.message);
        setTicketsLeft('Error');
      } else {
        setTicketsLeft(data.total_tickets - data.tickets_sold);
      }
    };

    fetchEventData();
  }, [event.dbId]);

  const handleBooking = async () => {
    if (!name || !phone || !slipFile || !event.dbId) return;

    setIsSubmitting(true);
    try {
      const fileExt = slipFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.floor(Math.random() * 1000)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('slips')
        .upload(fileName, slipFile);

      if (uploadError) throw new Error('อัปโหลดสลิปไม่สำเร็จ: ' + uploadError.message);

      const { data: publicUrlData } = supabase.storage
        .from('slips')
        .getPublicUrl(fileName);

      const { data: rpcData, error: rpcError } = await supabase.rpc('book_tickets', {
        p_event_id: event.dbId,
        p_name: name,
        p_phone: phone,
        p_qty: quantity,
        p_slip: publicUrlData.publicUrl
      });

      if (rpcError) throw new Error('เกิดข้อผิดพลาดในการจอง: ' + rpcError.message);

      if (rpcData && rpcData.success) {
        setBookingSuccess({
          eventName: event.title,
          name,
          phone,
          quantity,
          total: totalAmount,
          timestamp: new Date().toLocaleString('th-TH'),
          status: 'pending'
        });

        setIsModalOpen(false);
        setName('');
        setPhone('');
        setQuantity(1);
        setSlipFile(null);
        setTicketsLeft((prev) => (typeof prev === 'number' ? prev - quantity : prev));
      } else {
        alert(rpcData?.message || 'จองไม่สำเร็จ โปรดลองใหม่');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckTicket = async () => {
    if (!checkPhone) return;
    setIsChecking(true);

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('phone', checkPhone)
        .eq('event_id', event.dbId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw new Error(error.message);

      if (data && data.length > 0) {
        const b = data[0];
        setBookingSuccess({
          eventName: event.title,
          name: b.customer_name,
          phone: b.phone,
          quantity: b.quantity,
          total: calculateTotal(b.quantity, event),
          timestamp: new Date(b.created_at).toLocaleString('th-TH'),
          status: b.status
        });
        setIsCheckModalOpen(false);
        setCheckPhone('');
      } else {
        alert(`ไม่พบข้อมูลการจองงาน "${event.title}" สำหรับเบอร์โทรนี้`);
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className={styles.container}>
      {bookingSuccess ? (
        <>
          {event.dbId === 'cbea4e42-b6a6-41df-852a-377137ce9fa3' ? (
            <IndieKids3Ticket booking={bookingSuccess} poster={event.poster} />
          ) : (
            <div className={styles.eTicketWrapper}>
              <div className={styles.eTicketTop}>
                <h2 className={styles.eTicketHeader}>E-TICKET</h2>
                <h3 className={styles.eTicketEvent}>{bookingSuccess.eventName}</h3>
              </div>

              <div className={styles.ticketDivider}></div>

              <div className={styles.eTicketBottom}>
                <div className={styles.eTicketDetails}>
                  <div className={styles.detailRow}><span>ชื่อ:</span> <strong>{bookingSuccess.name}</strong></div>
                  <div className={styles.detailRow}><span>เบอร์โทร:</span> <strong>{bookingSuccess.phone}</strong></div>
                  <div className={styles.detailRow}><span>จำนวนบัตร:</span> <strong>{bookingSuccess.quantity} ใบ</strong></div>
                  <div className={styles.detailRow}><span>ยอดชำระ:</span> <strong>{bookingSuccess.total} บาท</strong></div>
                  <div className={styles.detailRow}><span>เวลา:</span> <strong>{bookingSuccess.timestamp}</strong></div>
                </div>

                <div className={bookingSuccess.status === 'confirmed' ? styles.eTicketStatusConfirmed : styles.eTicketStatus}>
                  {bookingSuccess.status === 'confirmed' ? '✅ ยืนยันการชำระเงินแล้ว' : '⏳ รอตรวจสอบการชำระเงิน'}
                </div>

                <p className={styles.eTicketNote}>โปรดแคปหน้าจอนี้เก็บไว้เป็นหลักฐานเพื่อแสดงหน้างาน</p>
              </div>
            </div>
          )}

          <button
            className={styles.backButton}
            style={{ maxWidth: '380px' }}
            onClick={() => setBookingSuccess(null)}
          >
            กลับสู่หน้างาน
          </button>
        </>
      ) : (
        <>
          <div className={styles.posterSection}>
            <img src={event.poster} alt={event.title} className={styles.poster} />
          </div>

          <div className={styles.detailsSection}>
            <h1 className={styles.title}>{event.title}</h1>
            <p className={styles.date}>{event.date}</p>

            <div className={styles.schedule}>
              {event.schedule.map((item, idx) =>
                item === 'Lineup:' ? (
                  <h4 key={idx} className={styles.lineupHeader}>LINEUP ARTISTS</h4>
                ) : (
                  <div key={idx} className={styles.scheduleItem}>
                    <span className={styles.bulletPoint}></span>
                    {item}
                  </div>
                )
              )}
            </div>

            <div className={styles.ticketInfo}>
              <p>ONLINE TICKET: <strong>{event.onlinePrice}฿</strong></p>
              {event.promoPairPrice && (
                <p style={{ color: '#fcd34d', fontWeight: 'bold' }}>
                  🔥 PROMO มา 2 คน: {event.promoPairPrice}฿ (เฉลี่ยคนละ {event.promoPairPrice / 2}฿)
                </p>
              )}
              <p>AT DOOR: {event.doorPrice}฿</p>
            </div>

            <button
              className={styles.bookButton}
              disabled={typeof ticketsLeft !== 'number' || ticketsLeft <= 0}
              onClick={() => setIsModalOpen(true)}
            >
              {ticketsLeft === 'กำลังโหลด...'
                ? 'กำลังเชื่อมต่อ...'
                : ticketsLeft > 0
                ? 'จองบัตรเลย'
                : 'SOLD OUT'}
            </button>

            <button
              className={styles.checkButton}
              onClick={() => setIsCheckModalOpen(true)}
            >
              ตรวจสอบตั๋วของฉัน
            </button>
          </div>
        </>
      )}

      {/* Modal จองตั๋ว */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2>{event.title}</h2>
            <div className={styles.formGroup}>
              <input
                type="text"
                placeholder="ชื่อ-นามสกุล"
                className={styles.inputField}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
              />
              <input
                type="tel"
                placeholder="เบอร์โทรศัพท์"
                className={styles.inputField}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isSubmitting}
              />
              <div className={styles.qtyRow}>
                <label>จำนวนบัตร:</label>
                <select
                  className={styles.selectField}
                  style={{ width: 'auto', minWidth: '150px' }}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  disabled={isSubmitting}
                >
                  {[1, 2, 3, 4, 5].map((num) => {
                    const price = calculateTotal(num, event);
                    const isPromo = event.promoPairPrice && num === 2;
                    return (
                      <option key={num} value={num} disabled={num > ticketsLeft}>
                        {num} ใบ ({price}฿{isPromo ? ' โปรคู่' : ''})
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <PromptPayQR
              payload={promptPayPayload(PROMPTPAY_ID, totalAmount)}
              amount={totalAmount}
              accountName={ACCOUNT_NAME}
              displayId={PROMPTPAY_ID.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')}
              eventTitle={event.title}
            />

            <div className={styles.formGroup}>
              <span className={styles.fileLabel}>แนบสลิปโอนเงิน</span>
              <label className={`${styles.uploadBox} ${slipFile ? styles.uploadBoxFilled : ''}`}>
                <input
                  type="file"
                  accept="image/*"
                  className={styles.fileInputHidden}
                  onChange={(e) => setSlipFile(e.target.files[0] || null)}
                  disabled={isSubmitting}
                />
                {slipPreview ? (
                  <>
                    <img src={slipPreview} alt="สลิปที่แนบ" className={styles.slipThumb} />
                    <span className={styles.uploadText}>
                      <strong>แนบสลิปแล้ว</strong>
                      <small>แตะเพื่อเปลี่ยนรูป</small>
                    </span>
                  </>
                ) : (
                  <span className={styles.uploadText}>
                    <strong>แตะเพื่อแนบสลิป</strong>
                    <small>เลือกรูปจากอัลบั้ม</small>
                  </span>
                )}
              </label>
            </div>

            <div className={styles.buttonGroup}>
              <button
                className={styles.cancelButton}
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
              >
                ยกเลิก
              </button>
              <button
                className={styles.confirmButton}
                onClick={handleBooking}
                disabled={!name || !phone || !slipFile || isSubmitting}
              >
                {isSubmitting ? 'กำลังจอง...' : 'ยืนยันการจอง'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ตรวจสอบตั๋ว */}
      {isCheckModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2>ตรวจสอบตั๋วของฉัน</h2>
            <p style={{ color: '#ccc', marginBottom: '16px', fontSize: '0.9rem' }}>
              กรอกเบอร์โทรศัพท์ที่ใช้จองงาน {event.title}
            </p>
            <div className={styles.formGroup}>
              <input
                type="tel"
                placeholder="เบอร์โทรศัพท์"
                className={styles.inputField}
                value={checkPhone}
                onChange={(e) => setCheckPhone(e.target.value)}
                disabled={isChecking}
              />
            </div>
            <div className={styles.buttonGroup}>
              <button
                className={styles.cancelButton}
                onClick={() => setIsCheckModalOpen(false)}
                disabled={isChecking}
              >
                ยกเลิก
              </button>
              <button
                className={styles.confirmButton}
                onClick={handleCheckTicket}
                disabled={!checkPhone || isChecking}
              >
                {isChecking ? 'กำลังค้นหา...' : 'ค้นหาตั๋ว'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EventPage;