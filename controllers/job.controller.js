const db = require('../models');

// Use the correct keys as defined in models/index.js
const Job = db.jobs;  // Changed from db.job to db.jobs
const User = db.users; // Changed from db.user to db.users
const Bid = db.bids;  // Changed from db.Bid to db.bids

exports.createJob = async (req, res) => {
  try {
    const { title, category, description, budget, location, duration, required_skills, deadline } = req.body;

    // Only check for fields that are required in the middleware
    if (!title || !category || !description) {
      return res.status(400).send({ message: 'All required fields must be provided.' });
    }

    console.log('Creating job for user:', req.user);

    const job = await Job.create({
      title,
      category,
      description,
      budget: budget ? parseFloat(budget) : null, // Handle optional field
      location: location || null, // Handle optional field
      duration: duration ? parseInt(duration) : null, // Handle optional field
      requiredSkills: required_skills || [], // Default to empty array if not provided
      deadline: deadline ? new Date(deadline) : null, // Handle optional field
      client_id: req.user.id,
      status: 'open',
    });

    console.log('Job created:', job.toJSON());
    res.status(201).send({ message: 'Job posted successfully!', job });
  } catch (error) {
    console.error('Error creating job:', error.message);
    res.status(500).send({ message: 'Failed to post job.', error: error.message });
  }
};

exports.getAllJobs = async (req, res) => {
  try {
    const jobs = await Job.findAll({
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['id', 'username', 'email'],
        },
      ],
    });
    res.status(200).send(jobs);
  } catch (error) {
    console.error('Error fetching jobs:', error.message);
    res.status(500).send({ message: 'Failed to fetch jobs', error: error.message });
  }
};

exports.getJobById = async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['id', 'username', 'email'],
        },
        {
          model: Bid,
          as: 'bids',
          include: [
            {
              model: User,
              as: 'engineer',
              attributes: ['id', 'username', 'email'],
            },
          ],
        },
      ],
    });
    if (!job) {
      return res.status(404).send({ message: 'Job not found' });
    }
    res.status(200).send(job);
  } catch (error) {
    console.error('Error fetching job:', error.message);
    res.status(500).send({ message: 'Failed to fetch job', error: error.message });
  }
};

exports.updateJob = async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.id);
    if (!job) {
      return res.status(404).send({ message: 'Job not found' });
    }
    if (job.client_id !== req.user.id) {
      return res.status(403).send({ message: 'You are not authorized to update this job' });
    }
    await job.update(req.body);
    res.status(200).send({ message: 'Job updated successfully', job });
  } catch (error) {
    console.error('Error updating job:', error.message);
    res.status(500).send({ message: 'Failed to update job', error: error.message });
  }
};

exports.deleteJob = async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.id);
    if (!job) {
      return res.status(404).send({ message: 'Job not found' });
    }
    if (job.client_id !== req.user.id) {
      return res.status(403).send({ message: 'You are not authorized to delete this job' });
    }
    await job.destroy();
    res.status(200).send({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Error deleting job:', error.message);
    res.status(500).send({ message: 'Failed to delete job', error: error.message });
  }
};

exports.getClientJobs = async (req, res) => {
  try {
    const jobs = await Job.findAll({
      where: { client_id: req.user.id },
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['id', 'username', 'email'],
        },
        {
          model: Bid,
          as: 'bids',
          include: [
            {
              model: User,
              as: 'engineer',
              attributes: ['id', 'username', 'email'],
            },
          ],
        },
      ],
    });
    res.status(200).send(jobs);
  } catch (error) {
    console.error('Error fetching client jobs:', error.message);
    res.status(500).send({ message: 'Failed to fetch client jobs', error: error.message });
  }
};

exports.getRecommendedJobs = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).send([]);
    }
    const jobs = await Job.findAll({
      where: {
        status: 'open',
      },
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['id', 'username', 'email'],
        },
      ],
    });
    res.status(200).send(jobs);
  } catch (error) {
    console.error('Error fetching recommended jobs:', error.message);
    res.status(500).send([]);
  }
};

exports.acceptBid = async (req, res) => {
  try {
    const { jobId, bidId } = req.params;

    // Find the job
    const job = await Job.findByPk(jobId);
    if (!job) {
      return res.status(404).send({ message: 'Job not found' });
    }

    // Check if the user is the client who posted the job
    if (job.client_id !== req.user.id) {
      return res.status(403).send({ message: 'You are not authorized to accept bids for this job' });
    }

    // Check if the job is still open
    if (job.status !== 'open') {
      return res.status(400).send({ message: 'This job is not open for bidding' });
    }

    // Find the bid
    const bid = await Bid.findByPk(bidId);
    if (!bid) {
      return res.status(404).send({ message: 'Bid not found' });
    }

    // Check if the bid belongs to this job
    if (bid.job_id !== parseInt(jobId)) {
      return res.status(400).send({ message: 'This bid does not belong to the specified job' });
    }

    // Check if the bid is still pending
    if (bid.status !== 'pending') {
      return res.status(400).send({ message: 'This bid cannot be accepted as it is not pending' });
    }

    // Update the bid status to "accepted"
    await bid.update({ status: 'accepted' });

    // Update the job status to "in-progress"
    await job.update({ status: 'in-progress' });

    // Optionally, mark other bids as "rejected"
    await Bid.update(
      { status: 'rejected' },
      { where: { job_id: jobId, id: { [db.Sequelize.Op.ne]: bidId }, status: 'pending' } }
    );

    res.status(200).send({ message: 'Bid accepted successfully', bid, job });
  } catch (error) {
    console.error('Error accepting bid:', error.message);
    res.status(500).send({ message: 'Failed to accept bid', error: error.message });
  }
};