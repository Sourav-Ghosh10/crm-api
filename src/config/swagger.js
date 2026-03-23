const swaggerJsdoc = require('swagger-jsdoc');

const port = process.env.PORT || 5000;

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Pulse Ops API',
      version: '1.0.0',
      description: 'API documentation for Pulse Ops - HR Management System',
      contact: {
        name: 'Pulse Ops Team',
      },
    },
    servers: [
      {
        url: `http://localhost:${port}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/app.js', './src/routes/*.js', './src/models/*.js'], // Files containing annotations
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
