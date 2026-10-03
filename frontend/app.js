/**
 * app.js — KPR Hotel Conversational & 20-Page Restaurant Platform Engine
 * Fully Functional Multilingual Food Ordering Agent & Interactive Web App
 */

const API_BASE = window.KPR_API_BASE || "http://localhost:8000/api";

// Session & State Store
let sessionId = localStorage.getItem("kpr_session_id") || "sess_" + Math.random().toString(36).substring(2, 9);
localStorage.setItem("kpr_session_id", sessionId);

let menuData = [];
window.menuData = menuData;
let currentCart = { items: [], subtotal: 0, tax: 0, delivery_fee: 30, total: 0 };
window.currentCart = currentCart;
let favorites = JSON.parse(localStorage.getItem("kpr_favorites") || "[]");
window.favorites = favorites;
let currentSpeechLang = localStorage.getItem("kpr_speech_lang") || "en-IN";

// Dynamic Table Booking State
let tableList = [
  { id: "Table 1", seats: 2, status: "available" },
  { id: "Table 2", seats: 4, status: "booked" },
  { id: "Table 3", seats: 4, status: "selected" },
  { id: "Table 4", seats: 6, status: "available" },
  { id: "Table 5", seats: 2, status: "booked" },
  { id: "Table 6", seats: 8, status: "available" }
];
let selectedTableId = "Table 3";

// Special Deals Data
const DEALS_DATA = {
  "biryani-combo": {
    name: "Biryani + Starter + Drink Combo",
    item_id: "deal-biryani-01",
    desc: "Aromatic Seeraga Samba Chicken Biryani + Spiced Chicken 65 + Onion Raita + Chilled Madurai Jigarthanda Drink.",
    origPrice: 420,
    offerPrice: 319,
    image: "assets/dishes/deal-biryani-combo.jpg",
    items: ["1x Seeraga Samba Chicken Biryani", "1x Spiced Chicken 65 Starter", "1x Chilled Madurai Jigarthanda", "Fresh Onion Raita & Mirchi Salna"]
  },
  "family-feast": {
    name: "South Indian Family Mega Feast",
    item_id: "deal-family-01",
    desc: "2x Chicken Biryani + 1x Chettinad Chicken Curry + 4x Malabar Parotta + 2x Traditional Filter Coffee.",
    origPrice: 980,
    offerPrice: 749,
    image: "assets/dishes/deal-family-feast.jpg",
    items: ["2x Seeraga Samba Chicken Biryani", "1x Chettinad Chicken Curry Bowl", "4x Golden Flaky Parotta", "2x Kumbakonam Degree Coffee"]
  },
  "tiffin-combo": {
    name: "Morning Tiffin Grand Combo",
    item_id: "deal-tiffin-01",
    desc: "1x Crispy Ghee Roast Dosa + 2x Medu Vada + 2x Soft Steamed Idli + 1x Hot Kumbakonam Degree Filter Coffee.",
    origPrice: 260,
    offerPrice: 189,
    image: "assets/dishes/dosa-001.jpg",
    items: ["1x Ghee Roast Dosa", "2x Crispy Medu Vada", "2x Steamed Idli with Sambar", "1x Fresh Filter Coffee"]
  },
  "burger-combo": {
    name: "Burger + Fries + Coke Combo",
    item_id: "deal-burger-01",
    desc: "Juicy gourmet spiced patty burger with fresh lettuce & melted cheese + Peri-Peri seasoned golden fries + Chilled Coke.",
    origPrice: 350,
    offerPrice: 249,
    image: "assets/dishes/deal-burger-combo.jpg",
    items: ["1x Spiced Gourmet Burger", "1x Basket of Peri-Peri Fries", "1x Glass of Chilled Coke", "House Dip & Tomato Ketchup"]
  },
  "pizza-combo": {
    name: "Pizza + Garlic Bread + Drink Combo",
    item_id: "deal-pizza-01",
    desc: "Freshly baked woodfire supreme pizza with melted mozzarella + 3x Crunchy cheesy garlic bread slices + Cold beverage.",
    origPrice: 520,
    offerPrice: 379,
    image: "assets/dishes/deal-pizza-combo.jpg",
    items: ["1x Woodfire Supreme Pizza (Regular)", "3x Cheesy Garlic Bread Slices", "1x Chilled Soft Drink", "Chilli Flakes & Oregano Packets"]
  }
};
// ==========================================
// 1. CENTRALIZED I18N TRANSLATION SYSTEM
// ==========================================
const I18N_TRANSLATIONS = {
  sec_main: { en: "MAIN", ta: "முதன்மை மெனு", tanglish: "MAIN MENU" },
  sec_dining: { en: "DINING & ORDERS", ta: "உணவு & ஆர்டர்கள்", tanglish: "DINING & ORDERS" },
  sec_management: { en: "MANAGEMENT", ta: "நிர்வாகம்", tanglish: "MANAGEMENT" },
  sec_support: { en: "INFO & SUPPORT", ta: "தகவல் & ஆதரவு", tanglish: "INFO & SUPPORT" },
  sec_system: { en: "SYSTEM", ta: "அமைப்பு", tanglish: "SYSTEM" },

  nav_dashboard: { en: "Dashboard", ta: "முகப்பு", tanglish: "Dashboard" },
  nav_ai_agent: { en: "AI Voice Agent", ta: "AI குரல் உதவியாளர்", tanglish: "AI Voice Agent" },
  nav_menu: { en: "Menu", ta: "உணவு பட்டியல்", tanglish: "Menu" },
  nav_book_table: { en: "Book Table", ta: "மேஜை முன்பதிவு", tanglish: "Table Book Pannunga" },
  nav_live_track: { en: "Live Track", ta: "நேரலை கண்காணிப்பு", tanglish: "Live Track" },
  nav_offers: { en: "Offers", ta: "சலுகைகள்", tanglish: "Offers & Deals" },
  nav_favorites: { en: "Favorites", ta: "விருப்பங்கள்", tanglish: "Enakku Pidithavai" },
  nav_cart: { en: "Cart", ta: "கார்ட்", tanglish: "Cart" },
  nav_order_history: { en: "Order History", ta: "ஆர்டர் வரலாறு", tanglish: "Past Orders" },
  nav_specials: { en: "Chef Specials", ta: "செஃப் ஸ்பெஷல்", tanglish: "Chef Specials" },
  nav_catering: { en: "Bulk Catering", ta: "மொத்த ஆர்டர்கள்", tanglish: "Bulk Catering" },
  nav_kitchen_admin: { en: "Kitchen Admin", ta: "சமையலறை நிர்வாகம்", tanglish: "Kitchen Admin" },
  nav_kds: { en: "Kitchen Orders (KDS)", ta: "சமையலறை ஆர்டர்கள்", tanglish: "Kitchen Orders" },
  nav_analytics: { en: "Business Analytics", ta: "வணிக பகுப்பாய்வு", tanglish: "Business Analytics" },
  nav_menu_admin: { en: "Menu & Stock Manager", ta: "சரக்கு மேலாண்மை", tanglish: "Menu & Stock" },
  nav_about: { en: "Our Story", ta: "எங்கள் பாரம்பரியம்", tanglish: "Our Story" },
  nav_nutrition: { en: "Nutrition & Allergens", ta: "ஊட்டச்சத்து விவரம்", tanglish: "Nutrition & Allergens" },
  nav_reviews: { en: "Customer Reviews", ta: "வாடிக்கையாளர் கருத்துகள்", tanglish: "Customer Reviews" },
  nav_help: { en: "Help & Contact", ta: "உதவி & தொடர்பு", tanglish: "Help & Support" },
  nav_settings: { en: "Settings", ta: "அமைப்புகள்", tanglish: "Settings" },
  nav_language: { en: "Language", ta: "மொழி", tanglish: "Language" },

  qa_order_food: { en: "Order Food", ta: "உணவு ஆர்டர் செய்", tanglish: "Food Order Pannunga" },
  qa_view_menu: { en: "View Menu", ta: "மெனு பார்க்க", tanglish: "Menu Paarkavum" },
  qa_ask_ai: { en: "Ask AI", ta: "AI இடம் பேசுங்கள்", tanglish: "AI kitta Pesunga" },
  qa_book_table: { en: "Book Table", ta: "மேஜை முன்பதிவு", tanglish: "Table Book Pannunga" },

  stat_legacy: { en: "Years Legacy", ta: "ஆண்டுகள் பாரம்பரியம்", tanglish: "Years Legacy" },
  stat_reviews: { en: "12,000+ Reviews", ta: "12,000+ மதிப்புரைகள்", tanglish: "12,000+ Reviews" },
  stat_langs: { en: "Languages (EN/TA/Tanglish)", ta: "மொழிகள் (EN/TA/Tanglish)", tanglish: "Languages (EN/TA/Tanglish)" },

  kpi_total_orders: { en: "Total Orders", ta: "மொத்த ஆர்டர்கள்", tanglish: "Total Orders" },
  kpi_active_orders: { en: "Active Orders", ta: "செயலில் உள்ளவை", tanglish: "Active Orders" },
  kpi_favorites: { en: "Favorite Items", ta: "விருப்ப உணவுகள்", tanglish: "Saved Favorites" },
  kpi_cart_items: { en: "Cart Items", ta: "கார்ட் உணவுகள்", tanglish: "Cart Items" },
  kpi_offers: { en: "Today's Offers", ta: "இன்றைய சலுகைகள்", tanglish: "Today's Offers" },

  dash_ai_recs: { en: "AI Recommendations", ta: "AI பரிந்துரைகள்", tanglish: "AI Chef Picks" },
  dash_ai_recs_sub: { en: "Handcrafted suggestions personalized for authentic South Indian taste", ta: "பாரம்பரிய தென் இந்திய சுவைக்கான தனிப்பயன் பரிந்துரைகள்", tanglish: "South Indian favorites picked just for you" },
  dash_order_with_ai: { en: "Ask AI →", ta: "AI-யிடம் பேச →", tanglish: "Voice order pannunga →" },
  dash_popular_dishes: { en: "Popular Dishes", ta: "பிரபலமான உணவுகள்", tanglish: "Customer Top Dishes" },
  dash_popular_sub: { en: "Best-selling dishes loved by 10,000+ happy diners", ta: "10,000+ வாடிக்கையாளர்களால் விரும்பப்படும் உணவுகள்", tanglish: "Top selling authentic items" },
  dash_view_all_dishes: { en: "View Full Menu →", ta: "முழு மெனுவை பார்க்க →", tanglish: "Full menu paarka →" },
  dash_recent_orders: { en: "Recent Orders", ta: "சமீபத்திய ஆர்டர்கள்", tanglish: "Recent Orders" },
  dash_recent_orders_sub: { en: "Your latest orders and quick re-order actions", ta: "உங்கள் சமீபத்திய ஆர்டர்கள் மற்றும் மறு-ஆர்டர்", tanglish: "Your previous food orders" },
  dash_view_all_orders: { en: "View History →", ta: "வரலாறு பார்க்க →", tanglish: "History paarkavum →" },
  dash_featured_deals: { en: "Featured Special Combos", ta: "சிறப்பு காம்போ சலுகைகள்", tanglish: "Special Feast Combos" },
  dash_featured_deals_sub: { en: "Limited time value deals prepared fresh", ta: "வரம்பிற்குட்பட்ட சலுகைகள்", tanglish: "Super savings deals" },
  dash_all_deals: { en: "All Deals →", ta: "அனைத்து சலுகைகள் →", tanglish: "All deals paarkavum →" },
  dash_table_status: { en: "Table Availability", ta: "மேஜை விவரம்", tanglish: "Table Status" },
  dash_reserve_now: { en: "Reserve Table →", ta: "முன்பதிவு செய்ய →", tanglish: "Book pannunga →" }
};

// Global App Initialization Guard
let isAppInitialized = false;

function initApp() {
  if (isAppInitialized) return;
  isAppInitialized = true;

  initThemeAndAccent();
  initLanguageSelectors();
  initRouter();
  fetchMenu();
  fetchCart();
  setupEventListeners();
  setupMobileSidebar();
  setupSettingsModal();
  initSubPages();
  restoreChatHistory();
  updateFavoritesBadge();
  updateCartBadge();
}

window.initApp = initApp;
window.addEventListener("DOMContentLoaded", initApp);

// ==========================================
// 2. LANGUAGE SYNCHRONIZATION
// ==========================================
function initLanguageSelectors() {
  const sidebarSelect = document.getElementById("sidebarLangSelect");
  const chatVoiceSelect = document.getElementById("chatVoiceLangSelect");

  if (sidebarSelect) {
    sidebarSelect.value = currentSpeechLang;
    sidebarSelect.addEventListener("change", (e) => {
      setAppLanguage(e.target.value);
    });
  }

  if (chatVoiceSelect) {
    chatVoiceSelect.value = currentSpeechLang;
    chatVoiceSelect.addEventListener("change", (e) => {
      setAppLanguage(e.target.value);
    });
  }

  applyLanguage(currentSpeechLang);
}

function setAppLanguage(langCode) {
  currentSpeechLang = langCode;
  localStorage.setItem("kpr_speech_lang", langCode);
  applyLanguage(langCode);

  const langNames = {
    "en-IN": "English",
    "ta-IN": "Tamil (தமிழ்)",
    "ta-Latn": "Tanglish (தமிழ்)",
    "hi-IN": "Hindi (हिन्दी)",
    "ml-IN": "Malayalam (മലയാളம்)",
    "te-IN": "Telugu (తెలుగు)",
    "kn-IN": "Kannada (ಕನ್ನಡ)"
  };

  showToast(`🌐 Language set to ${langNames[langCode] || langCode}`);
}

function applyLanguage(langCode) {
  const langKey = langCode === "ta-IN" ? "ta" : (langCode === "ta-Latn" ? "tanglish" : "en");

  // Apply to all elements tagged with data-i18n
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    if (I18N_TRANSLATIONS[key] && I18N_TRANSLATIONS[key][langKey]) {
      el.textContent = I18N_TRANSLATIONS[key][langKey];
    }
  });

  // Update top header language label
  const langLabels = {
    "en-IN": "English",
    "ta-IN": "தமிழ்",
    "ta-Latn": "Tanglish",
    "hi-IN": "हिन्दी",
    "ml-IN": "മലയാളம்",
    "te-IN": "తెలుగు",
    "kn-IN": "ಕನ್ನಡ"
  };
  const headerLangLabel = document.getElementById("headerLangLabel");
  if (headerLangLabel) headerLangLabel.textContent = langLabels[langCode] || "English";

  // Sync dropdown values
  const sidebarSelect = document.getElementById("sidebarLangSelect");
  if (sidebarSelect) sidebarSelect.value = langCode;
  const chatVoiceSelect = document.getElementById("chatVoiceLangSelect");
  if (chatVoiceSelect) chatVoiceSelect.value = langCode;

  // Sync settings page language pills
  document.querySelectorAll(".lang-pill-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.lang === langCode);
  });

  // Re-render menu cards and recommendations if loaded
  if (menuData && menuData.length) {
    renderHomeDishes();
    renderFullMenu(menuData);
    renderDashboardAiRecs();
  }
}

