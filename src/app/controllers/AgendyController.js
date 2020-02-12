const dateNfs = require('date-fns');
const { Op } = require('sequelize');
const User = require('../models/User');
const Appointments = require('../models/Appointment');

class AgendyController {
  async index(req, res) {
    const checkProviderUser = await User.findOne({
      where: { id: req.userId, provider: true },
    });
    if (!checkProviderUser) {
      res.status(401).json({ error: 'User is not a provider' });
    }
    const { date } = req.query;
    const parsedDate = dateNfs.parseISO(date);
    const appointments = await Appointments.findAll({
      where: {
        provider_id: req.userId,
        canceled_at: null,
        date: {
          [Op.between]: [
            dateNfs.startOfDay(parsedDate),
            dateNfs.endOfDay(parsedDate),
          ],
        },
      },
      order: ['date'],
    });

    return res.json(appointments);
  }
}

module.exports = new AgendyController();
