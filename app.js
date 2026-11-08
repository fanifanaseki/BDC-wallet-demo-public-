// ==========================================
// BDCCOIN - Complete Application Logic
// Version: 1.0.0
// Founder: MD Hasan
// ==========================================

// ==========================================
// CONFIGURATION
// ==========================================
const APP_CONFIG = {
  DEMO_PIN: '123456',
  MAX_FAILED_ATTEMPTS: 5,
  SESSION_TIMEOUT: 5 * 60 * 1000,
  SPLASH_DURATION: 3000,
  STORAGE_KEYS: {
    AUTHENTICATED: 'bdccoin_authenticated',
    LOGIN_TIME: 'bdccoin_login_time',
    FAILED_ATTEMPTS: 'bdccoin_failed_attempts',
    LOCK_UNTIL: 'bdccoin_lock_until',
    DB: 'bdccoin_local_db_v1'
  }
};

// ==========================================
// LOCAL DATABASE (90-Day Auto-Delete)
// ==========================================
const BDCCOIN_DB = {
  dbName: APP_CONFIG.STORAGE_KEYS.DB,
  retentionDays: 90,

  saveTransaction: function(type, amount, receiver) {
    let db = this.getDB();
    const txData = {
      id: 'tx_' + Date.now(),
      type: type,
      amount: amount,
      receiver: receiver,
      timestamp: Date.now()
    };
    db.push(txData);
    this.saveDB(db);
    this.autoCleanup();
    console.log('BDCCOIN: Transaction saved locally.');
  },

  getTransactions: function() {
    return this.getDB();
  },

  autoCleanup: function() {
    let db = this.getDB();
    const cutoffTime = Date.now() - (this.retentionDays * 24 * 60 * 60 * 1000);
    const cleanDB = db.filter(tx => tx.timestamp > cutoffTime);
    
    if (cleanDB.length !== db.length) {
      this.saveDB(cleanDB);
      console.log('BDCCOIN: Old data cleaned up.');
    }
  },

  getDB: function() {
    const data = localStorage.getItem(this.dbName);
    return data ? JSON.parse(data) : [];
  },

  saveDB: function(data) {
    localStorage.setItem(this.dbName, JSON.stringify(data));
  },

  resetDB: function() {
    localStorage.removeItem(this.dbName);
  },

  exportTransactions: function() {
    const transactions = this.getTransactions();
    if (transactions.length === 0) {
      alert('No transactions found to export.');
      return false;
    }
    
    const exportData = {
      projectName: 'BDCCOIN',
      founder: 'MD Hasan',
      exportDate: new Date().toISOString(),
      totalTransactions: transactions.length,
      data: transactions
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'BDCCOIN_Transaction_History_' + Date.now() + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('BDCCOIN: Transactions exported.');
    return true;
  }
};

// ==========================================
// SCREEN MANAGEMENT
// ==========================================
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
  const target = document.getElementById(screenId);
  if (target) {
    target.style.display = 'block';
  }
}

function switchScreen(screenId, navElement) {
  showScreen(screenId);
  
  // Update active state in all bottom navs
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  if (navElement) {
    navElement.classList.add('active');
  } else {
    document.querySelectorAll(`.nav-item[data-screen="${screenId}"]`).forEach(item => item.classList.add('active'));
  }

  // Initialize screen specific logic
  if (screenId === 'homeScreen') {
    initHome();
  } else if (screenId === 'marketsScreen') {
    initMarkets();
  } else if (screenId === 'tradeScreen') {
    initTrade();
  } else if (screenId === 'futuresScreen') {
    initFutures();
  } else if (screenId === 'assetsScreen') {
    initAssets();
  } else if (screenId === 'profileScreen') {
    initProfile();
  } else if (screenId === 'settingsScreen') {
    initSettings();
  } else if (screenId === 'servicesScreen') {
    initServices();
  }
}

