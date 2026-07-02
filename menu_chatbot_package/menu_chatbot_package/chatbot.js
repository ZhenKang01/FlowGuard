// Menu-Based Customer Support Chatbot
// Replace support@example.com with your actual support email.

const SUPPORT_EMAIL = "support@example.com";

const chatbotMenus = {
  mainMenu: {
    message: "Hi! How can I help you today? Please choose one of the options below.",
    options: [
      "Account / Login Issues",
      "Dashboard Help",
      "Report a Problem",
      "Billing / Subscription",
      "Contact Customer Service"
    ]
  },

  "Account / Login Issues": {
    message: "What account issue are you facing?",
    options: [
      "Forgot password",
      "Cannot log in",
      "Create new account",
      "Email support",
      "Back to Main Menu"
    ]
  },

  "Dashboard Help": {
    message: "What do you need help with on the dashboard?",
    options: [
      "View water usage",
      "Understand alerts",
      "Export reports",
      "Email support",
      "Back to Main Menu"
    ]
  },

  "Report a Problem": {
    message: "What problem would you like to report?",
    options: [
      "Water leak",
      "Sensor issue",
      "Sanitation supply issue",
      "Maintenance request",
      "Email support",
      "Back to Main Menu"
    ]
  },

  "Billing / Subscription": {
    message: "What billing issue do you need help with?",
    options: [
      "View plan",
      "Payment issue",
      "Upgrade plan",
      "Email support",
      "Back to Main Menu"
    ]
  },

  "Contact Customer Service": {
    message: "You can contact our customer service team through email support.",
    options: [
      "Email support",
      "Back to Main Menu"
    ]
  }
};

const chatbotResponses = {
  "Forgot password": "You can reset your password by clicking the 'Forgot Password' link on the login page. Follow the instructions sent to your registered email address.",
  "Cannot log in": "Please check that your email and password are correct. If the issue continues, use email support for further assistance.",
  "Create new account": "Click the 'Sign Up' button on the login page and fill in the required details. Only provide the information needed to create your account.",

  "View water usage": "You can view water usage from the dashboard under the Water Usage section. This shows consumption trends and helps identify unusual usage.",
  "Understand alerts": "Alerts notify you about unusual water usage, possible leaks, sensor issues, or low sanitation supply levels.",
  "Export reports": "You can export reports from the dashboard by clicking the Export button. This allows you to save or share water usage and maintenance data.",

  "Water leak": "If a water leak is detected, check the leak alert details on your dashboard and arrange maintenance as soon as possible.",
  "Sensor issue": "If a sensor is not working, check whether it is connected and active. If the problem continues, contact email support.",
  "Sanitation supply issue": "You can check sanitation supply levels from the dashboard. If supplies are low, inform the person in charge of restocking or contact support.",
  "Maintenance request": "For maintenance issues, please email customer support with your property name, location, and a short description of the problem.",

  "View plan": "You can view your current subscription plan under Account Settings or Subscription Settings.",
  "Payment issue": "For payment issues, please contact email support with your account email and payment details. Do not include sensitive card information.",
  "Upgrade plan": "To upgrade your plan, go to Account Settings and select Subscription Options.",

  "Email support": `Please email our customer service team at ${SUPPORT_EMAIL}. Include your name, account email, issue category, and a short description of the problem.`
};

