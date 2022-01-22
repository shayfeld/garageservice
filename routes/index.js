const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../config/auth');

const Treatment = require('../models/Treatment');
const User = require('../models/User');

// Welcome page
router.get('/',(req, res)=>{
    res.render('login')
});

// Dashbord page
router.get('/dashboard', ensureAuthenticated, (req, res)=>{
    User.find({}, (err, users) =>{
        res.render('tables',{
            userList: users
        })
    })
    
});

// New Treatment page
router.get('/aboutUs', ensureAuthenticated, (req, res)=>{
    res.render('aboutUs')
});

// New Treatment page
router.get('/newTreatment', ensureAuthenticated, (req, res)=>{
    res.render('newTreatment')
});



module.exports = router;