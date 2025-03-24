// controllers/project.controller.js
const db = require('../config/db.config');
const { sendEmail } = require('../utils/email');

// Get all projects for client or engineer
exports.getProjects = async (req, res) => {
  try {
    let query;
    let params = [];
    
    if (req.user.user_type === 'client') {
      query = `
        SELECT p.*, u.username as engineer_name, u.email as engineer_email,
        j.title as original_job_title,
        (SELECT COUNT(*) FROM milestones WHERE project_id = p.id) as milestone_count,
        (SELECT COUNT(*) FROM milestones WHERE project_id = p.id AND status = 'approved') as completed_milestones
        FROM projects p
        JOIN users u ON p.engineer_id = u.id
        JOIN jobs j ON p.job_id = j.id
        WHERE p.client_id = ?
        ORDER BY p.created_at DESC
      `;
      params = [req.user.id];
    } else if (req.user.user_type === 'engineer') {
      query = `
        SELECT p.*, u.username as client_name, u.email as client_email,
        j.title as original_job_title,
        (SELECT COUNT(*) FROM milestones WHERE project_id = p.id) as milestone_count,
        (SELECT COUNT(*) FROM milestones WHERE project_id = p.id AND status = 'approved') as completed_milestones
        FROM projects p
        JOIN users u ON p.client_id = u.id
        JOIN jobs j ON p.job_id = j.id
        WHERE p.engineer_id = ?
        ORDER BY p.created_at DESC
      `;
      params = [req.user.id];
    } else if (req.user.user_type === 'admin') {
      query = `
        SELECT p.*, 
        c.username as client_name, c.email as client_email,
        e.username as engineer_name, e.email as engineer_email,
        j.title as original_job_title,
        (SELECT COUNT(*) FROM milestones WHERE project_id = p.id) as milestone_count,
        (SELECT COUNT(*) FROM milestones WHERE project_id = p.id AND status = 'approved') as completed_milestones
        FROM projects p
        JOIN users c ON p.client_id = c.id
        JOIN users e ON p.engineer_id = e.id
        JOIN jobs j ON p.job_id = j.id
        ORDER BY p.created_at DESC
      `;
    } else {
      return res.status(403).send({ message: 'Access denied' });
    }
    
    const [projects] = await db.execute(query, params);
    
    res.status(200).send(projects);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Error fetching projects' });
  }
};

// Get project by ID
exports.getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user is authorized to view this project
    const [project] = await db.execute(
      `SELECT p.*, 
       c.username as client_name, c.email as client_email,
       e.username as engineer_name, e.email as engineer_email,
       j.title as original_job_title,
       b.amount as project_amount, b.proposal
       FROM projects p
       JOIN users c ON p.client_id = c.id
       JOIN users e ON p.engineer_id = e.id
       JOIN jobs j ON p.job_id = j.id
       JOIN bids b ON p.bid_id = b.id
       WHERE p.id = ?`,
      [id]
    );
    
    if (project.length === 0) {
      return res.status(404).send({ message: 'Project not found' });
    }
    
    // Only client, engineer involved in project, or admin can view
    if (
      project[0].client_id !== req.user.id && 
      project[0].engineer_id !== req.user.id && 
      req.user.user_type !== 'admin'
    ) {
      return res.status(403).send({ message: 'Access denied' });
    }
    
    // Get milestones for the project
    const [milestones] = await db.execute(
      `SELECT * FROM milestones WHERE project_id = ? ORDER BY due_date ASC`,
      [id]
    );
    
    // Get messages for the project
    const [messages] = await db.execute(
      `SELECT m.*, u.username as sender_name
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.project_id = ?
       ORDER BY m.created_at ASC`,
      [id]
    );
    
    // Get payments for the project
    const [payments] = await db.execute(
      `SELECT * FROM payments WHERE project_id = ? ORDER BY created_at DESC`,
      [id]
    );
    
    res.status(200).send({
      project: project[0],
      milestones,
      messages,
      payments
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Error fetching project details' });
  }
};

