const { ForbiddenError } = require('../utils/errors');

/**
 * Authorize middleware - restrict access based on roles
 * @param  {...string} allowedRoles - Roles that can access the route
 */
const authorize =
  (...allowedRoles) =>
  (req, res, next) => {
    if (!req.user) {
      return next(new ForbiddenError('User not authenticated'));
    }

    const userRole = (req.user.employment?.role || '').toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'super admin' || req.user.isAdmin === true;

    if (isAdmin || allowedRoles.map(r => r.toLowerCase()).includes(userRole)) {
      return next();
    }

    return next(new ForbiddenError(`Access denied. Required roles: ${allowedRoles.join(', ')}`));
  };

/**
 * Permission-based authorization
 * @param {string} permission - Required permission
 */
const requirePermission = (permission) => (req, res, next) => {
  if (!req.user) {
    return next(new ForbiddenError('User not authenticated'));
  }

  const userRole = (req.user.employment?.role || '').toLowerCase();
  const isAdmin = userRole === 'admin' || userRole === 'super admin' || req.user.isAdmin === true;

  // Admins have all permissions
  if (isAdmin) {
    return next();
  }

  const userPermissions = req.user.permissions || {};

  // Check specific permission
  const permissionMap = {
    'approve:leave': userPermissions.canApproveLeave,
    'approve:reimbursement': userPermissions.canApproveReimbursement,
    'manage:schedule': userPermissions.canManageSchedule,
    'view:reports': userPermissions.canViewReports,
  };

  if (!permissionMap[permission]) {
    return next(new ForbiddenError(`Permission denied: ${permission}`));
  }

  next();
};

/**
 * Check if user can access their own resource or is admin/hr
 */
const authorizeOwnerOrRole =
  (...allowedRoles) =>
  (req, res, next) => {
    if (!req.user) {
      return next(new ForbiddenError('User not authenticated'));
    }

    const userRole = (req.user.employment?.role || '').toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'super admin' || req.user.isAdmin === true;
    const userId = (req.user.id || req.user._id).toString();
    const resourceUserId = (req.params.id || req.params.userId || '').toString();

    // Check if user is accessing their own resource
    const isOwner = userId === resourceUserId;

    // Check if user has required role
    const hasRole = allowedRoles.map(r => r.toLowerCase()).includes(userRole);

    if (isOwner || isAdmin || hasRole) {
      return next();
    }

    return next(new ForbiddenError('Access denied'));
  };

module.exports = {
  authorize,
  requirePermission,
  authorizeOwnerOrRole,
};