// ==========================================
// SPLASH SCREEN
// ==========================================
function initSplash() {
  createStars('splashStars');
  
  setTimeout(() => {
    const lockUntil = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.LOCK_UNTIL);
    if (lockUntil && Date.now() < parseInt(lockUntil)) {
      showScreen('loginScreen');
      showPinLogin();
      const remaining = Math.ceil((parseInt(lockUntil) - Date.now()) / 1000);
      showError('Account locked. Try again in ' + remaining + ' seconds.');
      setTimeout(() => {
        if (Date.now() < parseInt(lockUntil)) {
          const newRemaining = Math.ceil((parseInt(lockUntil) - Date.now()) / 1000);
          showError('Account locked. Try again in ' + newRemaining + ' seconds.');
        } else {
          localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.LOCK_UNTIL);
          localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.FAILED_ATTEMPTS);
        }
      }, 1000);
    } else {
      const isAuthenticated = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.AUTHENTICATED);
      const loginTime = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.LOGIN_TIME);
      
      if (isAuthenticated && loginTime) {
        const timeDiff = Date.now() - parseInt(loginTime);
        if (timeDiff < APP_CONFIG.SESSION_TIMEOUT) {
          showScreen('homeScreen');
          initHome();
          return;
        } else {
          localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.AUTHENTICATED);
          localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.LOGIN_TIME);
        }
      }
      showScreen('loginScreen');
    }
  }, APP_CONFIG.SPLASH_DURATION);
}

// ==========================================
// LOGIN SYSTEM
// ==========================================
function showPinLogin() {
  document.getElementById('loginOptions').style.display = 'none';
  document.getElementById('pinSection').style.display = 'block';
  
  const inputs = document.querySelectorAll('.pin-input');
  inputs.forEach(input => input.value = '');
  
  setTimeout(() => {
    if (inputs[0]) inputs[0].focus();
  }, 100);
  
  setupPinInputs();
}

function backToLoginOptions() {
  document.getElementById('pinSection').style.display = 'none';
  document.getElementById('loginOptions').style.display = 'flex';
  clearError();
}

function setupPinInputs() {
  const inputs = document.querySelectorAll('.pin-input');
  inputs.forEach((input, index) => {
    input.oninput = function(e) {
      this.value = this.value.replace(/[^0-9]/g, '');
      if (this.value && index < inputs.length - 1) {
        inputs[index + 1].focus();
      }
      if (index === inputs.length - 1 && this.value) {
        setTimeout(() => verifyPin(), 200);
      }
    };
    
    input.onkeydown = function(e) {
      if (e.key === 'Backspace' && !this.value && index > 0) {
        inputs[index - 1].focus();
      }
      if (e.key === 'Enter') {
        verifyPin();
      }
    };
  });
}

function verifyPin() {
  const inputs = document.querySelectorAll('.pin-input');
  let pin = '';
  inputs.forEach(input => pin += input.value);
  
  if (pin.length !== 6) {
    showError('Please enter 6 digits.');
    return;
  }
  
  if (pin === APP_CONFIG.DEMO_PIN) {
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.AUTHENTICATED, 'true');
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.LOGIN_TIME, Date.now().toString());
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.FAILED_ATTEMPTS);
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.LOCK_UNTIL);
    showScreen('homeScreen');
    initHome();
  } else {
    let attempts = parseInt(localStorage.getItem(APP_CONFIG.STORAGE_KEYS.FAILED_ATTEMPTS) || '0');
    attempts++;
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.FAILED_ATTEMPTS, attempts.toString());
    
    if (attempts >= APP_CONFIG.MAX_FAILED_ATTEMPTS) {
      const lockTime = Date.now() + (24 * 60 * 60 * 1000);
      localStorage.setItem(APP_CONFIG.STORAGE_KEYS.LOCK_UNTIL, lockTime.toString());
      showError('Too many failed attempts. Locked for 24 hours.');
      setTimeout(() => {
        backToLoginOptions();
      }, 3000);
    } else {
      const remaining = APP_CONFIG.MAX_FAILED_ATTEMPTS - attempts;
      showError('Incorrect PIN. ' + remaining + ' attempts remaining.');
    }
    
    inputs.forEach(input => input.value = '');
    if (inputs[0]) inputs[0].focus();
  }
}

function showBiometricLogin() {
  if (window.PublicKeyCredential) {
    alert('Fingerprint authentication: WebAuthn API ready. In production, this will trigger device biometric scan.');
  } else {
    alert('Biometric authentication is not supported on this device.');
  }
}

function showFaceIdLogin() {
  if (window.PublicKeyCredential) {
    alert('Face ID authentication: WebAuthn API ready. In production, this will trigger device face scan.');
  } else {
    alert('Face ID is not supported on this device.');
  }
}

