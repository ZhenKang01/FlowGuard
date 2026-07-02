Menu-Based Website Chatbot
==========================

Files included:
1. chatbot.css
2. chatbot.js
3. chatbot-snippet.html

How to add this chatbot to your existing website:

1. Copy chatbot.css into your website folder.
2. Copy chatbot.js into your website folder.
3. Open your main HTML file. This is usually index.html.
4. Add this line inside the <head> section:

   <link rel="stylesheet" href="chatbot.css">

5. Add this line before the closing </body> tag:

   <script src="chatbot.js"></script>

6. In chatbot.js, replace this line:

   const SUPPORT_EMAIL = "support@example.com";

   with your actual support email.

What this chatbot does:
- Uses a multiple-choice menu first.
- Includes Account/Login Issues, Dashboard Help, Report a Problem, Billing/Subscription, and Contact Customer Service.
- Contact Customer Service only shows Email Support.
- If the chatbot does not understand a typed question, it recommends Email Support instead of live chat or creating a ticket.

Main menu structure:

Main Menu
├── Account / Login Issues
│   ├── Forgot password
│   ├── Cannot log in
│   ├── Create new account
│   └── Email support
│
├── Dashboard Help
│   ├── View water usage
│   ├── Understand alerts
│   ├── Export reports
│   └── Email support
│
├── Report a Problem
│   ├── Water leak
│   ├── Sensor issue
│   ├── Sanitation supply issue
│   ├── Maintenance request
│   └── Email support
│
├── Billing / Subscription
│   ├── View plan
│   ├── Payment issue
│   ├── Upgrade plan
│   └── Email support
│
└── Contact Customer Service
    └── Email support
