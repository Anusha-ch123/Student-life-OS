require("node:dns").setServers(["8.8.8.8", "1.1.1.1"]);
const express = require('express');
const mongoose = require('mongoose');
const app = express();

app.use(express.urlencoded({ extended: true }));

// 🔗 MongoDB Connection
mongoose.connect('mongodb+srv://anushachilka6020_db_user:BFFbjzeyWARZAmqs@cluster0.ozeif94.mongodb.net/StudentDB')
    .then(() => {
        console.log("✅ MongoDB Connected Successfully");
        app.listen(5000, () => console.log("🚀 Server running at: http://localhost:5000"));
    })
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

// 📝 Database Models
const User = mongoose.model("User", new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String }, 
    role: { type: String, default: "student" },
    isRegistered: { type: Boolean, default: false }
}));

const Academic = mongoose.model("Academic", new mongoose.Schema({ 
    userId: String, 
    courseCode: String, 
    courseName: String, 
    credits: Number, 
    marks: Number, 
    grade: String,
    gradePoint: Number 
}));

const Expense = mongoose.model("Expense", new mongoose.Schema({ userId: String, amount: Number, category: String }));
const Skill = mongoose.model("Skill", new mongoose.Schema({ userId: String, skill: String, completed: { type: Boolean, default: false } }));
const Work = mongoose.model("Work", new mongoose.Schema({ userId: String, courseCode: String, courseName: String, workType: String, deadline: Date }));

let currentUser = null;

