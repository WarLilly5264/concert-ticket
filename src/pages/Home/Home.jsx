import React, { useState, useEffect } from 'react';
import styles from './Home.module.css';
import { supabase } from '../../lib/supabase';
import { promptPayPayload } from '../../lib/promptpay';
import PromptPayQR from './PromptPayQR';
import posterImg from '../../assets/image_899a45.jpg'; 

const PROMPTPAY_ID = '0801650551'; // ใส่เบอร์พร้อมเพย์จริง
const ACCOUNT_NAME = 'ภูมินทร์ สุรินโยธา';
const TICKET_PRICE = 150;

function Home() {
  const [eventId, setEventId] = useState(null);
  const [ticketsLeft, setTicketsLeft] = useState('กำลังโหลด...');
  
  // State สำหรับ Modal จองตั๋ว
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [slipFile, setSlipFile] = useState(null);

  // State สำหรับ Modal ตรวจสอบตั๋ว
  const [isCheckModalOpen, setIsCheckModalOpen] = useState(false);
  const [checkPhone, setCheckPhone] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  // State เก็บข้อมูลตั๋วเพื่อแสดง E-Ticket
  const [bookingSuccess, setBookingSuccess] = useState(null);

  // ตัวอย่างรูปสลิปที่เลือก (ให้ลูกค้าเห็นว่าแนบถูกใบ)
  const [slipPreview, setSlipPreview] = useState(null);
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
    const fetchEventData = async () => {
      const { data, error } = await supabase.from('events').select('*');
      if (error) {
        console.error('เชื่อมต่อ Supabase พลาด:', error.message);
        setTicketsLeft('Error');
      } else if (data.length > 0) {
        setTicketsLeft(data[0].total_tickets - data[0].tickets_sold);
        setEventId(data[0].id);
      }
    };
    fetchEventData();
  }, []);

  const handleBooking = async () => {
    if (!name || !phone || !slipFile || !eventId) return;

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
      
      const slipUrl = publicUrlData.publicUrl;

      const { data: rpcData, error: rpcError } = await supabase.rpc('book_tickets', {
        p_event_id: eventId,
        p_name: name,
        p_phone: phone,
        p_qty: quantity,
        p_slip: slipUrl
      });

      if (rpcError) throw new Error('เกิดข้อผิดพลาดในการจอง: ' + rpcError.message);

      if (rpcData && rpcData.success) {
        setBookingSuccess({
          name,
          phone,
          quantity,
          total: quantity * TICKET_PRICE,
          timestamp: new Date().toLocaleString('th-TH'),
          status: 'pending' // จองใหม่สถานะเป็นรอยืนยันเสมอ
        });
        
        setIsModalOpen(false);
        setName('');
        setPhone('');
        setQuantity(1);
        setSlipFile(null);
        setTicketsLeft(prev => prev - quantity);
      } else {
        alert(rpcData?.message || 'จองไม่สำเร็จ โปรดลองใหม่');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ฟังก์ชันดึงข้อมูลตั๋วเก่า
  const handleCheckTicket = async () => {
    if (!checkPhone) return;
    setIsChecking(true);
    
    try {
      // ค้นหาเบอร์โทรในฐานข้อมูล เรียงจากล่าสุด
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('phone', checkPhone)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw new Error(error.message);

      if (data && data.length > 0) {
        const b = data[0];
        setBookingSuccess({
          name: b.customer_name,
          phone: b.phone,
          quantity: b.quantity,
          total: b.quantity * TICKET_PRICE,
          timestamp: new Date(b.created_at).toLocaleString('th-TH'),
          status: b.status
        });
        setIsCheckModalOpen(false);
        setCheckPhone('');
      } else {
        alert('ไม่พบข้อมูลการจองสำหรับเบอร์โทรนี้');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className={styles.container}>
      
      {/* ถ้าจองสำเร็จ ให้แสดง E-Ticket แทนหน้าหลัก */}
      {bookingSuccess ? (
        <>
          <div className={styles.eTicketWrapper}>
            
            {/* ส่วนหัวตั๋วสีแดง */}
            <div className={styles.eTicketTop}>
              <h2 className={styles.eTicketHeader}>E-TICKET</h2>
              <h3 className={styles.eTicketEvent}>INDIE KIDS X BAANNAA</h3>
            </div>
            
            {/* รอยปรุและรอยฉีกตั๋ว */}
            <div className={styles.ticketDivider}></div>
            
            {/* ส่วนรายละเอียดตั๋ว */}
            <div className={styles.eTicketBottom}>
              <div className={styles.eTicketDetails}>
                <div className={styles.detailRow}><span>ชื่อ:</span> <strong>{bookingSuccess.name}</strong></div>
                <div className={styles.detailRow}><span>เบอร์โทร:</span> <strong>{bookingSuccess.phone}</strong></div>
                <div className={styles.detailRow}><span>จำนวนบัตร:</span> <strong>{bookingSuccess.quantity} ใบ</strong></div>
                <div className={styles.detailRow}><span>ยอดชำระ:</span> <strong>{bookingSuccess.total} บาท</strong></div>
                <div className={styles.detailRow}><span>เวลา:</span> <strong>{bookingSuccess.timestamp}</strong></div>
              </div>

              {/* สลับสีสถานะ */}
              <div className={bookingSuccess.status === 'confirmed' ? styles.eTicketStatusConfirmed : styles.eTicketStatus}>
                {bookingSuccess.status === 'confirmed' ? '✅ ยืนยันการชำระเงินแล้ว' : '⏳ รอตรวจสอบการชำระเงิน'}
              </div>
              
              <p className={styles.eTicketNote}>โปรดแคปหน้าจอนี้เก็บไว้เป็นหลักฐานเพื่อแสดงหน้างาน</p>
            </div>

          </div>
          
          <button className={styles.backButton} onClick={() => setBookingSuccess(null)}>
            กลับสู่หน้าแรก
          </button>
        </>
      ) : (
        <>
          <div className={styles.posterSection}>
            <img src={posterImg} alt="INDIE KIDS X BAANNAA" className={styles.poster} />
          </div>

          <div className={styles.detailsSection}>
            <h1 className={styles.title}>INDIE KIDS X BAANNAA</h1>
            <p className={styles.date}>27 NOVEMBER 2026 @ BAANNAA</p>
            
            <div className={styles.schedule}>
              <p>19:00 Doors Open</p>
              <p>20:00 SVCKNID</p>
              <p>20:45 SECRET DOOR</p>
              <p>21:30 IDIN</p>
            </div>
            
            <div className={styles.ticketInfo}>
              <p>ONLINE TICKET: <strong>150฿</strong></p>
              <p>AT DOOR: 250฿</p>
              <p className={styles.stock}>เหลือบัตร: {ticketsLeft} / 50 ใบ</p>
            </div>
            
            <button 
              className={styles.bookButton}
              disabled={ticketsLeft === 0 || ticketsLeft === 'กำลังโหลด...'}
              onClick={() => setIsModalOpen(true)}
            >
              {ticketsLeft > 0 ? 'จองบัตรเลย' : 'SOLD OUT'}
            </button>
            
            {/* ปุ่มสำหรับเช็คตั๋ว */}
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
            <h2>กรอกข้อมูลการจอง</h2>
            <div className={styles.formGroup}>
              <input type="text" placeholder="ชื่อ-นามสกุล" className={styles.inputField} value={name} onChange={(e) => setName(e.target.value)} disabled={isSubmitting} />
              <input type="tel" placeholder="เบอร์โทรศัพท์" className={styles.inputField} value={phone} onChange={(e) => setPhone(e.target.value)} disabled={isSubmitting} />
              <div className={styles.qtyRow}>
                <label>จำนวนบัตร:</label>
                <select className={styles.selectField} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} disabled={isSubmitting}>
                  {[1, 2, 3, 4, 5].map(num => (
                    <option key={num} value={num} disabled={num > ticketsLeft}>{num} ใบ</option>
                  ))}
                </select>
              </div>
            </div>

            {/* QR พร้อมเพย์ + ปุ่มบันทึกรูป (แทนที่ paymentBox เดิมทั้งก้อน) */}
            <PromptPayQR
              payload={promptPayPayload(PROMPTPAY_ID, quantity * TICKET_PRICE)}
              amount={quantity * TICKET_PRICE}
              accountName={ACCOUNT_NAME}
              displayId={PROMPTPAY_ID.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')}
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
              <button className={styles.cancelButton} onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>ยกเลิก</button>
              <button className={styles.confirmButton} onClick={handleBooking} disabled={!name || !phone || !slipFile || isSubmitting}>
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
            <p style={{ color: '#ccc', marginBottom: '16px', fontSize: '0.9rem' }}>กรอกเบอร์โทรศัพท์ที่ใช้ในการจอง</p>
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
              <button className={styles.cancelButton} onClick={() => setIsCheckModalOpen(false)} disabled={isChecking}>ยกเลิก</button>
              <button className={styles.confirmButton} onClick={handleCheckTicket} disabled={!checkPhone || isChecking}>
                {isChecking ? 'กำลังค้นหา...' : 'ค้นหาตั๋ว'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;