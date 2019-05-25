# Node.js + Express.js Authentication + Google search + Logg capturing API 

This is a project meant to be used as a starting point for APIs that require user authentication (registration and sign on). Sign on sessions are showcased with protected routes that pass through authentication middleware. API is designed to be consumed by a SPA.

**This is a WIP**, if you find any issues or concerns with the security of the implementation, please, open a new issue or contact me directly [@realnationalhero](https://www.facebook.com/Realnationalhero/) on Facebook Page.

## Project Setup

To run project locally:

- Clone repo
- `npm install` in root directory
- Add your mongoDB uri to `secrets.js` file or create an .ENV file and put details there
- Add your google key to `secrets.ja` filw or crete an .env file and place yout google key  
- `npm start` to run nodemon in watch mode
- Use [postman](https://https://www.getpostman.com/) to test endpoints or curl if you're cool

## Overview of auth system:

1.  User registers account. Password is hashed and salted with bcrypt and is stored in database
2.  User enters credentials, server validates credentials. If valid, a random 16 byte token is generated and stored in database along with the user ID of the requesting user
3.  Token is set in a cookie along with the server's response
4.  Client includes cookie on subsequent requests.
5.  Protected endpoints send request through authentication middleware, which checks token received in request to exist in database and have a status of 'valid'. The endpoints that use the authentication in this project are the GET/DELETE api/users/me and PUT api/users/logout. Meant to serve as examples of how it would work
6.  To logout, client would send request to api/users/logout with their auth token. If token exists and is valid, set session status as 'expired'
7.  Routes to serch locations and storing in mongodb database for future uses or for analytics 

### CSRF Protection

1.  Implemented CSRF-tokens for CSRF mitigation. Read more at 'Synchronizer (CSRF) Tokens' section of 
2.  Added new key to session schema. Every session now includes csrfToken key.
3.  Whenever a new user registers or existing user logs in, a new session is initialized. Sessions now require a csrfToken to be generated along with the original bearer token (using the same `generateToken()` method).
4.  Once session is initalized, server sets bearer token in a token cookie, but also responds with the session's csrf-token in body.
5.  This csrf-token **must** be attached to the headers of every request as `csrf-token: 'YOUR TOKEN HERE'` that _would change/modify server-side state_. In this case, the  `GET api/users/places` to get gsearch location ,`DELETE api/users/mydetails` and `PUT api/users/logout` routes require a csrf token.
6.  Protected routes use `csrfCheck` middleware. This middleware should be added to any route that would change state. The csrfCheck for the delete user route is somewhat redundant as it requires the user to provide credentials, but I included it to serve as example.

### API Documentaton 
1. first one should register to access any other API , so for registration call http://localhost:3000/api/users/register with request body as {
"email":"ejj@gmail.com",
"password":"test123"
}
and response will be , if successful 
{
"email":"ejj@gmail.com",
"password":"test123"
}
2.  Login API work 
http://localhost:3000/api/users/mydetails
request body :
{
	"email":"ranjan.pandey@hometown.in",
	"password":"Welcome123"
}

{
    "title": "Authentication successful",
    "detail": "Successfully authenticated user",
    "user": {
        "email": "ranjan.pandey@hometown.in"
    }
}
3. Once you successfully login you can access '/api/users/places' and '/api/users/mydetails'
