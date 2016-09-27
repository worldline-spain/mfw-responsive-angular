# MFW Client Security v1.0.0

This AngularJS module provides a responsive-dependent logic to applications as part of **Mobile FrameWork (MFW)**.


## Features

### Route interceptor

Provided implementation is based on [UI Router](https://github.com/angular-ui/ui-router).

* Configure your states with required credentials (from your own role list) and the route interceptor will
handle them and allow or deny access to them.
* Configure your login state to be addressed to when no credentials are found.


### HTTP requests interceptor

Provided implementation is based on [Restangular](https://github.com/mgonto/restangular).

* Configure all your Restangular configurations to be updated with proper credentials when user logs in or logs out.
* Handle error responses to broadcast a logout when `Unauthorized` response (HTTP status code 401) is received.


### Show/hide HTML content based on user credentials

* Use directives to show or hide HTML content when a user is logged in or not.
* Use directives to show or hide HTML content based on current user credentials.


## Installation

### Via Bower

Get module from Bower registry.

```shell
$ bower install --save mfw-responsive-angular
```


### Other

Download source files and include them into your project sources.



## Usage

Once dependency has been downloaded, configure your application module(s) to require:

* `mfw.responsive` module: `$mfwSecurity` service and directives.
* `mfw.responsive.storage.cookies` module: store credentials in cookies (depends on `ngCookies`).
* `mfw.responsive.storage.localstorage` module: store credentials in `localStorage`.
* `mfw.responsive.user-parser.jwt` module: parse JSON Web Tokens (JWT) after a successful login to a RESTful endpoint (depends on `angular-jwt`).
* `mfw.responsive.user-parser.identity` module: dummy parser that performs the identity logic: returns what it receives to parse.
* `mfw.responsive.route-interceptor.uirouter` module (optional): configure `ui.router` states for required credentials (depends on `ui.router`).
* `mfw.responsive.http-handler.restangular` module (optional): configure `Restangular` with authorization HTTP headers and error interceptors (depends on `restangular`).

```js
angular
  .module('your-module', [
      // Your other dependencies
      'mfw.responsive',
      'mfw.responsive.storage.cookies',
      'mfw.responsive.user-parser.jwt',
      'mfw.responsive.route-interceptor.uirouter',
      'mfw.responsive.http-handler.restangular'
  ]);
```

Inject `$mfwSecurity` service to request for login status or user credentials.

Use `mfw-sec-*` directives in your HTML templates.


> For further documentation, please read the generated `ngDocs` documentation inside `docs/` folder.


### Configuration

Security is configured by updating properties in constant objects on each module.

> *Important*: Update constants in `module.config` phase.


> For further documentation, please read the generated `ngDocs` documentation inside `docs/` folder.


## Extensions

If you want to use a different storage, or credentials information parser, just implement a new *service* using original API
and update `$mfwSecurityConfig` constant object to use them in configuration phase.

> For further documentation, please read the generated `ngDocs` documentation inside `docs/` folder.


## Development

* Use Gitflow
* Update package.json version
* Tag Git with same version numbers as NPM
* Check for valid `ngDocs` output inside `docs/` folder

> **Important**: Run `npm install` before anything. This will install NPM and Bower dependencies.

> **Important**: Run `npm run deliver` before committing anything. This will build documentation and distribution files.
> It's a shortcut for running both `docs` and `build` scripts.

### NPM commands

* Bower: install Bower dependencies in `bower_components/` folder:

```shell
$ npm run bower
```

* Build: build distributable binaries in `dist/` folder:

```shell
$ npm run build
```

* Documentation: generate user documentation (using `ngDocs`):

```shell
$ npm run docs
```

* Linting: run *linter* (currently JSHint):

```shell
$ npm run lint
```

* Deliver: **run it before committing to Git**. It's a shortcut for `docs` and `build` scripts:

```shell
$ npm run deliver
```