// ==========================================
// 3. ROUTER & SIDEBAR CONTROLS
// ==========================================
function initRouter() {
  function handleRoute() {
    let hash = window.location.hash.replace("#", "") || "home";

    // Supported route aliases
    const aliases = {
      "": "home",
      "dashboard": "home",
      "ai-agent": "ai-assistant",
      "cart": "cart-checkout",
      "book-table": "reservations",
      "live-track": "order-status",
      "track": "order-status"
    };
    if (aliases[hash]) hash = aliases[hash];

    const views = document.querySelectorAll(".page-view");
    let found = false;
    views.forEach(view => {
      if (view.id === `view-${hash}`) {
        view.classList.add("active");
        found = true;
      } else {
        view.classList.remove("active");
      }
    });

    if (!found) {
      document.getElementById("view-home")?.classList.add("active");
      hash = "home";
    }

    // Highlight all sidebar navigation items
    const sidebarItems = document.querySelectorAll(".sidebar-item, .submenu-item");
    sidebarItems.forEach(link => {
      if (link.dataset.page === hash) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });

    // If a subpage of kitchen-admin is active, highlight the parent kitchen-admin item too
    if (["kitchen-admin", "analytics", "menu-admin"].includes(hash)) {
      document.querySelector('.sidebar-item[data-page="kitchen-admin"]')?.classList.add("active");
    }

    // Update Top Header Breadcrumb
    const pageTitles = {
      "home": "Dashboard",
      "ai-assistant": "AI Voice Agent",
      "menu": "Menu Catalog",
      "dish-detail": "Dish Customizer",
      "cart-checkout": "Cart & Checkout",
      "payment": "Payment & UPI",
      "order-status": "Live Delivery Tracker",
      "order-history": "Past Orders",
      "favorites": "Saved Favorites",
      "offers": "Special Deals & Combos",
      "reservations": "Book Table",
      "catering": "Bulk Catering",
      "specials": "Chef Specials",
      "kitchen-admin": "Kitchen Orders (KDS)",
      "analytics": "Business Analytics",
      "menu-admin": "Menu & Stock Manager",
      "about": "Our Story & Heritage",
      "nutrition": "Nutrition & Allergens",
      "reviews": "Customer Reviews",
      "help-contact": "Help Center & Contact",
      "settings": "Settings & Preferences"
    };

    const breadcrumbCurrent = document.getElementById("headerBreadcrumbCurrent");
    if (breadcrumbCurrent) {
      breadcrumbCurrent.textContent = pageTitles[hash] || hash;
    }

    // Close mobile sidebar drawer automatically on navigation item selection
    closeMobileSidebar();

    if (typeof window.scrollTo === "function") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // Page Specific Activations
    if (hash === "home") renderDashboard();
    if (hash === "dish-detail") {
      const container = document.getElementById("dishDetailContent");
      if (!container || !container.children.length || container.querySelector("p")) {
        window.openDishCustomizer(null);
      }
    }
    if (hash === "cart-checkout") fetchCart();
    if (hash === "order-history") loadOrderHistory();
    if (hash === "reservations") loadTableReservations();
    if (hash === "payment") loadPaymentPortal();
    if (hash === "order-status") startLiveTracker();
    if (hash === "kitchen-admin") loadKitchenOrders();
    if (hash === "analytics") loadAnalytics();
    if (hash === "menu-admin") renderMenuAdmin();
    if (hash === "reviews") loadReviews();
    if (hash === "favorites") renderFavorites();
    if (hash === "nutrition") renderNutrition();
    if (hash === "settings") renderSettingsPage();
    if (hash === "ai-assistant") {
      const scroll = document.getElementById("chatScroll");
      if (scroll) scroll.scrollTop = scroll.scrollHeight;
      setTimeout(() => {
        document.getElementById("textInput")?.focus();
      }, 80);
    }
  }

  window.handleRoute = handleRoute;
  window.addEventListener("hashchange", handleRoute);
  handleRoute();
}

// Mobile Sidebar Controls
function setupMobileSidebar() {
  const mobileBtn = document.getElementById("mobileMenuBtn");
  const closeBtn = document.getElementById("sidebarCloseBtn");
  const backdrop = document.getElementById("sidebarBackdrop");
  const sidebar = document.getElementById("appSidebar");

  if (mobileBtn && sidebar) {
    mobileBtn.addEventListener("click", () => {
      sidebar.classList.toggle("open");
      backdrop?.classList.toggle("active");
    });
  }

  if (closeBtn && sidebar) {
    closeBtn.addEventListener("click", closeMobileSidebar);
  }

  if (backdrop && sidebar) {
    backdrop.addEventListener("click", closeMobileSidebar);
  }

  // Auto-close sidebar on mobile whenever any navigation item is clicked
  document.querySelectorAll(".sidebar-item, .sidebar-subitem").forEach(item => {
    item.addEventListener("click", closeMobileSidebar);
  });
}

function closeMobileSidebar() {
  const sidebar = document.getElementById("appSidebar");
  const backdrop = document.getElementById("sidebarBackdrop");
  sidebar?.classList.remove("open");
  backdrop?.classList.remove("active");
}

// Theme & Accent Management
function initThemeAndAccent() {
  const savedTheme = localStorage.getItem("kpr_theme") || "dark";
  const savedAccent = localStorage.getItem("kpr_accent") || "gold";
  setAppTheme(savedTheme, false);
  setAppAccent(savedAccent, false);
}

function setAppTheme(theme, notify = true) {
  localStorage.setItem("kpr_theme", theme);
  document.body.classList.remove("theme-light", "theme-dark", "theme-system");
  
  let effectiveTheme = theme;
  if (theme === "system") {
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    effectiveTheme = prefersDark ? "dark" : "light";
  }

  if (effectiveTheme === "light") {
    document.body.classList.add("theme-light");
  } else {
    document.body.classList.add("theme-dark");
  }

  // Sync settings view theme cards
  document.querySelectorAll(".theme-card-option").forEach(card => {
    card.classList.toggle("active", card.dataset.theme === theme);
  });

  if (notify) {
    showToast(`Theme switched to ${theme.toUpperCase()} 🎨`);
  }
}

function setAppAccent(accent, notify = true) {
  localStorage.setItem("kpr_accent", accent);
  document.body.dataset.accent = accent;
  document.body.classList.remove("accent-gold", "accent-red", "accent-green", "accent-blue", "accent-purple");
  document.body.classList.add(`accent-${accent}`);

  // Sync settings view swatches
  document.querySelectorAll(".accent-swatch").forEach(swatch => {
    swatch.classList.toggle("active", swatch.dataset.accent === accent);
  });

  if (notify) {
    showToast(`Accent color set to ${accent.toUpperCase()} ✨`);
  }
}

function renderSettingsPage() {
  const currentLang = localStorage.getItem("kpr_speech_lang") || "en-IN";
  const currentTheme = localStorage.getItem("kpr_theme") || "dark";
  const currentAccent = localStorage.getItem("kpr_accent") || "gold";

  // Sync language pills
  document.querySelectorAll(".lang-pill-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.lang === currentLang);
  });

  // Sync theme cards
  document.querySelectorAll(".theme-card-option").forEach(card => {
    card.classList.toggle("active", card.dataset.theme === currentTheme);
  });

  // Sync accent swatches
  document.querySelectorAll(".accent-swatch").forEach(swatch => {
    swatch.classList.toggle("active", swatch.dataset.accent === currentAccent);
  });

  // Sync toggles
  const ttsToggle = document.getElementById("settingTtsToggle");
  if (ttsToggle) ttsToggle.checked = localStorage.getItem("kpr_setting_tts") !== "false";
  const notifyToggle = document.getElementById("settingNotifyToggle");
  if (notifyToggle) notifyToggle.checked = localStorage.getItem("kpr_setting_notify") !== "false";
}

window.setAppTheme = setAppTheme;
window.setAppAccent = setAppAccent;
window.renderSettingsPage = renderSettingsPage;

// Settings Modal Controls
function setupSettingsModal() {
  const settingsBtn = document.getElementById("sidebarSettingsBtn");
  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
      window.location.hash = "#settings";
    });
  }

  document.getElementById("headerNotifyBtn")?.addEventListener("click", () => {
    showToast("🔔 3 Notifications: Welcome offer 20% applied · Chef Special Kari Dosa live · Table confirmed");
  });

  document.getElementById("headerUserBadge")?.addEventListener("click", () => {
    showToast(`👤 Active Guest Session: ${sessionId}`);
  });
}

window.closeSettingsModal = function() {
  document.getElementById("settingsModal")?.classList.remove("show");
};

window.saveSettings = function() {
  const tts = document.getElementById("settingTtsToggle")?.checked;
  const notify = document.getElementById("settingNotifyToggle")?.checked;
  const branch = document.getElementById("settingBranchSelect")?.value;
  const diet = document.getElementById("settingDietSelect")?.value;

  localStorage.setItem("kpr_setting_tts", tts ? "true" : "false");
  localStorage.setItem("kpr_setting_notify", notify ? "true" : "false");
  if (branch) localStorage.setItem("kpr_setting_branch", branch);
  if (diet) localStorage.setItem("kpr_setting_diet", diet);

  showToast("Settings saved successfully! ⚙️");
};

window.resetCartSession = function() {
  localStorage.removeItem("kpr_session_id");
  sessionId = "sess_" + Math.random().toString(36).substring(2, 9);
  localStorage.setItem("kpr_session_id", sessionId);
  currentCart = { items: [], subtotal: 0, tax: 0, delivery_fee: 30, total: 0 };
  updateCartUI(currentCart);
  window.closeSettingsModal();
  showToast("Session and cart have been reset 🔄");
};

// ==========================================
// 4. REALISTIC DASHBOARD COMPONENT ENGINE
// ==========================================
function renderDashboard() {
  updateDashboardKPIs();
  renderDashboardAiRecs();
  renderDashboardRecentOrders();
  renderDashboardDealsSpotlight();
  renderDashboardTableStatus();
}

function updateDashboardKPIs() {
  updateFavoritesBadge();
  updateCartBadge();

  // Offers active count
  const offersCount = Object.keys(DEALS_DATA).length;
  const kpiOffers = document.getElementById("kpiOffersCount");
  if (kpiOffers) kpiOffers.textContent = `${offersCount} Deals Active`;

  // Fetch real past orders stats
  fetch(`${API_BASE}/orders/history`)
    .then(res => res.json())
    .then(data => {
      const orders = data.orders || [];
      const totalOrdersEl = document.getElementById("kpiTotalOrders");
      const totalSpendEl = document.getElementById("kpiTotalSpend");
      if (totalOrdersEl) totalOrdersEl.textContent = `${orders.length} Orders`;
      if (totalSpendEl) {
        const spent = orders.reduce((s, o) => s + (o.total || 0), 0);
        totalSpendEl.textContent = `₹${spent.toFixed(0)} total spent`;
      }
    })
    .catch(() => {});
}

function renderDashboardAiRecs() {
  const container = document.getElementById("dashboardAiRecsGrid");
  if (!container || !menuData.length) return;

  // Curate 4 top South Indian chef recommendations
  const signatureIds = ["bir-001", "dosa-001", "meals-001", "bev-001"];
  const recItems = menuData.filter(m => signatureIds.includes(m.id)).slice(0, 4);
  if (!recItems.length) return;

  const isTamil = currentSpeechLang === "ta-IN";
  container.innerHTML = recItems.map(item => `
    <div class="ai-rec-card">
      <div class="ai-rec-img-box">
        <img src="${item.image}" alt="${item.name_en}" onerror="this.onerror=null; this.src='assets/dishes/bir-001.jpg'" />
        <span class="ai-rec-badge">✨ AI CHEF PICK</span>
      </div>
      <div class="ai-rec-body">
        <h4>${isTamil && item.name_ta ? item.name_ta : item.name_en}</h4>
        <p>${item.description_en}</p>
        <div class="ai-rec-foot">
          <span class="ai-rec-price">₹${item.price}</span>
          <button type="button" class="add-btn" style="padding:4px 12px; font-size:12px;" onclick="window.addToCart('${item.id}', 1, this)">+ Add</button>
        </div>
      </div>
    </div>
  `).join("");
}

function renderDashboardRecentOrders() {
  const container = document.getElementById("dashboardRecentOrdersList");
  if (!container) return;

  fetch(`${API_BASE}/orders/history`)
    .then(res => res.json())
    .then(data => {
      const orders = (data.orders || []).slice(0, 3);
      if (!orders.length) {
        container.innerHTML = `<div style="text-align:center; padding:16px; color:#A99990; font-size:13px;">No past orders yet. Place an order to see it here!</div>`;
        return;
      }
      container.innerHTML = orders.map(ord => `
        <div class="recent-order-item">
          <div class="recent-order-info">
            <strong>Order #${ord.order_id}</strong>
            <span>${ord.date} · ${(ord.items || []).map(i => `${i.quantity}x ${i.name_en}`).join(", ")}</span>
          </div>
          <div class="recent-order-meta">
            <span class="price">₹${(ord.total || 0).toFixed(0)}</span>
            <span class="status-badge delivered">${ord.status || 'Delivered'}</span>
          </div>
        </div>
      `).join("");
    })
    .catch(() => {
      container.innerHTML = `<div style="text-align:center; padding:16px; color:#A99990; font-size:13px;">Past orders will appear here.</div>`;
    });
}

