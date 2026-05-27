const sendSuccess = (res, data, statusCode = 200, message = null) => {
  const response = { success: true };
  if (message) response.message = message;
  if (data) response.data = data;
  return res.status(statusCode).json(response);
};

const sendCreated = (res, data, message = 'Created successfully') =>
  sendSuccess(res, data, 201, message);

const sendNoContent = (res) => res.status(204).send();

const sendPaginated = (res, data, pagination) =>
  sendSuccess(res, {
    ...data,
    pagination: {
      currentPage: pagination.page,
      totalPages: Math.ceil(pagination.total / pagination.limit),
      totalRecords: pagination.total,
      limit: pagination.limit,
      hasNextPage: pagination.page < Math.ceil(pagination.total / pagination.limit),
      hasPreviousPage: pagination.page > 1,
    },
  });

module.exports = {
  sendSuccess,
  sendCreated,
  sendNoContent,
  sendPaginated,
};