// Update project status
exports.updateProjectStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Valid status values
    const validStatuses = ['not_started', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).send({ message: 'Invalid status value' });
    }
    
    // Check if project exists and user is authorized
    const [project] = await db.execute(
      'SELECT * FROM projects WHERE id = ?',
      [id]
    );
    
    if (project.length === 0) {
      return res.status(404).send({ message: 'Project not found' });
    }
    
    // Only client, admin can update project status
    if (project[0].client_id !== req.user.id && req.user.user_type !== 'admin') {
      return res.status(403).send({ message: 'Only clients or admins can update project status' });
    }
    
    // Update project status
    await db.execute(
      'UPDATE projects SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, id]
    );
    
    // If project is completed, also update the job status
    if (status === 'completed') {
      await db.execute(
        'UPDATE jobs SET status = "completed" WHERE id = ?',
        [project[0].job_id]
      );
      
      // Notify the engineer
      await db.execute(
        `INSERT INTO notifications (user_id, title, message) 
         VALUES (?, 'Project Completed', 'The project "${project[0].title}" has been marked as completed by the client.')`,
        [project[0].engineer_id]
      );
      
      // Get engineer email
      const [engineer] = await db.execute(
        'SELECT email FROM users WHERE id = ?',
        [project[0].engineer_id]
      );
      
      // Send email notification
      if (engineer.length > 0) {
        await sendEmail(
          engineer[0].email,
          'Project Completed',
          `Dear Engineer,\n\nThe project "${project[0].title}" has been marked as completed by the client. Please log in to LevKonnect to check your earnings and leave a review.\n\nThank you,\nLevKonnect Team`
        );
      }
    } else if (status === 'cancelled') {
      // Update the job status if cancelled
      await db.execute(
        'UPDATE jobs SET status = "cancelled" WHERE id = ?',
        [project[0].job_id]
      );
      
      // Notify the engineer about cancellation
      await db.execute(
        `INSERT INTO notifications (user_id, title, message) 
         VALUES (?, 'Project Cancelled', 'The project "${project[0].title}" has been cancelled by the client.')`,
        [project[0].engineer_id]
      );
      
      // Get engineer email
      const [engineer] = await db.execute(
        'SELECT email FROM users WHERE id = ?',
        [project[0].engineer_id]
      );
      
      // Send email notification
      if (engineer.length > 0) {
        await sendEmail(
          engineer[0].email,
          'Project Cancelled',
          `Dear Engineer,\n\nThe project "${project[0].title}" has been cancelled by the client. Please log in to LevKonnect for more details.\n\nThank you,\nLevKonnect Team`
        );
      }
    }
    
    res.status(200).send({ message: `Project status updated to ${status}` });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Error updating project status' });
  }
};