function renderDashboardDealsSpotlight() {
  const container = document.getElementById("dashboardDealsSpotlight");
  if (!container) return;

  const dealsKeys = Object.keys(DEALS_DATA).slice(0, 2);
  container.innerHTML = dealsKeys.map(k => {
    const d = DEALS_DATA[k];
    return `
      <div class="deal-spotlight-card">
        <img src="${d.image}" alt="${d.name}" onerror="this.onerror=null; this.src='assets/dishes/bir-001.jpg'" />
        <div class="deal-spotlight-info">
          <h4>${d.name}</h4>
          <p>${d.desc}</p>
          <div class="deal-spotlight-pricing">
            <span class="curr">₹${d.offerPrice}</span>
            <span class="orig">₹${d.origPrice}</span>
            <button type="button" class="add-btn" style="padding:3px 10px; font-size:11px; margin-left:auto;" onclick="window.openDealDetailModal('${k}')">View &amp; Add</button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function renderDashboardTableStatus() {
  const container = document.getElementById("dashboardTableStatus");
  if (!container) return;

  container.innerHTML = tableList.slice(0, 6).map(t => `
    <div class="table-status-pill ${t.status === 'available' ? 'avail' : (t.status === 'booked' ? 'booked' : 'selected')}">
      <span class="t-name">${t.id} (${t.seats}S)</span>
      <span class="t-status">${t.status}</span>
    </div>
  `).join("");
}

// ==========================================
// 3. MENU FETCHING & RENDERING
// ==========================================
async function fetchMenu() {
  let loaded = false;
  try {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 2500) : null;
    const res = await fetch(`${API_BASE}/menu`, { signal: controller ? controller.signal : undefined });
    if (timeoutId) clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      menuData = data.items || [];
      if (menuData.length > 0) loaded = true;
    }
  } catch (e) {
    console.warn("Backend API /menu not accessible (offline or cloud CORS/mixed-content). Attempting local assets/menu.json fallback...", e);
  }

  // Fallback to local static assets/menu.json (ideal for Vercel/Netlify frontend-only deployments)
  if (!loaded || !menuData.length) {
    try {
      const fallbackRes = await fetch("assets/menu.json");
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        menuData = Array.isArray(fallbackData) ? fallbackData : (fallbackData.items || []);
        loaded = true;
        console.info("Loaded menu successfully from local assets/menu.json fallback (Total items:", menuData.length, ")");
      }
    } catch (err) {
      console.warn("Local assets/menu.json fallback also failed:", err);
    }
  }

  window.menuData = menuData;
  renderHomeDishes();
  renderFullMenu(menuData);
  renderSpecials();
  renderChatMealBrowser("breakfast");
}

function renderHomeDishes() {
  const container = document.getElementById("homeDishesGrid");
  if (!container) return;

  const topItems = menuData.slice(0, 4);
  container.innerHTML = topItems.map(item => `
    <div class="dish-card">
      <div class="dish-img-box">
        <img src="${item.image}" alt="${item.name_en}" onerror="this.onerror=null; this.src='assets/dishes/bir-001.jpg'" />
        <span class="${item.veg ? 'dish-badge-veg' : 'dish-badge-nonveg'}">
          ${item.veg ? '🌱 VEG' : '🍗 NON-VEG'}
        </span>
      </div>
      <div class="dish-info">
        <h3 class="dish-title">${item.name_en}</h3>
        <p class="dish-desc">${item.description_en}</p>
        <div class="dish-foot">
          <span class="dish-price">₹${item.price}</span>
          <div style="display:flex; gap:6px;">
            <button type="button" class="add-btn" style="background:#444;" onclick="window.openDishCustomizer('${item.id}')">⚙️ Customize</button>
            <button type="button" class="add-btn" onclick="window.addToCart('${item.id}', 1, this)">+ Add</button>
          </div>
        </div>
      </div>
    </div>
  `).join("");
}

function renderFullMenu(items) {
  const container = document.getElementById("fullMenuGrid");
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = `<p class="page-header" style="grid-column: 1/-1; text-align:center;">No items match your filter.</p>`;
    return;
  }

  container.innerHTML = items.map(item => {
    const isFav = favorites.includes(item.id);
    return `
    <div class="dish-card">
      <div class="dish-img-box">
        <img src="${item.image}" alt="${item.name_en}" onerror="this.onerror=null; this.src='assets/dishes/bir-001.jpg'" />
        <span class="${item.veg ? 'dish-badge-veg' : 'dish-badge-nonveg'}">
          ${item.veg ? '🌱 VEG' : '🍗 NON-VEG'}
        </span>
      </div>
      <div class="dish-info">
        <h3 class="dish-title">${item.name_en}</h3>
        <p class="dish-desc">${item.description_en}</p>
        <div class="dish-foot">
          <span class="dish-price">₹${item.price}</span>
          <div style="display:flex; gap:6px;">
            <button type="button" class="add-btn" style="background:${isFav ? '#C1442D' : '#555'}" onclick="toggleFav('${item.id}')">${isFav ? '❤️' : '🤍'}</button>
            <button type="button" class="add-btn" style="background:#444;" onclick="window.openDishCustomizer('${item.id}')">⚙️</button>
            <button type="button" class="add-btn" onclick="window.addToCart('${item.id}', 1, this)">+ Add</button>
          </div>
        </div>
      </div>
    </div>
  `}).join("");
}

// Menu Search & Filter
document.getElementById("menuSearchInput")?.addEventListener("input", (e) => {
  const q = e.target.value.toLowerCase();
  const filtered = menuData.filter(i => 
    i.name_en.toLowerCase().includes(q) || 
    (i.name_ta && i.name_ta.includes(q)) || 
    i.category.toLowerCase().includes(q)
  );
  renderFullMenu(filtered);
});

document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const cat = btn.dataset.cat;

    if (cat === "all") renderFullMenu(menuData);
    else if (cat === "veg") renderFullMenu(menuData.filter(i => i.veg));
    else if (cat === "non-veg") renderFullMenu(menuData.filter(i => !i.veg));
    else renderFullMenu(menuData.filter(i => i.category === cat));
  });
});

// ==========================================
// 4. CHAT PAGE MENU BROWSER TOGGLE
// ==========================================
function renderChatMealBrowser(mealType) {
  const container = document.getElementById("mealItems");
  if (!container || !menuData.length) return;

  const items = menuData.filter(item => {
    if (mealType === "breakfast") return item.category === "Dosa" || item.id.startsWith("dosa") || item.category === "Beverages";
    if (mealType === "lunch") return item.category === "Meals" || item.category === "Biryani";
    return item.category === "Biryani" || item.category === "Curry" || item.id.startsWith("dinner");
  });

  container.innerHTML = (items.length ? items : menuData.slice(0, 4)).map(item => `
    <div style="display:flex; justify-content:space-between; align-items:center; background:#fff; padding:8px 12px; border-radius:8px; margin-bottom:8px; border:1px solid #eee;">
      <div style="display:flex; align-items:center; gap:8px;">
        <img src="${item.image}" alt="${item.name_en}" style="width:36px; height:36px; border-radius:6px; object-fit:cover;" onerror="this.onerror=null; this.src='assets/dishes/bir-001.jpg'" />
        <div>
          <strong style="font-size:13px;">${item.name_en}</strong>
          <div style="font-size:11px; color:var(--clay); font-weight:700;">₹${item.price}</div>
        </div>
      </div>
      <button type="button" class="add-btn" style="padding:4px 10px; font-size:12px;" onclick="window.addToCart('${item.id}', 1, this)">+ Add</button>
    </div>
  `).join("");
}

// ==========================================
// 5. REQUIREMENT 4: DISH CUSTOMIZER STUDIO
// ==========================================
let custState = {
  dish: null,
  sizeName: "Regular",
  sizeExtra: 0,
  spice: "Medium",
  addons: [],
  instructions: "",
  quantity: 1
};

window.openDishCustomizer = function(dishId) {
  // If dishId not supplied, default to first bestseller
  const item = (dishId ? menuData.find(i => i.id === dishId) : null) || menuData[0] || {
    id: "bir-001",
    name_en: "Chicken Biryani",
    name_ta: "சிக்கன் பிரியாணி",
    price: 220,
    veg: false,
    image: "assets/dishes/bir-001.jpg",
    description_en: "Fragrant seeraga samba rice slow-cooked with tender chicken, whole spices and caramelised onions."
  };

  custState.dish = item;
  custState.sizeName = "Regular";
  custState.sizeExtra = 0;
  custState.spice = "Medium";
  custState.addons = [];
  custState.instructions = "";
  custState.quantity = 1;

  window.location.hash = "#dish-detail";
  renderDishCustomizerUI();
};

function renderDishCustomizerUI() {
  const container = document.getElementById("dishDetailContent");
  if (!container || !custState.dish) return;

  const item = custState.dish;

  // Options
  const sizeOptions = [
    { name: "Regular (Full)", extra: 0, label: "+₹0" },
    { name: "Medium / Special", extra: 40, label: "+₹40" },
    { name: "Large / Family Portion", extra: 80, label: "+₹80" }
  ];

  const availableAddons = [
    { name: "Extra Masala Gravy", price: 25 },
    { name: "Chilled Onion Raita", price: 20 },
    { name: "Farm Boiled Egg", price: 25 },
    { name: "Pure Desi Ghee Roast", price: 30 },
    { name: "Crispy Roasted Cashews", price: 40 }
  ];

  container.innerHTML = `
    <div class="customizer-card">
      <!-- Dish Switcher Dropdown (Never Blank) -->
      <div class="customizer-dish-selector">
        <label for="customizerDishSelect"><strong>🍽️ Select Dish to Customize:</strong></label>
        <select id="customizerDishSelect" onchange="window.openDishCustomizer(this.value)">
          ${menuData.map(m => `
            <option value="${m.id}" ${m.id === item.id ? 'selected' : ''}>
              ${m.veg ? '🌱' : '🍗'} ${m.name_en} (₹${m.price})
            </option>
          `).join("")}
        </select>
      </div>

      <div class="customizer-body">
        <!-- Left: Image & Dish Info -->
        <div>
          <div class="customizer-img-box">
            <img src="${item.image}" alt="${item.name_en}" onerror="this.onerror=null; this.src='assets/dishes/bir-001.jpg'" />
            <span class="${item.veg ? 'dish-badge-veg' : 'dish-badge-nonveg'}" style="position:absolute; top:12px; left:12px;">
              ${item.veg ? '🌱 VEG' : '🍗 NON-VEG'}
            </span>
          </div>
          <div style="margin-top:14px;">
            <h2 style="font-family:'Fraunces',serif; font-size:24px; margin:0 0 6px 0;">${item.name_en}</h2>
            <div style="font-size:18px; color:var(--clay); font-weight:800; margin-bottom:8px;">Base Price: ₹${item.price}</div>
            <p style="font-size:13px; color:#555; line-height:1.5; margin:0;">${item.description_en || 'Authentic KPR specialty prepared freshly with regional South Indian spices.'}</p>
          </div>
        </div>

        <!-- Right: Customizer Options -->
        <div class="customizer-options">
          <!-- 1. Size Options -->
          <div class="option-group">
            <h4>📏 Choose Portion Size</h4>
            <div class="size-pill-group">
              ${sizeOptions.map(s => `
                <label class="size-pill-label ${custState.sizeName === s.name ? 'active' : ''}">
                  <input type="radio" name="optSize" value="${s.name}" data-extra="${s.extra}" ${custState.sizeName === s.name ? 'checked' : ''} onchange="window.updateCustSize('${s.name}', ${s.extra})" />
                  <span>${s.name}</span>
                  <span style="font-size:11px; color:var(--clay);">${s.label}</span>
                </label>
              `).join("")}
            </div>
          </div>

          <!-- 2. Spice Level -->
          <div class="option-group">
            <h4>🌶️ Select Spice Level</h4>
            <div style="display:flex; gap:14px; flex-wrap:wrap; font-size:13px; font-weight:600;">
              <label style="display:flex; align-items:center; gap:6px; cursor:pointer;"><input type="radio" name="optSpice" value="Mild" onchange="window.updateCustSpice('Mild')" /> Mild 🌶️</label>
              <label style="display:flex; align-items:center; gap:6px; cursor:pointer;"><input type="radio" name="optSpice" value="Medium" checked onchange="window.updateCustSpice('Medium')" /> Medium 🌶️🌶️</label>
              <label style="display:flex; align-items:center; gap:6px; cursor:pointer;"><input type="radio" name="optSpice" value="Spicy" onchange="window.updateCustSpice('Spicy')" /> Spicy 🌶️🌶️🌶️</label>
              <label style="display:flex; align-items:center; gap:6px; cursor:pointer;"><input type="radio" name="optSpice" value="Extra Hot" onchange="window.updateCustSpice('Extra Hot')" /> Extra Hot 🔥</label>
            </div>
          </div>

          <!-- 3. Add-ons & Toppings -->
          <div class="option-group">
            <h4>🧀 Add-ons &amp; Premium Toppings</h4>
            <div class="addon-grid-container">
              ${availableAddons.map(a => `
                <label class="addon-card-label">
                  <input type="checkbox" class="cust-addon-cb" value="${a.name}" data-price="${a.price}" onchange="window.updateCustAddons()" />
                  <span>${a.name}</span>
                  <span class="addon-price-tag">+₹${a.price}</span>
                </label>
              `).join("")}
            </div>
          </div>

          <!-- 4. Special Instructions -->
          <div class="option-group">
            <h4>📝 Special Instructions</h4>
            <textarea id="custSpecialInstructions" placeholder="e.g. Less oil, extra crispy, separate gravy in pouch, no onions..." style="width:100%; border-radius:8px; border:1px solid #ccc; padding:10px; font-family:inherit; font-size:13px;" rows="2" oninput="window.updateCustNotes(this.value)"></textarea>
          </div>

          <!-- 5. Dynamic Price Calculation Box -->
          <div class="price-calc-box">
            <div class="calc-breakdown">
              <div>Base Price: ₹${item.price} | Size: +₹<span id="custCalcSize">0</span></div>
              <div>Add-ons: +₹<span id="custCalcAddons">0</span> | Qty: <span id="custCalcQty">1</span>x</div>
            </div>
            <div style="display:flex; align-items:center; gap:16px;">
              <div style="display:flex; align-items:center; gap:8px;">
                <button type="button" class="add-btn" style="padding:4px 14px; font-size:16px;" onclick="window.changeCustQty(-1)">-</button>
                <span id="custQtyVal" style="font-weight:800; font-size:18px;">1</span>
                <button type="button" class="add-btn" style="padding:4px 14px; font-size:16px;" onclick="window.changeCustQty(1)">+</button>
              </div>
              <div class="calc-total" id="custCalcTotal">₹${item.price}</div>
            </div>
          </div>

          <!-- 6. Add to Cart Button -->
          <button type="button" class="btn-primary full-width" id="custAddToCartBtn" style="font-size:16px; padding:14px;" onclick="window.submitCustomizedItem()">
            Add Customized Item to Cart 🛒
          </button>
        </div>
      </div>
    </div>
  `;

  recalculateCustomizer();
}

window.updateCustSize = function(name, extra) {
  custState.sizeName = name;
  custState.sizeExtra = extra;
  document.querySelectorAll(".size-pill-label").forEach(l => l.classList.remove("active"));
  const checked = document.querySelector('input[name="optSize"]:checked');
  if (checked) checked.closest(".size-pill-label")?.classList.add("active");
  recalculateCustomizer();
};

window.updateCustSpice = function(spice) {
  custState.spice = spice;
  recalculateCustomizer();
};

window.updateCustAddons = function() {
  const checkboxes = document.querySelectorAll(".cust-addon-cb:checked");
  custState.addons = Array.from(checkboxes).map(cb => ({
    name: cb.value,
    price: parseFloat(cb.dataset.price || 0)
  }));
  recalculateCustomizer();
};

window.updateCustNotes = function(notes) {
  custState.instructions = notes;
};

window.changeCustQty = function(delta) {
  custState.quantity = Math.max(1, custState.quantity + delta);
  const el = document.getElementById("custQtyVal");
  if (el) el.innerText = custState.quantity;
  recalculateCustomizer();
};

function recalculateCustomizer() {
  if (!custState.dish) return;

  const base = custState.dish.price;
  const size = custState.sizeExtra;
  const addonsTotal = custState.addons.reduce((sum, a) => sum + a.price, 0);
  const unitPrice = base + size + addonsTotal;
  const totalPrice = unitPrice * custState.quantity;

  const sizeEl = document.getElementById("custCalcSize");
  const addonsEl = document.getElementById("custCalcAddons");
  const qtyEl = document.getElementById("custCalcQty");
  const totalEl = document.getElementById("custCalcTotal");
  const btn = document.getElementById("custAddToCartBtn");

  if (sizeEl) sizeEl.innerText = size;
  if (addonsEl) addonsEl.innerText = addonsTotal;
  if (qtyEl) qtyEl.innerText = custState.quantity;
  if (totalEl) totalEl.innerText = `₹${totalPrice.toFixed(0)}`;
  if (btn) btn.innerText = `Add Customized Item to Cart • ₹${totalPrice.toFixed(0)} 🛒`;

  custState.calculatedUnitPrice = unitPrice;
  custState.calculatedTotalPrice = totalPrice;
}

window.submitCustomizedItem = async function() {
  if (!custState.dish) return;

  const item = custState.dish;
  const customList = [];

  if (custState.sizeName && custState.sizeName !== "Regular (Full)") {
    customList.push(custState.sizeName);
  }
  if (custState.spice) {
    customList.push(custState.spice + " Spice");
  }
  custState.addons.forEach(a => customList.push(a.name));
  if (custState.instructions && custState.instructions.trim()) {
    customList.push(`Note: ${custState.instructions.trim()}`);
  }

  const unitPrice = custState.calculatedUnitPrice || item.price;
  const qty = custState.quantity || 1;

  await window.addToCart(item.id, qty, null, customList, unitPrice);
  showToast("Customized dish added to cart successfully! 🎉");

  setTimeout(() => {
    window.location.hash = "#cart-checkout";
  }, 400);
};

// ==========================================
// 6. REQUIREMENT 1: ADD BUTTON / CART ENGINE
// ==========================================
function recalculateLocalCart() {
  if (!currentCart || !currentCart.items) {
    currentCart = { items: [], subtotal: 0, tax: 0, delivery_fee: 30, total: 0 };
  }
  const subtotal = currentCart.items.reduce((sum, item) => sum + (item.line_total || (item.unit_price * item.quantity)), 0);
  const tax = Math.round(subtotal * 0.05 * 100) / 100;
  const delivery_fee = currentCart.items.length > 0 ? 30 : 0;
  currentCart.subtotal = subtotal;
  currentCart.tax = tax;
  currentCart.delivery_fee = delivery_fee;
  currentCart.total = subtotal + tax + delivery_fee;
  try {
    localStorage.setItem("kpr_offline_cart", JSON.stringify(currentCart));
  } catch (e) {}
}

async function fetchCart() {
  try {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 1500) : null;
    const res = await fetch(`${API_BASE}/cart/${sessionId}`, { signal: controller ? controller.signal : undefined });
    if (timeoutId) clearTimeout(timeoutId);
    if (res.ok) {
      const cart = await res.json();
      currentCart = cart;
      updateCartUI(cart);
      return;
    }
  } catch (e) {
    // Backend API unreachable — fall back to local cart
  }

  const savedCart = localStorage.getItem("kpr_offline_cart");
  if (savedCart) {
    try {
      currentCart = JSON.parse(savedCart);
    } catch (e) {}
  }
  updateCartUI(currentCart);
}

window.addToCart = async function(dishId, qty = 1, btnElement = null, customizations = [], explicitUnitPrice = null) {
  // Prevent duplicate/accidental spam clicking
  if (btnElement) {
    btnElement.disabled = true;
    setTimeout(() => { btnElement.disabled = false; }, 600);
  }

  const item = menuData.find(i => i.id === dishId);
  const nameEn = item ? item.name_en : (dishId.startsWith("deal") ? "Special Combo" : "Delicious Dish");
  const price = explicitUnitPrice !== null ? explicitUnitPrice : (item ? item.price : 150);

  let apiSuccess = false;
  try {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 2000) : null;
    const res = await fetch(`${API_BASE}/cart/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller ? controller.signal : undefined,
      body: JSON.stringify({
        session_id: sessionId,
        item_id: dishId,
        name_en: nameEn,
        name_ta: item ? item.name_ta : nameEn,
        price: price,
        quantity: qty,
        customizations: customizations
      })
    });
    if (timeoutId) clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data.cart) {
        currentCart = data.cart;
        updateCartUI(data.cart);
        apiSuccess = true;
      }
    }
  } catch (e) {
    // Network / Mixed Content error on Vercel
  }

  if (!apiSuccess) {
    if (!currentCart) currentCart = { items: [], subtotal: 0, tax: 0, delivery_fee: 30, total: 0 };
    if (!currentCart.items) currentCart.items = [];
    const custKey = JSON.stringify(customizations || []);
    let existingItem = currentCart.items.find(i => i.item_id === dishId && JSON.stringify(i.customizations || []) === custKey);
    if (existingItem) {
      existingItem.quantity += qty;
      existingItem.line_total = existingItem.quantity * existingItem.unit_price;
    } else {
      currentCart.items.push({
        item_id: dishId,
        name_en: nameEn,
        name_ta: item ? item.name_ta : nameEn,
        unit_price: price,
        quantity: qty,
        line_total: price * qty,
        customizations: customizations
      });
    }
    recalculateLocalCart();
    updateCartUI(currentCart);
  }

  showToast(`Item added successfully! (${qty}x ${nameEn})`);
};

