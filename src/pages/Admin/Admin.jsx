import React, { useState } from 'react';
import styles from './Admin.module.css';
import { supabase } from '../../lib/supabase';

function Admin() {
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ticketsLeft, setTicketsLeft] = useState('...'); 
  
  // 🔍 State ใหม่สำหรับเก็บข้อความค้นหา
  const [searchTerm, setSearchTerm] = useState('');

  const ADMIN_PASSWORD = 'baannaa_admin'; 

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthorized(true);
      fetchBookings(); 
      fetchEventData(); 
    } else {
      alert('รหัสผ่านไม่ถูกต้อง!');
      setPassword('');
    }
  };

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

  const deleteBooking = async (id, quantity, eventId) => {
    const confirmDelete = window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้? (ระบบจะคืนโควต้าบัตรให้คนอื่นซื้อต่อได้)');
    if (!confirmDelete) return;

    try {
      const { error: deleteError } = await supabase.from('bookings').delete().eq('id', id);
      if (deleteError) throw deleteError;

      const { data: eventData, error: eventError } = await supabase.from('events').select('tickets_sold').eq('id', eventId).single();
      if (eventError) throw eventError;

      const { error: updateError } = await supabase.from('events').update({ tickets_sold: eventData.tickets_sold - quantity }).eq('id', eventId);
      if (updateError) throw updateError;

      alert('ลบข้อมูลและคืนโควต้าสำเร็จ!');
      fetchBookings(); 
      fetchEventData(); 
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการลบ: ' + err.message);
    }
  };

  // 🔍 กรองข้อมูลตามเบอร์โทร (ถ้ายอดพิมพ์ตรงกับบางส่วนของเบอร์ก็จะแสดงผลทันที)
  const filteredBookings = bookings.filter((booking) => 
    booking.phone.includes(searchTerm)
  );

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
        
        <div className={styles.summaryBox}>
          <h3>ยอดบัตรคงเหลือ: <span className={styles.stockHighlight}>{ticketsLeft} / 50 ใบ</span></h3>
        </div>

        {/* 🔍 กล่องค้นหาเบอร์โทร */}
        <div className={styles.searchBox}>
          <input 
            type="tel" 
            placeholder="🔍 ค้นหาด้วยเบอร์โทรศัพท์..." 
            className={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {loading ? (
          <p className={styles.loadingText}>กำลังโหลดข้อมูล...</p>
        ) : (
          <div className={styles.cardContainer}>
            {/* เปลี่ยนจากการ map bookings มาเป็น filteredBookings */}
            {filteredBookings.map((booking) => (
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
                    ดูสลิป
                  </a>
                  <button 
                    className={booking.status === 'pending' ? styles.btnApprove : styles.btnRevoke}
                    onClick={() => toggleStatus(booking.id, booking.status)}
                  >
                    {booking.status === 'pending' ? '✅ อนุมัติ' : '❌ ยกเลิก'}
                  </button>
                  <button 
                    className={styles.btnDelete}
                    onClick={() => deleteBooking(booking.id, booking.quantity, booking.event_id)}
                  >
                    🗑️ ลบ
                  </button>
                </div>

              </div>
            ))}
            
            {/* กรณีพิมพ์หาแล้วไม่เจอข้อมูลเลย */}
            {filteredBookings.length === 0 && (
              <p className={styles.emptyText}>
                {searchTerm ? 'ไม่พบข้อมูลการจองสำหรับเบอร์นี้' : 'ยังไม่มีรายการจอง'}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Admin;