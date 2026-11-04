import React, { useState } from 'react';
import styles from './Admin.module.css';
import { supabase } from '../../lib/supabase';

function Admin() {
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // เพิ่ม State สำหรับเก็บยอดตั๋ว
  const [ticketsLeft, setTicketsLeft] = useState('...'); 

  const ADMIN_PASSWORD = 'baannaa_admin'; 

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthorized(true);
      fetchBookings(); 
      fetchEventData(); // ดึงยอดตั๋วคงเหลือด้วยตอนล็อกอินผ่าน
    } else {
      alert('รหัสผ่านไม่ถูกต้อง!');
      setPassword('');
    }
  };

  // ฟังก์ชันใหม่สำหรับดึงยอดตั๋วคงเหลือ
  const fetchEventData = async () => {
    const { data, error } = await supabase.from('events').select('*');
    if (!error && data.length > 0) {
      setTicketsLeft(data[0].total_tickets - data[0].tickets_sold);
    }
  };

  const fetchBookings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching bookings:', error.message);
    } else {
      setBookings(data);
    }
    setLoading(false);
  };

  const toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'pending' ? 'confirmed' : 'pending';
    
    const { error } = await supabase
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', id);
      
    if (error) {
      alert('อัปเดตสถานะไม่สำเร็จ: ' + error.message);
    } else {
      fetchBookings();
    }
  };

  if (!isAuthorized) {
    return (
      <div className={styles.loginContainer}>
        <form className={styles.loginBox} onSubmit={handleLogin}>
          <h2>Admin Login</h2>
          <input 
            type="password" 
            placeholder="ใส่รหัสผ่าน..." 
            className={styles.loginInput}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className={styles.loginButton}>เข้าสู่ระบบ</button>
        </form>
      </div>
    );
  }

  return (
    <div className={styles.adminPage}>
      <div className={styles.container}>
        <h2 className={styles.pageTitle}>ระบบจัดการหลังบ้าน</h2>
        
        {/* --- กล่องแสดงยอดบัตรคงเหลือบนหน้าแอดมิน --- */}
        <div className={styles.summaryBox}>
          <h3>ยอดบัตรคงเหลือ: <span className={styles.stockHighlight}>{ticketsLeft} / 50 ใบ</span></h3>
        </div>
        
        {loading ? (
          <p className={styles.loadingText}>กำลังโหลดข้อมูล...</p>
        ) : (
          <div className={styles.cardContainer}>
            {bookings.map((booking) => (
              <div key={booking.id} className={styles.card}>
                
                <div className={styles.cardHeader}>
                  <h3>{booking.customer_name}</h3>
                  <span className={booking.status === 'confirmed' ? styles.badgeConfirmed : styles.badgePending}>
                    {booking.status === 'confirmed' ? 'ยืนยันแล้ว' : 'รอตรวจสอบ'}
                  </span>
                </div>

                <div className={styles.cardBody}>
                  <p><strong>เบอร์โทร:</strong> {booking.phone}</p>
                  <p><strong>จำนวน:</strong> {booking.quantity} ใบ</p>
                  <p><strong>วันที่:</strong> {new Date(booking.created_at).toLocaleString('th-TH')}</p>
                </div>

                <div className={styles.cardFooter}>
                  <a href={booking.slip_url} target="_blank" rel="noreferrer" className={styles.btnSlip}>
                    ดูรูปสลิป
                  </a>
                  <button 
                    className={booking.status === 'pending' ? styles.btnApprove : styles.btnRevoke}
                    onClick={() => toggleStatus(booking.id, booking.status)}
                  >
                    {booking.status === 'pending' ? '✅ อนุมัติ' : '❌ ยกเลิกอนุมัติ'}
                  </button>
                </div>

              </div>
            ))}
            
            {bookings.length === 0 && <p className={styles.emptyText}>ยังไม่มีรายการจอง</p>}
          </div>
        )}
      </div>
    </div>
  );
}

export default Admin;