window.changeItemQty = async function(itemId, newQty, customizations = []) {
  if (newQty <= 0) {
    return window.removeItemFromCart(itemId, customizations);
  }

  let apiSuccess = false;
  try {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 2000) : null;
    const res = await fetch(`${API_BASE}/cart/update-qty`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller ? controller.signal : undefined,
      body: JSON.stringify({
        session_id: sessionId,
        item_id: itemId,
        customizations: customizations,
        quantity: newQty
      })
    });
    if (timeoutId) clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data.cart) {
        currentCart = data.cart;
        updateCartUI(data.cart);
        apiSuccess = true;
      }
    }
  } catch (e) {}

  if (!apiSuccess) {
    const custKey = JSON.stringify(customizations || []);
    const item = (currentCart.items || []).find(i => i.item_id === itemId && JSON.stringify(i.customizations || []) === custKey);
    if (item) {
      item.quantity = newQty;
      item.line_total = item.quantity * item.unit_price;
      recalculateLocalCart();
      updateCartUI(currentCart);
    }
  }
};

window.removeItemFromCart = async function(itemId, customizations = []) {
  let apiSuccess = false;
  try {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 2000) : null;
    const res = await fetch(`${API_BASE}/cart/remove`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller ? controller.signal : undefined,
      body: JSON.stringify({
        session_id: sessionId,
        item_id: itemId,
        customizations: customizations
      })
    });
    if (timeoutId) clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data.cart) {
        currentCart = data.cart;
        updateCartUI(data.cart);
        apiSuccess = true;
      }
    }
  } catch (e) {}

  if (!apiSuccess) {
    const custKey = JSON.stringify(customizations || []);
    currentCart.items = (currentCart.items || []).filter(i => !(i.item_id === itemId && JSON.stringify(i.customizations || []) === custKey));
    recalculateLocalCart();
    updateCartUI(currentCart);
  }
  showToast("Item removed from cart");
};

function updateCartBadge() {
  const count = ((currentCart && currentCart.items) || []).reduce((acc, i) => acc + (i.quantity || 1), 0);

  // Live badge in left vertical sidebar
  const sidebarBadge = document.getElementById("navCartBadge");
  if (sidebarBadge) {
    sidebarBadge.textContent = count;
  }

  // Live badge in top header
  const headerBadge = document.getElementById("headerCartCount");
  if (headerBadge) {
    headerBadge.textContent = count;
  }

  // Legacy badge if present
  const legacyBadge = document.getElementById("cartCountBadge");
  if (legacyBadge) {
    legacyBadge.textContent = count;
  }

  // Dashboard KPI stat card
  const kpiCart = document.getElementById("kpiCartCount");
  if (kpiCart) {
    kpiCart.textContent = `${count} Items`;
  }

  const kpiTotal = document.getElementById("kpiCartTotal");
  if (kpiTotal) {
    kpiTotal.textContent = `₹${((currentCart && currentCart.total) || 0).toFixed(0)} cart value`;
  }
}

function updateCartUI(cart) {
  if (cart) currentCart = cart;
  updateCartBadge();

  // Checkout list on Page 5
  const checkoutList = document.getElementById("cartFullList");
  if (checkoutList) {
    if (!cart.items || cart.items.length === 0) {
      checkoutList.innerHTML = `
        <div style="padding:40px 20px; text-align:center; background:#fff; border-radius:12px; border:1px dashed #ddd;">
          <div style="font-size:42px; margin-bottom:12px;">🍛</div>
          <h3 style="font-family:'Fraunces',serif; margin:0 0 8px 0;">Your Cart is Empty</h3>
          <p style="color:#666; margin:0 0 16px 0;">Explore our authentic menu or combo deals to start your order!</p>
          <a href="#menu" class="btn-primary" style="display:inline-block;">Browse Menu Now ➔</a>
        </div>
      `;
    } else {
      checkoutList.innerHTML = cart.items.map(item => {
        const customsJson = JSON.stringify(item.customizations || []).replace(/"/g, '&quot;');
        return `
        <div class="cart-line-item" style="display:flex; justify-content:space-between; align-items:center; padding:16px; background:#fff; border-radius:10px; margin-bottom:10px; box-shadow:0 2px 6px rgba(0,0,0,0.04); border:1px solid #eee;">
          <div style="flex:1;">
            <div style="font-weight:700; font-size:15px; color:var(--charcoal);">${item.name_en}</div>
            ${item.customizations && item.customizations.length ? `<div style="font-size:12px; color:var(--clay); font-weight:600; margin-top:2px;">⚙️ ${item.customizations.join(", ")}</div>` : ''}
            <div style="font-size:13px; color:#666; margin-top:4px;">₹${item.unit_price} each</div>
          </div>
          
          <div style="display:flex; align-items:center; gap:16px;">
            <div class="cart-qty-ctrl" style="display:flex; align-items:center; gap:8px; background:var(--cream); padding:4px 8px; border-radius:8px; border:1px solid var(--cream-dark);">
              <button type="button" class="btn-qty" style="width:26px; height:26px; border-radius:4px; border:none; background:#fff; font-weight:800; cursor:pointer;" onclick="window.changeItemQty('${item.item_id}', ${item.quantity - 1}, ${customsJson})">-</button>
              <span style="font-weight:800; min-width:20px; text-align:center;">${item.quantity}</span>
              <button type="button" class="btn-qty" style="width:26px; height:26px; border-radius:4px; border:none; background:#fff; font-weight:800; cursor:pointer;" onclick="window.changeItemQty('${item.item_id}', ${item.quantity + 1}, ${customsJson})">+</button>
            </div>
            
            <div style="font-weight:800; font-size:16px; min-width:70px; text-align:right;">₹${item.line_total}</div>
            
            <button type="button" style="background:none; border:none; color:#C1442D; cursor:pointer; font-size:16px; padding:4px;" title="Remove item" onclick="window.removeItemFromCart('${item.item_id}', ${customsJson})">🗑️</button>
          </div>
        </div>
      `}).join("");
    }
  }

  // Totals on Checkout Page
  const sub = cart.subtotal || 0;
  const disc = cart.discount_amount || 0;
  const tax = cart.tax || 0;
  const del = cart.delivery_fee || (cart.items && cart.items.length ? 30 : 0);
  const tot = cart.total || 0;

  if (document.getElementById("chkSubtotal")) document.getElementById("chkSubtotal").innerText = `₹${sub.toFixed(2)}`;
  
  const discRow = document.getElementById("chkDiscountRow");
  const discEl = document.getElementById("chkDiscount");
  if (discRow && discEl) {
    if (disc > 0) {
      discRow.style.display = "flex";
      discEl.innerText = `-₹${disc.toFixed(2)}`;
    } else {
      discRow.style.display = "none";
    }
  }

  if (document.getElementById("chkTax")) document.getElementById("chkTax").innerText = `₹${tax.toFixed(2)}`;
  if (document.getElementById("chkDelivery")) document.getElementById("chkDelivery").innerText = del === 0 && sub > 0 ? "FREE" : `₹${del.toFixed(2)}`;
  if (document.getElementById("chkGrand")) document.getElementById("chkGrand").innerText = `₹${tot.toFixed(2)}`;

  updateReceiptPanel(cart);
}

function updateReceiptPanel(cart) {
  if (!cart) return;

  const sessionEl = document.getElementById("receiptSessionId");
  if (sessionEl) sessionEl.innerText = `Session: ${sessionId}`;

  const statusBadge = document.getElementById("billStatusBadge");
  const isPaid = cart.payment_status === "PAID";
  if (statusBadge) {
    statusBadge.innerText = isPaid ? "PAID ✓" : "UNPAID";
    statusBadge.className = isPaid ? "bill-status-badge paid" : "bill-status-badge unpaid";
  }

  // 1. Rooms Section
  const roomsSec = document.getElementById("billRoomsSection");
  const roomsList = document.getElementById("billRoomsList");
  const roomsSub = document.getElementById("billRoomsSubtotal");
  const hasRooms = cart.rooms && cart.rooms.length > 0;

  if (roomsSec && roomsList) {
    if (hasRooms) {
      roomsSec.style.display = "block";
      if (roomsSub) roomsSub.innerText = `₹${(cart.room_subtotal || 0).toFixed(2)}`;
      roomsList.innerHTML = cart.rooms.map(r => `
        <div class="bill-item-row">
          <div class="bill-item-info">
            <div class="bill-item-name">${r.name}</div>
            <div class="bill-item-sub">${r.nights} night${r.nights > 1 ? 's' : ''} @ ₹${r.price_per_night} / night</div>
          </div>
          <div class="bill-item-actions">
            <span class="bill-item-total">₹${r.line_total.toFixed(2)}</span>
            <button type="button" class="bill-item-del-btn" title="Remove room" onclick="window.removeRoomFromBill('${r.room_id}')">✕</button>
          </div>
        </div>
      `).join("");
    } else {
      roomsSec.style.display = "none";
      roomsList.innerHTML = "";
    }
  }

  // 2. Food Section
  const foodSec = document.getElementById("billFoodSection");
  const foodList = document.getElementById("billFoodList");
  const foodSub = document.getElementById("billFoodSubtotal");
  const hasFood = cart.items && cart.items.length > 0;

  if (foodSec && foodList) {
    if (hasFood) {
      foodSec.style.display = "block";
      if (foodSub) foodSub.innerText = `₹${(cart.food_subtotal || 0).toFixed(2)}`;
      foodList.innerHTML = cart.items.map(i => {
        const customsJson = JSON.stringify(i.customizations || []).replace(/"/g, '&quot;');
        return `
          <div class="bill-item-row">
            <div class="bill-item-info">
              <div class="bill-item-name">${i.quantity}x ${i.name_en}</div>
              <div class="bill-item-sub">₹${i.unit_price} each ${i.customizations && i.customizations.length ? `· ${i.customizations.join(', ')}` : ''}</div>
            </div>
            <div class="bill-item-actions">
              <button type="button" class="bill-qty-btn" onclick="window.changeItemQty('${i.item_id}', ${i.quantity - 1}, ${customsJson})">-</button>
              <span style="font-weight:700; font-size:12px; min-width:14px; text-align:center;">${i.quantity}</span>
              <button type="button" class="bill-qty-btn" onclick="window.changeItemQty('${i.item_id}', ${i.quantity + 1}, ${customsJson})">+</button>
              <span class="bill-item-total">₹${i.line_total.toFixed(2)}</span>
              <button type="button" class="bill-item-del-btn" title="Remove item" onclick="window.removeItemFromCart('${i.item_id}', ${customsJson})">✕</button>
            </div>
          </div>
        `;
      }).join("");
    } else {
      foodSec.style.display = "none";
      foodList.innerHTML = "";
    }
  }

  // 3. Hotel Services Section
  const srvSec = document.getElementById("billServicesSection");
  const srvList = document.getElementById("billServicesList");
  const srvSub = document.getElementById("billServicesSubtotal");
  const hasServices = cart.services && cart.services.length > 0;

  if (srvSec && srvList) {
    if (hasServices) {
      srvSec.style.display = "block";
      if (srvSub) srvSub.innerText = `₹${(cart.service_subtotal || 0).toFixed(2)}`;
      srvList.innerHTML = cart.services.map(s => `
        <div class="bill-item-row">
          <div class="bill-item-info">
            <div class="bill-item-name">${s.quantity}x ${s.name}</div>
            <div class="bill-item-sub">₹${s.unit_price} service fee</div>
          </div>
          <div class="bill-item-actions">
            <span class="bill-item-total">₹${s.line_total.toFixed(2)}</span>
            <button type="button" class="bill-item-del-btn" title="Remove service" onclick="window.removeServiceFromBill('${s.service_id}')">✕</button>
          </div>
        </div>
      `).join("");
    } else {
      srvSec.style.display = "none";
      srvList.innerHTML = "";
    }
  }

  // 4. Empty State vs Totals Breakdown
  const emptyState = document.getElementById("billEmptyState");
  const totalsContainer = document.getElementById("receiptTotals");
  const payBtn = document.getElementById("billPayNowBtn");
  const paidBanner = document.getElementById("billPaidBanner");
  const payBtnAmount = document.getElementById("payBtnAmount");

  const isEmpty = !hasRooms && !hasFood && !hasServices;

  if (emptyState) emptyState.style.display = isEmpty ? "block" : "none";

  if (totalsContainer) {
    totalsContainer.style.display = isEmpty ? "none" : "flex";

    const rowRoom = document.getElementById("rowRoomSub");
    if (rowRoom) {
      rowRoom.style.display = hasRooms ? "flex" : "none";
      const el = document.getElementById("totRoomSub");
      if (el) el.innerText = `₹${(cart.room_subtotal || 0).toFixed(2)}`;
    }
    const rowFood = document.getElementById("rowFoodSub");
    if (rowFood) {
      rowFood.style.display = hasFood ? "flex" : "none";
      const el = document.getElementById("totFoodSub");
      if (el) el.innerText = `₹${(cart.food_subtotal || 0).toFixed(2)}`;
    }
    const rowService = document.getElementById("rowServiceSub");
    if (rowService) {
      rowService.style.display = hasServices ? "flex" : "none";
      const el = document.getElementById("totServiceSub");
      if (el) el.innerText = `₹${(cart.service_subtotal || 0).toFixed(2)}`;
    }

    const rowDisc = document.getElementById("rowDiscount");
    if (rowDisc) {
      const disc = cart.discount_amount || 0;
      rowDisc.style.display = disc > 0 ? "flex" : "none";
      const el = document.getElementById("totDiscount");
      if (el) el.innerText = `-₹${disc.toFixed(2)}`;
    }

    const elTax = document.getElementById("totTax");
    if (elTax) elTax.innerText = `₹${(cart.tax || 0).toFixed(2)}`;

    const elDel = document.getElementById("totDelivery");
    if (elDel) elDel.innerText = (cart.delivery_fee === 0 || !hasFood) ? "FREE" : `₹${(cart.delivery_fee || 30).toFixed(2)}`;

    const elGrand = document.getElementById("totGrand");
    if (elGrand) elGrand.innerText = `₹${(cart.total || 0).toFixed(2)}`;
  }

  // 5. Pay Now Button & Paid Banner
  if (payBtn && paidBanner) {
    if (isEmpty) {
      payBtn.style.display = "none";
      paidBanner.style.display = "none";
    } else if (isPaid) {
      payBtn.style.display = "none";
      paidBanner.style.display = "flex";
      const details = cart.payment_details || {};
      const txnEl = document.getElementById("paidTxnLabel");
      if (txnEl) txnEl.innerText = `Txn ID: ${details.transaction_id || 'TXN-KPR'}`;
      const dtEl = document.getElementById("paidDateLabel");
      if (dtEl) dtEl.innerText = `Via: ${details.method || 'UPI'} · ${details.paid_at || 'Paid Just Now'}`;
    } else {
      payBtn.style.display = "flex";
      paidBanner.style.display = "none";
      if (payBtnAmount) payBtnAmount.innerText = `₹${(cart.total || 0).toFixed(2)}`;
    }
  }
}

// Global Bill Removal Handlers
window.removeRoomFromBill = async (roomId) => {
  try {
    const res = await fetch(`${API_BASE}/cart/remove-room`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, room_id: roomId })
    });
    const data = await res.json();
    currentCart = data.bill || data.cart;
    updateCartUI(currentCart);
    showToast("Room removed from your bill.");
  } catch (e) {
    console.error("Remove room error:", e);
  }
};

