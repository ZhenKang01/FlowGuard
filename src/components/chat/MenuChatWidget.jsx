import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';

const SUPPORT_EMAIL = "support@flowguard.com";

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
      "Payment plan",
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
  "Export reports": "You can export reports from the dashboard by clicking the Generate Report button. This allows you to save or share water usage and maintenance data.",
  "Water leak": "If a water leak is detected, check the leak alert details on your dashboard and arrange maintenance as soon as possible.",
  "Sensor issue": "If a sensor is not working, check whether it is connected and active. If the problem continues, contact email support.",
  "Sanitation supply issue": "You can check sanitation supply levels from the dashboard. If supplies are low, inform the person in charge of restocking or contact support.",
  "Maintenance request": "For maintenance issues, please email customer support with your property name, location, and a short description of the problem.",
  "Payment plan": "You can view your current payment plan under Account Settings or Subscription Settings.",
  "Payment issue": "For payment issues, please contact email support with your account email and payment details. Do not include sensitive card information.",
  "Upgrade plan": "To upgrade your plan, go to Account Settings and select Subscription Options.",
  "Email support": `Please email our customer service team at ${SUPPORT_EMAIL}. Include your name, account email, issue category, and a short description of the problem.`
};

const keywordMap = [
  { keywords: ["forgot", "password", "reset"], option: "Forgot password" },
  { keywords: ["cannot log", "can't log", "login", "sign in"], option: "Cannot log in" },
  { keywords: ["create account", "sign up", "register"], option: "Create new account" },
  { keywords: ["water usage", "usage", "consumption"], option: "View water usage" },
  { keywords: ["alert", "notification", "warning"], option: "Understand alerts" },
  { keywords: ["export", "report", "download", "generate"], option: "Export reports" },
  { keywords: ["leak", "leaking", "water leak"], option: "Water leak" },
  { keywords: ["sensor", "device"], option: "Sensor issue" },
  { keywords: ["sanitation", "supply", "soap", "toilet paper"], option: "Sanitation supply issue" },
  { keywords: ["maintenance", "repair", "broken", "fix"], option: "Maintenance request" },
  { keywords: ["plan", "subscription", "payment plan"], option: "Payment plan" },
  { keywords: ["payment", "billing", "invoice", "card", "pay"], option: "Payment issue" },
  { keywords: ["upgrade"], option: "Upgrade plan" },
  { keywords: ["email", "support", "customer service", "contact", "help"], option: "Email support" }
];

function findMatchingOption(userText) {
  const message = userText.toLowerCase();
  for (const item of keywordMap) {
    if (item.keywords.some(keyword => message.includes(keyword))) {
      return item.option;
    }
  }
  return null;
}

export default function MenuChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize with main menu
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        role: 'bot',
        text: chatbotMenus.mainMenu.message,
        options: chatbotMenus.mainMenu.options
      }]);
    }
  }, [messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const addBotMessage = (text, options = []) => {
    setMessages(prev => [...prev, { role: 'bot', text, options }]);
  };

  const addUserMessage = (text) => {
    setMessages(prev => [...prev, { role: 'user', text }]);
  };

  const showFallback = () => {
    addBotMessage(
      "Sorry, I'm not able to answer that right now. Please contact our customer service team through email support for further assistance.",
      ["Email support", "Back to Main Menu"]
    );
  };

  const showMenu = (menuName) => {
    const menu = chatbotMenus[menuName];
    if (!menu) {
      showFallback();
      return;
    }
    addBotMessage(menu.message, menu.options);
  };

  const handleOptionClick = (option) => {
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
      addBotMessage(chatbotResponses[option], ["Back to Main Menu", "Email support"]);
      return;
    }
    showFallback();
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;

    addUserMessage(text);
    setInput('');

    const matchedOption = findMatchingOption(text);
    if (matchedOption) {
      if (chatbotResponses[matchedOption]) {
        addBotMessage(chatbotResponses[matchedOption], ["Back to Main Menu", "Email support"]);
      } else if (chatbotMenus[matchedOption]) {
        showMenu(matchedOption);
      } else {
        showFallback();
      }
    } else {
      showFallback();
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {open && (
        <div
          className="fixed bottom-20 right-4 z-50 w-80 sm:w-96 flex flex-col rounded-2xl shadow-2xl border border-slate-200 bg-white overflow-hidden"
          style={{ height: '520px' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white shrink-0">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              <span className="font-semibold text-sm">Customer Support</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="hover:bg-white/20 rounded-full p-1 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4 bg-slate-50">
            {messages.map((msg, i) => {
              const isUser = msg.role === 'user';
              return (
                <div key={i} className="space-y-3">
                  <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${isUser ? 'bg-blue-600' : 'bg-slate-200'}`}>
                      {isUser ? <User className="w-3.5 h-3.5 text-white" /> : <Bot className="w-3.5 h-3.5 text-slate-600" />}
                    </div>
                    <div className={`max-w-[85%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
                      <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                        isUser
                          ? 'bg-blue-600 text-white rounded-tr-sm'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  </div>
                  
                  {/* Options */}
                  {!isUser && msg.options && msg.options.length > 0 && (
                    <div className="flex flex-wrap gap-2 pl-8">
                      {msg.options.map((opt, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleOptionClick(opt)}
                          className="border border-blue-600 bg-white text-blue-600 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex items-end gap-2 px-3 py-3 border-t border-slate-100 bg-white shrink-0">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type your question..."
              className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent leading-snug max-h-24 overflow-y-auto"
              style={{ minHeight: '38px' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="shrink-0 w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-4 right-4 z-50 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 ${
          open ? 'bg-slate-700 hover:bg-slate-800' : 'bg-blue-600 hover:bg-blue-700 hover:scale-105'
        }`}
        style={{ width: '60px', height: '60px' }}
      >
        {open ? <X className="w-6 h-6 text-white" /> : <MessageCircle className="w-6 h-6 text-white" />}
      </button>
    </>
  );
}
