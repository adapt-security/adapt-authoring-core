# Error handling
Handling errors correctly is a key aspect of writing stable software. This guide will give some tips on how you should deal with errors, as well as the utilities available to make error handling simpler.

Before going into specifics, it would be useful to discuss application errors in general terms. The errors you experience are likely to fall into one of the following broad groups:
- **Initialisation errors**: i.e. problems during start-up
- **General server errors**: errors which occur outside of user requests, possibly during automated tasks
- **User errors**: errors which are a direct result of a user request

You will need to deal with each category of error differently. Below are some general tips on handling each type of error.

## Initialisation errors
## Initialisation errors
Any errors which occur during initialisation should be captured and logged as appropriate. Depending on the type of error, it may or may not be considered fatal to your code.

Some examples:
- For a database-handler module, failing to connect to the database would be considered a fatal error, as no further actions can be executed. In this case, the code should perform any clean-up and exit.
- For a configuration module, failing to load the user configuration file may not be fatal if the application can run without it (e.g. with default settings). In this case the error should be logged, but the code can continue to initialise post-error.
- For a module which attempts to load a specific file in each module connected to the core system, failing to load a single configuration file may not be an error as such, but rather an expected outcome if the configuration file in question is not something that's required to be defined for every module. In this case, the code can continue and it may not even be necessary to log a message.

## General server errors
'General server errors' is a broad category which covers other errors that don't take place at either initialisation or as a result of direct user action. Again, depending on the specific error, these may or may not be fatal.

Some examples:
- For a database-handler module, disconnecting from the database is an expected error, and can be handled and rectified easily.

## User errors errors
User errors are any errors which are caused as a direct result of a user performing an action incorrectly. It is even *more* critical with user errors that the error is as specific and descriptive as possible, as the response needs to be informative and instructive to the user that caused the error. Failing to do so will result in an unpleasant user experience.

Some examples:
- A user uploads a file in an invalid format. This definitely isn't a fatal error, as the code can continue post-error. The returned error should inform the user of the issue, as well as how it can be rectified.

## Defining errors
Depending on the kinds of error that you're dealing with in your code, it may be useful to include a set of custom error definitions specific to your code.

Defining useful errors is a critical part of any software system. The ErrorsModule makes it easy to define errors for your own modules, and make use of errors defined in other modules.

## Catching errors

## Throwing errors
As mentioned above, it is preferable to catch errors internally in your code and re-throw these errors

The ErrorsModule acts as a central store for all errors defined in the system, and errors can be accessed and thrown from here. For convenience, the Errors module is made available directly as a property of the main App instance, or by referencing the module in the usual way: `App#waitForModule('errors)`

```js
try {
  // do something here
} catch(e) {
  throw this.app.errors.MY_ERROR
}
```
