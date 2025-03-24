const db = require('../models');

exports.createBid = async (req, res) => {
  try {
    const { job_id, bid_amount, delivery_days, cover_letter } = req.body;
    const engineer_id = req.user.id;

    const job = await db.jobs.findByPk(job_id);
    if (!job) {
      return res.status(404).send({ message: 'Job not found' });
    }
    if (job.status !== 'open') {
      return res.status(400).send({ message: 'This job is not open for bidding' });
    }

    const existingBid = await db.bids.findOne({ where: { job_id, engineer_id } });
    if (existingBid) {
      return res.status(400).send({ message: 'You have already submitted a bid for this job' });
    }

    const bid = await db.bids.create({
      job_id,
      engineer_id,
      bid_amount,
      delivery_days,
      cover_letter,
      status: 'pending',
      submitted_date: new Date(),
    });

    res.status(201).send({ message: 'Bid submitted successfully', bid });
  } catch (error) {
    console.error('Error submitting bid:', error.message);
    res.status(500).send({ message: 'Failed to submit bid', error: error.message });
  }
};

exports.getMyBids = async (req, res) => {
  try {
    const engineer_id = req.user.id;

    const bids = await db.bids.findAll({
      where: { engineer_id },
      include: [
        {
          model: db.jobs,
          as: 'job',
          include: [
            {
              model: db.users,
              as: 'client',
              attributes: ['id', 'username', 'email'],
            },
          ],
        },
      ],
      order: [['submitted_date', 'DESC']],
    });

    res.status(200).send(bids);
  } catch (error) {
    console.error('Error fetching bids:', error.message);
    res.status(500).send({ message: 'Failed to fetch bids', error: error.message });
  }
};