function showError(msg) {
  const el = document.getElementById('errorMessage');
  if (el) {
    el.textContent = msg;
    el.style.display = 'block';
    el.style.color = '#FF3B30';
  }
}

function clearError() {
  const el = document.getElementById('errorMessage');
  if (el) {
    el.textContent = '';
    el.style.display = 'none';
  }
}

// ==========================================
// HOME SCREEN
// ==========================================
function initHome() {
  createStars('homeStars');
  updateTime();
  setInterval(updateTime, 60000);
  BDCCOIN_DB.autoCleanup();
  setupHomeEventListeners();
  console.log('%c BDCCOIN ', 'background: linear-gradient(135deg, #FFD700, #FFA500); color: #000; padding: 10px 20px; font-size: 16px; font-weight: bold; border-radius: 5px;');
  console.log('Project: BDCCOIN | Founder: MD Hasan | Max Supply: 1,000,000,000,000 BDC');
}

function setupHomeEventListeners() {
  const menuBtn = document.getElementById('menuBtn');
  const closeMenu = document.getElementById('closeMenu');
  const modal = document.getElementById('menuModal');
  const eyeIcon = document.getElementById('eyeIcon');
  const downloadBtn = document.getElementById('downloadHistoryBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const securityBanner = document.getElementById('securityBanner');
  const seeAllMarkets = document.getElementById('seeAllMarkets');
  const notifBtn = document.getElementById('notifBtn');
  
  if (menuBtn) menuBtn.onclick = showMenu;
  if (closeMenu) closeMenu.onclick = closeMenuFn;
  if (eyeIcon) eyeIcon.onclick = toggleBalance;
  if (downloadBtn) downloadBtn.onclick = handleDownloadHistory;
  if (logoutBtn) logoutBtn.onclick = handleLogout;
  if (securityBanner) securityBanner.onclick = () => showDemo('Security Center');
  if (seeAllMarkets) seeAllMarkets.onclick = () => switchScreen('marketsScreen', document.querySelector('.nav-item[data-screen="marketsScreen"]'));
  if (notifBtn) notifBtn.onclick = () => showDemo('Notifications');
  
  document.querySelectorAll('.feature-btn').forEach(btn => {
    btn.onclick = () => showDemo(btn.dataset.feature);
  });
  
  document.querySelectorAll('.menu-item[data-demo]').forEach(item => {
    item.onclick = () => showDemo(item.dataset.demo);
  });
  
  window.onclick = function(event) {
    if (modal && event.target === modal) {
      modal.style.display = 'none';
    }
  };
}

function showMenu() {
  const modal = document.getElementById('menuModal');
  if (modal) modal.style.display = 'block';
}

function closeMenuFn() {
  const modal = document.getElementById('menuModal');
  if (modal) modal.style.display = 'none';
}

let balanceVisible = true;
function toggleBalance() {
  const amount = document.getElementById('balanceAmount');
  const eyeIcon = document.getElementById('eyeIcon');
  if (!amount || !eyeIcon) return;
  
  balanceVisible = !balanceVisible;
  if (balanceVisible) {
    amount.textContent = '1,000,000,000,000';
    eyeIcon.textContent = '👁️';
  } else {
    amount.textContent = '••••••••••••';
    eyeIcon.textContent = '🙈';
  }
}

function handleDownloadHistory() {
  const success = BDCCOIN_DB.exportTransactions();
  if (success) {
    showNotification('✅ Transaction History Downloaded Successfully!', '#00FF88');
  }
  closeMenuFn();
}

function handleLogout() {
  if (confirm('Are you sure you want to logout?')) {
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.AUTHENTICATED);
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.LOGIN_TIME);
    showScreen('loginScreen');
    backToLoginOptions();
    showNotification('Logged out successfully', '#FFD700');
  }
}

function showDemo(feature) {
  showNotification('DEMO: ' + feature + ' - Coming Soon', '#FFD700');
}