// 🎨 UI Layout Helper
const layout = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Student Portal</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
        :root { --primary: #4361ee; --secondary: #3f37c9; --bg: #f8f9fc; --text-main: #2b2d42; --text-light: #8d99ae; --white: #ffffff; --shadow: 0 10px 25px rgba(0,0,0,0.05); --danger: #ef233c; }
        body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text-main); margin: 0; padding: 0; display: flex; flex-direction: column; align-items: center; }
        .navbar { background: var(--white); padding: 18px; width: 100%; display: flex; justify-content: center; gap: 30px; position: sticky; top: 0; z-index: 1000; box-shadow: 0 2px 10px rgba(0,0,0,0.03); }
        .navbar a { color: var(--text-light); text-decoration: none; font-weight: 500; font-size: 14px; text-transform: uppercase; }
        .navbar a:hover { color: var(--primary); }
        .container { margin-top: 40px; width: 90%; max-width: 1000px; padding-bottom: 50px; }
        .content-card { background: var(--white); padding: 40px; border-radius: 16px; box-shadow: var(--shadow); margin-bottom: 30px; text-align: center; }
        .dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; width: 100%; }
        .info-card { background: var(--white); padding: 25px; border-radius: 16px; text-decoration: none; color: inherit; box-shadow: var(--shadow); transition: 0.3s; border: 1px solid rgba(0,0,0,0.02); }
        .info-card:hover { transform: translateY(-8px); border-color: var(--primary); }
        input, select { padding: 12px 16px; margin: 10px 5px; border-radius: 8px; border: 1px solid #e0e0e0; font-family: inherit; }
        button { background: var(--primary); color: white; padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; }
        table { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 25px; }
        th, td { padding: 16px; text-align: left; border-bottom: 1px solid #f0f0f0; }
        .cgpa-badge { background: var(--primary); color: white; padding: 20px; border-radius: 12px; display: inline-block; margin-bottom: 20px; }
        .delete-btn { color: var(--danger); text-decoration: none; font-weight: 600; }
    </style>
</head>
<body>
    <nav class="navbar">
        ${currentUser ? `<a href="/dashboard">Dashboard</a><a href="/academic">Academics</a><a href="/expenses">Expenses</a><a href="/skills">Skills</a><a href="/works">Works</a><a href="/logout" style="color: var(--danger);">Logout</a>` : `<a href="/">Login</a><a href="/register">Register</a>`}
    </nav>
    <div class="container">${content}</div>
</body>
</html>
`;

// --- AUTH ---
app.get('/', (req, res) => {
    if (currentUser) return res.redirect('/dashboard');
    res.send(layout(`<div class="content-card" style="max-width:400px; margin:auto;"><h2>Login</h2><form action="/login" method="POST"><input name="email" type="email" placeholder="Email" required style="width:85%"><br><input name="password" type="password" placeholder="Password" required style="width:85%"><br><button type="submit" style="width:90%; margin-top:20px;">Login</button></form></div>`));
});

app.get('/register', (req, res) => {
    res.send(layout(`<div class="content-card" style="max-width:400px; margin:auto;"><h2>Register</h2><p style="font-size:12px; color:gray;">Create a new student account</p><form action="/register" method="POST"><input name="email" type="email" placeholder="Email" required style="width:85%"><br><input name="password" type="password" placeholder="Password" required style="width:85%"><br><button type="submit" style="width:90%; margin-top:20px;">Register Account</button></form></div>`));
});

app.post('/register', async (req, res) => {
    const email = req.body.email.toLowerCase().trim();
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser && !existingUser.isRegistered) {
            existingUser.password = req.body.password;
            existingUser.isRegistered = true;
            await existingUser.save();
            return res.send("<script>alert('Account activated successfully!'); window.location='/';</script>");
        }
        if (existingUser && existingUser.isRegistered) {
            return res.send("<script>alert('Account already exists with this email.'); window.location='/';</script>");
        }
        await User.create({ email, password: req.body.password, role: "student", isRegistered: true });
        res.send("<script>alert('Registration successful! Please login.'); window.location='/';</script>");
    } catch (err) {
        res.send("<script>alert('Error creating account.'); window.location='/register';</script>");
    }
});

app.post('/login', async (req, res) => {
    const email = req.body.email.toLowerCase().trim();
    const user = await User.findOne({ email, password: req.body.password });
    if (user) { 
        currentUser = user; 
        res.redirect('/dashboard'); 
    } else { 
        res.send("<script>alert('Invalid Credentials'); window.location='/';</script>"); 
    }
});

app.get('/logout', (req, res) => { currentUser = null; res.redirect('/'); });

// --- DASHBOARD ---
app.get('/dashboard', async (req, res) => {
    if (!currentUser) return res.redirect('/');
    const adminLink = currentUser.role === 'admin' ? `<a href="/admin-panel" class="info-card" style="border:1px solid red"><h3>🛠️ Admin Panel</h3><p>Manage users.</p></a>` : "";
    res.send(layout(`<div style="text-align:center;"><h1>Student Life OS</h1><p>Logged in as: <b>${currentUser.email}</b> (${currentUser.role})</p></div><div class="dashboard-grid"><a href="/academic" class="info-card"><h3>📚 Academics</h3><p>Grades & CGPA</p></a><a href="/expenses" class="info-card"><h3>💰 Expenses</h3><p>Tracker</p></a><a href="/skills" class="info-card"><h3>🚀 Skills</h3><p>Learning</p></a><a href="/works" class="info-card"><h3>📝 Works</h3><p>Deadlines</p></a>${adminLink}</div>`));
});

// --- ACADEMICS ---
app.get('/academic', async (req, res) => {
    if (!currentUser) return res.redirect('/');
    const data = await Academic.find({ userId: currentUser._id });
    let totalWP = 0, totalCr = 0;
    data.forEach(c => { totalWP += (c.gradePoint * c.credits); totalCr += c.credits; });
    const cgpa = totalCr > 0 ? (totalWP / totalCr).toFixed(2) : "0.00";
    const rows = data.map(d => `<tr><td>${d.courseCode}</td><td>${d.courseName}</td><td>${d.credits}</td><td>${d.marks}</td><td>${d.grade}</td><td><a href="/academic/delete/${d._id}" class="delete-btn">Delete</a></td></tr>`).join('');
    res.send(layout(`<div class="content-card"><div class="cgpa-badge"><small>CGPA</small><h1>${cgpa}</h1></div><form action="/academic/add" method="POST"><input name="code" placeholder="Code" required style="width:100px"><input name="name" placeholder="Course Name" required><input name="credits" type="number" placeholder="Credits" required style="width:80px"><input name="marks" type="number" placeholder="Marks" required style="width:80px"><button>Add Course</button></form><table><thead><tr><th>Code</th><th>Course</th><th>Credits</th><th>Marks</th><th>Grade</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table></div>`));
});

app.post('/academic/add', async (req, res) => {
    const m = Number(req.body.marks);
    let g, gp;
    if (m >= 90) { g = "S"; gp = 10; } else if (m >= 80) { g = "A"; gp = 9; } else if (m >= 70) { g = "B"; gp = 8; } else if (m >= 60) { g = "C"; gp = 7; } else if (m >= 50) { g = "D"; gp = 6; } else { g = "F"; gp = 0; }
    await Academic.create({ userId: currentUser._id, courseCode: req.body.code, courseName: req.body.name, credits: Number(req.body.credits), marks: m, grade: g, gradePoint: gp });
    res.redirect('/academic');
});

app.get('/academic/delete/:id', async (req, res) => { await Academic.findByIdAndDelete(req.params.id); res.redirect('/academic'); });

// --- EXPENSES ---
app.get('/expenses', async (req, res) => {
    if (!currentUser) return res.redirect('/');
    const data = await Expense.find({ userId: currentUser._id });
    const rows = data.map(e => `<tr><td>₹${e.amount}</td><td>${e.category}</td><td><a href="/expenses/delete/${e._id}" class="delete-btn">Delete</a></td></tr>`).join('');
    res.send(layout(`<div class="content-card"><h2>Expenses</h2><form action="/expenses/add" method="POST"><input name="amount" type="number" placeholder="Amount"><input name="category" placeholder="Category"><button>Add</button></form><table><thead><tr><th>Amount</th><th>Category</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table></div>`));
});

app.post('/expenses/add', async (req, res) => { await Expense.create({ userId: currentUser._id, amount: req.body.amount, category: req.body.category }); res.redirect('/expenses'); });
app.get('/expenses/delete/:id', async (req, res) => { await Expense.findByIdAndDelete(req.params.id); res.redirect('/expenses'); });

// --- SKILLS ---
app.get('/skills', async (req, res) => {
    if (!currentUser) return res.redirect('/');
    const data = await Skill.find({ userId: currentUser._id });
    const items = data.map(s => `<div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee;"><span><input type="checkbox" ${s.completed ? 'checked' : ''} onchange="window.location.href='/skills/toggle/${s._id}'"> ${s.skill}</span><a href="/skills/delete/${s._id}" class="delete-btn">Remove</a></div>`).join('');
    res.send(layout(`<div class="content-card"><h2>Skills</h2><form action="/skills/add" method="POST"><input name="skill" placeholder="Skill Name"><button>Add</button></form><div style="text-align:left; margin-top:20px;">${items}</div></div>`));
});

