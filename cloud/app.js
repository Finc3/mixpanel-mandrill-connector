
// These two lines are required to initialize Express in Cloud Code.
var express = require('express');
var parseExpressHttpsRedirect = require('parse-express-https-redirect');
var parseExpressCookieSession = require('parse-express-cookie-session');
var app = express();

// Global app configuration section
app.set('views', 'cloud/views');  // Specify the folder to find templates
app.set('view engine', 'ejs');    // Set the template engine
app.use(parseExpressHttpsRedirect());
app.use(express.cookieParser('secretstuff'));
app.use(parseExpressCookieSession({ cookie: { maxAge: 3600000 } }));
app.use(express.bodyParser());    // Middleware for reading request body


Parse.Cloud.afterDelete(Parse.User, function(request) {
    var query, user;
    Parse.Cloud.useMasterKey();
    user = request.object;
    query = new Parse.Query(Parse.Session);
    query.equalTo('user', user);
    return query.find().then(function(jobs) {
      return Parse.Object.destroyAll(jobs);
    }).then(function(success) {
      return console.log("successfully removed jobs for " + (user.get('username')));
    }, function(error) {
      return console.error("error while removing jobs for " + (user.get('username')));
    });
  });

Parse.Cloud.beforeSave("Webhook", function(request, response) {
  if (!request.object.get("in")) {
    request.object.set("in", 0);
  }
  if (!request.object.get("out")) {
    request.object.set("out", 0);
  }

  /*if (!request.object.get("trackGoogleAnalytics")) {
    request.object.set("trackGoogleAnalytics", false);
  }*/

  response.success();
});

// S E T U P (GET)
// shows the registration-page
app.get("/setup", function(req, res){
 	Parse.Cloud.useMasterKey();

	var admin = Parse.Object.extend("User");
	var query = new Parse.Query(admin);
	query.equalTo("username", "admin");
	query.find({
		success: function(results){
			if (results.length > 0){
				res.render("login.ejs", { msg: { type: "Error!", text: "You already have setup your account!"}});
			} else {
				res.render("setup.ejs");
			}
		},
		error: function(error){
			console.log(error);
		}
	});	
});

// S E T U P (POST)
// creates the admin user
app.post("/setup", function(req, res){
 	Parse.Cloud.useMasterKey();

	Parse.Cloud.httpRequest({
	    method: 'POST',
	    headers: {
	        'Content-Type': 'application/json; charset=utf-8'
	    },
	    url: 'https://mandrillapp.com/api/1.0/users/info.json',
	    body: {
	        key: req.body.apiKey,
	    },
	    success: function(httpResponse) {
	    	var response = JSON.parse(httpResponse.text);

	    	var user = new Parse.User();
			user.set("email", req.body.email);
			user.set("password", req.body.password);
			user.set("username", "admin");
			user.set("apiKey", req.body.apiKey);
			user.set("notificationMail", req.body.notificationMail);

			user.signUp(null, {
				success: function(user){
					res.render("login.ejs", { msg: { type: "success", text: "You can now sign in with your password!" }});
				},
				error: function(error){
					res.render("setup.ejs", { msg: { type: "Error", text: "An error occured." }});
				}
			});
			
	    },
	    error: function(httpResponse) {
	    	var response = JSON.parse(httpResponse.text);
	        res.render("setup.ejs", { msg: { type: "Error", text: response.message }});
	    }
	});
});	

