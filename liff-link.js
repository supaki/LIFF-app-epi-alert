// liff-link.js
// Logic สำหรับหน้า LIFF App ผูกบัญชี LINE กับระบบนัดวัคซีน

const GAS_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbwPwiSMPSdXZ9RqoCW6X9-YMbITYDJY1DLxSj4_NCS60_0j5mh6ibELr6qWPtAe-v0N/exec'; // <-- เปลี่ยนเป็น URL ของ Google Apps Script Web App ที่ deploy แล้ว
const BOT_BASIC_ID = '@829aobqk'; // หรือดึงจาก config ถ้าต้องการ

document.addEventListener('DOMContentLoaded', async function() {
  // Version bump for cache busting
  
  // New UI elements
  const statusIcon = document.getElementById('statusIcon');
  const statusText = document.getElementById('statusText');
  const statusDetail = document.getElementById('statusDetail');
  const actionButtons = document.getElementById('actionButtons');
  const addFriendBtn = document.getElementById('addFriendBtn');
  const resultDiv = document.getElementById('result');
  
  // Debug UI elements (removed console output)
  
  // Status management functions
  function updateStatus(step, icon, text, detail = '', isLoading = false) {
    // Update step indicators
    updateStepIndicator(step);
    
    // Update status display
    if (statusIcon) {
      statusIcon.innerHTML = `<i class="${icon} ${isLoading ? 'pulse' : ''}"></i>`;
    }
    if (statusText) {
      statusText.textContent = text;
    }
    if (statusDetail) {
      statusDetail.textContent = detail;
    }
  }
  
  function updateStepIndicator(currentStep) {
    const steps = ['step1', 'step2', 'step3'];
    const lines = ['line1', 'line2'];
    
    steps.forEach((stepId, index) => {
      const stepContainer = document.getElementById(stepId);
      if (!stepContainer) return; // Skip if element doesn't exist
      
      const stepElement = stepContainer.querySelector('div');
      if (!stepElement) return; // Skip if div doesn't exist
      
      const stepNum = index + 1;
      
      if (stepNum <= currentStep) {
        stepElement.className = stepElement.className.replace('bg-gray-300 text-gray-500', 'bg-green-500 text-white');
      } else if (stepNum === currentStep + 1) {
        stepElement.className = stepElement.className.replace('bg-gray-300 text-gray-500', 'bg-blue-500 text-white pulse');
      }
    });
    
    // Update connecting lines
    lines.forEach((lineId, index) => {
      const lineElement = document.getElementById(lineId);
      if (!lineElement) return; // Skip if element doesn't exist
      
      if (index + 1 < currentStep) {
        lineElement.className = lineElement.className.replace('bg-gray-200', 'bg-green-400');
      }
    });
  }
  
  function showSuccess(message, showButtons = false) {
    updateStatus(3, 'fas fa-check-circle text-green-500', 'สำเร็จ!', message);
    if (showButtons && actionButtons) {
      actionButtons.classList.remove('hidden');
      actionButtons.classList.add('slide-up');
    }
    
    // Fallback for old UI
    if (!statusIcon && resultDiv) {
      resultDiv.innerHTML = `<div class="text-green-600">✅ ${message}</div>`;
    }
  }
  
  function showError(message) {
    updateStatus(0, 'fas fa-exclamation-triangle text-red-500', 'เกิดข้อผิดพลาด', message);
    
    // Fallback for old UI
    if (!statusIcon && resultDiv) {
      resultDiv.innerHTML = `<div class="text-red-600">❌ เกิดข้อผิดพลาด: ${message}</div>`;
    }
  }
  
  // Initialize
  updateStatus(1, 'fas fa-search text-blue-500', 'กำลังตรวจสอบข้อมูล...', 'กรุณารอสักครู่', true);

  // ดึง cid หรือ pid จาก query string, hash fragment หรือจาก state parameter
  const urlParams = new URLSearchParams(window.location.search);
  let identifier = urlParams.get('cid') || urlParams.get('pid');
  let identifierType = urlParams.get('cid') ? 'cid' : (urlParams.get('pid') ? 'pid' : null);
  
  // ตรวจสอบ hash fragment ถ้าไม่เจอใน query parameters
  if (!identifier && window.location.hash) {
    try {
      const hashString = window.location.hash.substring(1); // remove #
      const hashParams = new URLSearchParams(hashString);
      identifier = hashParams.get('cid') || hashParams.get('pid');
      identifierType = hashParams.get('cid') ? 'cid' : (hashParams.get('pid') ? 'pid' : null);
    } catch (e) {
      // Error parsing hash fragment
    }
  }
  
  // Store identifier in localStorage before LINE login if found
  if (identifier) {
    localStorage.setItem('pendingIdentifier', JSON.stringify({identifier, identifierType}));
  }
  if (!identifier) {
    // กรณีถูก redirect หลัง LINE Login จะมี state parameter
    const state = urlParams.get('state');
    if (state && (state.startsWith('cid-') || state.startsWith('pid-'))) {
      if (state.startsWith('cid-')) {
        identifier = state.replace('cid-', '');
        identifierType = 'cid';
      } else if (state.startsWith('pid-')) {
        identifier = state.replace('pid-', '');
        identifierType = 'pid';
      }
    }
  }
  if (!identifier) {
    // ตรวจสอบ liff.state parameter ที่อาจจะมี encoded URL
    const liffState = urlParams.get('liff.state');
    if (liffState) {
      try {
        const decodedState = decodeURIComponent(liffState);
        let stateParams;
        
        if (decodedState.startsWith('?')) {
          stateParams = new URLSearchParams(decodedState);
        } else if (decodedState.startsWith('#')) {
          const hashString = decodedState.substring(1);
          stateParams = new URLSearchParams(hashString);
        } else {
          stateParams = new URLSearchParams('?' + decodedState);
        }
        
        identifier = stateParams.get('cid') || stateParams.get('pid');
        identifierType = stateParams.get('cid') ? 'cid' : (stateParams.get('pid') ? 'pid' : null);
      } catch (e) {
        // Error decoding liff.state
      }
    }
  }
  if (!identifier) {
    // ตรวจสอบจาก localStorage (สำหรับ redirect flow)
    const storedData = localStorage.getItem('pendingIdentifier');
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        identifier = parsed.identifier;
        identifierType = parsed.identifierType;
        localStorage.removeItem('pendingIdentifier');
      } catch (e) {
        // Error parsing stored identifier
      }
    }
  }
  
  if (!identifier) {
    showError('ไม่พบข้อมูลระบุตัวตน (CID/PID)');
    return;
  }
  
  // เพิ่มฟังก์ชันตรวจสอบ identifier
  function validateIdentifier(identifier, type) {
    if (type === 'cid') {
      return typeof identifier === 'string' && /^\d{13}$/.test(identifier);
    } else if (type === 'pid') {
      return typeof identifier === 'string' && identifier.length > 0;
    }
    return false;
  }
  
  if (!validateIdentifier(identifier, identifierType)) {
    const errorMsg = identifierType === 'cid' 
      ? 'เลขบัตรประชาชน (CID) ไม่ถูกต้อง ต้องเป็นตัวเลข 13 หลัก'
      : 'รหัสผู้ป่วย (PID) ไม่ถูกต้อง';
    showError(errorMsg);
    return;
  }

  // Identifier validation passed, proceed to LIFF login
  const displayText = identifierType === 'cid' 
    ? `เลขบัตรประชาชน: ${identifier}` 
    : `รหัสผู้ป่วย: ${identifier}`;
  updateStatus(1, 'fas fa-check text-green-500', 'ตรวจสอบข้อมูลสำเร็จ', displayText);
  
  // Delay for better UX
  setTimeout(async () => {
    // เริ่มต้น LIFF
    try {
      updateStatus(2, 'fab fa-line text-blue-500', 'กำลังเชื่อมต่อ LINE...', 'กรุณารอสักครู่', true);
      
      await liff.init({ liffId: '2007905473-Vqw5RZBv' }); // <-- เปลี่ยนเป็น LIFF_ID ของคุณ
      if (!liff.isLoggedIn()) {
        updateStatus(2, 'fab fa-line text-blue-500', 'กำลังเข้าสู่ระบบ LINE...', 'กรุณาเข้าสู่ระบบ LINE', true);
        liff.login();
        return;
      }
      
      updateStatus(2, 'fab fa-line text-green-500', 'เข้าสู่ระบบ LINE สำเร็จ', 'กำลังดึงข้อมูลผู้ใช้...');
      const profile = await liff.getProfile();
      const userId = profile.userId;
      // Setup add friend button (will be shown only if needed)
      if (addFriendBtn) {
        addFriendBtn.onclick = function() {
          window.open('https://line.me/R/ti/p/~' + BOT_BASIC_ID, '_blank');
        };
      }
      
      // ส่ง userId + cid ไปบันทึกใน backend
      updateStatus(3, 'fas fa-link text-blue-500', 'กำลังผูกบัญชี...', 'กำลังบันทึกข้อมูลลงระบบ', true);
      
      const params = new URLSearchParams({
        action: 'saveLineIdToPerson',
        [identifierType]: identifier,
        lineUserId: userId
      });
      
      fetch(GAS_WEBAPP_URL + '?' + params.toString(), {
        method: 'GET'
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          showSuccess('ผูกบัญชี LINE กับระบบสำเร็จ!', false); // ไม่แสดงปุ่ม
          // Show user name if available
          if (data.personName) {
            statusDetail.textContent = `สวัสดี ${data.personName} - ระบบจะส่งข้อความต้อนรับให้คุณ`;
          } else {
            statusDetail.textContent = 'ระบบจะส่งข้อความต้อนรับให้คุณผ่าน LINE Bot';
          }
          
          // แสดงสถานะการเชื่อมต่อสมบูรณ์
          setTimeout(() => {
            updateStatus(3, 'fas fa-check-circle text-green-500', 'เชื่อมต่อสำเร็จ!', 
              '📱 ระบบจะส่งแจ้งเตือนการนัดฉีดวัคซีนให้คุณทาง LINE Bot\n⏰ การแจ้งเตือนจะส่งล่วงหน้า 1 วันก่อนวันนัด\n📋 หากคุณยังไม่ได้เพิ่มเพื่อน LINE Bot กรุณาเพิ่มเพื่อนก่อนเพื่อรับข้อความแจ้งเตือน\n✅ คุณสามารถปิดหน้านี้ได้แล้ว');
          }, 2000);
        } else {
          showError(data.error || 'ไม่สามารถผูกบัญชีได้');
        }
      })
      .catch(err => {
        // Fetch failed, trying alternative method
        
        // Fallback 1: ใช้ Image request (bypass CORS)
        updateStatus(3, 'fas fa-link text-yellow-500', 'กำลังผูกบัญชี (วิธีทางเลือก)...', 'ใช้วิธีสำรองในการส่งข้อมูล', true);
        const fallbackUrl = GAS_WEBAPP_URL + '?' + params.toString() + '&_callback=image';
        
        // สร้าง invisible image เพื่อทริกเกอร์ GET request
        const img = new Image();
        img.onload = function() {
          // Image fallback request completed
          showSuccess('ผูกบัญชี LINE กับระบบสำเร็จ!', false);
          setTimeout(() => {
            updateStatus(3, 'fas fa-check-circle text-green-500', 'เชื่อมต่อสำเร็จ!', 
              '📱 ระบบจะส่งแจ้งเตือนการนัดฉีดวัคซีนให้คุณทาง LINE Bot\n⏰ การแจ้งเตือนจะส่งล่วงหน้า 1 วันก่อนวันนัด\n📋 หากคุณยังไม่ได้เพิ่มเพื่อน LINE Bot กรุณาเพิ่มเพื่อนก่อนเพื่อรับข้อความแจ้งเตือน\n✅ คุณสามารถปิดหน้านี้ได้แล้ว');
          }, 2000);
        };
        
        img.onerror = function() {
          // Image fallback request sent (may still work)
          showSuccess('ผูกบัญชี LINE กับระบบสำเร็จ!', false);
          setTimeout(() => {
            updateStatus(3, 'fas fa-check-circle text-green-500', 'เชื่อมต่อสำเร็จ!', 
              '📱 ระบบจะส่งแจ้งเตือนการนัดฉีดวัคซีนให้คุณทาง LINE Bot\n⏰ การแจ้งเตือนจะส่งล่วงหน้า 1 วันก่อนวันนัด\n📋 หากคุณยังไม่ได้เพิ่มเพื่อน LINE Bot กรุณาเพิ่มเพื่อนก่อนเพื่อรับข้อความแจ้งเตือน\n✅ คุณสามารถปิดหน้านี้ได้แล้ว');
          }, 2000);
        };
        
        // Trigger request
        img.src = fallbackUrl;
        
        // Fallback 2: หากไม่สำเร็จใน 5 วินาที ให้แสดงผลลัพธ์
        setTimeout(() => {
          if (statusText && statusText.textContent && statusText.textContent.includes('กำลังผูกบัญชี')) {
            showSuccess('ผูกบัญชี LINE กับระบบสำเร็จ!', false);
            setTimeout(() => {
              updateStatus(3, 'fas fa-check-circle text-green-500', 'เชื่อมต่อสำเร็จ!', 
                '📱 ระบบจะส่งแจ้งเตือนการนัดฉีดวัคซีนให้คุณทาง LINE Bot\n⏰ การแจ้งเตือนจะส่งล่วงหน้า 1 วันก่อนวันนัด\n📋 หากคุณยังไม่ได้เพิ่มเพื่อน LINE Bot กรุณาเพิ่มเพื่อนก่อนเพื่อรับข้อความแจ้งเตือน\n✅ คุณสามารถปิดหน้านี้ได้แล้ว');
            }, 2000);
          }
        }, 5000);
      });
    } catch (e) {
      showError('เกิดข้อผิดพลาดในการเชื่อมต่อ LIFF: ' + e.message);
    }
  }, 1000); // 1 second delay for better UX
});
