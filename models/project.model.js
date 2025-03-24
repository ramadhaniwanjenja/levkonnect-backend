const db = require('../config/db.config');

// Project model with methods for database operations
const Project = {
  // Create a new project
  create: (newProject, result) => {
    db.query('INSERT INTO projects SET ?', newProject, (err, res) => {
      if (err) {
        console.error('Error creating project:', err);
        result(err, null);
        return;
      }
      
      console.log('Created project:', { id: res.insertId, ...newProject });
      result(null, { id: res.insertId, ...newProject });
    });
  },

  // Find project by ID
  findById: (projectId, result) => {
    db.query(`
      SELECT p.*, 
             j.title as job_title, j.description as job_description, j.category,
             u_client.first_name as client_first_name, u_client.last_name as client_last_name,
             u_client.email as client_email, u_client.profile_image as client_profile_image,
             cp.company_name,
             u_engineer.first_name as engineer_first_name, u_engineer.last_name as engineer_last_name,
             u_engineer.email as engineer_email, u_engineer.profile_image as engineer_profile_image,
             ep.title as engineer_title, ep.skills
      FROM projects p
      JOIN jobs j ON p.job_id = j.id
      JOIN users u_client ON p.client_id = u_client.id
      JOIN users u_engineer ON p.engineer_id = u_engineer.id
      LEFT JOIN client_profiles cp ON u_client.id = cp.user_id
      LEFT JOIN engineer_profiles ep ON u_engineer.id = ep.user_id
      WHERE p.id = ?
    `, projectId, (err, res) => {
      if (err) {
        console.error('Error finding project by ID:', err);
        result(err, null);
        return;
      }

      if (res.length) {
        result(null, res[0]);
        return;
      }

      // Project with ID not found
      result({ kind: 'not_found' }, null);
    });
  },

  // Get projects by client ID
  getByClientId: (clientId, result) => {
    db.query(`
      SELECT p.*, 
             j.title as job_title, j.category,
             u.first_name as engineer_first_name, u.last_name as engineer_last_name,
             u.profile_image as engineer_profile_image
      FROM projects p
      JOIN jobs j ON p.job_id = j.id
      JOIN users u ON p.engineer_id = u.id
      WHERE p.client_id = ?
      ORDER BY p.created_at DESC
    `, clientId, (err, res) => {
      if (err) {
        console.error('Error getting projects for client:', err);
        result(err, null);
        return;
      }

      console.log('Projects for client ID', clientId, ':', res);
      result(null, res);
    });
  },

  // Get projects by engineer ID
  getByEngineerId: (engineerId, result) => {
    db.query(`
      SELECT p.*, 
             j.title as job_title, j.category,
             u.first_name as client_first_name, u.last_name as client_last_name,
             u.profile_image as client_profile_image,
             cp.company_name
      FROM projects p
      JOIN jobs j ON p.job_id = j.id
      JOIN users u ON p.client_id = u.id
      LEFT JOIN client_profiles cp ON u.id = cp.user_id
      WHERE p.engineer_id = ?
      ORDER BY p.created_at DESC
    `, engineerId, (err, res) => {
      if (err) {
        console.error('Error getting projects for engineer:', err);
        result(err, null);
        return;
      }

      console.log('Projects for engineer ID', engineerId, ':', res);
      result(null, res);
    });
  },

  // Update project by ID
  updateById: (id, project, result) => {
    db.query(
      'UPDATE projects SET ? WHERE id = ?',
      [project, id],
      (err, res) => {
        if (err) {
          console.error('Error updating project:', err);
          result(err, null);
          return;
        }

        if (res.affectedRows == 0) {
          // Project with ID not found
          result({ kind: 'not_found' }, null);
          return;
        }

        console.log('Updated project:', { id: id, ...project });
        result(null, { id: id, ...project });
      }
    );
  },

  // Get all projects with filters
  getAll: (filters, result) => {
    let query = `
      SELECT p.*, 
             j.title as job_title,
             u_client.first_name as client_first_name, u_client.last_name as client_last_name,
             u_engineer.first_name as engineer_first_name, u_engineer.last_name as engineer_last_name
      FROM projects p
      JOIN jobs j ON p.job_id = j.id
      JOIN users u_client ON p.client_id = u_client.id
      JOIN users u_engineer ON p.engineer_id = u_engineer.id
      WHERE 1=1
    `;
    
    const queryParams = [];
    
    if (filters) {
      if (filters.status) {
        query += ' AND p.status = ?';
        queryParams.push(filters.status);
      }
    }
    
    query += ' ORDER BY p.created_at DESC';
    
    db.query(query, queryParams, (err, res) => {
      if (err) {
        console.error('Error retrieving projects:', err);
        result(err, null);
        return;
      }

      console.log('Retrieved projects:', res);
      result(null, res);
    });
  },
  
  // Create a milestone for a project
  createMilestone: (milestone, result) => {
    db.query('INSERT INTO milestones SET ?', milestone, (err, res) => {
      if (err) {
        console.error('Error creating milestone:', err);
        result(err, null);
        return;
      }
      
      console.log('Created milestone:', { id: res.insertId, ...milestone });
      result(null, { id: res.insertId, ...milestone });
    });
  },
  
  // Get milestones by project ID
  getMilestones: (projectId, result) => {
    db.query(
      'SELECT * FROM milestones WHERE project_id = ? ORDER BY due_date',
      projectId,
      (err, res) => {
        if (err) {
          console.error('Error getting milestones:', err);
          result(err, null);
          return;
        }

        console.log('Milestones for project ID', projectId, ':', res);
        result(null, res);
      }
    );
  },
  
  // Update milestone by ID
  updateMilestone: (milestoneId, milestone, result) => {
    db.query(
      'UPDATE milestones SET ? WHERE id = ?',
      [milestone, milestoneId],
      (err, res) => {
        if (err) {
          console.error('Error updating milestone:', err);
          result(err, null);
          return;
        }

        if (res.affectedRows == 0) {
          // Milestone with ID not found
          result({ kind: 'not_found' }, null);
          return;
        }

        console.log('Updated milestone:', { id: milestoneId, ...milestone });
        result(null, { id: milestoneId, ...milestone });
      }
    );
  },
  
  // Count projects by status
  countByStatus: (status, result) => {
    db.query(
      'SELECT COUNT(*) as count FROM projects WHERE status = ?',
      status,
      (err, res) => {
        if (err) {
          console.error('Error counting projects by status:', err);
          result(err, null);
          return;
        }

        result(null, res[0].count);
      }
    );
  }
};

module.exports = Project;