// H O M E  
// shows existing webhooks with attributes and available actions (edit/delete)
app.get('/', function(req, res) {
 	Parse.Cloud.useMasterKey();

	// if User is not logged in -> redirect to login-page
	if (Parse.User.current()) {
		var webhook = Parse.Object.extend("Webhook");
		var query = new Parse.Query(webhook);
		console.log(Parse.User.current());
		query.equalTo("user", Parse.User.current());
		query.find({
			success: function(webhooks){
				res.render("webhooks.ejs", { webhooks: webhooks });
			},
			error: function(error){
				res.render("webhooks.ejs", { msg: {type: "error", text: "An error occured. Try again!"}});
			}
		}); 

	} else {
		var query = new Parse.Query(Parse.User);
		query.equalTo("username", "admin");
		query.find({
			success: function(users){
				if (users.length > 0){
					res.redirect("/login");
				} else {
					res.redirect("/setup");
				}
			},
			error: function(users){
				res.redirect("/setup");
			}
		});  
	}
});

  app.get("/forgot-password", function(req, res){
  	res.render("forgot-password.ejs");
  });

  app.post("/forgot-password", function(req, res){
  	Parse.User.requestPasswordReset(req.body.email, {
	  success: function() {
	    res.render("forgot-password.ejs", { msg: {type:"success", text: "We've sent you an email to reset your password."}});
	  },
	  error: function(error) {
	    // Show the error message somewhere
	     res.render("forgot-password.ejs", { msg: {type:"Error!", text: error.message }});
	  }
	});
  });

// L O G I N
// shows the login-page
app.get("/login", function(req, res){
	if (!Parse.User.current()) {
		res.render("login.ejs");
	} else {
		res.redirect("/");
	}
});

// L O G I N
// signs the user in
app.post("/login", function(req, res){
	Parse.User.logIn("admin", req.body.password, {
		success: function(user) {
	    	res.redirect("/");
	  	},
	  	error: function(user, error) {
	  		console.log("ERROR: " + error.message);
	  		res.redirect("/login");
	    	// The login failed. Check error to see why.
	  	}
	});
})

// L O G O U T
// signs the user out
app.get("/logout", function(req, res){

  	if (Parse.User.current()){
  		Parse.User.logOut();
  	}
  	res.redirect("/login");
});

// S E T T I N G S
// shows settings-page
app.get("/settings", function(req, res){
	Parse.Cloud.useMasterKey();
	var user = Parse.User.current();
	if (user){
		user.fetch({
			success: function(user){
				res.render("settings.ejs", { user: user });
			},
			error: function(user, error){
				res.redirect("/");
			}
		});
	} else {
		res.render("login.ejs", { msg: { type: "Error!", text: "You have to be logged in!" }});
	}
  	
});

// S E T T I N G S
// updates the settings
app.post("/settings", function(req, res){
	Parse.Cloud.useMasterKey();
	var user = Parse.User.current();
	if (user){
		user.fetch().then(function(user){
			Parse.Cloud.httpRequest({
			    method: 'POST',
			    headers: {
			        'Content-Type': 'application/json; charset=utf-8'
			    },
			    url: 'https://mandrillapp.com/api/1.0/users/info.json',
			    body: {
			        key: req.body.apiKey,
			    },
			    success: function(httpResponse) {
			    	var response = JSON.parse(httpResponse.text);

			    	user.set("apiKey", req.body.apiKey);
					user.set("notificationMail", req.body.adminMail);

					user.save(null, {
						success: function(user){
							res.render("settings.ejs", { user: user, msg: { type: "success", text: "Successfully saved."}});
						},
						error: function(error){
							res.render("settings.ejs", { user: user, msg: { type: "Error!", text: "An error occured."}});
						}
					});
					
			    },
			    error: function(httpResponse) {
			    	var response = JSON.parse(httpResponse.text);
			        res.render("settings.ejs", { user: user, msg: { type: "Error", text: response.message }});
			    }
			});			
		});  
	}	
});

// N E W  W E B H O O K
// shows form for creating new webhook
app.get("/new", function(req, res){
	Parse.Cloud.useMasterKey();
	var user = Parse.User.current();
	if (user) {

		var slugs = [];
		user.fetch().then(function(user){
			Parse.Cloud.httpRequest({
		  		method: 'POST',
			  url: 'https://mandrillapp.com/api/1.0/templates/list.json',
			  body: {
			    key: user.get("apiKey"),
			  },
			  success: function(httpResponse) {
			  	var response = JSON.parse(httpResponse.text);

			  	if (response.length == 0){

			  		var webhook = Parse.Object.extend("Webhook");
					var query = new Parse.Query(webhook);
					query.equalTo("user", Parse.User.current());
					query.find({
						success: function(webhooks){
			  				res.render("webhooks.ejs", { webhooks: webhooks, msg: { type: "Error", text: "You have no published templates on Mandrill. Please publish the templates you want to use first." }});
						},
						error: function(error){
			  				res.render("webhooks.ejs", { msg: { type: "Error!", text: "You have no published templates on Mandrill. Please publish the templates you want to use first" }});
						}
					});  

			  		return;
			  	}

			   	for (var i=0; i<response.length; i++){
			   		if (response[i].hasOwnProperty("published_at")){
				   		slugs.push(response[i].slug);
			   		}
			   	}

				res.render("new.ejs", { slugs: slugs });

			  },
			  error: function(httpResponse) {
			    res.render("webhooks.ejs", { msg: { type: "Error!", text: "An Error occured. Did you enter the right Mandrill API-Key?" }});
			  }
			});
		})	
	} else {
		res.redirect("/login");
	}
});

