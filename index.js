const express			= require('express');
const session			= require('express-session');
const hbs				= require('express-handlebars');
const mongoose			= require('mongoose');
const passport			= require('passport');
const localStrategy		= require('passport-local').Strategy;
const bcrypt			= require('bcrypt');
const app				= express();
const bodyparser        = require('body-parser');
var fs = require('fs');
const User = require(__dirname+'/models/user');
if(process.env.NODE_ENV !== 'production'){
	require('dotenv').config()
}
const req = require('express/lib/request');
mongoose.connect(process.env.DATABASE_URL, {
	useNewUrlParser: true,
	useUnifiedTopology: true
});

// Middleware
app.use(bodyparser.urlencoded({ extended: true}))
app.engine('hbs', hbs({ extname: '.hbs' }));
app.set('view engine', 'hbs');
app.use(express.static(__dirname + '/public'));
app.use(session({
	secret: "verygoodsecret",
	resave: false,
	saveUninitialized: true
}));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Passport.js
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function (user, done) {
	done(null, user.id);
});

passport.deserializeUser(function (id, done) {
	User.findById(id, function (err, user) {
		done(err, user);
	});
});

passport.use(new localStrategy(function (username, password, done) {
	User.findOne({ username: username }, function (err, user) {
		if (err) return done(err);
		if (!user) return done(null, false, { message: 'Incorrect username.' });

		bcrypt.compare(password, user.password, function (err, res) {
			if (err) return done(err);
			if (res === false) return done(null, false, { message: 'Incorrect password.' });
			
			return done(null, user);
		});
	});
}));

function isLoggedIn(req, res, next) {
	if (req.isAuthenticated()) return next();
	res.redirect('/login');
}

function isLoggedOut(req, res, next) {
	if (!req.isAuthenticated()) return next();
	res.redirect('/');
}
// ROUTES
app.get('/', isLoggedOut, (req, res) => {
	res.render("home", { title: "Home" });
});
//User.findOne({username: 'a'},(err,data)=> console.log(data));
//User.findOneAndUpdate({username : 'a'},(err,data)=> {$inc : {gamesplayed : 1}});
/*app.get('/about', (req, res) => {
	res.render("index", { title: "About" });
});
*/
app.get('/about', isLoggedIn, (req, res) => {
	res.send('about');
});
app.get('/home', isLoggedIn, (req, res) => {
	
	res.send('hi' + req.user.username + ' ' +req.user.gamesplayed + ' ' + req.user._id + ' ' + User.findOne({username: "a"}) + ' ' + User.findOne({gamesplayed: req.user.gamesplayed},(err,data)=> (data)));
	User.updateOne({username: req.user.username}, {$inc:{gamesplayed:1}}, (err) => {
		if (err) {
			console.log("Something wrong when updating data!");
		}
	});
});
app.post('home', isLoggedIn, (req, res) => {
	findOneAndUpdate({username :res.user.username}, {$inc : {gamesplayed : 1}});
});


app.get('/login', isLoggedOut, (req, res) => {
	const response = {
		title: "Login",
		error: req.query.error
	}

	res.render('login', response);
});

app.post('/login', passport.authenticate('local', {
	successRedirect: '/about',
	failureRedirect: '/login?error=true'
}));

app.get('/logout', function (req, res) {
	req.logout();
	res.redirect('/');
});

// Setup our admin user
app.get('/register', (req,res) =>{
    fs.readFile(__dirname + '/views/register.hbs/', function(err, data){
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.write(data);
      return res.end();
    })
  })
app.post('/register/done', async (req, res) => {
		const exists = await User.exists({ username: req.body.email });
	
		if (exists) {
			res.send('Account email is already taken');
			return;
		};
	
		bcrypt.genSalt(10, function (err, salt) {
			if (err) return next(err);
			bcrypt.hash(req.body.password, salt, function (err, hash) {
				if (err) return next(err);
				
				const newAdmin = new User({
					username: req.body.email,
					password: hash,
				});
	
				newAdmin.save();
				
				res.redirect('/login');
			});
		});
	});


app.listen(3000, () => {
	console.log("Listening on port 3000");
});