window.removeServiceFromBill = async (serviceId) => {
  try {
    const res = await fetch(`${API_BASE}/cart/remove-service`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, service_id: serviceId })
    });
    const data = await res.json();
    currentCart = data.bill || data.cart;
    updateCartUI(currentCart);
    showToast("Hotel service removed from your bill.");
  } catch (e) {
    console.error("Remove service error:", e);
  }
};

// ==========================================
// IN-PAGE PAYMENT MODAL ENGINE
// ==========================================
function openAgentPaymentModal() {
  if (!currentCart || currentCart.is_empty || (currentCart.total || 0) <= 0) {
    showToast("⚠️ Your bill is empty! Add rooms, food, or hotel services first.");
    return;
  }
  const modal = document.getElementById("agentPaymentModal");
  if (!modal) return;

  const mRowRoom = document.getElementById("mRowRoom");
  const mRowFood = document.getElementById("mRowFood");
  const mRowServices = document.getElementById("mRowServices");
  const mRowDiscount = document.getElementById("mRowDiscount");

  if (mRowRoom) {
    const has = currentCart.rooms && currentCart.rooms.length > 0;
    mRowRoom.style.display = has ? "flex" : "none";
    const el = document.getElementById("mValRoom");
    if (el) el.innerText = `₹${(currentCart.room_subtotal || 0).toFixed(2)}`;
  }
  if (mRowFood) {
    const has = currentCart.items && currentCart.items.length > 0;
    mRowFood.style.display = has ? "flex" : "none";
    const el = document.getElementById("mValFood");
    if (el) el.innerText = `₹${(currentCart.food_subtotal || 0).toFixed(2)}`;
  }
  if (mRowServices) {
    const has = currentCart.services && currentCart.services.length > 0;
    mRowServices.style.display = has ? "flex" : "none";
    const el = document.getElementById("mValServices");
    if (el) el.innerText = `₹${(currentCart.service_subtotal || 0).toFixed(2)}`;
  }
  if (mRowDiscount) {
    const disc = currentCart.discount_amount || 0;
    mRowDiscount.style.display = disc > 0 ? "flex" : "none";
    const el = document.getElementById("mValDiscount");
    if (el) el.innerText = `-₹${disc.toFixed(2)}`;
  }

  const elTax = document.getElementById("mValTax");
  if (elTax) elTax.innerText = `₹${(currentCart.tax || 0).toFixed(2)}`;

  const elGrand = document.getElementById("mValGrand");
  if (elGrand) elGrand.innerText = `₹${(currentCart.total || 0).toFixed(2)}`;

  const elBtnText = document.getElementById("modalPayBtnText");
  if (elBtnText) elBtnText.innerText = `Pay ₹${(currentCart.total || 0).toFixed(2)} (Demo Payment)`;

  // Reset view to form
  const sumEl = document.getElementById("modalBillSummary");
  if (sumEl) sumEl.style.display = "flex";
  const methEl = document.querySelector(".modal-payment-methods");
  if (methEl) methEl.style.display = "block";
  const actEl = document.querySelector(".modal-actions");
  if (actEl) actEl.style.display = "block";
  const succEl = document.getElementById("modalSuccessCard");
  if (succEl) succEl.style.display = "none";

  modal.style.display = "flex";
}

function closeAgentPaymentModal() {
  const modal = document.getElementById("agentPaymentModal");
  if (modal) modal.style.display = "none";
}

window.openAgentPaymentModal = openAgentPaymentModal;

// ==========================================
// 7. REQUIREMENT 2: CHATBOT ENGINE
// ==========================================
let chatHistory = [];

function restoreChatHistory() {
  const saved = sessionStorage.getItem("kpr_chat_history");
  if (saved) {
    try {
      chatHistory = JSON.parse(saved);
      const scroll = document.getElementById("chatScroll");
      if (scroll && chatHistory.length) {
        scroll.innerHTML = "";
        chatHistory.forEach(entry => {
          if (entry.sender === "user") appendUserMessageDOM(entry.text, entry.time);
          else appendAgentMessageDOM(entry.text, entry.time);
        });
      }
    } catch (e) {
      chatHistory = [];
    }
  } else {
    // Default greeting with hotel concierge introduction
    appendAgentMessage("Vanakkam! Welcome to KPR Hotel 🙏 I am your real-time Hotel Concierge & Dining Agent. You can ask about our rooms (Deluxe, Premium, Suite), complimentary breakfast, reserve tables, order food, or check your live bill on the right!");
  }
}

let isSendingMessage = false;

async function sendChatMessage(text) {
  if (!text || !text.trim() || isSendingMessage) return;
  const cleanText = text.trim();
  isSendingMessage = true;

  // Instant display of user message
  appendUserMessage(cleanText);

  // Set processing state
  setVoiceState("processing");
  showBotTyping(true);

  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, text: cleanText })
    });

    const data = await res.json();
    showBotTyping(false);

    const reply = data.reply_text || "Thank you! I have updated your request.";
    appendAgentMessage(reply);

    if (data.cart) {
      currentCart = data.cart;
      updateCartUI(data.cart);
    }

    // Process backend UI events without leaving the Agent page
    if (data.ui_events && Array.isArray(data.ui_events)) {
      data.ui_events.forEach(ev => {
        if (ev.type === "open_payment_modal") {
          openAgentPaymentModal();
        } else if (ev.type === "cart_updated" && ev.payload) {
          currentCart = ev.payload;
          updateCartUI(currentCart);
        } else if (ev.type === "table_booked" && ev.payload) {
          showToast(`Table booked successfully! Reference: ${ev.payload.booking_id || ''}`);
          if (typeof loadTableReservations === "function") loadTableReservations();
        } else if (ev.type === "set_language" && ev.payload) {
          setAppLanguage(ev.payload);
        } else if (ev.type === "set_theme" && ev.payload) {
          setAppTheme(ev.payload);
        } else if (ev.type === "set_accent" && ev.payload) {
          setAppAccent(ev.payload);
        } else if (ev.type === "navigate" && ev.payload) {
          // ONLY navigate if user explicitly asked for home, kitchen-admin, or menu
          if (["home", "kitchen-admin", "analytics", "menu-admin", "menu", "favorites", "offers"].includes(ev.payload)) {
            window.location.hash = `#${ev.payload}`;
          }
        }
      });
    }

    speakAgentResponse(reply);
  } catch (e) {
    showBotTyping(false);
    setVoiceState("ready");
    const offlineReply = generateOfflineAgentReply(cleanText);
    appendAgentMessage(offlineReply);
    speakAgentResponse(offlineReply);
  } finally {
    isSendingMessage = false;
  }
}

function generateOfflineAgentReply(text) {
  const t = text.toLowerCase();

  // Breakfast query (image 2 query)
  if (t.includes("breakfast") || t.includes("காலை உணவு") || t.includes("tiffin")) {
    return "Yes! All room bookings at KPR Hotel include complimentary South Indian & Continental buffet breakfast ☕🍳 (Idli, Medu Vada, Crispy Dosa, Pongal, Poori & Kumbakonam Degree Coffee) served daily from 7:00 AM to 10:30 AM in our Heritage Dining Hall. Would you like to reserve a room or explore our dining menu?";
  }

  // Room tariffs & amenities
  if (t.includes("deluxe") || t.includes("room price") || t.includes("room rate") || t.includes("suite") || t.includes("stay") || t.includes("tariff") || t.includes("room")) {
    return "Here are our KPR Hotel room tariffs:\n• Deluxe Room: ₹2,499/night (AC, King Bed, Free WiFi & Breakfast)\n• Premium Heritage Room: ₹3,999/night (Balcony, Garden View, Complimentary High Tea)\n• Royal Suite: ₹5,999/night (Living Lounge, Jacuzzi, 24/7 Butler Service).\nAll rooms include complimentary breakfast! Would you like me to reserve a Deluxe Room for you?";
  }

  // Table reservation
  if (t.includes("table") || t.includes("book table") || t.includes("reserve") || t.includes("seat") || t.includes("மேஜை")) {
    return "You can book your dining table right here! We have family booths, window garden seating, and grand banquet tables. Click 'Book Table' in the sidebar or let me know your preferred date, time, and number of guests!";
  }

  // Food / Biryani / Dishes
  if (t.includes("biryani") || t.includes("chicken") || t.includes("bestseller") || t.includes("recommend") || t.includes("special") || t.includes("food") || t.includes("சாப்பாடு")) {
    return "Our top chef recommendations today are:\n🍗 Thalassery & Seeraga Samba Chicken Biryani (₹240)\n🥞 Madurai Ghee Roast Dosa (₹110)\n🍗 Chettinad Pepper Chicken 65 (₹190)\n🍨 Madurai Jigarthanda Drink (₹85)\nWould you like me to add one of these delicious dishes to your cart?";
  }

  // Add to cart intent
  if (t.includes("add") || t.includes("order")) {
    const item = (menuData || []).find(i => t.includes(i.name_en.toLowerCase()) || (i.tags && i.tags.some(tag => t.includes(tag.toLowerCase()))));
    if (item) {
      window.addToCart(item.id, 1);
      return `I have added 1x ${item.name_en} (₹${item.price}) to your cart! You can view your live bill on the right or proceed to Cart & Checkout.`;
    }
  }

  // Hotel timings
  if (t.includes("timing") || t.includes("time") || t.includes("open") || t.includes("check-in") || t.includes("check in")) {
    return "KPR Hotel is open 24/7! ⏰\n• Check-in: 12:00 PM | Check-out: 11:00 AM\n• Restaurant Timings: Breakfast 7:00–11:30 AM | Lunch 12:00–4:00 PM | Dinner 6:30–11:00 PM.";
  }

  // Location / Contact
  if (t.includes("location") || t.includes("address") || t.includes("where") || t.includes("contact") || t.includes("phone")) {
    return "📍 KPR Hotel is located at 124 Heritage Bypass Road, Madurai, Tamil Nadu.\n📞 Phone: +91 98400 12345 | Email: reservations@kprhotel.com.";
  }

  // Default pleasant concierge response
  return "Vanakkam! Welcome to KPR Hotel Concierge. I can help you with room bookings, complimentary breakfast details, table reservations, authentic South Indian menu recommendations, and order checkout. How may I assist you today?";
}

function showBotTyping(isTyping) {
  const scroll = document.getElementById("chatScroll");
  if (!scroll) return;

  const existing = document.getElementById("botTypingIndicator");
  if (isTyping && !existing) {
    const div = document.createElement("div");
    div.id = "botTypingIndicator";
    div.className = "typing-indicator";
    div.innerHTML = `
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <span style="font-size:12px; color:#666; margin-left:6px;">KPR Hotel Agent is thinking...</span>
    `;
    scroll.appendChild(div);
    scroll.scrollTo({ top: scroll.scrollHeight, behavior: "smooth" });
  } else if (!isTyping && existing) {
    existing.remove();
  }
}

function _formatCurrentTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function appendUserMessage(msg) {
  const time = _formatCurrentTime();
  appendUserMessageDOM(msg, time);
  chatHistory.push({ sender: "user", text: msg, time: time });
  sessionStorage.setItem("kpr_chat_history", JSON.stringify(chatHistory));
}

function appendAgentMessage(msg) {
  const time = _formatCurrentTime();
  appendAgentMessageDOM(msg, time);
  chatHistory.push({ sender: "agent", text: msg, time: time });
  sessionStorage.setItem("kpr_chat_history", JSON.stringify(chatHistory));
}

function appendUserMessageDOM(msg, time) {
  const scroll = document.getElementById("chatScroll");
  if (!scroll) return;
  const timeStr = time || _formatCurrentTime();
  const div = document.createElement("div");
  div.className = "msg msg-user";
  div.innerHTML = `
    <div class="msg-content">${msg}</div>
    <div style="font-size:10px; opacity:0.7; text-align:right; margin-top:4px;">${timeStr}</div>
  `;
  scroll.appendChild(div);
  if (typeof scroll.scrollTo === "function") {
    scroll.scrollTo({ top: scroll.scrollHeight, behavior: "smooth" });
  } else {
    scroll.scrollTop = scroll.scrollHeight;
  }
}

function appendAgentMessageDOM(msg, time) {
  const scroll = document.getElementById("chatScroll");
  if (!scroll) return;
  const timeStr = time || _formatCurrentTime();
  const div = document.createElement("div");
  div.className = "msg msg-agent";
  // Convert newlines to breaks for readable formatting
  const formattedMsg = msg.replace(/\n/g, '<br>');
  div.innerHTML = `
    <div style="display:flex; align-items:flex-start; gap:8px;">
      <span style="font-size:16px; flex-shrink:0;">🏨</span>
      <div style="flex:1;">
        <div class="msg-content">${formattedMsg}</div>
        <div style="font-size:10px; color:#888; margin-top:4px;">${timeStr} · KPR Hotel AI</div>
      </div>
    </div>
  `;
  scroll.appendChild(div);
  if (typeof scroll.scrollTo === "function") {
    scroll.scrollTo({ top: scroll.scrollHeight, behavior: "smooth" });
  } else {
    scroll.scrollTop = scroll.scrollHeight;
  }
}

// ==========================================
// 8. REQUIREMENT 3: MULTILINGUAL VOICE ASSISTANT
// ==========================================
let recognitionInstance = null;
let isVoiceListening = false;

function setVoiceState(state) {
  const recordingCard = document.getElementById("recordingCard");
  const recordingTitle = document.getElementById("recordingTitle");
  const recordingStatus = document.getElementById("recordingStatus");
  const micBtn = document.getElementById("micBtn");

  if (!micBtn) return;

  micBtn.classList.remove("recording", "processing", "speaking");

  if (state === "ready") {
    micBtn.innerHTML = '<span class="mic-icon">🎤</span><span class="mic-rings" aria-hidden="true"></span>';
    micBtn.setAttribute("title", "Click to speak (Ready)");
    if (recordingCard) recordingCard.style.display = "none";
  } else if (state === "listening") {
    micBtn.classList.add("recording");
    micBtn.innerHTML = '<span class="mic-icon">🔴</span><span class="mic-rings" aria-hidden="true"></span>';
    micBtn.setAttribute("title", "Listening to your voice...");
    if (recordingCard) recordingCard.style.display = "flex";
    if (recordingTitle) recordingTitle.innerHTML = "🔴 Listening...";
    if (recordingStatus) recordingStatus.innerText = `Speak clearly in ${currentSpeechLang}... Click Done when finished.`;
  } else if (state === "processing") {
    micBtn.classList.add("processing");
    micBtn.innerHTML = '<span class="mic-icon">⏳</span>';
    micBtn.setAttribute("title", "Processing AI request...");
    if (recordingCard) recordingCard.style.display = "flex";
    if (recordingTitle) recordingTitle.innerHTML = "⏳ Processing...";
    if (recordingStatus) recordingStatus.innerText = "KPR AI is analyzing your request...";
  } else if (state === "speaking") {
    micBtn.classList.add("speaking");
    micBtn.innerHTML = '<span class="mic-icon">🔊</span>';
    micBtn.setAttribute("title", "Speaking AI response...");
    if (recordingCard) recordingCard.style.display = "flex";
    if (recordingTitle) recordingTitle.innerHTML = "🔊 Speaking...";
    if (recordingStatus) recordingStatus.innerText = "Playing audio response...";
  }
}