//  N E W  W E B H O O K
// creates a new webhook
app.post("/new", function(req, res){

	var trackGoogleAnalytics = false;
	if (req.body.trackGoogleAnalytics == 'on'){
		trackGoogleAnalytics = true;
	}

	Parse.Cloud.useMasterKey();
	var user = Parse.User.current();
	if (user){
		var trackOpens = false;
		if (req.body.trackOpens == 'on'){
			trackOpens = true;
		}

		var trackClicks = false;
		if (req.body.trackClicks == 'on'){
			trackClicks = true;
		}

		var Webhook = Parse.Object.extend("Webhook");
		var webhook = new Webhook();

		// check if choosen mandrill template has a default email sender address
		if (!req.body.email_from){
			user.fetch().then(function(user){
				Parse.Cloud.httpRequest({
		  			method: 'POST',
				  url: 'https://mandrillapp.com/api/1.0/templates/list.json',
				  body: {
				    key: user.get("apiKey"),
				  },
				  success: function(response){
					var templates = JSON.parse(response.text);
					var templateName = "";
					var slugs = [];
				  	for (var i=0; i<templates.length; i++){
				  		if (templates[i].slug === req.body.slug){
				  			templateName = templates[i].name;
				  		}

				  		slugs.push(templates[i].slug);
				  	}

				  	Parse.Cloud.httpRequest({
  						method: 'POST',
		  				url: 'https://mandrillapp.com/api/1.0/templates/info.json',
						  body: {
						    key: user.get("apiKey"),
						    name: templateName
						  },
						  success: function(response){
						  		var template = JSON.parse(response.text);
						  		if (!template.from_email){
						  			res.render("new.ejs", { slugs: slugs, msg: { type: "Error", text: 'Your choosen template has no default "FROM E-Mail" address so you have to set an email address here.' }});
						  		} else {
						  			webhook = new Webhook();
						  			webhook.set("name", req.body.name);
									webhook.set("endpoint", req.body.endpoint);
									webhook.set("mandrillTemplateSlug", req.body.slug);
									webhook.set("trackOpens", trackOpens);
									webhook.set("trackClicks", trackClicks);
									webhook.set("subject", req.body.subject);
									webhook.set("email_from", req.body.email_from);
									webhook.set("email_name", req.body.email_name);
									webhook.set("user", Parse.User.current());
									webhook.set("in", 0);
									webhook.set("out", 0);

									console.log("trackGoogleAnalytics: " + req.body.trackGoogleAnalytics);

									if (trackGoogleAnalytics){
										webhook.set("trackGoogleAnalytics", true);
										webhook.set("googleAnalyticsCampaign", req.body.googleAnalyticsCampaign);
										webhook.set("googleAnalyticsDomains", req.body.domain);
									}
									
									webhook.setACL(new Parse.ACL(Parse.User.current()));

									webhook.save(null, {
										success: function(webhook){
											res.redirect("/");
										},
										error: function(error){
											res.redirect("/");
										}
									});
						  		}
						  },
						  error: function(response){
					  			res.render("new.ejs", { slugs: slugs, msg: { type: "Error", text: 'An error occured.' }});
						  }
					});

				  },
				  error: function(response){
				  	console.log(user);
				  		console.log(response.text);
				  }
				});
			});

		} else {
			webhook.set("name", req.body.name);
			webhook.set("endpoint", req.body.endpoint);
			webhook.set("mandrillTemplateSlug", req.body.slug);
			webhook.set("trackOpens", trackOpens);
			webhook.set("trackClicks", trackClicks);
			webhook.set("subject", req.body.subject);
			webhook.set("email_from", req.body.email_from);
			webhook.set("email_name", req.body.email_name);
			webhook.set("user", Parse.User.current());
			webhook.set("in", 0);
			webhook.set("out", 0);
			if (trackGoogleAnalytics){
				webhook.set("trackGoogleAnalytics", true);
				webhook.set("googleAnalyticsCampaign", req.body.googleAnalyticsCampaign);
				webhook.set("googleAnalyticsDomains", req.body.domain);
			}
			webhook.setACL(new Parse.ACL(Parse.User.current()));

		webhook.save(null, {
			success: function(webhook){
				res.redirect("/");
			},
			error: function(webhook, error){
				res.redirect("/");
			}
		});
		}

	}
});

