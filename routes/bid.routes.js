const express = require('express');
const router = express.Router();
const bidController = require('../controllers/bid.controller');
const { verifyToken, isEngineer } = require('../middleware/authJwt');

router.post('/', [verifyToken, isEngineer], bidController.createBid);

router.get('/my-bids', [verifyToken, isEngineer], (req, res) => {
  console.log('GET /api/bids/my-bids - User:', req.user);
  bidController.getMyBids(req, res);
});

module.exports = router;