// Create a new project (when a bid is accepted)
exports.createProject = async (req, res) => {
  try {
    const { job_id, bid_id } = req.body;
    
    // Check if the user is a client
    if (req.user.user_type !== 'client') {
      return res.status(403).send({ message: 'Only clients can create projects' });
    }
    
    // Check if job exists and belongs to the client
    const [job] = await db.execute(
      'SELECT * FROM jobs WHERE id = ? AND client_id = ?',
      [job_id, req.user.id]
    );
    
    if (job.length === 0) {
      return res.status(404).send({ message: 'Job not found or you are not authorized' });
    }
    
    // Check if bid exists and is for the specified job
    const [bid] = await db.execute(
      'SELECT * FROM bids WHERE id = ? AND job_id = ?',
      [bid_id, job_id]
    );
    
    if (bid.length === 0) {
      return res.status(404).send({ message: 'Bid not found or not associated with this job' });
    }
    
    // Update bid status to accepted
    await db.execute(
      'UPDATE bids SET status = "accepted" WHERE id = ?',
      [bid_id]
    );
    
    // Update other bids to rejected
    await db.execute(
      'UPDATE bids SET status = "rejected" WHERE job_id = ? AND id != ?',
      [job_id, bid_id]
    );
    
    // Update job status to in_progress
    await db.execute(
      'UPDATE jobs SET status = "in_progress" WHERE id = ?',
      [job_id]
    );
    
    // Create project
    const [result] = await db.execute(
      `INSERT INTO projects 
       (job_id, client_id, engineer_id, bid_id, title, description, start_date, status) 
       VALUES (?, ?, ?, ?, ?, ?, NOW(), 'not_started')`,
      [job_id, req.user.id, bid[0].engineer_id, bid_id, job[0].title, job[0].description]
    );
    
    const projectId = result.insertId;
    
    // Create default milestones (if any)
    if (req.body.milestones && Array.isArray(req.body.milestones)) {
      for (const milestone of req.body.milestones) {
        await db.execute(
          `INSERT INTO milestones 
           (project_id, title, description, amount, due_date, status) 
           VALUES (?, ?, ?, ?, ?, 'pending')`,
          [
            projectId,
            milestone.title,
            milestone.description,
            milestone.amount,
            milestone.due_date || null
          ]
        );
      }
    }
    
    // Notify the engineer
    await db.execute(
      `INSERT INTO notifications (user_id, title, message) 
       VALUES (?, 'Bid Accepted', 'Your bid for the job "${job[0].title}" has been accepted! A new project has been created.')`,
      [bid[0].engineer_id]
    );
    
    // Get engineer email
    const [engineer] = await db.execute(
      'SELECT email FROM users WHERE id = ?',
      [bid[0].engineer_id]
    );
    
    // Send email notification
    if (engineer.length > 0) {
      await sendEmail(
        engineer[0].email,
        'Bid Accepted - New Project Created',
        `Dear Engineer,\n\nCongratulations! Your bid for the job "${job[0].title}" has been accepted. A new project has been created. Please log in to LevKonnect to view the project details and start working.\n\nThank you,\nLevKonnect Team`
      );
    }
    
    res.status(201).send({ 
      message: 'Project created successfully', 
      projectId 
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Error creating project' });
  }
};

// Create project milestone
exports.createMilestone = async (req, res) => {
  try {
    const { project_id } = req.params;
    const { title, description, amount, due_date } = req.body;
    
    // Validate required fields
    if (!title || !amount) {
      return res.status(400).send({ message: 'Title and amount are required' });
    }
    
    // Check if project exists and user is authorized
    const [project] = await db.execute(
      'SELECT * FROM projects WHERE id = ?',
      [project_id]
    );
    
    if (project.length === 0) {
      return res.status(404).send({ message: 'Project not found' });
    }
    
    // Only client or admin can add milestones
    if (project[0].client_id !== req.user.id && req.user.user_type !== 'admin') {
      return res.status(403).send({ message: 'Only clients can add milestones' });
    }
    
    // Create milestone
    const [result] = await db.execute(
      `INSERT INTO milestones 
       (project_id, title, description, amount, due_date, status) 
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [project_id, title, description, amount, due_date || null]
    );
    
    // Notify the engineer
    await db.execute(
      `INSERT INTO notifications (user_id, title, message) 
       VALUES (?, 'New Milestone Added', 'A new milestone has been added to your project "${project[0].title}"')`,
      [project[0].engineer_id]
    );
    
    res.status(201).send({ 
      message: 'Milestone added successfully', 
      milestoneId: result.insertId 
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Error adding milestone' });
  }
};

// Update milestone status
exports.updateMilestoneStatus = async (req, res) => {
  try {
    const { project_id, milestone_id } = req.params;
    const { status } = req.body;
    
    // Valid status values
    const validStatuses = ['pending', 'in_progress', 'submitted', 'approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).send({ message: 'Invalid status value' });
    }
    
    // Check if project and milestone exist
    const [milestone] = await db.execute(
      `SELECT m.*, p.client_id, p.engineer_id, p.title as project_title 
       FROM milestones m
       JOIN projects p ON m.project_id = p.id
       WHERE m.id = ? AND m.project_id = ?`,
      [milestone_id, project_id]
    );
    
    if (milestone.length === 0) {
      return res.status(404).send({ message: 'Milestone not found' });
    }
    
    // Check authorization based on status change
    if (status === 'submitted' && req.user.id !== milestone[0].engineer_id) {
      return res.status(403).send({ message: 'Only engineers can submit milestones' });
    }
    
    if ((status === 'approved' || status === 'rejected') && req.user.id !== milestone[0].client_id) {
      return res.status(403).send({ message: 'Only clients can approve or reject milestones' });
    }
    
    // Update milestone status
    await db.execute(
      'UPDATE milestones SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, milestone_id]
    );
    
    // Handle notifications based on status changes
    let notificationUserId, notificationTitle, notificationMessage, emailSubject, emailBody;
    
    if (status === 'submitted') {
      notificationUserId = milestone[0].client_id;
      notificationTitle = 'Milestone Submitted';
      notificationMessage = `The milestone "${milestone[0].title}" for project "${milestone[0].project_title}" has been submitted for review.`;
      emailSubject = 'Milestone Submitted for Review';
      emailBody = `Dear Client,\n\nThe milestone "${milestone[0].title}" for project "${milestone[0].project_title}" has been submitted for your review. Please log in to LevKonnect to approve or reject the milestone.\n\nThank you,\nLevKonnect Team`;
    } else if (status === 'approved') {
      notificationUserId = milestone[0].engineer_id;
      notificationTitle = 'Milestone Approved';
      notificationMessage = `The milestone "${milestone[0].title}" for project "${milestone[0].project_title}" has been approved.`;
      emailSubject = 'Milestone Approved - Payment Released';
      emailBody = `Dear Engineer,\n\nThe milestone "${milestone[0].title}" for project "${milestone[0].project_title}" has been approved. Payment has been released to your account. Please log in to LevKonnect to check your earnings.\n\nThank you,\nLevKonnect Team`;
      
      // Create payment record when milestone is approved
      await db.execute(
        `INSERT INTO payments 
         (project_id, milestone_id, client_id, engineer_id, amount, payment_method, status, payment_date) 
         VALUES (?, ?, ?, ?, ?, 'system', 'completed', NOW())`,
        [
          project_id,
          milestone_id,
          milestone[0].client_id,
          milestone[0].engineer_id,
          milestone[0].amount
        ]
      );
    } else if (status === 'rejected') {
      notificationUserId = milestone[0].engineer_id;
      notificationTitle = 'Milestone Rejected';
      notificationMessage = `The milestone "${milestone[0].title}" for project "${milestone[0].project_title}" has been rejected. Please check the messages for details.`;
      emailSubject = 'Milestone Rejected - Action Required';
      emailBody = `Dear Engineer,\n\nThe milestone "${milestone[0].title}" for project "${milestone[0].project_title}" has been rejected. Please log in to LevKonnect to check the client's feedback and make necessary improvements.\n\nThank you,\nLevKonnect Team`;
    }
    
    // Create notification
    if (notificationUserId) {
      await db.execute(
        `INSERT INTO notifications (user_id, title, message) 
         VALUES (?, ?, ?)`,
        [notificationUserId, notificationTitle, notificationMessage]
      );
      
      // Get user email
      const [user] = await db.execute(
        'SELECT email FROM users WHERE id = ?',
        [notificationUserId]
      );
      
      // Send email notification
      if (user.length > 0 && emailSubject && emailBody) {
        await sendEmail(
          user[0].email,
          emailSubject,
          emailBody
        );
      }
    }
    
    res.status(200).send({ message: `Milestone status updated to ${status}` });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Error updating milestone status' });
  }
};

// Send message in a project
exports.sendMessage = async (req, res) => {
  try {
    const { project_id } = req.params;
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).send({ message: 'Message content is required' });
    }
    
    // Check if project exists and user is authorized
    const [project] = await db.execute(
      'SELECT * FROM projects WHERE id = ?',
      [project_id]
    );
    
    if (project.length === 0) {
      return res.status(404).send({ message: 'Project not found' });
    }
    
    // Only client, engineer involved in project, or admin can send messages
    if (
      project[0].client_id !== req.user.id && 
      project[0].engineer_id !== req.user.id && 
      req.user.user_type !== 'admin'
    ) {
      return res.status(403).send({ message: 'Access denied' });
    }
    
    // Determine receiver ID (if client sends, engineer receives and vice versa)
    const receiverId = req.user.id === project[0].client_id ? project[0].engineer_id : project[0].client_id;
    
    // Save message
    const [result] = await db.execute(
      `INSERT INTO messages 
       (sender_id, receiver_id, project_id, content) 
       VALUES (?, ?, ?, ?)`,
      [req.user.id, receiverId, project_id, content]
    );
    
    // Notify the receiver
    await db.execute(
      `INSERT INTO notifications (user_id, title, message) 
       VALUES (?, 'New Message', 'You have received a new message in project "${project[0].title}"')`,
      [receiverId]
    );
    
    res.status(201).send({ 
      message: 'Message sent successfully', 
      messageId: result.insertId 
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Error sending message' });
  }
};

// Add project review
exports.addReview = async (req, res) => {
  try {
    const { project_id } = req.params;
    const { rating, comment } = req.body;
    
    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).send({ message: 'Rating must be between 1 and 5' });
    }
    
    // Check if project exists and is completed
    const [project] = await db.execute(
      'SELECT * FROM projects WHERE id = ? AND status = "completed"',
      [project_id]
    );
    
    if (project.length === 0) {
      return res.status(404).send({ message: 'Project not found or not completed yet' });
    }
    
    // Check if user is involved in the project
    if (req.user.id !== project[0].client_id && req.user.id !== project[0].engineer_id) {
      return res.status(403).send({ message: 'Access denied' });
    }
    
    // Determine reviewee
    const revieweeId = req.user.id === project[0].client_id ? project[0].engineer_id : project[0].client_id;
    
    // Check if review already exists
    const [existingReview] = await db.execute(
      'SELECT * FROM reviews WHERE project_id = ? AND reviewer_id = ?',
      [project_id, req.user.id]
    );
    
    if (existingReview.length > 0) {
      return res.status(400).send({ message: 'You have already reviewed this project' });
    }
    
    // Create review
    const [result] = await db.execute(
      `INSERT INTO reviews 
       (project_id, reviewer_id, reviewee_id, rating, comment) 
       VALUES (?, ?, ?, ?, ?)`,
      [project_id, req.user.id, revieweeId, rating, comment || null]
    );
    
    // Notify the reviewee
    await db.execute(
      `INSERT INTO notifications (user_id, title, message) 
       VALUES (?, 'New Review', 'You have received a new review for project "${project[0].title}"')`,
      [revieweeId]
    );
    
    res.status(201).send({ 
      message: 'Review submitted successfully', 
      reviewId: result.insertId 
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Error submitting review' });
  }
};