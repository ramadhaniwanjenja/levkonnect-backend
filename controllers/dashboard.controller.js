const db = require('../models');

const Job = db.jobs;
const Bid = db.bids;

exports.getDashboardMetrics = async (req, res) => {
  try {
    const clientId = req.user.id;

    // Count active projects (status: 'in-progress')
    const activeProjects = await Job.count({
      where: {
        client_id: clientId,
        status: 'in-progress',
      },
    });

    // Count completed projects (status: 'completed')
    const completedProjects = await Job.count({
      where: {
        client_id: clientId,
        status: 'completed',
      },
    });

    // Count pending bids for the client's jobs
    const pendingBids = await Bid.count({
      include: [
        {
          model: Job,
          as: 'job',
          where: {
            client_id: clientId,
          },
        },
      ],
      where: {
        status: 'pending',
      },
    });

    res.status(200).send({
      activeProjects,
      completedProjects,
      pendingBids,
    });
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error.message);
    res.status(500).send({ message: 'Failed to fetch dashboard metrics', error: error.message });
  }
};

exports.getEngineerDashboardMetrics = async (req, res) => {
  try {
    const engineerId = req.user.id;

    // Count active projects (bids accepted and job status is 'in-progress')
    const activeProjects = await Bid.count({
      include: [
        {
          model: Job,
          as: 'job',
          where: {
            status: 'in-progress',
          },
        },
      ],
      where: {
        engineer_id: engineerId,
        status: 'accepted',
      },
    });

    // Count completed projects (bids accepted and job status is 'completed')
    const completedProjects = await Bid.count({
      include: [
        {
          model: Job,
          as: 'job',
          where: {
            status: 'completed',
          },
        },
      ],
      where: {
        engineer_id: engineerId,
        status: 'accepted',
      },
    });

    // Count pending bids for the engineer
    const pendingBids = await Bid.count({
      where: {
        engineer_id: engineerId,
        status: 'pending',
      },
    });

    // Calculate total earnings (sum of bid amounts for completed projects)
    const earningsResult = await Bid.findAll({
      include: [
        {
          model: Job,
          as: 'job',
          where: {
            status: 'completed',
          },
        },
      ],
      where: {
        engineer_id: engineerId,
        status: 'accepted',
      },
      attributes: [
        [db.sequelize.fn('SUM', db.sequelize.col('bid_amount')), 'totalEarnings'], // Changed 'amount' to 'bid_amount'
      ],
    });

    const totalEarnings = earningsResult[0]?.dataValues?.totalEarnings || 0;

    res.status(200).send({
      activeProjects,
      completedProjects,
      pendingBids,
      earnings: parseFloat(totalEarnings),
    });
  } catch (error) {
    console.error('Error fetching engineer dashboard metrics:', error.message);
    res.status(500).send({ message: 'Failed to fetch engineer dashboard metrics', error: error.message });
  }
};