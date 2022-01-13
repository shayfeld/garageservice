const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
// User model
const User = require('../models/User');

// Login Page
router.get('/login',(req, res)=>{
    res.render('login')
});

// Register Page
router.get('/register',(req, res)=>{
    res.render('register')
});

// Forgot Password Page
router.get('/forgotpass',(req, res)=>{
    res.render('forgotpass')
});

// Change Password Page
router.get('/changepass',(req, res)=>{
    res.render('Changepass')
});

// Register Handle
router.post('/register',(req, res)=>{
    const {firstName, lastName, email, password, password2} = req.body;
    let errors = [];

    //Check required fields
    if(!firstName || !lastName || !email || !password || !password2){
        errors.push({msg:'Please fill in all fields'});
    }

    //Check passwords match
    if(password !== password2){
        errors.push({msg:'Passwords do nt match'});
    }

    //Check passwords length
    if(password.length < 6){
        errors.push({msg:'Passwords Should be at least 6 characters'});
    }

    if(errors.length > 0){
        res.render('register',{
            firstName,
            lastName,
            email,
            password,
            password2
        });
    }else{
        // Validation passed
        User.findOne({email: email})
        .then(user =>{
            if(user){
                //User exists
                errors.push({msg: 'Email is already registered'});
                res.render('register',{
                    firstName,
                    lastName,
                    email,
                    password,
                    password2
                });
            }else{
                const newUser = new User({
                    firstName,
                    lastName,
                    email,
                    password
                });

                // Hash Password
                bcrypt.genSalt(10, (err, salt)=> 
                    bcrypt.hash(newUser.password, salt, (err, hash)=>{
                        if(err) throw err;
                        // Set password to hashed
                        newUser.password = hash;
                        // Save user
                        newUser.save()
                        .then(user => {
                            req.flash('success_msg', 'You are now registered and can log in');
                            res.redirect('/users/login');
                        })
                        .catch(err => console.log(err));
                }));
            }
        });

    }

});

// Login Handle
router.post('/login',(req, res, next)=>{
    passport.authenticate('local', {
        successRedirect: '/dashboard',
        failureRedirect: '/users/login',
        failureFlash: true
    })(req, res, next);
});

// Logout Handle
router.post('/logout',(req, res, next)=>{
    req.logout();
    req.flash('success_msg', 'You are logged out');
    res.redirect('/users/login');
});

// Forget Password Handle ????????????????????????????????????
router.post('/forgotpass',(req, res)=>{
    const {email} = req.body;
    let errors = [];

    //Check required field
    if(!email){
        errors.push({msg:'Please fill in Email field'});
    }

    if(errors.length > 0){
        res.render('forgotpass',{
            email
        });
    }else{
        // Validation passed
        User.findOne({email: email})
        .then(user =>{
            if(!user){
                //User does not exists
                errors.push({msg: 'Email is not found'});
                res.render('forgotpass',{
                    email
                });
            }else{
                res.render('changepass',{
                    user
                });
            }
        });

    }

});


// Change Password Handle // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
router.put('/changepass',(req, res)=>{
    const {password, password2} = req.body;
    const id = req.params.user.id;
    let errors = [];

    //Check required fields
    if(!password || !password2){
        errors.push({msg:'Please fill in all fields'});
    }

    //Check passwords match
    if(password !== password2){
        errors.push({msg:'Passwords do nt match'});
    }

    //Check passwords length
    if(password.length < 6){
        errors.push({msg:'Passwords Should be at least 6 characters'});
    }

    if(errors.length > 0){
        res.render('changepass');
    }

    else{
        // Hash Password
        bcrypt.genSalt(10, (err, salt)=> 
            bcrypt.hash(password, salt, (err, hash)=>{
                if(err) throw err;
                // Set password to hashed
                password = hash;
                User.findByIdAndUpdate(id,{password: password},{userFindAndModify: false})
                .then(user =>{
                    if(!user){
                        //User exists
                        errors.push({msg: 'Email is already registered'});
                        res.render('changepass',{
                            password,
                            password2
                        });
                    }else{
                        req.flash('success_msg', 'Your password changed and can log in');
                        es.redirect('/users/login');
                    }
                })
                .catch(err => console.log(err));
        }));
    }
});
module.exports = router;