function speakAgentResponse(text) {
  const ttsEnabled = localStorage.getItem("kpr_setting_tts") !== "false";
  if (!ttsEnabled || typeof window === "undefined" || !window.speechSynthesis) {
    setVoiceState("ready");
    return;
  }

  try {
    window.speechSynthesis.cancel();
    // Clean text of emojis and special characters for clean TTS
    const cleanSpeech = text.replace(/[*_#`~[\]()]/g, '').replace(/[^\x00-\x7F\u0B80-\u0BFF\s.,!?₹0-9]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    utterance.lang = currentSpeechLang || "en-IN";
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    setVoiceState("speaking");
    utterance.onend = () => {
      setVoiceState("ready");
    };
    utterance.onerror = () => {
      setVoiceState("ready");
    };
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    setVoiceState("ready");
  }
}

function initVoiceRecorder() {
  const micBtn = document.getElementById("micBtn");
  const stopBtn = document.getElementById("stopRecordingBtn");
  if (!micBtn) return;

  micBtn.addEventListener("click", () => {
    if (!isVoiceListening) {
      startVoiceListening();
    } else {
      stopVoiceListening();
    }
  });

  if (stopBtn) {
    stopBtn.addEventListener("click", () => {
      stopVoiceListening();
    });
  }
}

function startVoiceListening() {
  const recordingStatus = document.getElementById("recordingStatus");

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showToast("⚠️ Speech recognition not supported in this browser. Please type your message.");
    setVoiceState("ready");
    return;
  }

  try {
    recognitionInstance = new SpeechRecognition();
    recognitionInstance.lang = currentSpeechLang;
    recognitionInstance.interimResults = true;
    recognitionInstance.continuous = false;

    isVoiceListening = true;
    setVoiceState("listening");
    showToast(`🎙️ Voice assistant listening (${currentSpeechLang})`);

    recognitionInstance.onresult = (event) => {
      let interim = "";
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      const input = document.getElementById("textInput");
      if (input) input.value = finalTranscript || interim;

      if (finalTranscript.trim()) {
        stopVoiceListening();
        sendChatMessage(finalTranscript.trim());
      }
    };

    recognitionInstance.onerror = (err) => {
      console.warn("Speech recognition error:", err);
      if (err.error === "not-allowed" || err.error === "service-not-allowed") {
        showToast("⚠️ Microphone permission denied. Please enable mic access.");
        if (recordingStatus) recordingStatus.innerText = "⚠️ Microphone permission denied. Please allow microphone access or type your order.";
      }
      stopVoiceListening();
    };

    recognitionInstance.onend = () => {
      stopVoiceListening();
    };

    recognitionInstance.start();
  } catch (err) {
    console.error("Speech recognition startup error:", err);
    showToast("⚠️ Could not start speech recognition. Please allow mic permissions.");
    stopVoiceListening();
  }
}

function stopVoiceListening() {
  isVoiceListening = false;
  setVoiceState("ready");

  if (recognitionInstance) {
    try { recognitionInstance.stop(); } catch (e) {}
    recognitionInstance = null;
  }
}

// ==========================================
// 9. REQUIREMENT 5: APPLY COUPON ENGINE
// ==========================================
function setupCouponHandlers() {
  const applyBtn = document.getElementById("applyPromoBtn");
  const promoInput = document.getElementById("promoCodeInput");
  const feedbackMsg = document.getElementById("promoFeedbackMsg");

  if (!applyBtn || !promoInput) return;

  const handleApply = async () => {
    const code = promoInput.value.trim().toUpperCase();
    if (!code) {
      if (feedbackMsg) {
        feedbackMsg.style.display = "block";
        feedbackMsg.className = "promo-feedback-error";
        feedbackMsg.innerText = "Please enter a coupon code (e.g. KPR15, KPR50, or WELCOME).";
      }
      return;
    }

    let apiHandled = false;
    try {
      const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), 2000) : null;
      const res = await fetch(`${API_BASE}/cart/promo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller ? controller.signal : undefined,
        body: JSON.stringify({ session_id: sessionId, promo_code: code })
      });
      if (timeoutId) clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        apiHandled = true;
        if (data.status === "success" || data.status === "info") {
          if (feedbackMsg) {
            feedbackMsg.style.display = "block";
            feedbackMsg.className = "promo-feedback-success";
            feedbackMsg.innerText = `🎉 ${data.message}`;
          }
          showToast(`🎉 ${data.message}`);
          if (data.cart) {
            currentCart = data.cart;
            updateCartUI(data.cart);
          }
        } else {
          if (feedbackMsg) {
            feedbackMsg.style.display = "block";
            feedbackMsg.className = "promo-feedback-error";
            feedbackMsg.innerText = `⚠️ ${data.message}`;
          }
          showToast(`⚠️ ${data.message}`);
        }
      }
    } catch (err) {
      // Backend not running on cloud -> client-side fallback
    }

    if (!apiHandled) {
      if (!currentCart || !currentCart.items || currentCart.items.length === 0) {
        if (feedbackMsg) {
          feedbackMsg.style.display = "block";
          feedbackMsg.className = "promo-feedback-error";
          feedbackMsg.innerText = "Your cart is empty. Please add delicious items before applying a coupon!";
        }
        showToast("Your cart is empty!");
        return;
      }

      const validCodes = {
        "KPR15": { type: "percent", value: 15, name: "15% OFF" },
        "KPR50": { type: "flat", value: 50, name: "₹50 OFF" },
        "WELCOME": { type: "flat", value: 100, name: "₹100 Welcome Discount" },
        "WELCOME50": { type: "flat", value: 50, name: "₹50 Welcome Discount" },
        "FESTIVAL": { type: "percent", value: 20, name: "20% Festival Feast" }
      };

      if (validCodes[code]) {
        const promo = validCodes[code];
        let discount = 0;
        if (promo.type === "percent") {
          discount = Math.round(currentCart.subtotal * (promo.value / 100));
        } else {
          discount = Math.min(promo.value, currentCart.subtotal);
        }
        currentCart.promo_code = code;
        currentCart.discount_amount = discount;
        recalculateLocalCart();
        currentCart.total = Math.max(0, (currentCart.subtotal - discount) + currentCart.tax + currentCart.delivery_fee);
        updateCartUI(currentCart);

        if (feedbackMsg) {
          feedbackMsg.style.display = "block";
          feedbackMsg.className = "promo-feedback-success";
          feedbackMsg.innerText = `🎉 Coupon ${code} applied successfully! You saved ₹${discount}.`;
        }
        showToast(`🎉 Coupon ${code} applied! Saved ₹${discount}`);
      } else {
        if (feedbackMsg) {
          feedbackMsg.style.display = "block";
          feedbackMsg.className = "promo-feedback-error";
          feedbackMsg.innerText = "Invalid coupon code. Try KPR15 (15% off), KPR50 (₹50 off), or WELCOME (₹100 off).";
        }
        showToast("Invalid coupon code");
      }
    }
  };

  applyBtn.addEventListener("click", handleApply);
  promoInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleApply();
    }
  });
}

// ==========================================
// 10. REQUIREMENT 6: SPECIAL DEALS & COMBOS
// ==========================================
window.addDealToCart = async function(dealKey) {
  const deal = DEALS_DATA[dealKey];
  if (!deal) return;

  await window.addToCart(deal.item_id, 1, null, ["Combo Deal"], deal.offerPrice);
  showToast(`Item added successfully! (${deal.name})`);
};

window.viewDealDetail = function(dealKey) {
  const deal = DEALS_DATA[dealKey];
  if (!deal) return;

  const modal = document.getElementById("dealDetailModal");
  if (!modal) return;

  document.getElementById("dealModalImg").src = deal.image;
  document.getElementById("dealModalTitle").innerText = deal.name;
  document.getElementById("dealModalDesc").innerText = deal.desc;
  document.getElementById("dealModalOrigPrice").innerText = `₹${deal.origPrice}`;
  document.getElementById("dealModalOfferPrice").innerText = `₹${deal.offerPrice}`;

  const list = document.getElementById("dealModalItemsList");
  if (list) {
    list.innerHTML = deal.items.map(i => `<li>${i}</li>`).join("");
  }

  const addBtn = document.getElementById("dealModalAddBtn");
  if (addBtn) {
    addBtn.onclick = () => {
      window.addDealToCart(dealKey);
      window.closeDealDetailModal();
      window.location.hash = "#cart-checkout";
    };
  }

  modal.classList.add("active");
};

window.closeDealDetailModal = function() {
  document.getElementById("dealDetailModal")?.classList.remove("active");
};

// ==========================================
// 11. REQUIREMENT 7: TABLE BOOKING SYSTEM
// ==========================================
async function loadTableReservations() {
  const dateInput = document.getElementById("resDate");
  const timeInput = document.getElementById("resTime");
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;

  if (dateInput) {
    if (!dateInput.value || dateInput.value.length > 10 || isNaN(Date.parse(dateInput.value))) {
      dateInput.value = todayStr;
    }
    dateInput.min = todayStr;
    dateInput.max = `${yyyy + 1}-12-31`;
  }

  const dateVal = (dateInput && dateInput.value) ? dateInput.value : todayStr;
  const timeVal = (timeInput && timeInput.value) ? timeInput.value : "07:30 PM (Dinner)";

  try {
    const res = await fetch(`${API_BASE}/tables/availability?date=${encodeURIComponent(dateVal)}&time=${encodeURIComponent(timeVal)}`);
    const data = await res.json();
    if (data && data.tables) {
      tableList = data.tables;

      // Keep selection if still available, otherwise choose first available
      let cur = tableList.find(t => t.id === selectedTableId);
      if (!cur || cur.status === "booked") {
        const firstAvail = tableList.find(t => t.status === "available");
        if (firstAvail) {
          selectedTableId = firstAvail.id;
          firstAvail.status = "selected";
          const hiddenInput = document.getElementById("selectedTableId");
          if (hiddenInput) hiddenInput.value = firstAvail.id;
          const guestsInput = document.getElementById("resGuests");
          if (guestsInput) guestsInput.value = firstAvail.seats;
        } else {
          selectedTableId = null;
        }
      } else {
        cur.status = "selected";
      }
    }
    renderTableMap();
  } catch (e) {
    renderTableMap();
  }
}

function renderTableMap() {
  const container = document.getElementById("tableMapGrid");
  if (!container) return;

  container.innerHTML = tableList.map(t => {
    const isBooked = t.status === "booked";
    const isSelected = !isBooked && (t.status === "selected" || t.id === selectedTableId);

    let statusClass = "available";
    let statusText = "🟢 Available";
    let inlineStyle = "cursor: pointer; transition: all 0.2s;";

    if (isBooked) {
      statusClass = "booked";
      statusText = "🔴 Booked";
      inlineStyle = "opacity: 0.55; cursor: not-allowed; pointer-events: none; border-color: #C1442D;";
    } else if (isSelected) {
      statusClass = "available active-table";
      statusText = "⭐ Selected";
      inlineStyle = "cursor: pointer; border-color: var(--turmeric); box-shadow: 0 0 14px var(--accent-glow);";
    }

    return `
      <div class="table-node ${statusClass}" data-table="${t.id}" style="${inlineStyle}" onclick="${isBooked ? '' : `window.handleTableNodeClick('${t.id}', ${t.seats})`}">
        <span class="t-name">${t.id}</span>
        <span class="t-status">${statusText}</span>
        <span class="t-seats">${t.seats} Guests Max</span>
      </div>
    `;
  }).join("");
}

window.handleTableNodeClick = function(tableId, seats) {
  const table = tableList.find(t => t.id === tableId);
  if (!table || table.status === "booked") return;

  selectedTableId = tableId;
  tableList.forEach(t => {
    if (t.status !== "booked") {
      t.status = (t.id === tableId) ? "selected" : "available";
    }
  });

  const hiddenInput = document.getElementById("selectedTableId");
  if (hiddenInput) hiddenInput.value = tableId;

  const guestsInput = document.getElementById("resGuests");
  if (guestsInput) guestsInput.value = seats;

  renderTableMap();
  showToast(`Selected ${tableId} (${seats} Seats)!`);
};

// ==========================================
// 12. REQUIREMENT 8: SPECIAL ORDER MODAL & LOGIC
// ==========================================
let specialOrderQty = 1;

window.openSpecialOrderModal = function(dishId = null) {
  const modal = document.getElementById("specialOrderModal");
  if (!modal) return;

  specialOrderQty = 1;
  const item = (dishId ? menuData.find(i => i.id === dishId) : null) || {
    id: "sp-kari-dosa",
    name_en: "Madurai Mutton Kari Dosa",
    price: 280,
    image: "assets/dishes/special-kari-dosa.jpg",
    description_en: "Crispy golden fermented dosa layered with spicy minced mutton keema, fried egg, and rich Chettinad spices."
  };

  document.getElementById("spModalImg").src = item.image || "assets/dishes/special-kari-dosa.jpg";
  document.getElementById("spModalTitle").innerText = item.name_en;
  document.getElementById("spModalDesc").innerText = item.description_en || "Chef's signature slow-cooked woodfire specialty.";
  document.getElementById("spModalBasePrice").innerText = `₹${item.price}`;
  modal.dataset.basePrice = item.price;
  modal.dataset.dishId = item.id;
  modal.dataset.dishName = item.name_en;

  document.querySelectorAll(".sp-addon").forEach(cb => { cb.checked = false; });
  document.querySelectorAll(".sp-addon").forEach(cb => {
    cb.onchange = window.recalcSpecialOrderPrice;
  });

  window.changeSpecialOrderQty(0);
  modal.classList.add("active");
};

window.closeSpecialOrderModal = function() {
  document.getElementById("specialOrderModal")?.classList.remove("active");
};

window.changeSpecialOrderQty = function(delta) {
  specialOrderQty = Math.max(1, specialOrderQty + delta);
  const qtyEl = document.getElementById("spQtyVal");
  const dispEl = document.getElementById("spQtyDisplay");
  if (qtyEl) qtyEl.innerText = specialOrderQty;
  if (dispEl) dispEl.innerText = specialOrderQty;
  recalcSpecialOrderPrice();
};

function recalcSpecialOrderPrice() {
  const modal = document.getElementById("specialOrderModal");
  if (!modal) return;

  const base = parseFloat(modal.dataset.basePrice || 280);
  let addons = 0;
  document.querySelectorAll(".sp-addon:checked").forEach(cb => {
    addons += parseFloat(cb.dataset.price || 0);
  });

  const unit = base + addons;
  const total = unit * specialOrderQty;

  const totalEl = document.getElementById("spTotalVal");
  if (totalEl) totalEl.innerText = `₹${total}`;
  modal.dataset.totalPrice = total;
  modal.dataset.unitPrice = unit;
}

window.submitSpecialOrder = async function() {
  const modal = document.getElementById("specialOrderModal");
  if (!modal) return;

  const dishId = modal.dataset.dishId || "sp-order";
  const dishName = modal.dataset.dishName || "Chef Special Order";
  const unitPrice = parseFloat(modal.dataset.unitPrice || 280);

  const prep = document.querySelector('input[name="spPrepStyle"]:checked')?.value || "Woodfire Claypot";
  const spice = document.querySelector('input[name="spSpice"]:checked')?.value || "Medium";
  const addons = Array.from(document.querySelectorAll('.sp-addon:checked')).map(cb => cb.value);
  const notes = document.getElementById("spInstructions")?.value.trim() || "";

  const customs = [prep, spice + " Spice", ...addons];
  if (notes) customs.push(`Note: ${notes}`);

  await window.addToCart(dishId, specialOrderQty, null, customs, unitPrice);
  window.closeSpecialOrderModal();
  showToast("Item added successfully! Special order added to cart 🛒");

  setTimeout(() => {
    window.location.hash = "#cart-checkout";
  }, 400);
};

// ==========================================
// 13. CHEF SPECIALS & PAST ORDERS
// ==========================================
function renderSpecials() {
  const container = document.getElementById("specialsGrid");
  if (!container) return;

  const specialsList = [
    {
      id: "sp-kari-dosa",
      name_en: "Madurai Mutton Kari Dosa",
      price: 280,
      image: "assets/dishes/special-kari-dosa.jpg",
      description_en: "Crispy fermented dosa layered with tender spiced minced mutton keema, fried egg, and rich Chettinad salna."
    },
    {
      id: "bir-002",
      name_en: "Royal Seeraga Samba Mutton Biryani",
      price: 320,
      image: "assets/dishes/bir-002.jpg",
      description_en: "Traditional woodfire brass deg cooked aromatic small-grain biryani with tender lamb chunks."
    },
    {
      id: "dinner-001",
      name_en: "Malabar Parotta & Salna Feast",
      price: 160,
      image: "assets/dishes/dinner-001.jpg",
      description_en: "Flaky golden layered parottas served with steaming spicy aromatic salna and sliced red onions."
    }
  ];

  container.innerHTML = specialsList.map(s => `
    <div class="dish-card">
      <div class="dish-img-box">
        <img src="${s.image}" alt="${s.name_en}" onerror="this.onerror=null; this.src='assets/dishes/bir-001.jpg'" />
        <span class="dish-badge-nonveg" style="position:absolute; top:12px; left:12px;">🌟 CHEF SPECIAL</span>
      </div>
      <div class="dish-info">
        <h3 class="dish-title">${s.name_en}</h3>
        <p class="dish-desc">${s.description_en}</p>
        <div class="dish-foot">
          <span class="dish-price">₹${s.price}</span>
          <div style="display:flex; gap:6px;">
            <button type="button" class="btn-primary" style="padding:6px 12px; font-size:13px;" onclick="window.openSpecialOrderModal('${s.id}')">🌟 Special Order</button>
            <button type="button" class="add-btn" onclick="window.addToCart('${s.id}', 1, this)">+ Add</button>
          </div>
        </div>
      </div>
    </div>
  `).join("");
}

async function loadOrderHistory() {
  const container = document.getElementById("orderHistoryList");
  if (!container) return;

  try {
    const res = await fetch(`${API_BASE}/orders/history`);
    const data = await res.json();
    const orders = data.orders || [];

    if (!orders.length) {
      container.innerHTML = `<p style="padding:20px; text-align:center;">No past orders yet. Place an order to see it here!</p>`;
      return;
    }

    container.innerHTML = orders.map(ord => `
      <div style="background:#fff; border-radius:12px; padding:20px; margin-bottom:16px; box-shadow:0 2px 8px rgba(0,0,0,0.06); border:1px solid #eee;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #eee; padding-bottom:12px; margin-bottom:12px;">
          <div>
            <strong>Order #${ord.order_id}</strong>
            <div style="font-size:12px; color:#777;">${ord.date}</div>
          </div>
          <span style="background:#E8F5E9; color:#2E7D32; font-weight:700; font-size:12px; padding:4px 10px; border-radius:12px;">
            ${ord.status}
          </span>
        </div>

        <ul style="padding-left:18px; margin:0 0 16px 0; font-size:13px; color:#444;">
          ${(ord.items || []).map(i => `<li>${i.quantity || 1}x ${i.name_en || 'Dish'}</li>`).join("")}
        </ul>

        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="font-size:16px; font-weight:800; color:var(--clay);">Total: ₹${(ord.total||0).toFixed(2)}</div>
          <button type="button" class="btn-primary" style="padding:6px 14px; font-size:13px;" onclick="window.reorderPastOrder('${ord.order_id}')">🔄 Re-Order All Items</button>
        </div>
      </div>
    `).join("");
  } catch (e) {
    console.error("Failed to load order history", e);
  }
}

window.reorderPastOrder = async function(orderId) {
  try {
    const res = await fetch(`${API_BASE}/orders/history`);
    const data = await res.json();
    const order = (data.orders || []).find(o => o.order_id === orderId);
    if (!order) return;

    for (const item of (order.items || [])) {
      await window.addToCart(item.item_id, item.quantity || 1);
    }
    showToast(`Re-ordered items from #${orderId}! 🛒`);
    window.location.hash = "#cart-checkout";
  } catch (e) {
    showToast("Re-order failed");
  }
};

// ==========================================
// 14. CHECKOUT & PAYMENT PORTAL
// ==========================================
async function loadPaymentPortal() {
  const qrImg = document.getElementById("portalQrImage");
  const qrAmt = document.getElementById("portalQrAmount");
  const tot = (currentCart && typeof currentCart.total === "number") ? currentCart.total : 0;
  
  if (qrAmt) qrAmt.innerText = `Total Amount: ₹${tot.toFixed(2)}`;

  let apiSuccess = false;
  try {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 2000) : null;
    const res = await fetch(`${API_BASE}/payment/qr/${sessionId}`, { signal: controller ? controller.signal : undefined });
    if (timeoutId) clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data.qr_image_base64) {
        if (qrImg) qrImg.src = data.qr_image_base64;
        if (qrAmt) qrAmt.innerText = `Total Amount: ₹${data.total.toFixed(2)}`;
        apiSuccess = true;
      }
    }
  } catch (e) {
    console.warn("Payment QR API unavailable, using fallback QR", e);
  }

  if (!apiSuccess && qrImg) {
    // Generate valid UPI QR code using reliable public QR generator API
    const upiUri = `upi://pay?pa=kprhotel@upi&pn=KPR%20Hotel&am=${tot.toFixed(2)}&cu=INR&tn=KPR%20Hotel%20Food%20Order`;
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiUri)}`;
    qrImg.alt = `UPI QR Code: ₹${tot.toFixed(2)}`;
  }
}

async function executeOrderCheckout(method = "UPI") {
  const name = localStorage.getItem("kpr_cust_name") || "Guest Diner";
  const phone = localStorage.getItem("kpr_cust_phone") || "+91 98400 12345";
  const addr = localStorage.getItem("kpr_cust_address") || "Madurai Dining Room";
  const notes = localStorage.getItem("kpr_cust_notes") || "";

  let orderId = "ORD-" + Math.floor(1000 + Math.random() * 9000);
  try {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 2000) : null;
    const res = await fetch(`${API_BASE}/orders/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller ? controller.signal : undefined,
      body: JSON.stringify({
        session_id: sessionId,
        customer_name: name,
        phone: phone,
        address: addr,
        special_notes: notes,
        payment_method: method
      })
    });
    if (timeoutId) clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data.status === "success" && data.order_id) {
        orderId = data.order_id;
      }
    }
  } catch (err) {
    // Fall back to client-generated order
  }

  showToast(`✅ Order Confirmed! Starting Live Tracking...`);
  currentCart = { items: [], subtotal: 0, tax: 0, delivery_fee: 30, total: 0 };
  try { localStorage.removeItem("kpr_offline_cart"); } catch (e) {}
  updateCartUI(currentCart);

  const trackOrd = document.getElementById("trackerOrderId");
  if (trackOrd) trackOrd.innerText = `Order #${orderId}`;

  setTimeout(() => {
    window.location.hash = "#order-status";
    if (typeof startLiveTracker === "function") startLiveTracker();
  }, 700);
}

