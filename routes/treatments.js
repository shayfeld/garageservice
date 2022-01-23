const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../config/auth');

// User model
const User = require('../models/User');

// Treatment model
const Treatment = require('../models/Treatment');


// Add Treatment Page
router.get('/addTreatment', ensureAuthenticated, (req, res)=>{
    res.render('addTreatment')
});

// Edit Treatment Page
router.get('/editTreatment/:id', ensureAuthenticated, (req, res)=>{
    const userId = req.params.id;
    Treatment.findById(userId)
    .then((user)=>{
        res.render('editTreatment',{
            userId: userId,
            email: user.workerEmail,
            treatmentInformation: user.treatmentInformation,
            carNumber: user.carNumber,
            inputDate: user.inputDate
        });
    })
    .catch((err)=>{
        console.log(err);
    });
});

// Add Treatment Handle
router.post('/addTreatment', ensureAuthenticated, (req, res)=>{
    const {carNumber, treatmentInformation, email} = req.body;

    const treatment = new Treatment({
        treatmentNumber:1,
        treatmentInformation:treatmentInformation,
        workerEmail:email,
        carNumber: carNumber
    });

    treatment.save()
    .then(() => {
        // Back to dashboard
        res.redirect('/dashboard');
    })
    .catch(err => console.log(err));

});

// Edit Treatment Handle
router.put('/editTreatment/:id', ensureAuthenticated, (req, res)=>{
    const id = req.params.id;

    Treatment.findByIdAndUpdate(id, req.body, {useFindAndModify: false})
    .then(() =>{
        res.redirect('/dashboard');
    })
    .catch((err)=>{
        console.log(err);
    });
});

// Delete Treatment Handle
router.get('/deleteTreatment/:id', ensureAuthenticated, (req, res)=>{
    const id = req.params.id;
    Treatment.findByIdAndDelete(id)
    .then(()=>{
        res.redirect('/dashboard');
    })
    .catch((err)=>{
        console.log(err);
    });
});



module.exports = router;