require('dotenv/config');
require('./database');
const express = require('express');
const path = require('path');
const Youch = require('youch');
const Sentry = require('@sentry/node');
require('express-async-errors');

const routes = require('./routes');
const sentryConfig = require('./config/sentry');

class App {
  constructor() {
    this.server = express();

    Sentry.init(sentryConfig);

    this.middlewares();
    this.routes();
    this.exeptionHlander();
  }

  middlewares() {
    this.server.use(Sentry.Handlers.requestHandler());
    this.server.use(express.json());
    this.server.use(
      '/files',
      express.static(path.resolve(__dirname, '..', 'tmp', 'uploads'))
    );
  }

  routes() {
    this.server.use(routes);
    this.server.use(Sentry.Handlers.errorHandler());
  }

  exeptionHlander() {
    this.server.use(async (err, req, res, next) => {
      if (process.env.NODE_ENV === 'development') {
        const errs = await new Youch(err, req).toJSON();

        return res.status(500).json(errs);
      }

      return res.status(500).json({ error: 'Internal server error' });
    });
  }
}

module.exports = new App().server;
