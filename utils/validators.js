// Simple, dependency-free validation helpers used by the controllers.
// Keeping these separate keeps controller functions focused on business logic.

const validateRegisterInput = ({ name, email, password }) => {
  const errors = [];

  if (!name || name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  }

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    errors.push('A valid email is required');
  }

  if (!password || password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }

  return errors;
};

const validateLoginInput = ({ email, password }) => {
  const errors = [];

  if (!email) errors.push('Email is required');
  if (!password) errors.push('Password is required');

  return errors;
};

const validateTaskInput = ({ taskTitle, dueDate }) => {
  const errors = [];

  if (!taskTitle || taskTitle.trim().length < 3) {
    errors.push('Task title must be at least 3 characters long');
  }

  if (!dueDate || isNaN(Date.parse(dueDate))) {
    errors.push('A valid due date is required');
  }

  return errors;
};

const validateStatusInput = ({ status }) => {
  const errors = [];
  if (!['Pending', 'Completed'].includes(status)) {
    errors.push('Status must be either "Pending" or "Completed"');
  }
  return errors;
};

module.exports = {
  validateRegisterInput,
  validateLoginInput,
  validateTaskInput,
  validateStatusInput,
};
