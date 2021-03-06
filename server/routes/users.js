const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const searchResult = require('../models/searchResult');
const Session = require('../models/session');
const { authenticate } = require('../middleware/authenticate');
const { csrfCheck } = require('../middleware/csrfCheck');
const { initSession, isEmail } = require('../utils/utils');
const { getSecret } = require('../secrets');
const { logger } = require('../../logs/logger')
const googleMapsClient = require('@google/maps').createClient({
  key: getSecret['googleKey']
});
const router = express.Router();
/**
 * <p>
 *  register user for authontication for first time
 * </p>
 *
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(!isEmail(email), req.body)
    if (!isEmail(email)) {
      throw new Error(`Email must be a valid email address. ${email}`);
    }
    if (typeof password !== 'string') {
      throw new Error('Password must be a string.');
    }
    const user = new User({ email, password });
    const persistedUser = await user.save();
    const userId = persistedUser._id;

    const session = await initSession(userId);
    logger.info(`User Registration Successful ${email}`)
    res
      .cookie('token', session.token, {
        httpOnly: true,
        sameSite: true,
        maxAge: 1209600000,
        //secure: process.env.NODE_ENV === 'production',
      })
      .status(201)
      .json({
        title: 'User Registration Successful',
        detail: 'Successfully registered new user',
        csrfToken: session.csrfToken,
      });
  } catch (err) {
    logger.error(`Something went wrong during registration process ${err}`)
    res.status(400).json({
      errors: [
        {
          title: 'Registration Error',
          detail: 'Something went wrong during registration process.',
          errorMessage: err.message,
        },
      ],
    });
  }
});
/**
 * <p>
 *  Login and create token
 * </p>
 *
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!isEmail(email)) {
      logger.warn(`Bad Request Email must be a valid email address ${email}`)
      return res.status(400).json({
        errors: [
          {
            title: 'Bad Request',
            detail: 'Email must be a valid email address',
          },
        ],
      });
    }
    if (typeof password !== 'string') {
      logger.warn(`Bad Request Password must be a string ${email}`)
      return res.status(400).json({
        errors: [
          {
            title: 'Bad Request',
            detail: 'Password must be a string',
          },
        ],
      });
    }
    const user = await User.findOne({ email });
    if (!user) {
      logger.warn(`user not found ${user}`)
      throw new Error();
    }
    const userId = user._id;

    const passwordValidated = await bcrypt.compare(password, user.password);
    if (!passwordValidated) {
      logger.warn(`invalid password ${user}`)
      throw new Error();
    }

    const session = await initSession(userId);

    res
      .cookie('token', session.token, {
        httpOnly: true,
        sameSite: true,
        maxAge: 1209600000,
        secure: process.env.NODE_ENV === 'production',
      })
      .json({
        title: 'Login Successful',
        detail: 'Successfully validated user credentials',
        csrfToken: session.csrfToken,
      });
  } catch (err) {
    logger.error(`Check email and password combination ${err}`)
    res.status(401).json({
      errors: [
        {
          title: 'Invalid Credentials',
          detail: 'Check email and password combination',
          errorMessage: err.message,
        },
      ],
    });
  }
});

/**
 * <p>
 *  Display my details
 * </p>
 *
 */
router.get('/mydetails', authenticate, async (req, res) => {
  try {
    const { userId } = req.session;
    const user = await User.findById({ _id: userId }, { email: 1, _id: 0 });

    res.json({
      title: 'Authentication successful',
      detail: 'Successfully authenticated user',
      user,
    });
  } catch (err) {
    logger.error(`Not authorized to access this route.`)
    res.status(401).json({
      errors: [
        {
          title: 'Unauthorized',
          detail: 'Not authorized to access this route',
          errorMessage: err.message,
        },
      ],
    });
  }
});

/**
 * <p>
 *  Search for places and if existing place than keep 
 *  inside mongodb and retrive from db if same keyword is searched
 *  param authenticate used to authentic user it is a middleware
 * </p>
 *
 */
router.get('/places', authenticate, async (req, res) => {
  try {
    const { query: { searchKey } } = req
    let searchData;
    const exstingSearchDetails = await searchResult.findOne({ key: searchKey });
    if (exstingSearchDetails) {
      res.json({
        title: 'place detail',
        detail: exstingSearchDetails,
      });
    }else{
      
      googleMapsClient.geocode({
        address: searchKey
      }, async (err, response) => {
          //console.log("search key", err, exstingSearchDetails);
        if (!err) {
          console.log(response.json.results);
          searchData = response.json.results
          let SD = JSON.stringify(searchData)
          let search = new searchResult({ searchKey, SD });
          await search.save();
          res.json({
            title: 'place detail',
            detail: searchData,
          });
        }
          throw new Error('Please use correct google map Key.');
      });
    }
    
    //const searchId = insertedSearch._id;

  } catch (err) {
    logger.error(`Not authorized to access this route. ${err}`)
    res.status(401).json({
      errors: [
        {
          title: 'Unauthorized',
          detail: 'Not authorized to access this route',
          errorMessage: err.message,
        },
      ],
    });
  }
})
/**
 * <p>
 *  Delete my details
 * </p>
 *
 */
router.delete('/mydetails', authenticate, csrfCheck, async (req, res) => {
  try {
    const { userId } = req.session;
    const { password } = req.body;
    if (typeof password !== 'string') {
      throw new Error();
    }
    const user = await User.findById({ _id: userId });

    const passwordValidated = await bcrypt.compare(password, user.password);
    if (!passwordValidated) {
      throw new Error();
    }

    await Session.expireAllTokensForUser(userId);
    res.clearCookie('token');
    await User.findByIdAndDelete({ _id: userId });
    logger.info(`Successfuly expired login session. ${userId}`)
    res.json({
      title: 'Account Deleted',
      detail: 'Account with credentials provided has been successfuly deleted',
    });
  } catch (err) {
    logger.error(`Something went wrong during the logout process.`)
    res.status(401).json({
      errors: [
        {
          title: 'Invalid Credentials',
          detail: 'Check email and password combination',
          errorMessage: err.message,
        },
      ],
    });
  }
});

/**
 * <p>
 *  Logour or destroyed all token
 * </p>
 *
 */
router.put('/logout', authenticate, csrfCheck, async (req, res) => {
  try {
    const { session } = req;
    await session.expireToken(session.token);
    res.clearCookie('token');
    logger.info(`Successfuly expired login session.`)
    res.json({
      title: 'Logout Successful',
      detail: 'Successfuly expired login session',
    });
  } catch (err) {
    logger.error(`Something went wrong during the logout process.`)
    res.status(400).json({
      errors: [
        {
          title: 'Logout Failed',
          detail: 'Something went wrong during the logout process.',
          errorMessage: err.message,
        },
      ],
    });
  }
});

module.exports = router;
