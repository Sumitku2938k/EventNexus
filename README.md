# 🎓 EventNexus – College Event Management System

EventNexus is a full-stack web application designed to simplify college event management.  
It provides a centralized platform for **students** to explore and register for events,  
and for **admins** to create, update, and manage event details with ease.

---

## 🚀 Features

- 👨‍🎓 Student Dashboard – View, register, and manage events  
- 👩‍💼 Admin Panel – Create, edit, and delete events  
- 📅 Event Categories – Technical, Cultural, and Sports  
- 📩 Email Notifications – Confirmation & reminders (via Nodemailer)  
- 📊 Dashboard Analytics (Future Scope)  
- 🔐 Secure Authentication (Planned for next version)

---

## 🛠️ Tech Stack

| Layer | Technology |
|--------|-------------|
| Frontend | HTML, CSS, JavaScript, EJS Templates |
| Backend | Node.js, Express.js |
| Database | MongoDB with Mongoose |
| Styling | Bootstrap 5 |
| Templating Engine | EJS + ejs-mate Layouts |
| Middleware | express-session, method-override |
| Deployment (optional) | Render / Railway |
| Email Service | Nodemailer (for future use) |

---

## 📁 Folder Structure

```
College Event Manager
├─ app.js
├─ init
│  ├─ data.js
│  └─ index.js
├─ models
│  └─ events.js
├─ package-lock.json
├─ package.json
├─ public
│  └─ css
│     └─ style.css
├─ README.md
└─ views
   ├─ events
   │  ├─ edit.ejs
   │  ├─ index.ejs
   │  ├─ new.ejs
   │  └─ show.ejs
   ├─ home.ejs
   └─ layouts
      └─ boilerplate.ejs

```

---

## ⚙️ Installation and Setup (Local Machine)

Follow these steps to run the project locally 👇

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/your-username/EventNexus.git
cd EventNexus
```

### 2️⃣ Install Dependencies
```bash
npm install
```

### 3️⃣ (Optional) Seed the Database with Dummy Events
```bash
node init/index.js
```

### 4️⃣ Start the Server
```bash
npm start
```

# OR for development
```bash
npm run dev
```

### 5️⃣ Open in Browser
```bash
http://localhost:3000/
```

## 🧠 How It Works

- **Admin** can create, edit, and delete events.

- **Students** can browse and register for events.

- All data is stored securely in **MongoDB**.

- Frontend dynamically renders using **EJS templates**.

## 📸 Screenshots (Add later)

- Home Page

- Event List

- Event Details Page

- Create Event Form

##  🔮 Future Enhancements

- User Authentication (JWT / Sessions)

- Student Event Registration System

- Admin Analytics Dashboard with Chart.js

- Email Notifications via Nodemailer

- QR-based Check-in System

- Payment Integration for Paid Events

## 🧑‍💻 Author

Sumit Kumar
B.Tech CSE Student – College Event Management Project
📧 sumitku2938k@gmail.com

## 📜 License

This project is open-source and available under the MIT License.
