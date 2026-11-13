import React, { useState, useEffect } from 'react';
import styles from './Home.module.css';
import { supabase } from '../../lib/supabase';
import { promptPayPayload } from '../../lib/promptpay';
import PromptPayQR from './PromptPayQR';

// โหลดรูปโปสเตอร์ทั้ง 2 งาน
import posterImg1 from '../../assets/image_899a45.jpg'; 
import posterImg2 from '../../assets/indie-kids-3.png'; 

const PROMPTPAY_ID = '0801650551';
const ACCOUNT_NAME = 'ภูมินทร์ สุรินโยธา';

// --- ข้อมูลของแต่ละคอนเสิร์ต ---
const EVENTS_INFO = [
  {
    dbId: "cf6e40ed-b5fb-4c06-84bc-070b24e3c11e", 
    shortName: "INDIE X BAANNAA", 
    title: "INDIE KIDS X BAANNAA",
    date: "27 NOVEMBER 2026 @ BAANNAA",
    poster: posterImg1,
    schedule: [
      "19:00 Doors Open",
      "20:00 SVCKNID",
      "20:45 SECRET DOOR",
      "21:30 IDIN"
    ],
    onlinePrice: 150,
    doorPrice: 250
  },
  {
    dbId: "cbea4e42-b6a6-41df-852a-377137ce9fa3",
    shortName: "INDIE KIDS 3", 
    title: "อินดี้คิดส์ปาร์ตี้ 3",
    date: "26 DECEMBER 2026",
    poster: posterImg2,
    schedule: [
      "Lineup:",
      "PADMI",
      "Solitaryn",
      "Moontage Daydream",
      "FongFord",
      "UBG.4US x FKCREW",
      "IDIN",
      "SvckNid",
      "L4wW x AkMiller",
      "Secret Door"
    ],
    onlinePrice: 150,
    doorPrice: 150 
  }
];

function Home() {
  const [activeTab, setActiveTab] = useState(0);
  const currentEvent = EVENTS_INFO[activeTab];

  const [dbEvents, setDbEvents] = useState([]);
  
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
    const fetchAllEvents = async () => {
      const { data, error } = await supabase.from('events').select('*');
      if (!error && data) {
        setDbEvents(data);
      } else {
        console.error('เชื่อมต่อ Supabase พลาด:', error?.message);
      }
    };
    fetchAllEvents();
  }, []);

  const activeDbData = dbEvents.find(e => e.id === currentEvent.dbId);
  const ticketsLeft = activeDbData ? (activeDbData.total_tickets - activeDbData.tickets_sold) : 'กำลังโหลด...';

  const handleBooking = async () => {
    if (!name || !phone || !slipFile || !currentEvent.dbId) return;

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
        p_event_id: currentEvent.dbId,
        p_name: name,
        p_phone: phone,
        p_qty: quantity,
        p_slip: slipUrl
      });

      if (rpcError) throw new Error('เกิดข้อผิดพลาดในการจอง: ' + rpcError.message);

      if (rpcData && rpcData.success) {
        setBookingSuccess({
          eventName: currentEvent.title,
          name,
          phone,
          quantity,
          total: quantity * currentEvent.onlinePrice,
          timestamp: new Date().toLocaleString('th-TH'),
          status: 'pending' 
        });
        
        setIsModalOpen(false);
        setName('');
        setPhone('');
        setQuantity(1);
        setSlipFile(null);
        setDbEvents(prev => prev.map(e => e.id === currentEvent.dbId ? { ...e, tickets_sold: e.tickets_sold + quantity } : e));
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
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw new Error(error.message);

      if (data && data.length > 0) {
        const b = data[0];
        const bookedEvent = EVENTS_INFO.find(e => e.dbId === b.event_id) || currentEvent;

        setBookingSuccess({
          eventName: bookedEvent.title,
          name: b.customer_name,
          phone: b.phone,
          quantity: b.quantity,
          total: b.quantity * bookedEvent.onlinePrice,
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
      
      {bookingSuccess ? (
        <>
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
          
          <button className={styles.backButton} onClick={() => setBookingSuccess(null)}>
            กลับสู่หน้าแรก
          </button>
        </>
      ) : (
        <>
          <div className={styles.tabContainer}>
            {EVENTS_INFO.map((event, index) => (
              <button 
                key={event.dbId}
                className={activeTab === index ? `${styles.tabButton} ${styles.activeTab}` : styles.tabButton}
                onClick={() => setActiveTab(index)}
              >
                {event.shortName}
              </button>
            ))}
          </div>

          <div className={styles.posterSection}>
            <img src={currentEvent.poster} alt={currentEvent.title} className={styles.poster} />
          </div>

          <div className={styles.detailsSection}>
            <h1 className={styles.title}>{currentEvent.title}</h1>
            <p className={styles.date}>{currentEvent.date}</p>
            
            <div className={styles.schedule}>
              {currentEvent.schedule.map((item, idx) => (
                item === "Lineup:" ? (
                  <h4 key={idx} className={styles.lineupHeader}>LINEUP ARTISTS</h4>
                ) : (
                  <div key={idx} className={styles.scheduleItem}>
                    <span className={styles.bulletPoint}></span>
                    {item}
                  </div>
                )
              ))}
            </div>
            
            <div className={styles.ticketInfo}>
              <p>ONLINE TICKET: <strong>{currentEvent.onlinePrice}฿</strong></p>
              <p>AT DOOR: {currentEvent.doorPrice}฿</p>
            </div>
            
            <button 
              className={styles.bookButton}
              disabled={ticketsLeft === 0 || ticketsLeft === 'กำลังโหลด...'}
              onClick={() => setIsModalOpen(true)}
            >
              {ticketsLeft === 'กำลังโหลด...' ? 'กำลังเชื่อมต่อ...' : (ticketsLeft > 0 ? 'จองบัตรเลย' : 'SOLD OUT')}
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

            <PromptPayQR
              payload={promptPayPayload(PROMPTPAY_ID, quantity * currentEvent.onlinePrice)}
              amount={quantity * currentEvent.onlinePrice}
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