// D E L E T E  W E B H O O K
// deletes a given webhook
app.get("/:id/delete", function(req, res){
	Parse.Cloud.useMasterKey();

	var webhook = Parse.Object.extend("Webhook");
	var query = new Parse.Query(webhook);

	query.get(req.params.id, {
		success: function(webhook){
			webhook.destroy({
				success: function(obj){
					res.redirect("/");
				},
				error: function(obj, error){
					res.render("webhooks.ejs", { msg: { type: "Error", text: "An error occured while deleting your webhook. Please try again!"}});
				}
			});
		},
		error: function(webhook, error){
			res.redirect("/");
		}
	});
});

// E D I T  W E B H O O K
// shows edit-page
app.get("/:id/edit", function(req, res){
	Parse.Cloud.useMasterKey();
	var webhook = Parse.Object.extend("Webhook");
	var query = new Parse.Query(webhook);

	query.get(req.params.id, {
		success: function(webhook){
			res.render("edit.ejs", { user: Parse.User.current(), webhook: webhook });
		},
		error: function(webhook, error){
			res.redirect("/");
		}
	});
});

// E D I T  W E B H O O K
// updates the webhook
app.post("/:id/edit", function(req, res){
	Parse.Cloud.useMasterKey();

	var webhook = Parse.Object.extend("Webhook");
	var query = new Parse.Query(webhook);


	query.get(req.params.id, {
		success: function(webhook){

			var trackClicks = false;
			if (req.body.trackClicks === 'on'){
				trackClicks = true;
			}

			var trackOpens = false;
			if (req.body.trackOpens === 'on'){
				trackOpens = true;
			}

			// check if choosen mandrill template has a default email sender address
			if (!req.body.email_from){

				var user = Parse.User.current();
				user.fetch().then(function(user){

					Parse.Cloud.httpRequest({
			  			method: 'POST',
					  	url: 'https://mandrillapp.com/api/1.0/templates/list.json',
					  	body: {
					    	key: user.get("apiKey"),
					  },
					  success: function(response){
						var templates = JSON.parse(response.text);
						var templateName = "";
						var slugs = [];
					  	for (var i=0; i<templates.length; i++){
					  		if (templates[i].slug === req.body.slug){
					  			templateName = templates[i].name;
					  		}

					  		slugs.push(templates[i].slug);
					  	}

					  	Parse.Cloud.httpRequest({
							method: 'POST',
			  				url: 'https://mandrillapp.com/api/1.0/templates/info.json',
							  body: {
							    key: user.get("apiKey"),
							    name: templateName
							  },
							  success: function(response){
							  		var template = JSON.parse(response.text);
							  		if (!template.from_email){
							  			res.render("edit.ejs", { webhook: webhook, msg: { type: "Error", text: 'Your choosen template has no default "FROM E-Mail" address so you have to set an email address here.' }});
							  		} else {
							  			webhook = new Webhook();
							  			webhook.set("name", req.body.name);
										webhook.set("endpoint", req.body.endpoint);
										webhook.set("mandrillTemplateSlug", req.body.slug);
										webhook.set("subject", req.body.subject);
										webhook.set("googleAnalyticsCampaign", req.body.campaign);	
										webhook.set("trackClicks", trackClicks);
										webhook.set("trackOpens", trackOpens);
										webhook.set("email_from", req.body.email_from);
										webhook.set("email_name", req.body.email_name);

										webhook.save(null, {
											success: function(webhook){
												res.redirect("/");
											},
											error: function(webhook, error){
												res.render("edit.ejs", { webhook: webhook, msg: { type: "Error", text: "An error occured during saving your webhook. Please try again!"}});
											}
										});
							  		}
							  },
							  error: function(response){
							  		var error = JSON.parse(response);
						  			res.render("edit.ejs", { webhook: webhook, msg: { type: "Error", text: error.message }});
							  }
						});

					  },
					  error: function(response){
					  	console.log("ERROR");
					  }
					});
				});

			} else {
				webhook.set("name", req.body.name);
				webhook.set("endpoint", req.body.endpoint);
				webhook.set("mandrillTemplateSlug", req.body.slug);
				webhook.set("subject", req.body.subject);
				webhook.set("googleAnalyticsCampaign", req.body.campaign);	
				webhook.set("trackClicks", trackClicks);
				webhook.set("trackOpens", trackOpens);
				webhook.set("email_from", req.body.email_from);
				webhook.set("email_name", req.body.email_name);

				webhook.save(null, {
					success: function(webhook){
						res.redirect("/");
					},
					error: function(webhook, error){
						res.render("edit.ejs", { webhook: webhook, msg: { type: "Error", text: "An error occured during saving your webhook. Please try again!"}});
					}
				});
			}

			

		},
		error: function(response){
			res.render("webhooks", { msg: { type: "Error", text: "An error occured. "}});
		}
	});

});