app.post('/skills/add', async (req, res) => { await Skill.create({ userId: currentUser._id, skill: req.body.skill }); res.redirect('/skills'); });
app.get('/skills/toggle/:id', async (req, res) => { const s = await Skill.findById(req.params.id); s.completed = !s.completed; await s.save(); res.redirect('/skills'); });
app.get('/skills/delete/:id', async (req, res) => { await Skill.findByIdAndDelete(req.params.id); res.redirect('/skills'); });

// --- WORKS (Displays Course Name) ---
app.get('/works', async (req, res) => {
    if (!currentUser) return res.redirect('/');
    const data = await Work.find({ userId: currentUser._id }).sort({ deadline: 1 });
    const rows = data.map(w => `<tr><td>${w.courseCode}</td><td>${w.courseName || 'N/A'}</td><td>${w.workType}</td><td>${new Date(w.deadline).toLocaleString()}</td><td><a href="/works/delete/${w._id}" class="delete-btn">Clear</a></td></tr>`).join('');
    
    // Calculate current time for the 'min' attribute
    const now = new Date().toISOString().slice(0, 16);

    res.send(layout(`<div class="content-card"><h2>Deadlines</h2>
        <form action="/works/add" method="POST">
        <input name="code" placeholder="Code">
        <input name="name" placeholder="Course Name">
        <input name="type" placeholder="Task">
        <input name="deadline" type="datetime-local" min="${now}" required>
        <button>Add</button></form><table><thead><tr>
        <th>Code</th>
        <th>Course Name</th>
        <th>Task</th>
        <th>Deadline</th>
        <th>Action</th>
        </tr></thead>
        <tbody>${rows}</tbody></table></div>`));
});

app.post('/works/add', async (req, res) => { 
    const selectedDate = new Date(req.body.deadline);
    const today = new Date();
    
    // Buffer check: compare timestamps
    if (selectedDate < today) {
        return res.send("<script>alert('Please select a current or future date for the deadline.'); window.location='/works';</script>");
    }

    await Work.create({ userId: currentUser._id, courseCode: req.body.code, courseName: req.body.name, workType: req.body.type, deadline: req.body.deadline }); 
    res.redirect('/works'); 
});

app.get('/works/delete/:id', async (req, res) => { await Work.findByIdAndDelete(req.params.id); res.redirect('/works'); });

// --- ADMIN PANEL ---
app.get('/admin-panel', async (req, res) => {
    if (!currentUser || currentUser.role !== "admin") return res.redirect('/dashboard');
    const users = await User.find();
    const rows = users.map(u => `<tr><td>${u.email}</td><td>${u.isRegistered ? 'Registered' : 'Invited'}</td><td>${u.role}</td></tr>`).join('');
    res.send(layout(`<div class="content-card"><h2>Admin Console</h2><form action="/admin/add" method="POST"><input name="email" type="email" placeholder="Email"><select name="role"><option value="student">Student</option><option value="admin">Admin</option></select><button>Add User</button></form><table><thead><tr><th>Email</th><th>Status</th><th>Role</th></tr></thead><tbody>${rows}</tbody></table></div>`));
});

app.post('/admin/add', async (req, res) => {
    if (!currentUser || currentUser.role !== 'admin') return res.redirect('/');
    try {
        await User.create({ email: req.body.email.toLowerCase().trim(), role: req.body.role, isRegistered: false });
        res.redirect('/admin-panel');
    } catch (e) { res.send("User already exists."); }
});