function initPaymentTabs() {
  const tabs = document.querySelectorAll("#payMethodTabs .pay-tab");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      const mode = tab.dataset.tab;
      const upiBody = document.getElementById("pay-body-upi");
      const cashBody = document.getElementById("pay-body-cash");
      const cardBody = document.getElementById("pay-body-card");

      if (upiBody) upiBody.hidden = (mode !== "upi");
      if (cashBody) cashBody.hidden = (mode !== "cash");
      if (cardBody) cardBody.hidden = (mode !== "card");

      if (mode === "upi") loadPaymentPortal();
    });
  });

  // Card Submit
  document.getElementById("cardPaymentForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const btn = document.getElementById("payCardBtn");
    if (btn) btn.innerText = "⏳ Authorizing Payment...";

    setTimeout(() => {
      if (btn) btn.innerText = "Pay via Credit/Debit Card ➔";
      executeOrderCheckout("Credit/Debit Card");
    }, 900);
  });

  // Confirm Cash
  document.getElementById("confirmCashOrderBtn")?.addEventListener("click", () => {
    executeOrderCheckout("Cash on Delivery");
  });

  // Confirm UPI Paid
  document.getElementById("portalConfirmPayBtn")?.addEventListener("click", () => {
    executeOrderCheckout("UPI");
  });

  // Receipt Panel Live Buttons
  document.getElementById("confirmPaidBtn")?.addEventListener("click", () => {
    executeOrderCheckout("UPI");
  });

  document.getElementById("newOrderBtn")?.addEventListener("click", async () => {
    sessionId = "sess_" + Math.random().toString(36).substring(2, 9);
    localStorage.setItem("kpr_session_id", sessionId);
    await fetchCart();
    showToast("Started fresh order session!");
    window.location.hash = "#menu";
  });
}

// ==========================================
// 15. LIVE ORDER TRACKER ENGINE
// ==========================================
let trackerInterval = null;
let trackerElapsed = 0;

function startLiveTracker() {
  const timerEl = document.getElementById("trackerTimer");
  const stepPlaced = document.getElementById("step-placed");
  const stepCooking = document.getElementById("step-cooking");
  const stepOut = document.getElementById("step-out");
  const stepDelivered = document.getElementById("step-delivered");
  const mapRider = document.getElementById("mapRiderIcon");

  if (trackerInterval) clearInterval(trackerInterval);

  let totalSecondsLeft = 1200; // 20 minutes countdown
  trackerElapsed = 0;

  trackerInterval = setInterval(() => {
    trackerElapsed++;
    totalSecondsLeft--;
    if (totalSecondsLeft < 0) totalSecondsLeft = 0;

    const mins = Math.floor(totalSecondsLeft / 60);
    const secs = totalSecondsLeft % 60;
    if (timerEl) timerEl.innerText = `${mins}:${secs < 10 ? '0' : ''}${secs} Mins`;

    // Dynamic step progression animation
    if (trackerElapsed < 5) {
      stepPlaced?.classList.add("completed");
      stepCooking?.classList.add("active");
      if (mapRider) mapRider.style.left = "25%";
    } else if (trackerElapsed < 12) {
      stepCooking?.classList.add("completed");
      stepOut?.classList.add("active");
      if (mapRider) mapRider.style.left = "55%";
    } else {
      stepOut?.classList.add("completed");
      stepDelivered?.classList.add("completed", "active");
      if (mapRider) mapRider.style.left = "85%";
    }
  }, 1000);
}