// E N D P O I N T
// custom endpoint where mixpanel request will be transformed into an mandrill request
app.post('/:endpoint', function(req, res) {

 	Parse.Cloud.useMasterKey();

	var webhook = Parse.Object.extend("Webhook");
	var query = new Parse.Query(webhook);

	// check if endpoint is existing
	query.equalTo("endpoint", req.params.endpoint);
	query.first({
		success: function(webhook){
			if (typeof webhook === 'undefined'){

				var query = new Parse.Query(Parse.User);
				query.equalTo("username", "admin");
				query.first({
					success: function(user){

						Parse.Cloud.httpRequest({
					    	method: 'POST',
					    	headers: {
					        	'Content-Type': 'application/json; charset=utf-8'
					   		},
					    	url: 'https://mandrillapp.com/api/1.0/messages/send.json',
					    	body: {
						        key: user.get("apiKey"),
						        message: {
						            subject: "Request to non-existing endpoint: " + req.params.endpoint,
						            from_email: webhook.get("email_from"),
			  						from_name: webhook.get("email_name"),
						            to: [
							    	{
							    		email: user.get("notificationMail"),
							    		name: user.get("name")
							    	}
							    ],
							    text: "Hello, a request was sent to a non-existing endpoint: " + req.params.endpoint
					        },
					        async: false
					    },
						  success: function(httpResponse) {
						    console.log(httpResponse);
						    //console.log("Email sent!");
						  },
						  error: function(httpResponse) {
						    console.log(httpResponse);
						  }
						});

					},
					error: function(error){
						console.log(error);
					}
				});

				res.send(404);

				return;
			}

			var userData = getUsers(req.body.users, webhook); // put your own function here

		    if (!req.body.hasOwnProperty("users")){
				res.send(404);
				return;
			}

				var userPointer = webhook.get("user");

				userPointer.fetch().then(function(user){

					var message = {
			            subject: webhook.get("subject"),
			            from_email: webhook.get("email_from"),
	  					from_name: webhook.get("email_name"),
			            to: userData,
			            track_opens: webhook.get("trackOpens"),
			            track_clicks: webhook.get("trackClicks"),
			        };

			        if (webhook.get("trackGoogleAnalytics")){
			        	
			        	message.google_analytics_domains = webhook.get("googleAnalyticsDomains");
			        	message.google_analytics_campaign = webhook.get("googleAnalyticsCampaign");
			        }

			        console.log(message);

					Parse.Cloud.httpRequest({
					    method: 'POST',
					    headers: {
					        'Content-Type': 'application/json; charset=utf-8'
					    },
					    url: 'https://mandrillapp.com/api/1.0/messages/send-template.json',
					    body: {
					        template_name: webhook.get("mandrillTemplateSlug"),
					        template_content: null,
					        key: user.get("apiKey"),
					        message: message,
					        async: false
					    },
					    success: function(httpResponse) {
					    	var results = JSON.parse(httpResponse.text);
					    	var out = 0;

					        for (var i=0; i<results.length;i++){
						    	if (results[i]["status"] === 'sent'){
						    		out++;
						    	} else if (results[i]["status"] === "invalid"){

									Parse.Cloud.httpRequest({
									    method: 'POST',
									    headers: {
									        'Content-Type': 'application/json; charset=utf-8'
									    },
									    url: 'https://mandrillapp.com/api/1.0/messages/send.json',
									    body: {
									        key: user.get("apiKey"),
									        message: {
									            subject: webhook.get("subject"),
									            from_email: webhook.get("email_from"),
			  									from_name: webhook.get("email_name"),
									            to: [
											    	{
											    		email: user.get("notificationMail"),
											    		name: user.get("name")
											    	}
										    	],
										    	text: "Hello, an E-Mail couldn't be sent because the E-Mail address is invalid: " + results[i]["email"]
									        },
									        async: false
									    }
									});
						    	}


						    	
						    }
						    console.log(out);
						    // increment outgoing emails
				    		webhook.increment("out", out);
				    		webhook.save(null, {
				    			success: function(webhook){
				    				res.send(200);
				    			},
				    			error: function(error){
				    				res.send(500);
				    			}
				    		});

					    },
					    error: function(error) {
					        console.log(error);
					    }
					});

				});
			},
			error: function(error){
				console.log(error);
			}
		});

	});



