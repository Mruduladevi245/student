require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');

// Connect to MongoDB before the server starts accepting traffic
connectDB();

const app = express();

// --- Global Middleware ---
app.use(cors());               // allow cross-origin requests (e.g. from a frontend on another port)
app.use(express.json());       // parse incoming JSON request bodies
app.use(express.urlencoded({ extended: true }));

// --- Health check ---
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Student Task Management API is running',
  });
});

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

// --- Error Handling (must be last) ---
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
