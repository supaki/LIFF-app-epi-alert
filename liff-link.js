// liff-link.js
// Logic สำหรับหน้า LIFF App ผูกบัญชี LINE กับระบบนัดวัคซีน

const GAS_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbwPwiSMPSdXZ9RqoCW6X9-YMbITYDJY1DLxSj4_NCS60_0j5mh6ibELr6qWPtAe-v0N/exec'; // <-- เปลี่ยนเป็น URL ของ Google Apps Script Web App ที่ deploy แล้ว
const BOT_BASIC_ID = '@829aobqk'; // หรือดึงจาก config ถ้าต้องการ

document.addEventListener('DOMContentLoaded', async function() {
  console.log('=== LIFF App Started (v2025081404) ==='); // Version bump for cache busting
  const statusDiv = document.getElementById('status');
  const resultDiv = document.getElementById('result');
  const addFriendBtn = document.getElementById('addFriendBtn');

  // ดึง cid จาก query string, hash fragment หรือจาก state parameter
  const urlParams = new URLSearchParams(window.location.search);
  console.log('window.location.href:', window.location.href);
  console.log('window.location.search:', window.location.search);
  console.log('window.location.hash:', window.location.hash);
  console.log('urlParams:', urlParams.toString());
  let cid = urlParams.get('cid');
  console.log('cid from query:', cid);
  
  // ตรวจสอบ hash fragment ถ้าไม่เจอใน query parameters
  if (!cid && window.location.hash) {
    console.log('Checking hash fragment...');
    try {
      const hashString = window.location.hash.substring(1); // remove #
      console.log('hash string (after removing #):', hashString);
      const hashParams = new URLSearchParams(hashString);
      cid = hashParams.get('cid');
      console.log('cid from hash:', cid);
    } catch (e) {
      console.log('Error parsing hash fragment:', e);
    }
  }
  
  // Store CID in localStorage before LINE login if found
  if (cid) {
    console.log('Storing CID in localStorage:', cid);
    localStorage.setItem('pendingCid', cid);
  }
  if (!cid) {
    // กรณีถูก redirect หลัง LINE Login จะมี state parameter
    const state = urlParams.get('state');
    console.log('state param:', state);
    if (state && state.startsWith('cid-')) {
      cid = state.replace('cid-', '');
      console.log('cid from state:', cid);
    }
  }
  console.log('Checking for liff.state...');
  if (!cid) {
    // ตรวจสอบ liff.state parameter ที่อาจจะมี encoded URL
    const liffState = urlParams.get('liff.state');
    console.log('liff.state param:', liffState);
    if (liffState) {
      try {
        // decode ค่า liff.state
        const decodedState = decodeURIComponent(liffState);
        console.log('decoded liff.state:', decodedState);
        console.log('decodedState type:', typeof decodedState);
        console.log('decodedState length:', decodedState.length);
        console.log('decodedState startsWith #:', decodedState.startsWith('#'));
        
        // ตรวจสอบว่า decoded state เป็น query string หรือ hash fragment
        if (decodedState.startsWith('?')) {
          console.log('Processing as query string');
          const stateParams = new URLSearchParams(decodedState);
          cid = stateParams.get('cid');
          console.log('cid from liff.state (query):', cid);
        } else if (decodedState.startsWith('#')) {
          console.log('Processing as hash fragment');
          // สำหรับ hash fragment เช่น #cid=3800600588871
          const hashString = decodedState.substring(1);
          console.log('hashString after removing #:', hashString);
          const hashParams = new URLSearchParams(hashString);
          cid = hashParams.get('cid');
          console.log('cid from liff.state (hash):', cid);
        } else {
          console.log('Processing as plain string');
          // ลองแปลง string ธรรมดาเป็น URLSearchParams
          const stateParams = new URLSearchParams('?' + decodedState);
          cid = stateParams.get('cid');
          console.log('cid from liff.state (plain):', cid);
        }
      } catch (e) {
        console.log('Error decoding liff.state:', e);
      }
    }
  }
  if (!cid) {
    cid = urlParams.get('pid');
    console.log('cid from pid:', cid);
  }
  if (!cid) {
    // ตรวจสอบจาก localStorage (สำหรับ redirect flow)
    const storedCid = localStorage.getItem('pendingCid');
    console.log('cid from localStorage:', storedCid);
    if (storedCid) {
      cid = storedCid;
      // ลบออกจาก localStorage หลังใช้แล้ว
      localStorage.removeItem('pendingCid');
      console.log('Using stored CID and removed from localStorage');
    }
  }
  if (!cid) {
    statusDiv.textContent = 'ไม่พบเลขบัตรประชาชน (cid/pid)';
    console.log('window.location.search:', window.location.search);
    console.log('cid:', cid);
    return;
  }
  // เพิ่มฟังก์ชันตรวจสอบ cid
  function validateCid(cid) {
    return typeof cid === 'string' && /^\d{13}$/.test(cid);
  }
  if (!cid || !validateCid(cid)) {
    statusDiv.textContent = 'เลขบัตรประชาชน (cid) ไม่ถูกต้อง ต้องเป็นตัวเลข 13 หลัก';
    return;
    console.log('(cid) ไม่ถูกต้อง:', cid);
  }

  // เริ่มต้น LIFF
  try {
    await liff.init({ liffId: '2007905473-Vqw5RZBv' }); // <-- เปลี่ยนเป็น LIFF_ID ของคุณ
    if (!liff.isLoggedIn()) {
      liff.login();
      return;
    }
    statusDiv.textContent = 'กำลังดึงข้อมูลบัญชี LINE...';
    const profile = await liff.getProfile();
    const userId = profile.userId;
    // แสดงปุ่มเพิ่มเพื่อน
    addFriendBtn.classList.remove('hidden');
    addFriendBtn.onclick = function() {
      window.open('https://line.me/R/ti/p/~' + BOT_BASIC_ID, '_blank');
    };
    // ส่ง userId + cid ไปบันทึกใน backend
    statusDiv.textContent = 'กำลังผูกบัญชี...';
    const params = new URLSearchParams({
      action: 'saveLineIdToPerson',
      cid: cid,
      lineUserId: userId
    });
    fetch(GAS_WEBAPP_URL + '?' + params.toString(), {
      method: 'GET'
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        statusDiv.textContent = '';
        resultDiv.textContent = 'ผูกบัญชี LINE กับระบบสำเร็จ!';
      } else {
        statusDiv.textContent = '';
        resultDiv.textContent = 'เกิดข้อผิดพลาด: ' + (data.error || 'ไม่สามารถผูกบัญชีได้');
      }
    })
    .catch(err => {
      console.error('Fetch failed, trying alternative method:', err);
      // Fallback: ใช้ window.open เปิดใน tab ใหม่แล้วปิดทันที
      statusDiv.textContent = 'กำลังผูกบัญชี (วิธีทางเลือก)...';
      const fallbackUrl = GAS_WEBAPP_URL + '?' + params.toString();
      const popup = window.open(fallbackUrl, '_blank', 'width=1,height=1');
      
      // ปิด popup หลัง 3 วินาที และแสดงข้อความสำเร็จ
      setTimeout(() => {
        if (popup) popup.close();
        statusDiv.textContent = '';
        resultDiv.textContent = 'ผูกบัญชี LINE กับระบบสำเร็จ! (กรุณาตรวจสอบในระบบ)';
      }, 3000);
    });
  } catch (e) {
    statusDiv.textContent = 'เกิดข้อผิดพลาดในการเชื่อมต่อ LIFF: ' + e.message;
  }
});