// Filter relevant user data from Mixpanel request
var getUsers = function(users, webhook){
	var webhookUsers = JSON.parse(users);
	var userData = [];

	for (i=0; i<webhookUsers.length; i++){
		if (!webhookUsers[i]["$properties"].hasOwnProperty("$email")){
			sendMissingEMailNotificationMail(webhook, webhookUsers[i]);
			continue;
		} 
				
		userData.push({email: webhookUsers[i]["$properties"]["$email"], name: webhookUsers[i]["$properties"]["$first_name"]});
	}

	webhook.increment("in", webhookUsers.length);
	webhook.save();

	return userData;

};

// send email if mail is missing in mixpanel profile
var sendMissingEMailNotificationMail = function(webhook, userDump){

	var userPointer = webhook.get("user");
	userPointer.fetch().then(function(user){
		if (user.get("notificationMail")){
			var Mandrill = require('mandrill');
				
				Mandrill.initialize(user.get("apiKey"));
				Mandrill.sendEmail({
					message: {
			  		subject: "Profile without E-Mail",
			  		from_email: webhook.get("email_from"),
			  		from_name: webhook.get("email_name"),
				    to: [
				    	{
				    		email: user.get("notificationMail"),
				    		name: user.get("name")
				    	}
				    ],
				    text: "Hello, a problem occured while attempting to send an E-Mail to an user: " + JSON.stringify(userDump)
			  	},
			  	async: false
			},{
			  success: function(httpResponse) {
			    //console.log(httpResponse);
			   // console.log("Email sent!");
			  },
			  error: function(httpResponse) {
			    //console.log(httpResponse);
			    //console.log("Uh oh, something went wrong");
			  }
			});
		}
			return;
		
	});

}



// // Example reading from the request query string of an HTTP get request.
// app.get('/test', function(req, res) {
//   // GET http://example.parseapp.com/test?message=hello
//   res.send(req.query.message);
// });

// // Example reading from the request body of an HTTP post request.
// app.post('/test', function(req, res) {
//   // POST http://example.parseapp.com/test (with request body "message=hello")
//   res.send(req.body.message);
// });

// Attach the Express app to Cloud Code.
app.listen();
