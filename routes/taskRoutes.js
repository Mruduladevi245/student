const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  updateTaskStatus,
  deleteTask,
} = require('../controllers/taskController');

router.use(protect);

router.route('/')
  .post(createTask)
  .get(getTasks);

router.route('/:id')
  .get(getTaskById)
  .put(updateTask)
  .delete(deleteTask);

router.patch('/:id/status', updateTaskStatus);

module.exports = router;