function showNotification(message, color) {
  const notification = document.createElement('div');
  notification.style.cssText = 'position:fixed;top:50px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,' + (color || '#FFD700') + ',' + (color === '#00FF88' ? '#00B4D8' : '#FFA500') + ');color:#000;padding:12px 24px;border-radius:25px;font-weight:800;font-size:14px;z-index:100000;box-shadow:0 4px 20px rgba(0,0,0,0.3);animation:slideDown 0.3s ease-out;max-width:90%;text-align:center;';
  notification.textContent = message;
  document.body.appendChild(notification);

  const style = document.createElement('style');
  style.textContent = '@keyframes slideDown{from{transform:translate(-50%,-100px);opacity:0}to{transform:translate(-50%,0);opacity:1}}';
  document.head.appendChild(style);

  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s';
    setTimeout(() => notification.remove(), 300);
  }, 2500);
}

// ==========================================
// MARKETS SCREEN
// ==========================================
function initMarkets() {
  setupMarketsEventListeners();
}

function setupMarketsEventListeners() {
  const marketsMenuBtn = document.getElementById('marketsMenuBtn');
  const marketsDropdown = document.getElementById('marketsDropdown');
  
  if (marketsMenuBtn) {
    marketsMenuBtn.onclick = function(e) {
      e.stopPropagation();
      if (marketsDropdown.style.display === 'none' || marketsDropdown.style.display === '') {
        marketsDropdown.style.display = 'block';
      } else {
        marketsDropdown.style.display = 'none';
      }
    };
  }

  document.onclick = function(event) {
    if (marketsDropdown && !event.target.closest('#marketsMenuBtn') && !event.target.closest('#marketsDropdown')) {
      marketsDropdown.style.display = 'none';
    }
  };

  document.querySelectorAll('.tab-item').forEach(tab => {
    tab.onclick = function() {
      document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      showNotification('Switched to ' + this.textContent + ' tab', '#00B4D8');
    };
  });

  const tradeBtn = document.querySelector('.trade-btn');
  if (tradeBtn) {
    tradeBtn.onclick = () => switchScreen('tradeScreen', document.querySelector('.nav-item[data-screen="tradeScreen"]'));
  }
}

// ==========================================
// TRADE SCREEN (SPOT)
// ==========================================
let currentTradeMode = 'buy';
let currentSliderPercent = 0;

function initTrade() {
  populateOrderBook();
  setupTradeEventListeners();
}

function populateOrderBook() {
  const asksContainer = document.getElementById('orderBookAsks');
  const bidsContainer = document.getElementById('orderBookBids');
  
  if (!asksContainer || !bidsContainer) return;
  
  const askData = [
    { price: 75777.00, amount: 0.36635 },
    { price: 75776.99, amount: 0.00014 },
    { price: 75776.82, amount: 0.50007 },
    { price: 75776.81, amount: 0.00014 },
    { price: 75776.01, amount: 6.60745 }
  ];
  
  const bidData = [
    { price: 75776.00, amount: 0.85819 },
    { price: 75775.99, amount: 0.00056 },
    { price: 75774.10, amount: 0.00014 },
    { price: 75774.09, amount: 0.00007 },
    { price: 75774.01, amount: 0.00014 }
  ];
  
  const maxAmount = Math.max(...askData.map(a => a.amount), ...bidData.map(a => a.amount));
  
  asksContainer.innerHTML = askData.map(ask => `
    <div class="ob-row ask" onclick="setPriceFromOB(${ask.price})">
      <div class="ob-bg" style="width: ${(ask.amount / maxAmount * 100)}%;"></div>
      <div class="ob-price">${ask.price.toFixed(2)}</div>
      <div class="ob-amount">${ask.amount.toFixed(5)}</div>
    </div>
  `).join('');
  
  bidsContainer.innerHTML = bidData.map(bid => `
    <div class="ob-row bid" onclick="setPriceFromOB(${bid.price})">
      <div class="ob-bg" style="width: ${(bid.amount / maxAmount * 100)}%;"></div>
      <div class="ob-price">${bid.price.toFixed(2)}</div>
      <div class="ob-amount">${bid.amount.toFixed(5)}</div>
    </div>
  `).join('');
}

function setPriceFromOB(price) {
  showNotification('Price set to: ' + price.toFixed(2), '#FFD700');
}