// ==========================================
// 16. SUB-PAGES & EVENT LISTENERS
// ==========================================
function setupEventListeners() {
  initVoiceRecorder();
  setupCouponHandlers();

  // Chat Composer Form
  document.getElementById("composerForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("textInput");
    if (!input || !input.value.trim()) return;
    sendChatMessage(input.value.trim());
    input.value = "";
  });

  // Quick Chips
  document.querySelectorAll("#quickChips .chip").forEach(chip => {
    chip.addEventListener("click", () => {
      sendChatMessage(chip.dataset.msg);
    });
  });

  // Chat Menu Browser Toggle
  const menuToggleBtn = document.getElementById("menuToggleBtn");
  const menuBrowser = document.getElementById("menuBrowser");
  if (menuToggleBtn && menuBrowser) {
    menuToggleBtn.addEventListener("click", () => {
      menuBrowser.hidden = !menuBrowser.hidden;
      menuToggleBtn.innerText = menuBrowser.hidden ? "🍽️ Browse Menu" : "✕ Close Menu";
    });
  }

  // Meal tabs inside Chat Menu Browser
  document.querySelectorAll("#mealTabs .meal-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll("#mealTabs .meal-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      renderChatMealBrowser(tab.dataset.meal);
    });
  });

  // Proceed to Payment Button on Checkout Page
  document.getElementById("proceedToPayBtn")?.addEventListener("click", () => {
    if (!currentCart || !currentCart.items || currentCart.items.length === 0) {
      showToast("⚠️ Your cart is empty! Add delicious dishes first.");
      window.location.hash = "#menu";
      return;
    }

    const name = document.getElementById("chkCustName")?.value.trim() || localStorage.getItem("kpr_cust_name") || "Guest Customer";
    const phone = document.getElementById("chkCustPhone")?.value.trim() || localStorage.getItem("kpr_cust_phone") || "+91 98400 12345";
    const addr = document.getElementById("chkCustAddress")?.value.trim() || localStorage.getItem("kpr_cust_address") || "Madurai Main Dining Table";
    const notes = document.getElementById("chkCustNotes")?.value.trim() || "";

    localStorage.setItem("kpr_cust_name", name);
    localStorage.setItem("kpr_cust_phone", phone);
    localStorage.setItem("kpr_cust_address", addr);
    localStorage.setItem("kpr_cust_notes", notes);

    window.location.hash = "#payment";
  });

  // Pre-fill checkout form if saved
  const savedName = localStorage.getItem("kpr_cust_name");
  const savedPhone = localStorage.getItem("kpr_cust_phone");
  const savedAddr = localStorage.getItem("kpr_cust_address");
  if (savedName && document.getElementById("chkCustName")) document.getElementById("chkCustName").value = savedName;
  if (savedPhone && document.getElementById("chkCustPhone")) document.getElementById("chkCustPhone").value = savedPhone;
  if (savedAddr && document.getElementById("chkCustAddress")) document.getElementById("chkCustAddress").value = savedAddr;

  // Table Reservation Form Submission
  document.getElementById("reservationForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const tableId = document.getElementById("selectedTableId")?.value || selectedTableId || "Table 1";
    const name = document.getElementById("resName").value.trim();
    const phone = document.getElementById("resPhone").value.trim();
    const date = document.getElementById("resDate").value;
    const time = document.getElementById("resTime").value;
    const guests = parseInt(document.getElementById("resGuests").value);
    const requests = document.getElementById("resRequests").value.trim();

    const payload = {
      name: name,
      phone: phone,
      date: date,
      time: time,
      guests: guests,
      table_type: tableId,
      special_requests: requests
    };

    let handled = false;
    try {
      const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), 2000) : null;
      const res = await fetch(`${API_BASE}/reservations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller ? controller.signal : undefined,
        body: JSON.stringify(payload)
      });
      if (timeoutId) clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data.status === "success") {
          handled = true;
          const bookingId = data.booking_id || "KPR-TB-8942";
          showBookingConfirmedUI(bookingId, tableId, name, phone, date, time, guests);
        }
      }
    } catch (err) {
      // Backend not running on cloud -> client-side booking fallback
    }

    if (!handled) {
      const mockBookingId = "KPR-TB-" + Math.floor(1000 + Math.random() * 9000);
      showBookingConfirmedUI(mockBookingId, tableId, name, phone, date, time, guests);
    }
  });

function showBookingConfirmedUI(bookingId, tableId, name, phone, date, time, guests) {
  const bookedTable = tableList.find(t => t.id === tableId);
  if (bookedTable) {
    bookedTable.status = "booked";
    renderTableMap();
  }

  const msgBox = document.getElementById("resResultMsg");
  if (msgBox) {
    msgBox.hidden = false;
    msgBox.innerHTML = `
      <div class="booking-confirmed-card">
        <span class="booking-header-badge">✓ Table booked successfully!</span>
        <h3 style="margin:4px 0 10px 0; color:var(--charcoal);">Booking Confirmed for ${name}</h3>
        <div class="booking-details-grid">
          <div class="booking-metric-box">
            <div class="booking-metric-lbl">Booking ID</div>
            <div class="booking-metric-val">${bookingId}</div>
          </div>
          <div class="booking-metric-box">
            <div class="booking-metric-lbl">Table Assigned</div>
            <div class="booking-metric-val">${tableId}</div>
          </div>
          <div class="booking-metric-box">
            <div class="booking-metric-lbl">Date</div>
            <div class="booking-metric-val">${date}</div>
          </div>
          <div class="booking-metric-box">
            <div class="booking-metric-lbl">Time Slot</div>
            <div class="booking-metric-val">${time}</div>
          </div>
          <div class="booking-metric-box">
            <div class="booking-metric-lbl">Guests</div>
            <div class="booking-metric-val">${guests} People</div>
          </div>
        </div>
        <p style="font-size:12px; color:#555; margin-top:12px;">Confirmation SMS sent to ${phone}. We look forward to hosting you!</p>
      </div>
    `;
    msgBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  showToast(`Table booked successfully! Reference: ${bookingId}`);
  if (typeof loadTableReservations === "function") loadTableReservations();
}

  // Dynamic table availability updates on date/time change
  document.getElementById("resDate")?.addEventListener("change", () => {
    loadTableReservations();
  });
  document.getElementById("resTime")?.addEventListener("change", () => {
    loadTableReservations();
  });

  // Settings Page Interactive Controls
  document.querySelectorAll(".lang-pill-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.dataset.lang) setAppLanguage(btn.dataset.lang);
    });
  });

  document.querySelectorAll(".theme-card-option").forEach(card => {
    card.addEventListener("click", () => {
      if (card.dataset.theme) setAppTheme(card.dataset.theme);
    });
  });

  document.querySelectorAll(".accent-swatch").forEach(swatch => {
    swatch.addEventListener("click", () => {
      if (swatch.dataset.accent) setAppAccent(swatch.dataset.accent);
    });
  });

  document.getElementById("settingTtsToggle")?.addEventListener("change", (e) => {
    localStorage.setItem("kpr_setting_tts", e.target.checked ? "true" : "false");
    showToast(e.target.checked ? "🔊 Voice audio responses enabled" : "🔇 Voice audio responses muted");
  });

  document.getElementById("settingNotifyToggle")?.addEventListener("change", (e) => {
    localStorage.setItem("kpr_setting_notify", e.target.checked ? "true" : "false");
    showToast(e.target.checked ? "🔔 Order notifications enabled" : "🔕 Order notifications silenced");
  });

  document.getElementById("settingsResetCartBtn")?.addEventListener("click", () => {
    window.resetCartSession();
  });

  // Catering Form
  document.getElementById("cateringForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      name: document.getElementById("catName").value,
      phone: document.getElementById("catPhone").value,
      event_type: document.getElementById("catEvent").value,
      guest_count: parseInt(document.getElementById("catGuests").value),
      event_date: document.getElementById("catDate").value
    };

    try {
      const res = await fetch(`${API_BASE}/catering/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      const msgBox = document.getElementById("cateringResultMsg");
      if (msgBox) {
        msgBox.hidden = false;
        msgBox.style.color = "var(--banana-leaf)";
        msgBox.innerText = `✅ ${data.message}`;
      }
      showToast("Catering request submitted!");
    } catch (err) {
      showToast("Catering request submitted!");
    }
  });

  // Reviews Form
  document.getElementById("addReviewForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      author: document.getElementById("revAuthor").value,
      rating: parseInt(document.getElementById("revRating").value),
      comment: document.getElementById("revComment").value
    };

    try {
      await fetch(`${API_BASE}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      showToast("Review submitted! Thank you 🙏");
      document.getElementById("revComment").value = "";
      loadReviews();
    } catch (err) {
      showToast("Review submitted!");
    }
  });

  // Live Hotel Bill & In-Page Payment Listeners
  document.getElementById("billPayNowBtn")?.addEventListener("click", () => {
    openAgentPaymentModal();
  });

  document.getElementById("closePaymentModalBtn")?.addEventListener("click", () => {
    closeAgentPaymentModal();
  });

  document.getElementById("succCloseBtn")?.addEventListener("click", () => {
    closeAgentPaymentModal();
  });

  // Modal payment method radio buttons
  document.querySelectorAll('input[name="payMethodChoice"]').forEach(radio => {
    radio.addEventListener("change", (e) => {
      document.querySelectorAll(".method-radio-card").forEach(card => {
        card.classList.toggle("active", card.dataset.method === e.target.value);
      });
    });
  });

  // Modal Submit Payment Button
  document.getElementById("modalSubmitPayBtn")?.addEventListener("click", async () => {
    const btn = document.getElementById("modalSubmitPayBtn");
    const btnText = document.getElementById("modalPayBtnText");
    const selectedMethod = document.querySelector('input[name="payMethodChoice"]:checked')?.value || "UPI";

    if (btn) btn.disabled = true;
    if (btnText) btnText.innerText = "Processing Payment...";

    try {
      const res = await fetch(`${API_BASE}/payment/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          method: selectedMethod
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        currentCart = data.cart;
        updateCartUI(currentCart);
        updateReceiptPanel(currentCart);

        // Show Success UI
        const sumEl = document.getElementById("modalBillSummary");
        if (sumEl) sumEl.style.display = "none";
        const methEl = document.querySelector(".modal-payment-methods");
        if (methEl) methEl.style.display = "none";
        const actEl = document.querySelector(".modal-actions");
        if (actEl) actEl.style.display = "none";

        const succEl = document.getElementById("modalSuccessCard");
        const succAmt = document.getElementById("succAmount");
        const succTxn = document.getElementById("succTxn");
        if (succAmt) succAmt.innerText = `₹${(data.amount_paid || 0).toFixed(2)}`;
        if (succTxn) succTxn.innerText = data.transaction_id || "TXN-KPR";
        if (succEl) succEl.style.display = "flex";

        // Add confirmation message to chat
        const confirmMsg = `✅ **Payment Successful!** Received ₹${data.amount_paid.toFixed(2)} via ${data.payment_method}. Transaction ID: \`${data.transaction_id}\`. Your room booking, dining orders, and hotel services are fully settled! Enjoy your stay at KPR Grand Palace! 🏨✨`;
        appendAgentMessageDOM(confirmMsg);
        chatHistory.push({ sender: "agent", text: confirmMsg, time: _formatCurrentTime() });
        sessionStorage.setItem("kpr_chat_history", JSON.stringify(chatHistory));
        speakAgentResponse(`Payment successful! Received rupees ${Math.round(data.amount_paid)}. Thank you!`);
        showToast("Payment Successful! Bill Paid 🎉");
      } else {
        showToast(`Payment failed: ${data.message || 'Error'}`);
      }
    } catch (err) {
      console.error("Payment error:", err);
      showToast("Payment processing error. Please try again.");
    } finally {
      if (btn) btn.disabled = false;
      if (btnText && currentCart) btnText.innerText = `Pay ₹${(currentCart.total || 0).toFixed(2)} (Demo Payment)`;
    }
  });

  // Reset Chat & Bill Session Button
  document.getElementById("resetChatBtn")?.addEventListener("click", async () => {
    if (!confirm("Are you sure you want to start a fresh chat session and reset your live bill?")) return;
    try {
      await fetch(`${API_BASE}/cart/reset/${sessionId}`, { method: "POST" });
    } catch (e) {}
    
    // Clear chat history
    chatHistory = [];
    sessionStorage.removeItem("kpr_chat_history");
    const scroll = document.getElementById("chatScroll");
    if (scroll) {
      scroll.innerHTML = `
        <div class="msg-row agent">
          <div class="agent-avatar-circle">🏨</div>
          <div class="msg-bubble-wrap">
            <div class="msg-bubble agent-bubble">
              <div class="agent-name-tag">KPR Hotel AI Concierge</div>
              <p>Vanakkam! 🙏 I am your continuous AI Concierge for KPR Grand Palace. I can check room availability &amp; prices, book Deluxe/Premium/Suites, take food &amp; dining orders, request laundry, shuttle or spa services, and manage your live bill. How may I assist you today?</p>
              <div class="msg-timestamp">${_formatCurrentTime()}</div>
            </div>
          </div>
        </div>
      `;
    }
    currentCart = {
      rooms: [],
      items: [],
      services: [],
      payment_status: "UNPAID",
      payment_details: null,
      room_subtotal: 0,
      food_subtotal: 0,
      service_subtotal: 0,
      subtotal: 0,
      tax: 0,
      discount_amount: 0,
      total: 0,
      item_count: 0,
      is_empty: true
    };
    updateCartUI(currentCart);
    updateReceiptPanel(currentCart);
    showToast("Chat session & Live Bill have been reset 🔄");
  });
}

function initSubPages() {
  initPaymentTabs();

  // Mega Menu Toggle
  const megaBtn = document.getElementById("megaBtn");
  const megaMenu = document.getElementById("megaMenu");
  if (megaBtn && megaMenu) {
    megaBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      megaMenu.style.display = megaMenu.style.display === "grid" ? "none" : "grid";
    });
    document.addEventListener("click", () => {
      megaMenu.style.display = "none";
    });
  }
}

// Kitchen Display System
async function loadKitchenOrders() {
  try {
    const res = await fetch(`${API_BASE}/kitchen/orders`);
    const data = await res.json();
    const orders = data.orders || [];

    const pending = document.getElementById("kdsPending");
    const cooking = document.getElementById("kdsCooking");
    const ready = document.getElementById("kdsReady");

    if (pending) pending.innerHTML = orders.filter(o => o.status === "pending").map(renderKdsCard).join("");
    if (cooking) cooking.innerHTML = orders.filter(o => o.status === "cooking").map(renderKdsCard).join("");
    if (ready) ready.innerHTML = orders.filter(o => o.status === "ready").map(renderKdsCard).join("");
  } catch (e) {
    console.error(e);
  }
}

function renderKdsCard(o) {
  return `
    <div class="kds-card">
      <strong>${o.order_id} (${o.table})</strong>
      <div style="font-size:12px; color:#666;">Customer: ${o.customer}</div>
      <ul style="font-size:13px; padding-left:16px; margin:8px 0;">
        ${o.items.map(i => `<li>${i}</li>`).join("")}
      </ul>
      <button type="button" class="add-btn" style="font-size:11px;" onclick="updateOrderStatus('${o.order_id}', 'ready')">Mark Ready</button>
    </div>
  `;
}

window.updateOrderStatus = async function(orderId, nextStatus) {
  await fetch(`${API_BASE}/kitchen/orders/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order_id: orderId, status: nextStatus })
  });
  loadKitchenOrders();
};

// Analytics
async function loadAnalytics() {
  try {
    const res = await fetch(`${API_BASE}/analytics`);
    const data = await res.json();
    document.getElementById("anRev").innerText = `₹${data.today_revenue.toLocaleString()}`;
    document.getElementById("anOrders").innerText = data.total_orders_today;
    document.getElementById("anAccuracy").innerText = data.ai_intent_accuracy;

    const barList = document.getElementById("anTopDishes");
    if (barList) {
      barList.innerHTML = data.popular_dishes.map(d => `
        <div style="margin-bottom:10px;">
          <div style="display:flex; justify-content:space-between; font-size:13px;">
            <span>${d.name}</span>
            <span>${d.orders} orders</span>
          </div>
          <div style="background:#eee; height:8px; border-radius:4px; overflow:hidden; margin-top:4px;">
            <div style="background:var(--clay); width:${(d.orders/80)*100}%; height:100%;"></div>
          </div>
        </div>
      `).join("");
    }
  } catch (e) {}
}

// Reviews
async function loadReviews() {
  try {
    const res = await fetch(`${API_BASE}/reviews`);
    const data = await res.json();
    const container = document.getElementById("reviewsList");
    if (container) {
      container.innerHTML = (data.reviews || []).map(r => `
        <div style="background:#fff; padding:16px; border-radius:8px; margin-bottom:12px; box-shadow:0 2px 8px rgba(0,0,0,0.05);">
          <div style="display:flex; justify-content:space-between;">
            <strong>${r.author}</strong>
            <span>${"⭐".repeat(r.rating)}</span>
          </div>
          <p style="font-size:13px; color:#444; margin:8px 0 0 0;">${r.comment}</p>
        </div>
      `).join("");
    }
  } catch (e) {}
}

// Nutrition Guide
function renderNutrition() {
  const container = document.getElementById("nutritionGrid");
  if (!container) return;
  container.innerHTML = menuData.map(m => `
    <div style="background:var(--cream); padding:16px; border-radius:8px; box-shadow:0 2px 6px rgba(0,0,0,0.08); border:1px solid #ddd;">
      <h3 style="margin:0 0 6px 0;">${m.name_en}</h3>
      <p style="font-size:12px; color:#666;">Dietary: ${m.veg ? 'Pure Veg 🌱' : 'Non-Veg 🍗'} | Spice: ${m.spice_level || 'Medium'}</p>
      <div style="font-size:13px; margin-top:8px;">Estimated Calories: <strong>${m.veg ? '320 kcal' : '540 kcal'}</strong></div>
    </div>
  `).join("");
}

// Menu Admin
function renderMenuAdmin() {
  const tbody = document.getElementById("menuAdminTbody");
  if (!tbody) return;
  tbody.innerHTML = menuData.map(m => `
    <tr>
      <td>${m.id}</td>
      <td><strong>${m.name_en}</strong></td>
      <td>${m.category}</td>
      <td>₹${m.price}</td>
      <td><span style="color:var(--banana-leaf); font-weight:700;">In Stock</span></td>
      <td><button type="button" class="add-btn" style="font-size:11px;" onclick="showToast('Updated stock for ${m.name_en}')">Toggle Stock</button></td>
    </tr>
  `).join("");
}

// ==========================================
// FAVORITES ENGINE & LIVE BADGE
// ==========================================
function updateFavoritesBadge() {
  const favList = window.favorites || favorites;
  const count = favList ? favList.length : 0;
  const badge = document.getElementById("navFavBadge");
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? "inline-flex" : "none";
  }

  const kpiFav = document.getElementById("kpiFavoritesCount");
  if (kpiFav) {
    kpiFav.textContent = `${count} Saved`;
  }
}

function renderFavorites() {
  const container = document.getElementById("favoritesGrid");
  if (!container) return;
  updateFavoritesBadge();

  const allItems = (window.menuData && window.menuData.length) ? window.menuData : menuData;
  const favList = window.favorites || favorites;
  const favItems = allItems.filter(m => favList.includes(m.id));
  if (favItems.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 48px 24px; background: rgba(43, 27, 20, 0.45); border-radius: 16px; border: 1px dashed rgba(227, 164, 38, 0.35);">
        <div style="font-size: 48px; margin-bottom: 12px;">❤️</div>
        <h3 style="font-family: 'Fraunces', serif; color: var(--cream); font-size: 24px; margin: 0 0 8px 0;">No Saved Favorites Yet</h3>
        <p style="color: var(--turmeric-soft); font-size: 14px; max-width: 440px; margin: 0 auto 20px auto;">Click the ❤️ button on any dish in our full menu catalog to save your go-to authentic dishes here for quick 1-click re-ordering!</p>
        <a href="#menu" class="btn-primary" style="display: inline-block;">🍽️ Explore Full Menu</a>
      </div>
    `;
    return;
  }

  const isTamil = currentSpeechLang === "ta-IN";
  container.innerHTML = favItems.map(item => `
    <div class="dish-card">
      <div class="dish-img-box">
        <img src="${item.image}" alt="${item.name_en}" onerror="this.onerror=null; this.src='assets/dishes/bir-001.jpg'" />
        <span class="${item.veg ? 'dish-badge-veg' : 'dish-badge-nonveg'}">
          ${item.veg ? '🌱 VEG' : '🍗 NON-VEG'}
        </span>
      </div>
      <div class="dish-info">
        <h3 class="dish-title">${isTamil && item.name_ta ? item.name_ta : item.name_en}</h3>
        <p class="dish-desc">${item.description_en}</p>
        <div class="dish-foot">
          <span class="dish-price">₹${item.price}</span>
          <div style="display:flex; gap:6px;">
            <button type="button" class="add-btn" style="background:#C1442D;" title="Remove from favorites" onclick="window.toggleFav('${item.id}')">❤️ Remove</button>
            <button type="button" class="add-btn" onclick="window.addToCart('${item.id}', 1, this)">+ Add</button>
          </div>
        </div>
      </div>
    </div>
  `).join("");
}

window.toggleFav = function(dishId) {
  let favList = window.favorites || favorites || [];
  if (favList.includes(dishId)) {
    favList = favList.filter(id => id !== dishId);
    showToast("Removed from favorites");
  } else {
    favList.push(dishId);
    showToast("Saved to favorites! ❤️");
  }
  favorites = favList;
  window.favorites = favList;
  localStorage.setItem("kpr_favorites", JSON.stringify(favorites));
  updateFavoritesBadge();

  const currentHash = window.location.hash.replace("#", "");
  if (currentHash === "favorites") {
    renderFavorites();
  }
  if (menuData && menuData.length) {
    renderFullMenu(menuData);
  }
};

// Toast Notifications
let toastTimeout = null;
function showToast(msg) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  if (toastTimeout) clearTimeout(toastTimeout);
  toast.innerText = msg;
  toast.className = "toast show";
  toastTimeout = setTimeout(() => {
    toast.className = "toast";
  }, 2800);
}
