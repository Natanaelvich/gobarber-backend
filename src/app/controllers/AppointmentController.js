const Yup = require('yup');
const dateFns = require('date-fns');
const pt = require('date-fns/locale/pt');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const File = require('../models/File');
const NoityMongo = require('../schemas/Notification');

const CancellationMail = require('../../jobs/CancellationMail');
const Queue = require('../../lib/Queue');

class AppmeintmentController {
  async index(req, res) {
    const { page = 1 } = req.query;
    const appointments = await Appointment.findAll({
      where: {
        user_id: req.userId,
        canceled_at: null,
      },
      order: ['date'],
      attributes: ['id', 'date', 'past', 'cancelable'],
      limit: 20,
      offset: (page - 1) * 20,
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['id', 'name'],
          include: [
            {
              model: File,
              as: 'avatar',
              attributes: ['id', 'path', 'url'],
            },
          ],
        },
      ],
    });
    return res.json(appointments);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      provider_id: Yup.number().required(),
      date: Yup.date().required(),
    });
    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Valdation Fails' });
    }

    const { provider_id, date } = req.body;
    // check is provider

    const isProvider = await User.findOne({
      where: { id: provider_id, provider: true },
    });
    if (!isProvider) {
      return res.status(401).json({ error: 'No Provider' });
    }
    // check date is validty
    const hourStart = dateFns.startOfHour(dateFns.parseISO(date));
    if (dateFns.isBefore(hourStart, new Date())) {
      return res.status(400).json({ error: 'Past dates are not permission' });
    }
    // check date availability

    const checkAvalilability = await Appointment.findOne({
      where: {
        provider_id,
        canceled_at: null,
        date: hourStart,
      },
    });
    if (checkAvalilability) {
      return res
        .status(400)
        .json({ error: 'Appointment date id not available' });
    }

    const appointment = await Appointment.create({
      date,
      user_id: req.userId,
      provider_id,
    });

    // notify provider with mongo

    const user = await User.findByPk(req.userId);
    const formattedDate = dateFns.format(
      hourStart,
      "'dia' d 'de' MMM ', as' H:mm'h'",
      { locale: pt }
    );

    await NoityMongo.create({
      content: `Novo agendamento de ${user.name} para ${formattedDate}`,
      user: provider_id,
    });

    return res.json(appointment);
  }

  async delete(req, res) {
    const appointment = await Appointment.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['name', 'email'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['name'],
        },
      ],
    });

    if (appointment.user_id !== req.userId) {
      return res.status(401).json({
        error: 'You don´t have permission to cancel this appointment ',
      });
    }

    const dateWithSub = dateFns.subHours(appointment.date, 2);

    if (dateFns.isBefore(dateWithSub, new Date())) {
      return res.status(401).json({
        error: 'You can only cancel appointments 2 hours in advanced',
      });
    }

    appointment.canceled_at = new Date();

    await appointment.save();

    await Queue.add(CancellationMail.Key, {
      appointment,
    });

    return res.json(appointment);
  }
}

module.exports = new AppmeintmentController();
