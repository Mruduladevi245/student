const Task = require('../models/Task');
const {
  validateTaskInput,
  validateStatusInput,
} = require('../utils/validators');

// @route   POST /api/tasks
// @access  Private
const createTask = async (req, res, next) => {
  try {
    const { taskTitle, description, dueDate, status } = req.body;

    const errors = validateTaskInput({ taskTitle, dueDate });
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(', ') });
    }

    const task = await Task.create({
      userId: req.user._id, // comes from the `protect` middleware
      taskTitle,
      description,
      dueDate,
      status: status || 'Pending',
    });

    res.status(201).json({ success: true, message: 'Task created', data: task });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/tasks
// @access  Private
// Supports optional ?status=Pending|Completed filter and pagination via ?page & ?limit
const getTasks = async (req, res, next) => {
  try {
    const filter = { userId: req.user._id };
    if (req.query.status) filter.status = req.query.status;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [tasks, total] = await Promise.all([
      Task.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Task.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: tasks.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: tasks,
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/tasks/:id
// @access  Private
const getTaskById = async (req, res, next) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user._id });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    res.status(200).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/tasks/:id
// @access  Private
const updateTask = async (req, res, next) => {
  try {
    const { taskTitle, description, dueDate, status } = req.body;

    const task = await Task.findOne({ _id: req.params.id, userId: req.user._id });
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (taskTitle !== undefined) task.taskTitle = taskTitle;
    if (description !== undefined) task.description = description;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (status !== undefined) task.status = status;

    const updatedTask = await task.save(); // triggers schema validation

    res.status(200).json({ success: true, message: 'Task updated', data: updatedTask });
  } catch (error) {
    next(error);
  }
};

// @route   PATCH /api/tasks/:id/status
// @access  Private
// Dedicated endpoint for the common "toggle Pending/Completed" action
const updateTaskStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    const errors = validateStatusInput({ status });
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(', ') });
    }

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { status },
      { new: true, runValidators: true }
    );

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    res.status(200).json({ success: true, message: 'Task status updated', data: task });
  } catch (error) {
    next(error);
  }
};

// @route   DELETE /api/tasks/:id
// @access  Private
const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.user._id });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    res.status(200).json({ success: true, message: 'Task deleted', data: { id: req.params.id } });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  updateTaskStatus,
  deleteTask,
};