function createChatbot() {
  const chatbotHTML = `
    <button class="chatbot-toggle" id="chatbotToggle" aria-label="Open chatbot">💬</button>

    <div class="chatbot-window" id="chatbotWindow">
      <div class="chatbot-header">
        <h3>Customer Support</h3>
        <button class="chatbot-close" id="chatbotClose" aria-label="Close chatbot">×</button>
      </div>

      <div class="chatbot-messages" id="chatbotMessages"></div>

      <div class="chatbot-options" id="chatbotOptions"></div>

      <div class="chatbot-input-area">
        <input type="text" id="chatbotInput" placeholder="Type your question..." />
        <button id="chatbotSend">Send</button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", chatbotHTML);

  document.getElementById("chatbotToggle").addEventListener("click", toggleChatbot);
  document.getElementById("chatbotClose").addEventListener("click", toggleChatbot);
  document.getElementById("chatbotSend").addEventListener("click", handleTypedMessage);
  document.getElementById("chatbotInput").addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      handleTypedMessage();
    }
  });

  showMenu("mainMenu");
}

function toggleChatbot() {
  document.getElementById("chatbotWindow").classList.toggle("open");
}

function addMessage(text, sender) {
  const messages = document.getElementById("chatbotMessages");
  const message = document.createElement("div");
  message.className = `chat-message ${sender}-message`;
  message.textContent = text;
  messages.appendChild(message);
  messages.scrollTop = messages.scrollHeight;
}

function addBotMessage(text) {
  addMessage(text, "bot");
}

function addUserMessage(text) {
  addMessage(text, "user");
}

function showButtons(options) {
  const optionsContainer = document.getElementById("chatbotOptions");
  optionsContainer.innerHTML = "";

  options.forEach(function (option) {
    const button = document.createElement("button");
    button.textContent = option;
    button.addEventListener("click", function () {
      handleChatOption(option);
    });
    optionsContainer.appendChild(button);
  });
}

function showMenu(menuName) {
  const menu = chatbotMenus[menuName];
  if (!menu) {
    showFallback();
    return;
  }

  addBotMessage(menu.message);
  showButtons(menu.options);
}

function handleChatOption(option) {
  addUserMessage(option);

  if (option === "Back to Main Menu") {
    showMenu("mainMenu");
    return;
  }

  if (chatbotMenus[option]) {
    showMenu(option);
    return;
  }

  if (chatbotResponses[option]) {
    addBotMessage(chatbotResponses[option]);
    showButtons(["Back to Main Menu", "Email support"]);
    return;
  }

  showFallback();
}

function handleTypedMessage() {
  const input = document.getElementById("chatbotInput");
  const userText = input.value.trim();

  if (userText === "") {
    return;
  }

  addUserMessage(userText);
  input.value = "";

  const matchedOption = findMatchingOption(userText);

  if (matchedOption) {
    if (chatbotResponses[matchedOption]) {
      addBotMessage(chatbotResponses[matchedOption]);
      showButtons(["Back to Main Menu", "Email support"]);
    } else if (chatbotMenus[matchedOption]) {
      showMenu(matchedOption);
    } else {
      showFallback();
    }
  } else {
    showFallback();
  }
}

function findMatchingOption(userText) {
  const message = userText.toLowerCase();

  const keywordMap = [
    { keywords: ["forgot", "password", "reset"], option: "Forgot password" },
    { keywords: ["cannot log", "can't log", "login", "sign in"], option: "Cannot log in" },
    { keywords: ["create account", "sign up", "register"], option: "Create new account" },
    { keywords: ["water usage", "usage", "consumption"], option: "View water usage" },
    { keywords: ["alert", "notification", "warning"], option: "Understand alerts" },
    { keywords: ["export", "report", "download"], option: "Export reports" },
    { keywords: ["leak", "leaking", "water leak"], option: "Water leak" },
    { keywords: ["sensor", "device"], option: "Sensor issue" },
    { keywords: ["sanitation", "supply", "soap", "toilet paper"], option: "Sanitation supply issue" },
    { keywords: ["maintenance", "repair", "broken"], option: "Maintenance request" },
    { keywords: ["plan", "subscription"], option: "View plan" },
    { keywords: ["payment", "billing", "invoice"], option: "Payment issue" },
    { keywords: ["upgrade"], option: "Upgrade plan" },
    { keywords: ["email", "support", "customer service", "contact"], option: "Email support" }
  ];

  for (const item of keywordMap) {
    if (item.keywords.some(keyword => message.includes(keyword))) {
      return item.option;
    }
  }

  return null;
}

function showFallback() {
  addBotMessage("Sorry, I’m not able to answer that right now. Please contact our customer service team through email support for further assistance.");
  showButtons(["Email support", "Back to Main Menu"]);
}

document.addEventListener("DOMContentLoaded", createChatbot);
