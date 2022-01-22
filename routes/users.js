const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');

// User model
const User = require('../models/User');

// User Verification model
const UserVerification = require('../models/UserVerification');


//env variables
require('dotenv').config();

// email handler
const {v4: uuidv4} = require('uuid');

const nodemailer = require('nodemailer');
const { route } = require('.');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth:{
        user: process.env.AUTH_EMAIL,
        pass: process.env.AUTH_PASS
    }
})

// testing nodemailer success
transporter.verify((err, success)=>{
    if(err){
        console.log(err);
    }else{
        console.log("Ready for messages");
        console.log(success);
    }
});


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
                if(!user.verified){ // did'nt verify
                    errors.push({msg: 'This email did not verification'});
                    res.render('register',{
                        firstName,
                        lastName,
                        email,
                        password,
                        password2
                    });
                }else{ // verified
                    errors.push({msg: 'Email is already registered'});
                    res.render('register',{
                        firstName,
                        lastName,
                        email,
                        password,
                        password2
                    });
                }
                
                
            }else{
                const newUser = new User({
                    firstName,
                    lastName,
                    email,
                    password,
                    verified: false
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
                            // Account verification handler
                            sendVerificationEmail(user, res);
                            //req.flash('success_msg', 'You are now registered and can log in');
                            //res.redirect('/users/login');
                        })
                        .catch(err => console.log(err));
                }));
            }
        });

    }

});

// Send verification email
const sendVerificationEmail = ({_id, email}, res) =>{
    // url to be used in the mail
    const currentUrl='http://localhost:3000/';

    const uniqueString = uuidv4() + _id;

    // mail options
    const mailOptions = {
        from: process.env.AUTH_EMAIL,
        to: email,
        subject: 'Verify Your Email',
        html: `<p> Verify your email address to complete the signup and login into your accout.</p><p>This link 
        <b>expires in 6 hours</b>.</p><p>Press <a href=${
            currentUrl + 'users/verify/' + _id + '/' + uniqueString
        }>here</a> to proceed.</p>`
    };

    // hash the uniqueString
    const saltRounds = 10;
    bcrypt
    .hash(uniqueString, saltRounds)
    .then((hashedUniqueString) =>{
        // set values in userVerification collection
        const newVerification = new UserVerification({
            userId: _id,
            uniqueString: hashedUniqueString,
            createLink: Date.now(),
            expireLink: Date.now() + 21600000,
        });
        newVerification
        .save()
        .then(()=>{
            transporter
            .sendMail(mailOptions)
            .then(()=>{
                // email sent and verification record saved
                res.json({
                    status: 'PENDING',
                    message: 'Verification email sent',
                });
            })
            .catch((err)=>{
                console.log(err);
                res.json({
                    status: 'FAILED',
                    message: 'Verification email failed',
                });
            })
        })
        .catch((err)=>{
            console.log(err);
            res.json({
                status: 'FAILED',
                message: 'Could not save verification email data!',
            });
        })
    })
    .catch((err) =>{
        res.json({
            status: 'FAILED',
            message: 'An error occurred while hashing email data!',
        });
    })
};

// verify email
router.get('/verify/:userId/:uniqueString',(req,res)=>{
    const {userId, uniqueString} = req.params;

    UserVerification
    .find({userId})
    .then((result)=>{
        if(result.length >0){
            // User verification record exists
            const {expireLink} = result[0];
            const hashedUniqueString = result[0].uniqueString;
            // Check for expired unique string
            if(expireLink < Date.now()){
                // record has expired
                UserVerification.deleteOne({userId})
                .then((result)=>{
                    User
                    .deleteOne({_id:userId})
                    .then(()=>{
                        const message ='Link has expired. Please sign up again.';
                        res.redirect(`/users/verified/error=true&message=${message}`);
                    })
                    .catch((err)=>{
                        console.log(err);
                        const message ='Clearing user with expired unique string failed.';
                        res.redirect(`/users/verified/error=true&message=${message}`);
                    })
                })
                .catch((err)=>{
                    console.log(err);
                    const message ='An error occurred while clearing expired user verification record.';
                    res.redirect(`/users/verified/error=true&message=${message}`);
                })
            }else{
                // Valid record exists

                // Compare the hashed unique string
                bcrypt
                .compare(uniqueString, hashedUniqueString)
                .then((result)=>{
                    if(result){
                        // Strings Match
                        User
                        .updateOne({_id:userId}, {verified: true})
                        .then(()=>{
                            UserVerification
                            .deleteOne({userId})
                            .then(()=>{
                                const message ='successful verification.';
                                res.redirect('/users/verified/');
                            })
                            .catch((err)=>{
                                console.log(err);
                                const message ='An error occurred while finalizing successful verification.';
                                res.redirect(`/users/verified/error=true&message=${message}`);
                            })
                        })
                        .catch((err)=>{
                            console.log(err);
                            const message ='An error occurred while updateing user record to show verified.';
                            res.redirect(`/users/verified/error=true&message=${message}`);
                        })
                    }else{
                       // Existing record but incorrect verification details passed 
                        const message ='Invalid verification details passed. Check your inbox.';
                        res.redirect(`/users/verified/error=true&message=${message}`);
                    }
                })
                .catch((err)=>{
                    const message ='An error occurred while comparing unique strings.';
                    res.redirect(`/users/verified/error=true&message=${message}`);
                })
            }
        }else{
            // User verification record does'nt exists
            const message ='Account record does not exist or has verified already. Please sign up or log in.';
            res.redirect(`/users/verified/error=true&message=${message}`);
        }
    })
    .catch((err)=>{
        console.log(err);
        const message ='An error occurred while checking for existing user verification record.';
        res.redirect(`/users/verified/error=true&message=${message}`);
    })
});

// verified page
router.get('/verified',(req,res)=>{
    res.render('verified');
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