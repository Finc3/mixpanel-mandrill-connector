# README


About
-----
The main challenge for clever transactional mails is to get IT to segment the users in real-time and trigger a Mandrill API call to send out an email. This web app enables combining [Mixpanel](http://www.mixpanel.com) Webhooks with Templates from [Mandrill](http://www.mandrillapp.com) to make event-based emails trackable and beautiful.

Requirements
------------

1. Parse Account
2. Mixpanel Account
3. Mandrill Account

This code is supposed to be running on [Parse](http://www.parse.com).

Installing
-----------
+ Create an account on [Parse.com](http://www.parse.com)
+ Install Development Tools on your machine ([Quickstart Guide](https://parse.com/apps/quickstart#hosting))
+ Create a new Project
+ Copy files into project folder
+ Deploy!

How to
------

1. Go to your root domain like: yourdomain.parseapp.com/
2. Click on Setup, create your account (user: admin; pass: ###)
3. Log into your account
4. Insert your data in yourdomain.parseapp.com/settings
5. Have a Template in Mandrill ([Templates?!](http://help.mandrill.com/entries/21694868-Getting-Started-with-Templates))
6. Go to yourdomain.parseapp.com/new and create a new Webhook
3. Important: Restrict class creation on Parse ([doc](https://parse.com/docs/data#security))
4. Important: Edit Class-Level Permissions for User and Webhook - for public only allow create
7. Go to Mixpanel, create a new Webhook (Notifications / New Notification / Webhook)
8. Done!

### Settings

+ API-Key: Your Mandrill API-Key
+ Admin Notification E-Mail: Receive notifications (Mixpanel profile without E-Mail, Request to Non-existing Endpoint, Invalide E-Mail address)

### New Webhook

+ Name: An inidividual name for your webhook to identify between many different ones
+ Endpoint: The URL endpoint where Mixpanel sends the request to
+ Mandrill Template Slug: The slug from a given Mandrill Template
+ Subject: Subject for your E-Mails to be sent through the web app - overwrites the default values from Mandrill
+ GA Campaign: Name of the Google Analytics Campaign you want to include
+ Track Opens: Turn on tracking of recipient opens the email
+ Track Clicks: Turn on tracking of recipient clicks on a link within the email
+ E-Mail From: The email address which will be displayed as sender
+ E-Nail Name: The name which will be displayed as sender

Support
-------

If you need any help or want to give feedback, do not hesitate to contact dennis dot ruske at finc3 dot de	