function setupTradeEventListeners() {
  const tradeMenuBtn = document.getElementById('tradeMenuBtn');
  if (tradeMenuBtn) {
    tradeMenuBtn.onclick = () => showDemo('Trade Menu');
  }
  
  document.querySelectorAll('.trade-tab:not(#tradeMenuBtn)').forEach(tab => {
    tab.onclick = function() {
      document.querySelectorAll('.trade-tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      showNotification('Switched to ' + this.textContent, '#FFD700');
    };
  });
}

function setTradeMode(mode) {
  currentTradeMode = mode;
  const buyBtn = document.getElementById('buyBtn');
  const sellBtn = document.getElementById('sellBtn');
  const actionBtn = document.getElementById('tradeActionBtn');
  
  if (mode === 'buy') {
    buyBtn.classList.add('active');
    sellBtn.classList.remove('active');
    actionBtn.textContent = 'Buy BTC';
    actionBtn.className = 'trade-action-btn buy-btn';
  } else {
    sellBtn.classList.add('active');
    buyBtn.classList.remove('active');
    actionBtn.textContent = 'Sell BTC';
    actionBtn.className = 'trade-action-btn sell-btn';
  }
}

function setSliderPercent(percent) {
  currentSliderPercent = percent;
  const fill = document.getElementById('sliderFill');
  const handle = document.getElementById('sliderHandle');
  
  if (fill) fill.style.width = percent + '%';
  if (handle) handle.style.left = percent + '%';
  
  showNotification('Slider set to ' + percent + '%', '#FFD700');
}

function switchTradeTab(tabId, element) {
  document.querySelectorAll('.trade-bottom-tab').forEach(tab => tab.classList.remove('active'));
  element.classList.add('active');
  
  document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
  const targetPanel = document.getElementById(tabId + 'Panel');
  if (targetPanel) {
    targetPanel.classList.add('active');
  }
}

function executeTrade() {
  const totalInput = document.getElementById('totalInput');
  const amount = totalInput ? totalInput.value : '';
  
  if (!amount || parseFloat(amount) <= 0) {
    showNotification('Please enter an amount', '#FF3B30');
    return;
  }
  
  const mode = currentTradeMode === 'buy' ? 'BUY' : 'SELL';
  showNotification(mode + ' Order: ' + amount + ' USDT - Demo Only', '#00FF88');
  
  BDCCOIN_DB.saveTransaction(mode.toLowerCase(), amount, 'BTC');
  
  if (totalInput) totalInput.value = '';
}

// ==========================================
// FUTURES SCREEN
// ==========================================
let currentFuturesMode = 'buy';
let currentMarginMode = 'cross';
let currentLeverage = 5;
let fundingCountdownSeconds = 4497;

function initFutures() {
  populateFuturesOrderBook();
  setupFuturesEventListeners();
  startFundingCountdown();
}

function populateFuturesOrderBook() {
  const asksContainer = document.getElementById('futOrderBookAsks');
  const bidsContainer = document.getElementById('futOrderBookBids');
  
  if (!asksContainer || !bidsContainer) return;
  
  const askData = [
    { price: 75727.4, amount: 0.061 },
    { price: 75727.3, amount: 0.001 },
    { price: 75727.2, amount: 0.001 },
    { price: 75726.7, amount: 0.001 },
    { price: 75726.4, amount: 1.116 }
  ];
  
  const bidData = [
    { price: 75726.3, amount: 31.487 },
    { price: 75726.2, amount: 0.028 },
    { price: 75725.9, amount: 0.040 },
    { price: 75725.8, amount: 0.001 },
    { price: 75725.6, amount: 0.052 }
  ];
  
  const maxAmount = Math.max(...askData.map(a => a.amount), ...bidData.map(a => a.amount));
  
  asksContainer.innerHTML = askData.map(ask => `
    <div class="ob-row ask">
      <div class="ob-bg" style="width: ${(ask.amount / maxAmount * 100)}%;"></div>
      <div class="ob-price">${ask.price.toFixed(1)}</div>
      <div class="ob-amount">${ask.amount.toFixed(3)}</div>
    </div>
  `).join('');
  
  bidsContainer.innerHTML = bidData.map(bid => `
    <div class="ob-row bid">
      <div class="ob-bg" style="width: ${(bid.amount / maxAmount * 100)}%;"></div>
      <div class="ob-price">${bid.price.toFixed(1)}</div>
      <div class="ob-amount">${bid.amount.toFixed(3)}</div>
    </div>
  `).join('');
}

function setupFuturesEventListeners() {
  const futuresMenuBtn = document.getElementById('futuresMenuBtn');
  if (futuresMenuBtn) {
    futuresMenuBtn.onclick = () => showDemo('Futures Menu');
  }
}

function switchFuturesMarket(market, element) {
  document.querySelectorAll('.futures-tab').forEach(tab => tab.classList.remove('active'));
  element.classList.add('active');
  showNotification('Switched to ' + element.textContent + ' market', '#FFD700');
}

function setFuturesMode(mode) {
  currentFuturesMode = mode;
  const buyBtn = document.getElementById('futBuyBtn');
  const sellBtn = document.getElementById('futSellBtn');
  const actionBtn = document.getElementById('futActionBtn');
  
  if (mode === 'buy') {
    buyBtn.classList.add('active');
    sellBtn.classList.remove('active');
    actionBtn.textContent = 'Buy / Long';
    actionBtn.className = 'trade-action-btn buy-btn';
  } else {
    sellBtn.classList.add('active');
    buyBtn.classList.remove('active');
    actionBtn.textContent = 'Sell / Short';
    actionBtn.className = 'trade-action-btn sell-btn';
  }
}

function setMarginMode(mode) {
  currentMarginMode = mode;
  const crossBtn = document.getElementById('crossBtn');
  const isolatedBtn = document.getElementById('isolatedBtn');
  
  if (mode === 'cross') {
    crossBtn.classList.add('active');
    isolatedBtn.classList.remove('active');
  } else {
    isolatedBtn.classList.add('active');
    crossBtn.classList.remove('active');
  }
  
  showNotification('Margin mode: ' + mode.toUpperCase(), '#00B4D8');
}

function showLeverageModal() {
  const modal = document.getElementById('leverageModal');
  if (modal) modal.style.display = 'block';
  
  const slider = document.getElementById('leverageSlider');
  if (slider) slider.value = currentLeverage;
  updateLeverageDisplay();
}

function closeLeverageModal() {
  const modal = document.getElementById('leverageModal');
  if (modal) modal.style.display = 'none';
}

function updateLeverage(value) {
  currentLeverage = parseInt(value);
  updateLeverageDisplay();
}

function updateLeverageDisplay() {
  const valueEl = document.getElementById('leverageValue');
  const modeEl = document.getElementById('leverageModeDisplay');
  if (valueEl) valueEl.textContent = currentLeverage + 'x';
  if (modeEl) modeEl.textContent = currentMarginMode === 'cross' ? 'Cross' : 'Isolated';
}

function setLeverage(value) {
  currentLeverage = value;
  const slider = document.getElementById('leverageSlider');
  if (slider) slider.value = value;
  updateLeverageDisplay();
}

function confirmLeverage() {
  const leverageBtn = document.getElementById('leverageBtn');
  if (leverageBtn) leverageBtn.textContent = currentLeverage + 'x';
  closeLeverageModal();
  showNotification('Leverage set to ' + currentLeverage + 'x (' + currentMarginMode + ')', '#FFD700');
}

function setBBO() {
  const priceInput = document.getElementById('futPriceInput');
  if (priceInput) {
    priceInput.value = '75726.3';
    showNotification('BBO price set: 75726.3', '#00FF88');
  }
}

function setFutSliderPercent(percent) {
  const fill = document.getElementById('futSliderFill');
  const handle = document.getElementById('futSliderHandle');
  if (fill) fill.style.width = percent + '%';
  if (handle) handle.style.left = percent + '%';
  showNotification('Slider set to ' + percent + '%', '#FFD700');
}

function switchFutTab(tabId, element) {
  document.querySelectorAll('#futuresScreen .trade-bottom-tab').forEach(tab => tab.classList.remove('active'));
  element.classList.add('active');
  
  document.querySelectorAll('#futuresScreen .tab-panel').forEach(panel => panel.classList.remove('active'));
  const targetPanel = document.getElementById(tabId + 'Panel');
  if (targetPanel) {
    targetPanel.classList.add('active');
  }
}

function executeFuturesTrade() {
  const priceInput = document.getElementById('futPriceInput');
  const amountInput = document.getElementById('futAmountInput');
  
  const price = priceInput ? priceInput.value : '';
  const amount = amountInput ? amountInput.value : '';
  
  if (!amount || parseFloat(amount) <= 0) {
    showNotification('Please enter an amount', '#FF3B30');
    return;
  }
  
  if (!price || parseFloat(price) <= 0) {
    showNotification('Please enter a valid price', '#FF3B30');
    return;
  }
  
  const mode = currentFuturesMode === 'buy' ? 'LONG' : 'SHORT';
  const message = mode + ' Order: ' + amount + ' BTC @ ' + price + ' USDT (' + currentLeverage + 'x ' + currentMarginMode + ') - Demo Only';
  showNotification(message, '#00FF88');
  
  BDCCOIN_DB.saveTransaction('futures_' + mode.toLowerCase(), amount + ' BTC @ ' + price, 'BTCUSDT Perp');
  
  if (amountInput) amountInput.value = '';
}

function startFundingCountdown() {
  setInterval(() => {
    if (fundingCountdownSeconds > 0) {
      fundingCountdownSeconds--;
      const hours = Math.floor(fundingCountdownSeconds / 3600);
      const minutes = Math.floor((fundingCountdownSeconds % 3600) / 60);
      const seconds = fundingCountdownSeconds % 60;
      
      const formatted = 
        String(hours).padStart(2, '0') + ':' + 
        String(minutes).padStart(2, '0') + ':' + 
        String(seconds).padStart(2, '0');
      
      const countdownEl = document.getElementById('fundingCountdown');
      if (countdownEl) countdownEl.textContent = formatted;
    } else {
      fundingCountdownSeconds = 8 * 3600;
    }
  }, 1000);
}

// ==========================================
// ASSETS SCREEN
// ==========================================
let assetsBalanceVisible = true;

function initAssets() {
  setupAssetsEventListeners();
}

function setupAssetsEventListeners() {
  const closeHistory = document.getElementById('closeHistory');
  if (closeHistory) {
    closeHistory.onclick = closeHistoryModal;
  }
}

function switchAssetsTab(tabName, element) {
  document.querySelectorAll('.assets-tab').forEach(tab => tab.classList.remove('active'));
  element.classList.add('active');
  showNotification('Switched to ' + tabName + ' assets', '#FFD700');
}

function toggleAssetsBalance() {
  const amountEl = document.getElementById('assetsTotalAmount');
  const eyeIcon = document.getElementById('assetsEyeIcon');
  
  if (!amountEl || !eyeIcon) return;
  
  assetsBalanceVisible = !assetsBalanceVisible;
  
  if (assetsBalanceVisible) {
    amountEl.innerHTML = '৳67.55 <span class="currency-text">BDT</span> <span class="dropdown-arrow">▼</span>';
    eyeIcon.textContent = '👁️';
  } else {
    amountEl.innerHTML = '•••••• <span class="currency-text">BDT</span> <span class="dropdown-arrow">▼</span>';
    eyeIcon.textContent = '🙈';
  }
}

function showHistoryModal() {
  const modal = document.getElementById('historyModal');
  if (modal) modal.style.display = 'block';
}

function closeHistoryModal() {
  const modal = document.getElementById('historyModal');
  if (modal) modal.style.display = 'none';
}

// ==========================================
// PROFILE SCREEN
// ==========================================
function initProfile() {
  console.log('BDCCOIN: Profile screen initialized.');
}

// ==========================================
// SETTINGS SCREEN
// ==========================================
function initSettings() {
  console.log('BDCCOIN: Settings screen initialized.');
}

// ==========================================
// SERVICES SCREEN
// ==========================================
let currentServicesTab = 'common';

function initServices() {
  console.log('BDCCOIN: Services screen initialized.');
}

function switchServicesTab(tabName, element) {
  currentServicesTab = tabName;
  
  document.querySelectorAll('.services-tab').forEach(tab => tab.classList.remove('active'));
  element.classList.add('active');
  
  document.querySelectorAll('.services-panel').forEach(panel => panel.classList.remove('active'));
  const targetPanel = document.getElementById('panel-' + tabName);
  if (targetPanel) {
    targetPanel.classList.add('active');
  }
}

function toggleShortcutSection() {
  const content = document.getElementById('shortcutContent');
  const icon = document.getElementById('shortcutToggleIcon');
  
  if (content.style.display === 'none') {
    content.style.display = 'block';
    icon.textContent = '▼';
  } else {
    content.style.display = 'none';
    icon.textContent = '▶';
  }
}

function filterServices(query) {
  const searchTerm = query.toLowerCase().trim();
  const allPanels = document.querySelectorAll('.services-panel');
  const allTabs = document.querySelectorAll('.services-tab');
  
  if (searchTerm === '') {
    allPanels.forEach(panel => panel.classList.remove('active'));
    const currentPanel = document.getElementById('panel-' + currentServicesTab);
    if (currentPanel) currentPanel.classList.add('active');
    
    allTabs.forEach(tab => tab.classList.remove('active'));
    const currentTab = document.querySelector(`.services-tab[data-tab="${currentServicesTab}"]`);
    if (currentTab) currentTab.classList.add('active');
    return;
  }
  
  allPanels.forEach(panel => {
    panel.classList.add('active');
    const items = panel.querySelectorAll('.service-item');
    items.forEach(item => {
      const label = item.querySelector('.service-label').textContent.toLowerCase();
      if (label.includes(searchTerm)) {
        item.style.display = 'flex';
        item.style.opacity = '1';
      } else {
        item.style.opacity = '0.3';
      }
    });
  });
  
  allTabs.forEach(tab => tab.classList.remove('active'));
}

// ==========================================
// UTILITIES
// ==========================================
function createStars(containerId) {
  const starsContainer = document.getElementById(containerId);
  if (!starsContainer) return;
  starsContainer.innerHTML = '';
  
  for (let i = 0; i < 50; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    const size = Math.random() * 3 + 1;
    star.style.width = size + 'px';
    star.style.height = size + 'px';
    star.style.left = Math.random() * 100 + '%';
    star.style.top = Math.random() * 100 + '%';
    star.style.animationDelay = Math.random() * 3 + 's';
    starsContainer.appendChild(star);
  }
}

function updateTime() {
  const timeElement = document.getElementById('currentTime');
  if (!timeElement) return;
  
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes();
  
  hours = hours % 12;
  hours = hours ? hours : 12;
  
  const minutesStr = minutes < 10 ? '0' + minutes : minutes;
  timeElement.textContent = hours + ':' + minutesStr;
}

// ==========================================
// PERFORMANCE OPTIMIZATION
// ==========================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('BDCCOIN: Service Worker registered', registration.scope);
      })
      .catch((error) => {
        console.log('BDCCOIN: Service Worker registration failed:', error);
      });
  });
}

