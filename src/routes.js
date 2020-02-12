const express = require('express');
const multer = require('multer');
const multerConfig = require('./config/multer');

const UserController = require('./app/controllers/UserController');
const SessionController = require('./app/controllers/SessionController');
const FileController = require('./app/controllers/FileController');
const ProviderController = require('./app/controllers/PrividerController');
const AppointmentController = require('./app/controllers/AppointmentController');
const AgendyProviderController = require('./app/controllers/AgendyController');
const NotificationsController = require('./app/controllers/NotificationController');
const AvailableController = require('./app/controllers/AvailableController');

const authMiddleware = require('./app/middlewares/auth');

const routes = express.Router();
const upload = multer(multerConfig);

routes.post('/users', UserController.store);
routes.post('/sessions', SessionController.store);

routes.use(authMiddleware);

routes.put('/users', UserController.update);

routes.post('/appointments', AppointmentController.store);
routes.get('/appointments', AppointmentController.index);
routes.delete('/appointments/:id', AppointmentController.delete);
routes.get('/agendys', AgendyProviderController.index);
routes.get('/notifications', NotificationsController.index);
routes.put('/notifications/:id', NotificationsController.update);

routes.post('/files', upload.single('file'), FileController.store);

routes.get('/providers', ProviderController.index);
routes.get('/providers/:providerId/available', AvailableController.index);
module.exports = routes;