window.addEventListener('load', () => {
  if (window.performance) {
    const timing = window.performance.timing;
    const loadTime = timing.loadEventEnd - timing.navigationStart;
    console.log('BDCCOIN: Page load time:', loadTime + 'ms');
    
    if (loadTime > 3000) {
      console.warn('BDCCOIN: Page load time is slow (>3s). Consider optimization.');
    }
  }
});

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
  showScreen('splashScreen');
  initSplash();
  
  // Close modals on outside click
  window.onclick = function(event) {
    const leverageModal = document.getElementById('leverageModal');
    if (leverageModal && event.target === leverageModal) {
      closeLeverageModal();
    }
    const historyModal = document.getElementById('historyModal');
    if (historyModal && event.target === historyModal) {
      closeHistoryModal();
    }
    const menuModal = document.getElementById('menuModal');
    if (menuModal && event.target === menuModal) {
      menuModal.style.display = 'none';
    }
  };
  
  // Search input reset
  const searchInput = document.getElementById('servicesSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      if (this.value === '') {
        document.querySelectorAll('.service-item').forEach(item => {
          item.style.opacity = '1';
        });
      }
    });
  }
  
  console.log('%c════════════════════════════════════', 'color: #FFD700; font-weight: bold;');
  console.log('%c  BDCCOIN - Application Ready!      ', 'color: #FFD700; font-weight: bold; font-size: 16px;');
  console.log('%c════════════════════════════════════', 'color: #FFD700; font-weight: bold;');
  console.log('%c  Founder: MD Hasan                ', 'color: #00B4D8;');
  console.log('%c  Max Supply: 1,000,000,000,000 BDC', 'color: #00B4D8;');
  console.log('%c  Status: Production Ready         ', 'color: #00FF88;');
  console.log('%c════════════════════════════════════', 'color: #FFD700; font-weight: bold;');
});